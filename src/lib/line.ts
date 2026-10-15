import type { IssueType, LineLogEntry, LineMessageType, RepairTicket } from '@/types';
import { APP_HOST, LINE_CHANNEL_ACCESS_TOKEN } from './constants';
import { t } from './i18n';

/** Demo mode: no real token configured, so every push is simulated. */
export const LINE_SIMULATED = !LINE_CHANNEL_ACCESS_TOKEN;

/** Placeholder replaced by the fixed-work thumbnail in the preview (and by a hosted photo URL in real pushes). */
export const PHOTO_LINK = '[link]';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' -> 'Oct 18' */
export function shortDate(iso: string): string {
  const m = Number(iso.slice(5, 7));
  const d = Number(iso.slice(8, 10));
  return MONTHS[m - 1] ? `${MONTHS[m - 1]} ${d}` : iso;
}

/** timestamp -> 'Oct 14 13:30' (local time, 24h) */
export function shortDateTime(ts: number): string {
  const d = new Date(ts);
  return `${MONTHS[d.getMonth()]} ${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const ISSUE_KEY: Record<IssueType, string> = {
  air_con: 'issueAirCon',
  door_lock: 'issueDoorLock',
  water_pipe: 'issueWaterPipe',
  electric: 'issueElectric',
  plumbing: 'issuePlumbing',
  other: 'issueOther',
};

const issueName = (tk: RepairTicket) => t('en', ISSUE_KEY[tk.issueType]);
const where = (tk: RepairTicket) => `Room ${tk.room} - ${shortDate(tk.repairDate)} - Q${tk.displayQ}`;

/** Notification 1 - juristic marked it fixed (to resident). */
export function fixedMessage(tk: RepairTicket, techName: string, at: number): string {
  return [
    'ซ่อมเสร็จแล้ว - กรุณายืนยัน / Repair Fixed - Please Confirm',
    `ห้อง Room ${tk.room} - Q ${shortDate(tk.repairDate)} - Q${tk.displayQ}`,
    `ช่าง Technician: ${techName} fixed ${issueName(tk)}`,
    `เวลา Time: ${shortDateTime(at)}`,
    `รูป Photo: ${PHOTO_LINK}`,
    'กรุณายืนยันในแอปว่าเสร็จจริงไหม?',
    'Please confirm in app if really fixed?',
    `เปิดแอปเพื่อยืนยัน: ${APP_HOST}`,
    '[ ใช่ เสร็จแล้ว] [ ยังไม่เสร็จ]',
  ].join('\n');
}

/** Notification 2 - resident confirmed (to juristic). */
export function confirmedMessage(tk: RepairTicket, at: number): string {
  return [
    'ลูกบ้านยืนยันเสร็จแล้ว / Resident Confirmed Complete',
    `${where(tk)} ${issueName(tk)}`,
    `Resident confirmed: Fixed on ${shortDateTime(at)}`,
    'Status: Completed - Closed',
    `Ticket: ${tk.ticketId} closed, room can book new ${issueName(tk)} now`,
  ].join('\n');
}

/** Notification 3 - resident says not fixed (to juristic). */
export function rejectedMessage(tk: RepairTicket, reason: string, hasPhoto: boolean): string {
  return [
    'ลูกบ้านแจ้งยังไม่เสร็จ / Resident Reports Not Fixed',
    `${where(tk)} ${issueName(tk)}`,
    `Reason: ${reason.replace(/\s+/g, ' ').trim()}${hasPhoto ? ' + photo' : ''}`,
    'Action: Please check - Status back to In Progress',
    `App: ${APP_HOST}/admin`,
  ].join('\n');
}

const RECIPIENT: Record<LineMessageType, LineLogEntry['to']> = {
  markFixed: 'resident',
  residentConfirmed: 'juristic',
  residentRejected: 'juristic',
};

/**
 * "Push" a LINE message. Demo mode only records the log entry - nothing is sent.
 * Wire a server function here when a real CHANNEL_ACCESS_TOKEN is available.
 */
export function pushLine(type: LineMessageType, text: string, historyId?: string): LineLogEntry {
  return {
    id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    to: RECIPIENT[type],
    sent: true,
    sentAt: Date.now(),
    simulated: LINE_SIMULATED,
    text,
    historyId,
  };
}
