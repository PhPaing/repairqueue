import { useState } from 'react';
import { DoorOpen } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { roomFromUrl } from '@/lib/session';
import LanguageToggle from './LanguageToggle';

/** Full-screen first-run screen: this phone is bound to one room. */
export function RoomLogin() {
  const { loginRoom, t, lang } = useApp();
  const [room, setRoom] = useState(roomFromUrl); // ?room=1201 from the LINE group link
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const th = lang === 'th' ? 'font-thai' : '';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginRoom(room, pin)) return;
    setError(/^\d{4}$/.test(pin) && room.trim() ? t('roomWrongPin') : t('roomInvalid'));
  };

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-neutral-50">
      <div className="mx-auto flex min-h-full max-w-sm flex-col justify-center px-5 py-8">
        <div className="mb-4 flex justify-end"><LanguageToggle /></div>
        <form onSubmit={submit} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-400 text-white">
            <DoorOpen size={24} />
          </div>
          <h1 className={`mb-4 text-center text-xl font-extrabold text-neutral-800 ${th}`}>{t('roomWelcome')}</h1>

          <label className={`mb-1 block text-xs font-semibold text-neutral-600 ${th}`}>{t('roomNumberLabel')} *</label>
          <input
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder={t('roomPlaceholder')}
            autoCapitalize="characters"
            className="mb-3 w-full rounded-xl border border-neutral-200 px-3 py-3 text-base outline-none focus:border-primary-400"
          />

          <label className={`mb-1 block text-xs font-semibold text-neutral-600 ${th}`}>{t('pinLabel')} *</label>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            type="password"
            placeholder="••••"
            className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base tracking-widest outline-none focus:border-primary-400"
          />
          <p className={`mb-4 mt-1.5 text-[11px] text-neutral-400 ${th}`}>{t('pinHintNew')}</p>

          {error && <p className={`mb-3 text-xs font-semibold text-red-600 ${th}`} role="alert">{error}</p>}

          <button type="submit" className={`w-full rounded-2xl bg-neutral-800 py-3.5 text-sm font-bold text-white active:scale-[0.98] ${th}`}>
            {t('roomEnter')}
          </button>
        </form>
      </div>
    </div>
  );
}
