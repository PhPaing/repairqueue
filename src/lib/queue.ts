import type { Language, LineNotification, RepairTicket, RepairStats } from '@/types';
import { t } from './i18n';

const ACTIVE_STATUSES = new Set(['in_progress', 'assigned', 'queued', 'waiting']);

export function getActiveTickets(tickets: RepairTicket[]): RepairTicket[] {
  return tickets
    .filter((tk) => ACTIVE_STATUSES.has(tk.status))
    .sort((a, b) => a.queueOrder - b.queueOrder);
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

export function recalcQueueOrder(tickets: RepairTicket[]): RepairTicket[] {
  const active = getActiveTickets(tickets);
  active.forEach((tk, i) => {
    tk.queueOrder = i + 1;
  });
  return [...tickets];
}

export function getQueuePosition(ticket: RepairTicket, tickets: RepairTicket[]): number {
  const active = getActiveTickets(tickets);
  return active.findIndex((tk) => tk.id === ticket.id) + 1;
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
