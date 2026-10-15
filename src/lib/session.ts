/** Device-level resident identity: which room this phone belongs to. */
export const ROOM_KEY = 'myRoom';
export const PIN_KEY = 'myPin';
export const DEVICE_KEY = 'deviceId';

export const normalizeRoom = (r: string) => r.trim().toUpperCase();
export const isValidPin = (p: string) => /^\d{4}$/.test(p);

const read = (k: string) => {
  try {
    return localStorage.getItem(k) ?? '';
  } catch {
    return '';
  }
};
const write = (k: string, v: string) => {
  try {
    if (v) localStorage.setItem(k, v);
    else localStorage.removeItem(k);
  } catch {
    /* private mode: session works for this visit only */
  }
};

export const loadRoom = () => normalizeRoom(read(ROOM_KEY));
export const loadPin = () => read(PIN_KEY);

export function saveSession(room: string, pin: string) {
  write(ROOM_KEY, room);
  write(PIN_KEY, pin);
  if (!read(DEVICE_KEY)) write(DEVICE_KEY, `dev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
}

export const clearRoom = () => write(ROOM_KEY, '');

/** ?room=1201 from the LINE group link (empty when absent). */
export const roomFromUrl = () => normalizeRoom(new URLSearchParams(window.location.search).get('room') ?? '');

/** Drop ?room= from the address bar after login; myRoom stays saved. */
export function clearRoomParam() {
  const u = new URL(window.location.href);
  if (!u.searchParams.has('room')) return;
  u.searchParams.delete('room');
  window.history.replaceState(null, '', u.pathname + u.search + u.hash);
}
