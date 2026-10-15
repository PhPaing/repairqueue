import { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Check,
  X,
  AlertTriangle,
  Play,
  RotateCcw,
  GripVertical,
  MessageCircle,
  Clock,
  CheckCircle,
  Users,
  Pencil,
  CalendarDays,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { TECHNICIANS, TECHNICIAN_MAP, ISSUE_EMOJI } from '@/lib/constants';
import {
  formatTimeAgo,
  getActiveTickets,
  getOpenDates,
  getQueueForDate,
  getQueuePosition,
  isOpenTicket,
  inQueue,
} from '@/lib/queue';
import { formatBookingDate, todayISO } from '@/lib/dates';
import { MarkFixedModal, CloseTicketModal } from './AdminModals';
import type { RepairTicket } from '@/types';
import { NotificationList } from './LineNotification';
import { LineLogPanel, SimulatedBadge } from './LineMessagePreview';
import { NoteHistory, UrgentBanner } from './TicketActions';
import { AdminCoreEditModal } from './AdminCoreEditModal';
import { formatStamp, priorityLabel } from '@/lib/history';

const STATUS_KEY: Record<string, string> = {
  in_progress: 'statusInProgress',
  waiting_confirm: 'statusWaitingConfirm',
  assigned: 'statusAssigned',
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
    moveTicket,
    reorderTickets,
    assignTechnician,
    startRepair,
    resetData,
    notifications,
    cancelLog,
    setViewAsRoom,
  } = useApp();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [roomFilter, setRoomFilter] = useState('all');
  const [fixedId, setFixedId] = useState<string | null>(null);
  const [closeId, setCloseId] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Admin works one repair date at a time - Oct 14's queue never mixes with Oct 18's.
  const today = todayISO();
  const openDates = getOpenDates(tickets);
  const dates = [...new Set([...openDates, today])].sort();
  const defaultDate = openDates.length === 0 || openDates.includes(today) ? today : (openDates.find((d) => d >= today) ?? openDates[0]);
  const date = selectedDate ?? defaultDate;
  const queue = getQueueForDate(tickets, date);
  const waitingConfirm = tickets.filter((tk) => tk.repairDate === date && tk.status === 'waiting_confirm');
  const done = tickets.filter((tk) => tk.repairDate === date && (tk.status === 'completed' || tk.status === 'closed'));
  // Admin sees every room; the dropdown only narrows the list (queue positions stay global).
  const ordered = [...queue, ...waitingConfirm, ...done].filter((tk) => roomFilter === 'all' || tk.room === roomFilter);
  const roomOptions = [...new Set(tickets.map((tk) => tk.room))].sort();
  const countFor = (d: string) => tickets.filter((tk) => tk.repairDate === d && isOpenTicket(tk)).length;
  const fixedTicket = tickets.find((tk) => tk.id === fixedId);
  const closeTicketRow = tickets.find((tk) => tk.id === closeId);

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

      {/* LINE notification log (resident confirmed / not fixed arrive here) */}
      <LineLogPanel />

      {/* LINE queue-move notifications */}
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

      {/* Cancellations made by residents (with reasons) */}
      {cancelLog.length > 0 && (
        <div className="mb-4">
          <p className={`mb-2 text-xs font-semibold text-neutral-500 ${lang === 'th' ? 'font-thai' : ''}`}>
            {t('adminCancelledTitle')} ({cancelLog.length})
          </p>
          <div className="space-y-2">
            {cancelLog.slice(0, 5).map((c) => (
              <div key={c.id} className="rounded-xl border border-red-100 bg-red-50 p-2.5">
                <p className="text-xs font-bold text-neutral-700">
                  {c.room} · {c.ticketId ?? ''} · Q{c.queueNumber} · {ISSUE_EMOJI[c.issueType]}
                  <span className="ml-1 font-medium text-neutral-400">{formatTimeAgo(c.timestamp, lang)}</span>
                </p>
                <p className={`mt-0.5 break-words text-xs text-neutral-600 ${lang === 'th' ? 'font-thai' : ''}`}>
                  {t('cancelledReasonLabel')}: {c.reason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Room filter + resident preview */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className={`text-xs font-semibold text-neutral-500 ${lang === 'th' ? 'font-thai' : ''}`}>{t('filterByRoom')}</label>
        <select
          value={roomFilter}
          onChange={(e) => setRoomFilter(e.target.value)}
          className="rounded-xl border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-700 outline-none focus:border-primary-400"
        >
          <option value="all">{t('allRooms')}</option>
          {roomOptions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        {roomFilter !== 'all' && (
          <button
            onClick={() => {
              setViewAsRoom(roomFilter);
              window.history.pushState(null, '', '/');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className={`rounded-xl bg-neutral-800 px-3 py-1.5 text-xs font-bold text-white ${lang === 'th' ? 'font-thai' : ''}`}
          >
            {t('viewAsResident')}: {roomFilter}
          </button>
        )}
      </div>

      {/* Repair-date filter: one queue per date */}
      <div className="mb-3">
        <p className={`mb-1.5 text-xs font-semibold text-neutral-500 ${lang === 'th' ? 'font-thai' : ''}`}>
          {t('queueForDate')} {formatBookingDate(date, lang)}
        </p>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {dates.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDate(d)}
              className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors ${
                d === date
                  ? 'border-primary-400 bg-primary-400 text-white'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
              } ${lang === 'th' ? 'font-thai' : ''}`}
            >
              {formatBookingDate(d, lang)}
              <span className={`ml-1 ${d === date ? 'text-white/80' : 'text-neutral-400'}`}>({countFor(d)})</span>
            </button>
          ))}
          <input
            type="date"
            aria-label={t('pickDate')}
            value={date}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="shrink-0 rounded-xl border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-600 outline-none focus:border-primary-400"
          />
        </div>
      </div>

      {/* Queue reorder hint */}
      <p className={`mb-2 text-xs font-medium text-neutral-400 ${lang === 'th' ? 'font-thai' : ''}`}>
        {t('dragToReorder')} · {t('dragHint')}
      </p>

      {/* Ticket list */}
      <div className="space-y-2.5">
        {ordered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-white py-12">
            <span className="text-4xl">🎉</span>
            <p className={`mt-3 text-lg font-bold text-neutral-700 ${lang === 'th' ? 'font-thai' : ''}`}>
              {t('noTicketsForDate')}
            </p>
          </div>
        ) : (
          ordered.map((ticket, idx) => (
            <AdminTicketRow
              key={ticket.id}
              ticket={ticket}
              index={idx}
              activeCount={queue.length}
              onMarkFixed={setFixedId}
              onClose={setCloseId}
              onMove={moveTicket}
              onAssign={assignTechnician}
              onStart={startRepair}
              onReorder={reorderTickets}
              dragId={dragId}
              setDragId={setDragId}
              onEditCore={setEditingId}
            />
          ))
        )}
      </div>

      {fixedTicket && <MarkFixedModal ticket={fixedTicket} onClose={() => setFixedId(null)} />}
      {closeTicketRow && <CloseTicketModal ticket={closeTicketRow} onClose={() => setCloseId(null)} />}
      {editingId && <AdminCoreEditModal ticketId={editingId} onClose={() => setEditingId(null)} />}

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
  onMarkFixed: (id: string) => void;
  onClose: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onAssign: (id: string, techId: string) => void;
  onStart: (id: string) => void;
  onReorder: (sourceId: string, targetId: string) => void;
  dragId: string | null;
  setDragId: (id: string | null) => void;
  onEditCore: (id: string) => void;
}

function AdminTicketRow({
  ticket,
  index,
  activeCount,
  onMarkFixed,
  onClose,
  onMove,
  onAssign,
  onStart,
  onReorder,
  dragId,
  setDragId,
  onEditCore,
}: AdminTicketRowProps) {
  const { tickets, t, lang } = useApp();
  const [isOver, setIsOver] = useState(false);
  const position = getQueuePosition(ticket, tickets);
  const isActive = inQueue(ticket);
  const isOpen = isOpenTicket(ticket);
  const awaitingResident = ticket.status === 'waiting_confirm';
  const sentLine = [...ticket.lineLog].reverse().find((l) => l.type === 'markFixed');
  // Latest "still broken" answer from the resident (shown until juristic marks it fixed again).
  const lastEntry = ticket.history[ticket.history.length - 1];
  const rejected =
    ticket.status === 'in_progress' && lastEntry?.by === 'resident' && lastEntry.to === 'in_progress' ? lastEntry : null;
  const tech = ticket.technicianId ? TECHNICIAN_MAP[ticket.technicianId] : null;

  // Drag & drop reorder (desktop). The in-progress repair stays pinned at the top.
  const canDrag = isActive && ticket.status !== 'in_progress';
  const dragging = dragId !== null && dragId !== ticket.id;

  const issueLabelKey = `issue${ticket.issueType.charAt(0).toUpperCase() + ticket.issueType.slice(1).replace(/_./g, (m) => m[1].toUpperCase())}`;

  return (
    <div
      draggable={canDrag}
      onDragStart={(e) => {
        if (!canDrag) return;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', ticket.id);
        setDragId(ticket.id);
      }}
      onDragEnd={() => {
        setDragId(null);
        setIsOver(false);
      }}
      onDragOver={(e) => {
        if (canDrag && dragging) {
          e.preventDefault();
          setIsOver(true);
        }
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        if (canDrag && dragId && dragId !== ticket.id) onReorder(dragId, ticket.id);
        setDragId(null);
      }}
      className={`rounded-2xl border bg-white p-3.5 shadow-sm transition-all ${
        isOver ? 'ring-2 ring-primary-300' : ''
      } ${dragId === ticket.id ? 'opacity-50' : ''} ${
        ticket.status === 'in_progress'
          ? 'border-info-200 ring-1 ring-info-100'
          : ticket.isYou
            ? 'border-primary-200'
            : 'border-neutral-200'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Drag handle + queue number */}
        {isOpen ? (
          <div className="flex shrink-0 flex-col items-center gap-1">
            <GripVertical
              size={14}
              className={canDrag ? 'cursor-grab text-neutral-400' : 'text-neutral-200'}
              aria-hidden
            />
            <div className="flex h-11 w-11 flex-col items-center justify-center rounded-lg bg-primary-50">
              <span className="text-base font-extrabold leading-none text-primary-600">Q{ticket.displayQ}</span>
              <span className="mt-0.5 text-[8px] font-semibold text-primary-500">
                {position > 0 ? `${t('positionShort')} #${position}` : '✓?'}
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
            <span className="text-[10px] font-medium text-neutral-400">{ticket.ticketId}</span>
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

          {(ticket.priority !== 'normal' || ticket.repairDate) && (
            <p className={`mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold ${lang === 'th' ? 'font-thai' : ''}`}>
              {ticket.priority !== 'normal' && (
                <span className={`rounded-md px-1.5 py-0.5 ${ticket.priority === 'urgent' ? 'bg-red-100 text-red-600' : 'bg-primary-100 text-primary-700'}`}>
                  {priorityLabel(ticket.priority, lang)}
                </span>
              )}
              <span className="flex items-center gap-1 text-neutral-500">
                <CalendarDays size={11} />
                {formatBookingDate(ticket.repairDate, lang)}
              </span>
            </p>
          )}
          <UrgentBanner ticket={ticket} />
          {rejected && (
            <div className={`mt-2 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 ${lang === 'th' ? 'font-thai' : ''}`}>
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-500" />
              <div className="text-xs leading-snug text-red-700">
                <p className="font-bold">{t('residentRejected')}</p>
                {rejected.reason && <p className="break-words">{rejected.reason}</p>}
                {rejected.photos && rejected.photos.length > 0 && (
                  <div className="mt-1.5 flex gap-1.5 overflow-x-auto scrollbar-hide">
                    {rejected.photos.map((src, i) => (
                      <img key={i} src={src} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-red-200 object-cover" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {awaitingResident && (
            <div className={`mt-2 rounded-xl bg-accent-50 px-3 py-2 text-xs font-semibold text-accent-700 ${lang === 'th' ? 'font-thai' : ''}`}>
              <p>{t('waitingConfirmAdmin')}</p>
              {sentLine && (
                <p className="mt-1 flex flex-wrap items-center gap-1.5 font-medium text-accent-600">
                  {t('lineSentAt', { time: formatStamp(sentLine.sentAt, lang) })}
                  {sentLine.simulated && <SimulatedBadge />}
                </p>
              )}
            </div>
          )}
          {ticket.title && (
            <p className={`mt-1 text-sm font-semibold text-neutral-800 ${lang === 'th' ? 'font-thai' : ''}`}>
              {ticket.title}
            </p>
          )}
          {ticket.description && (
            <p className={`mt-0.5 break-words text-xs text-neutral-500 ${lang === 'th' ? 'font-thai' : ''}`}>
              {ticket.description}
            </p>
          )}
          {ticket.photos.length > 0 && (
            <div className="mt-1.5 flex gap-1.5 overflow-x-auto scrollbar-hide">
              {ticket.photos.map((src, i) => (
                <img key={i} src={src} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-neutral-200 object-cover" />
              ))}
            </div>
          )}
          <NoteHistory ticket={ticket} />

          {/* Action buttons */}
          {isOpen && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {/* Move up/down */}
              {isActive && ticket.status !== 'in_progress' && (
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
              {isActive && ticket.status !== 'in_progress' && (
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

              {/* Step 1 of dual-confirm: no direct Complete - juristic marks it fixed with a photo */}
              {(ticket.status === 'in_progress' || ticket.status === 'assigned') && (
                <button
                  onClick={() => onMarkFixed(ticket.id)}
                  className={`flex items-center gap-1 rounded-lg bg-accent-500 px-2 py-1 text-[11px] font-bold text-white transition-colors hover:bg-accent-600 ${lang === 'th' ? 'font-thai' : ''}`}
                >
                  <Check size={12} strokeWidth={3} />
                  {t('markFixedBtn')}
                </button>
              )}

              {/* Edit core fields (audit-logged) */}
              <button
                onClick={() => onEditCore(ticket.id)}
                className={`flex items-center gap-1 rounded-lg border border-primary-200 bg-primary-50 px-2 py-1 text-[11px] font-semibold text-primary-700 transition-colors hover:bg-primary-100 ${lang === 'th' ? 'font-thai' : ''}`}
              >
                <Pencil size={12} />
                {t('adminEditCore')}
              </button>

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
