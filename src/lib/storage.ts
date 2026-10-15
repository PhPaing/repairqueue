import type { CancelRecord, Language, LineNotification, RepairTicket } from '@/types';
import { INITIAL_TICKETS, LANG_KEY, STORAGE_KEY } from './constants';
import { buildTicketId, isoFromTimestamp, isValidISO, nextTicketSeq, todayISO } from './dates';
import { normalizeQueue } from './queue';

export interface StoredData {
  tickets: RepairTicket[];
  notifications: LineNotification[];
  cancelLog: CancelRecord[];
}

type LegacyTicket = Partial<RepairTicket> & { id: string; scheduledDate?: string | null };

/** Fill in fields added after v1 so existing saved data keeps working. */
export function normalizeTicket(raw: LegacyTicket): RepairTicket {
  const { scheduledDate: legacyDate, ...rest } = raw;
  return {
    ...(rest as RepairTicket),
    technicianId: raw.technicianId || null,
    title: raw.title ?? '',
    photos: Array.isArray(raw.photos) ? raw.photos : [],
    notes: Array.isArray(raw.notes) ? raw.notes : [],
    priority: raw.priority ?? 'normal',
    repairDate: isValidISO(raw.repairDate) ? raw.repairDate : isValidISO(legacyDate) ? legacyDate : '',
    ticketId: raw.ticketId ?? '',
    lineLog: Array.isArray(raw.lineLog) ? raw.lineLog : [],
    displayQ: typeof raw.displayQ === 'number' ? raw.displayQ : 0,
    history: Array.isArray(raw.history)
      ? raw.history.map((h) => ({
          ...h,
          // v2 stored date changes as 'scheduledDate'
          field: ((h.field as string) === 'scheduledDate' ? 'repairDate' : h.field) as typeof h.field,
        }))
      : [],
  };
}

const isDone = (tk: RepairTicket) => tk.status === 'completed' || tk.status === 'closed';

/**
 * Upgrade pre-date-based data: give every ticket a repairDate, a permanent ticketId
 * and a per-date Q. Tickets that already have them are left untouched.
 */
export function migrateTickets(list: RepairTicket[]): RepairTicket[] {
  const today = todayISO();
  const used = list.map((tk) => tk.ticketId).filter(Boolean);
  const out = list.map((tk) =>
    tk.repairDate ? tk : { ...tk, repairDate: isDone(tk) ? isoFromTimestamp(tk.reportedAt) : today },
  );

  // Per-date Q for tickets missing one (oldest queue position first, then booking time).
  const needQ = out
    .filter((tk) => !tk.displayQ)
    .sort((a, b) => (a.queueOrder || 999) - (b.queueOrder || 999) || a.reportedAt - b.reportedAt);
  const qMap = new Map<string, number>();
  const maxQ = new Map<string, number>();
  out.forEach((tk) => tk.displayQ && maxQ.set(tk.repairDate, Math.max(maxQ.get(tk.repairDate) ?? 0, tk.displayQ)));
  needQ.forEach((tk) => {
    const n = (maxQ.get(tk.repairDate) ?? 0) + 1;
    maxQ.set(tk.repairDate, n);
    qMap.set(tk.id, n);
  });

  const withIds = out.map((tk) => {
    let next = tk;
    if (qMap.has(tk.id)) next = { ...next, displayQ: qMap.get(tk.id)! };
    if (!next.ticketId) {
      const id = buildTicketId(next.repairDate, next.room, nextTicketSeq(next.repairDate, next.room, used));
      used.push(id);
      next = { ...next, ticketId: id };
    }
    return next;
  });
  return normalizeQueue(withIds);
}

export function parseStored(raw: string | null): StoredData | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredData>;
    if (parsed.tickets && Array.isArray(parsed.tickets)) {
      return {
        tickets: migrateTickets(parsed.tickets.map(normalizeTicket)),
        notifications: parsed.notifications ?? [],
        cancelLog: parsed.cancelLog ?? [],
      };
    }
  } catch {
    // ignore corrupt data
  }
  return null;
}

export function loadData(): StoredData {
  try {
    const stored = parseStored(localStorage.getItem(STORAGE_KEY));
    if (stored) return stored;
  } catch {
    // fall through to defaults
  }
  return { tickets: INITIAL_TICKETS, notifications: [], cancelLog: [] };
}

export function saveData(data: StoredData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

export function loadLang(): Language {
  try {
    const raw = localStorage.getItem(LANG_KEY);
    if (raw === 'en' || raw === 'th') return raw;
  } catch {
    // ignore
  }
  return 'th';
}

export function saveLang(lang: Language): void {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // ignore
  }
}

export function clearData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
