import { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Check,
  X,
  Play,
  RotateCcw,
  GripVertical,
  MessageCircle,
  Clock,
  CheckCircle,
  Users,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { TECHNICIANS, TECHNICIAN_MAP, ISSUE_EMOJI } from '@/lib/constants';
import {
  formatTimeAgo,
  getActiveTickets,
  getQueuePosition,
} from '@/lib/queue';
import type { RepairTicket } from '@/types';
import { NotificationList } from './LineNotification';

const STATUS_KEY: Record<string, string> = {
  in_progress: 'statusInProgress',
  queued: 'statusQueued',
  waiting: 'statusWaiting',
  completed: 'statusCompleted',
  closed: 'statusClosed',
};

export function AdminPanel() {
  const {
    tickets,
    t,
    lang,
    logoutAdmin,
    completeRepair,
    closeTicket,
    moveTicket,
    assignTechnician,
    startRepair,
    resetData,
    notifications,
  } = useApp();
  const [confirmComplete, setConfirmComplete] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);

  const active = getActiveTickets(tickets);
  const completed = tickets.filter(
    (tk) => tk.status === 'completed' || tk.status === 'closed',
  );
  const ordered = [...active, ...completed];

  return (
    <div className="mx-auto max-w-2xl px-4 py-5">
      {/* Top bar */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className={`text-lg font-bold text-neutral-800 ${lang === 'th' ? 'font-thai' : ''}`}>
          {t('adminPanel')}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReset(true)}
            className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-50"
          >
            <RotateCcw size={13} />
            {t('clearData')}
          </button>
          <button
            onClick={logoutAdmin}
            className={`rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-neutral-700 ${lang === 'th' ? 'font-thai' : ''}`}
          >
            {t('logout')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4">
        <AdminStats tickets={tickets} t={t} lang={lang} />
      </div>

      {/* LINE notifications */}
      {notifications.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-2">
            <MessageCircle size={14} className="text-accent-500" fill="currentColor" />
            <span className={`text-xs font-semibold text-neutral-500 ${lang === 'th' ? 'font-thai' : ''}`}>
              LINE {t('lineBot')}
            </span>
          </div>
          <NotificationList />
        </div>
      )}

      {/* Queue reorder hint */}
      <p className={`mb-2 text-xs font-medium text-neutral-400 ${lang === 'th' ? 'font-thai' : ''}`}>
        {t('dragToReorder')}
      </p>

      {/* Ticket list */}
      <div className="space-y-2.5">
        {ordered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-white py-12">
            <span className="text-4xl">🎉</span>
            <p className={`mt-3 text-lg font-bold text-neutral-700 ${lang === 'th' ? 'font-thai' : ''}`}>
              {t('noRepairsTitle')}
            </p>
          </div>
        ) : (
          ordered.map((ticket, idx) => (
            <AdminTicketRow
              key={ticket.id}
              ticket={ticket}
              index={idx}
              activeCount={active.length}
              confirmComplete={confirmComplete}
              setConfirmComplete={setConfirmComplete}
              onComplete={completeRepair}
              onClose={closeTicket}
              onMove={moveTicket}
              onAssign={assignTechnician}
              onStart={startRepair}
            />
          ))
        )}
      </div>

      {/* Reset confirm modal */}
      {showReset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setShowReset(false)}
        >
          <div
            className="animate-scale-in w-full max-w-xs rounded-2xl bg-white p-5 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className={`text-sm font-semibold text-neutral-700 ${lang === 'th' ? 'font-thai' : ''}`}>
              {t('resetConfirm')}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setShowReset(false)}
                className={`flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-600 ${lang === 'th' ? 'font-thai' : ''}`}
              >
                {t('no')}
              </button>
              <button
                onClick={() => {
                  resetData();
                  setShowReset(false);
                }}
                className={`flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white ${lang === 'th' ? 'font-thai' : ''}`}
              >
                {t('yes')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminStats({
  tickets,
  t,
  lang,
}: {
  tickets: RepairTicket[];
  t: (key: string, params?: Record<string, string | number>) => string;
  lang: string;
}) {
  const active = getActiveTickets(tickets);
  const queued = active.filter(
    (tk) => tk.status === 'queued' || tk.status === 'waiting',
  ).length;
  const avgWait =
    active.length > 0 ? Math.round(active.length * 0.8 * 10) / 10 : 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const completedToday = tickets.filter(
    (tk) => tk.status === 'completed' && tk.reportedAt >= today.getTime() - 1000 * 60 * 60 * 24,
  ).length;

  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="rounded-xl border border-neutral-200 bg-white p-3 text-center shadow-sm">
        <Users size={16} className="mx-auto mb-1 text-primary-600" />
        <p className="text-xl font-extrabold text-neutral-800">{queued}</p>
        <p className={`mt-0.5 text-[10px] font-medium text-neutral-400 ${lang === 'th' ? 'font-thai' : ''}`}>
          {t('totalQueued')}
        </p>
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-3 text-center shadow-sm">
        <Clock size={16} className="mx-auto mb-1 text-info-600" />
        <p className="text-xl font-extrabold text-neutral-800">{avgWait}</p>
        <p className={`mt-0.5 text-[10px] font-medium text-neutral-400 ${lang === 'th' ? 'font-thai' : ''}`}>
          {t('avgWait')}
        </p>
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-3 text-center shadow-sm">
        <CheckCircle size={16} className="mx-auto mb-1 text-accent-600" />
        <p className="text-xl font-extrabold text-neutral-800">{completedToday}</p>
        <p className={`mt-0.5 text-[10px] font-medium text-neutral-400 ${lang === 'th' ? 'font-thai' : ''}`}>
          {t('completedToday')}
        </p>
      </div>
    </div>
  );
}

