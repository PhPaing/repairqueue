import type { Language } from '@/types';

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date as 'YYYY-MM-DD'. */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function isoFromTimestamp(ts: number): string {
  return toISODate(new Date(ts));
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function isValidISO(iso: unknown): iso is string {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(`${iso}T00:00:00`);
  return !Number.isNaN(d.getTime()) && toISODate(d) === iso;
}

/** DDMM part of a ticket id, e.g. '2026-10-18' -> '1810'. */
export function ddmm(iso: string): string {
  return `${iso.slice(8, 10)}${iso.slice(5, 7)}`;
}

export function cleanRoom(room: string): string {
  return room.replace(/[^A-Za-z0-9]/g, '');
}

/** Permanent ticket id: DDMM-ROOM-SEQ (e.g. 1810-1201-1). */
export function buildTicketId(repairDate: string, room: string, seq: number): string {
  return `${ddmm(repairDate)}-${cleanRoom(room)}-${seq}`;
}

/** Next free SEQ for a DDMM-ROOM prefix, given every ticket id ever issued. */
export function nextTicketSeq(repairDate: string, room: string, usedIds: string[]): number {
  const prefix = `${ddmm(repairDate)}-${cleanRoom(room)}-`;
  let max = 0;
  for (const id of usedIds) {
    if (id.startsWith(prefix)) {
      const n = parseInt(id.slice(prefix.length), 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return max + 1;
}

/** "Sat Oct 18" / "ส. 18 ต.ค." */
export function formatBookingDate(iso: string, lang: Language): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  if (lang === 'th') {
    return d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  const wd = d.toLocaleDateString('en-US', { weekday: 'short' });
  const mon = d.toLocaleDateString('en-US', { month: 'short' });
  return `${wd} ${mon} ${d.getDate()}`;
}
