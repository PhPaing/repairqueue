import { CalendarDays, Clock } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { TECHNICIAN_MAP, ISSUE_EMOJI } from '@/lib/constants';
import { formatTimeAgo, getActiveTickets, getQueuePosition } from '@/lib/queue';
import type { RepairStatus, RepairTicket } from '@/types';
import { getTechnicianName } from '@/lib/permissions';
import { formatDay, priorityLabel } from '@/lib/history';
import { NoteHistory, TicketActions } from '@/components/TicketActions';

const STATUS_STYLES: Record<RepairStatus, { bg: string; text: string; dot: string }> = {
  in_progress: { bg: 'bg-info-100', text: 'text-info-700', dot: 'bg-info-500' },
  assigned: { bg: 'bg-info-50', text: 'text-info-700', dot: 'bg-info-400' },
  queued: { bg: 'bg-primary-100', text: 'text-primary-700', dot: 'bg-primary-500' },
  waiting: { bg: 'bg-neutral-100', text: 'text-neutral-600', dot: 'bg-neutral-400' },
  completed: { bg: 'bg-accent-100', text: 'text-accent-700', dot: 'bg-accent-500' },
  closed: { bg: 'bg-neutral-100', text: 'text-neutral-500', dot: 'bg-neutral-300' },
};

const STATUS_KEY: Record<RepairStatus, string> = {
  in_progress: 'statusInProgress',
  assigned: 'statusAssigned',
  queued: 'statusQueued',
  waiting: 'statusWaiting',
  completed: 'statusCompleted',
  closed: 'statusClosed',
};

export function RepairList() {
  const { tickets, t, lang } = useApp();
  const active = getActiveTickets(tickets);
  const completed = tickets.filter((tk) => tk.status === 'completed' || tk.status === 'closed');
  const ordered = [...active, ...completed];

  if (tickets.length === 0 || active.length === 0 && completed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-white py-12">
        <span className="text-4xl">🎉</span>
        <p className={`mt-3 text-lg font-bold text-neutral-700 ${lang === 'th' ? 'font-thai' : ''}`}>
          {t('noRepairsTitle')}
        </p>
        <p className={`mt-1 text-sm text-neutral-400 ${lang === 'th' ? 'font-thai' : ''}`}>
          {t('noRepairsSub')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {ordered.map((ticket) => (
        <RepairCard key={ticket.id} ticket={ticket} />
      ))}
    </div>
  );
}

function RepairCard({ ticket }: { ticket: RepairTicket }) {
  const { tickets, t, lang } = useApp();
  const position = getQueuePosition(ticket, tickets);
  const isActive =
    ticket.status === 'in_progress' ||
    ticket.status === 'assigned' ||
    ticket.status === 'queued' ||
    ticket.status === 'waiting';
  const tech = ticket.technicianId ? TECHNICIAN_MAP[ticket.technicianId] : null;
  const technicianName = getTechnicianName(ticket);
  const styles = STATUS_STYLES[ticket.status];

  return (
    <div
      className={`rounded-2xl border bg-white p-3.5 shadow-sm transition-all hover:shadow-md ${
        ticket.isYou ? 'border-primary-300 ring-1 ring-primary-200' : 'border-neutral-200'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Queue number badge */}
        {isActive ? (
          <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-50">
            <span className="text-[9px] font-semibold uppercase text-primary-500">Q</span>
            <span className="text-xl font-extrabold leading-none text-primary-600">
              #{position}
            </span>
          </div>
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neutral-50">
            <span className="text-2xl">{ISSUE_EMOJI[ticket.issueType]}</span>
          </div>
        )}

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-neutral-800">{ticket.room}</span>
            {ticket.isYou && (
              <span className="rounded-md bg-primary-400 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {t('yourTicket')}
              </span>
            )}
          </div>

          <p className={`mt-0.5 text-sm text-neutral-600 ${lang === 'th' ? 'font-thai' : ''}`}>
            {ISSUE_EMOJI[ticket.issueType]} {t(`issue${ticket.issueType.charAt(0).toUpperCase() + ticket.issueType.slice(1).replace(/_./g, (m) => m[1].toUpperCase())}`)}
          </p>

          {ticket.title && (
            <p className={`mt-0.5 text-sm font-semibold text-neutral-800 ${lang === 'th' ? 'font-thai' : ''}`}>
              {ticket.title}
            </p>
          )}

          {ticket.description && (
            <p
              className={`mt-1 text-xs text-neutral-400 ${ticket.isYou ? 'break-words' : 'truncate'} ${lang === 'th' ? 'font-thai' : ''}`}
            >
              {ticket.description}
            </p>
          )}

          {ticket.photos.length > 0 && (
            <div className="mt-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
              {ticket.photos.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-lg border border-neutral-200 object-cover"
                />
              ))}
            </div>
          )}

          {/* Footer row */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${styles.bg} ${styles.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${styles.dot} ${ticket.status === 'in_progress' ? 'animate-pulse-soft' : ''}`} />
              {t(STATUS_KEY[ticket.status])}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-neutral-400">
              <Clock size={11} />
              {formatTimeAgo(ticket.reportedAt, lang)}
            </span>
            {ticket.priority !== 'normal' && (
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                  ticket.priority === 'urgent' ? 'bg-red-100 text-red-600' : 'bg-primary-100 text-primary-700'
                } ${lang === 'th' ? 'font-thai' : ''}`}
              >
                {priorityLabel(ticket.priority, lang)}
              </span>
            )}
            {ticket.scheduledDate && (
              <span className={`flex items-center gap-1 text-[11px] font-medium text-neutral-500 ${lang === 'th' ? 'font-thai' : ''}`}>
                <CalendarDays size={11} />
                {t('fieldScheduledDate')}: {formatDay(ticket.scheduledDate, lang)}
              </span>
            )}
            {tech && technicianName && (
              <span className="flex items-center gap-1 text-[11px] text-neutral-500">
                <span>{tech.avatar}</span>
                {technicianName}
              </span>
            )}
          </div>

          {ticket.isYou && <NoteHistory ticket={ticket} />}
          <TicketActions ticket={ticket} />
        </div>
      </div>
    </div>
  );
}
