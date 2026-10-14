import type { CancelRecord, Language, LineNotification, RepairTicket } from '@/types';
import { INITIAL_TICKETS, LANG_KEY, STORAGE_KEY } from './constants';

export interface StoredData {
  tickets: RepairTicket[];
  notifications: LineNotification[];
  cancelLog: CancelRecord[];
}

/** Fill in fields added after v1 so existing saved data keeps working. */
export function normalizeTicket(raw: Partial<RepairTicket> & { id: string }): RepairTicket {
  return {
    ...(raw as RepairTicket),
    technicianId: raw.technicianId || null,
    title: raw.title ?? '',
    photos: Array.isArray(raw.photos) ? raw.photos : [],
    notes: Array.isArray(raw.notes) ? raw.notes : [],
    priority: raw.priority ?? 'normal',
    scheduledDate: raw.scheduledDate ?? null,
    history: Array.isArray(raw.history) ? raw.history : [],
  };
}

export function parseStored(raw: string | null): StoredData | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredData>;
    if (parsed.tickets && Array.isArray(parsed.tickets)) {
      return {
        tickets: parsed.tickets.map(normalizeTicket),
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
