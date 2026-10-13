import type { Language, LineNotification, RepairTicket } from '@/types';
import { INITIAL_TICKETS, LANG_KEY, STORAGE_KEY } from './constants';

interface StoredData {
  tickets: RepairTicket[];
  notifications: LineNotification[];
}

export function loadData(): StoredData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredData;
      if (parsed.tickets && Array.isArray(parsed.tickets)) {
        return {
          tickets: parsed.tickets,
          notifications: parsed.notifications ?? [],
        };
      }
    }
  } catch {
    // fall through to defaults
  }
  return { tickets: INITIAL_TICKETS, notifications: [] };
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