interface AdminTicketRowProps {
  ticket: RepairTicket;
  index: number;
  activeCount: number;
  confirmComplete: string | null;
  setConfirmComplete: (id: string | null) => void;
  onComplete: (id: string) => void;
  onClose: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onAssign: (id: string, techId: string) => void;
  onStart: (id: string) => void;
}

function AdminTicketRow({
  ticket,
  index,
  activeCount,
  confirmComplete,
  setConfirmComplete,
  onComplete,
  onClose,
  onMove,
  onAssign,
  onStart,
}: AdminTicketRowProps) {
  const { tickets, t, lang } = useApp();
  const position = getQueuePosition(ticket, tickets);
  const isActive =
    ticket.status === 'in_progress' ||
    ticket.status === 'queued' ||
    ticket.status === 'waiting';
  const tech = ticket.technicianId ? TECHNICIAN_MAP[ticket.technicianId] : null;

  const handleComplete = () => {
    if (confirmComplete === ticket.id) {
      onComplete(ticket.id);
      setConfirmComplete(null);
    } else {
      setConfirmComplete(ticket.id);
    }
  };

  const issueLabelKey = `issue${ticket.issueType.charAt(0).toUpperCase() + ticket.issueType.slice(1).replace(/_./g, (m) => m[1].toUpperCase())}`;

  return (
    <div
      className={`rounded-2xl border bg-white p-3.5 shadow-sm transition-all ${
        ticket.status === 'in_progress'
          ? 'border-info-200 ring-1 ring-info-100'
          : ticket.isYou
            ? 'border-primary-200'
            : 'border-neutral-200'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Drag handle + queue number */}
        {isActive ? (
          <div className="flex shrink-0 flex-col items-center gap-1">
            <GripVertical size={14} className="text-neutral-300" />
            <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-primary-50">
              <span className="text-[8px] font-semibold uppercase text-primary-500">Q</span>
              <span className="text-base font-extrabold leading-none text-primary-600">
                #{position}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-neutral-50">
            <span className="text-xl">{ISSUE_EMOJI[ticket.issueType]}</span>
          </div>
        )}

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-neutral-800">{ticket.room}</span>
            {ticket.isYou && (
              <span className="rounded bg-primary-400 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {t('yourTicket')}
              </span>
            )}
            <span className={`text-[11px] font-semibold text-neutral-400 ${lang === 'th' ? 'font-thai' : ''}`}>
              {t(STATUS_KEY[ticket.status])}
            </span>
          </div>

          <p className={`mt-0.5 text-sm text-neutral-600 ${lang === 'th' ? 'font-thai' : ''}`}>
            {ISSUE_EMOJI[ticket.issueType]} {t(issueLabelKey)}
          </p>

          <p className={`mt-0.5 text-[11px] text-neutral-400 ${lang === 'th' ? 'font-thai' : ''}`}>
            {formatTimeAgo(ticket.reportedAt, lang)}
            {tech && ` • ${tech.avatar} ${tech.name}`}
          </p>

          {/* Action buttons */}
          {isActive && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {/* Move up/down */}
              {ticket.status !== 'in_progress' && (
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => onMove(ticket.id, 'up')}
                    disabled={index === 0}
                    className="rounded-lg border border-neutral-200 p-1 text-neutral-400 transition-colors hover:bg-neutral-50 hover:text-neutral-700 disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => onMove(ticket.id, 'down')}
                    disabled={index >= activeCount - 1}
                    className="rounded-lg border border-neutral-200 p-1 text-neutral-400 transition-colors hover:bg-neutral-50 hover:text-neutral-700 disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
              )}

              {/* Assign technician */}
              {ticket.status !== 'in_progress' && (
                <select
                  value={ticket.technicianId ?? ''}
                  onChange={(e) => onAssign(ticket.id, e.target.value)}
                  className={`rounded-lg border border-neutral-200 bg-white px-2 py-1 text-[11px] font-medium text-neutral-600 outline-none focus:border-primary-400 ${lang === 'th' ? 'font-thai' : ''}`}
                >
                  <option value="">{t('assignTech')}</option>
                  {TECHNICIANS.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.avatar} {tech.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Start repair */}
              {ticket.status === 'queued' && ticket.technicianId && (
                <button
                  onClick={() => onStart(ticket.id)}
                  className={`flex items-center gap-1 rounded-lg bg-info-500 px-2 py-1 text-[11px] font-bold text-white transition-colors hover:bg-info-600 ${lang === 'th' ? 'font-thai' : ''}`}
                >
                  <Play size={12} fill="white" />
                  {t('startRepair')}
                </button>
              )}

              {/* Complete (for in_progress) */}
              {ticket.status === 'in_progress' && (
                <button
                  onClick={handleComplete}
                  className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition-colors ${
                    confirmComplete === ticket.id
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-accent-500 text-white hover:bg-accent-600'
                  } ${lang === 'th' ? 'font-thai' : ''}`}
                >
                  <Check size={12} strokeWidth={3} />
                  {confirmComplete === ticket.id ? t('confirmComplete') : t('complete')}
                </button>
              )}

              {/* Close ticket */}
              <button
                onClick={() => onClose(ticket.id)}
                className={`flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1 text-[11px] font-medium text-neutral-500 transition-colors hover:bg-neutral-50 ${lang === 'th' ? 'font-thai' : ''}`}
              >
                <X size={12} />
                {t('closeTicket')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
