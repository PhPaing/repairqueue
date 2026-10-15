import type { Language, LineNotification, RepairTicket, RepairStats } from '@/types';
import { t } from './i18n';

/** Statuses that occupy a slot in a date's queue. */
const QUEUE_STATUSES = new Set(['in_progress', 'assigned', 'queued', 'waiting']);
/** Statuses that still count as an open (not finished) ticket. */
const OPEN_STATUSES = new Set(['in_progress', 'assigned', 'queued', 'waiting', 'waiting_confirm']);

export const inQueue = (tk: RepairTicket) => QUEUE_STATUSES.has(tk.status);
export const isOpenTicket = (tk: RepairTicket) => OPEN_STATUSES.has(tk.status);

const byOrder = (a: RepairTicket, b: RepairTicket) =>
  a.queueOrder - b.queueOrder || a.displayQ - b.displayQ || a.reportedAt - b.reportedAt;

/** Queue for ONE repair date, sorted by position. */
export function getQueueForDate(tickets: RepairTicket[], date: string): RepairTicket[] {
  return tickets.filter((tk) => inQueue(tk) && tk.repairDate === date).sort(byOrder);
}

/** Every queued ticket, grouped by date then position (compat helper). */
export function getActiveTickets(tickets: RepairTicket[]): RepairTicket[] {
  return tickets
    .filter(inQueue)
    .sort((a, b) => a.repairDate.localeCompare(b.repairDate) || byOrder(a, b));
}

/** Dates that have at least one open ticket, ascending. */
export function getOpenDates(tickets: RepairTicket[]): string[] {
  return [...new Set(tickets.filter(isOpenTicket).map((tk) => tk.repairDate))].sort();
}

/**
 * Re-index positions (1..n) inside each repair date. Non-queue tickets get 0.
 * Pure: returns new objects only where something changed.
 */
export function normalizeQueue(tickets: RepairTicket[]): RepairTicket[] {
  const dates = new Set(tickets.filter(inQueue).map((tk) => tk.repairDate));
  const pos = new Map<string, number>();
  dates.forEach((d) => getQueueForDate(tickets, d).forEach((tk, i) => pos.set(tk.id, i + 1)));
  return tickets.map((tk) => {
    const want = pos.get(tk.id) ?? 0;
    return tk.queueOrder === want ? tk : { ...tk, queueOrder: want };
  });
}

/** Kept for older call sites. */
export function recalcQueueOrder(tickets: RepairTicket[]): RepairTicket[] {
  return normalizeQueue(tickets);
}

/** Position inside the ticket's own repair date (0 when not queued). */
export function getQueuePosition(ticket: RepairTicket, tickets: RepairTicket[]): number {
  if (!inQueue(ticket)) return 0;
  return getQueueForDate(tickets, ticket.repairDate).findIndex((tk) => tk.id === ticket.id) + 1;
}

/** Next Q label for a repair date = highest Q already booked on that date + 1. */
export function nextDisplayQ(tickets: RepairTicket[], date: string): number {
  return tickets.filter((tk) => tk.repairDate === date).reduce((m, tk) => Math.max(m, tk.displayQ), 0) + 1;
}

const normRoom = (r: string) => r.replace(/\s+/g, '').toUpperCase();

/** One active ticket per room per issue type. */
export function findActiveDuplicate(
  tickets: RepairTicket[],
  room: string,
  issueType: RepairTicket['issueType'],
): RepairTicket | undefined {
  return tickets.find(
    (tk) => isOpenTicket(tk) && tk.issueType === issueType && normRoom(tk.room) === normRoom(room),
  );
}

export function getCompletedToday(tickets: RepairTicket[]): number {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return tickets.filter(
    (tk) =>
      tk.status === 'completed' &&
      tk.reportedAt >= startOfDay.getTime() - 1000 * 60 * 60 * 24,
  ).length;
}

export function getEstimatedTime(queuePosition: number, lang: Language): string {
  if (queuePosition <= 0) return '';
  if (queuePosition === 1) return t(lang, 'today');
  if (queuePosition === 2) return t(lang, 'tomorrow');
  const days = Math.max(1, Math.round(queuePosition * 0.8));
  return t(lang, 'inXDays', { n: days });
}

export function getPeopleAhead(queuePosition: number): number {
  return Math.max(0, queuePosition - 1);
}

export function computeStats(tickets: RepairTicket[]): RepairStats {
  const active = getActiveTickets(tickets);
  const queued = active.filter((tk) => tk.status === 'queued' || tk.status === 'waiting' || tk.status === 'assigned').length;
  const avgWait = active.length > 0 ? Math.round((active.length * 0.8) * 10) / 10 : 0;
  const completedToday = getCompletedToday(tickets);
  return {
    totalQueued: queued,
    avgWaitDays: avgWait,
    completedToday,
  };
}

export function makeLineNotification(
  room: string,
  queueNumber: number,
  lang: Language,
): LineNotification {
  const msg =
    queueNumber === 1
      ? t(lang, 'lineMsgUp1', { n: queueNumber })
      : t(lang, 'lineMsgNext', { n: queueNumber });
  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    room,
    message: msg,
    messageTh: msg,
    timestamp: Date.now(),
    queueNumber,
  };
}

export function formatTimeAgo(timestamp: number, lang: Language): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return t(lang, 'justNow');
  if (minutes < 60) return t(lang, 'minutesAgo', { n: minutes });
  if (hours < 24) return t(lang, 'hoursAgo', { n: hours });
  return t(lang, 'daysAgo', { n: days });
}
