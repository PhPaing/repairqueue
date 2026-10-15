import { useState } from 'react';
import { Settings } from 'lucide-react';
import { useApp } from '@/context/AppContext';

/** "Room 1201 | Change in Settings" + the PIN-protected change-room dialog. */
export function RoomBar() {
  const { myRoom, viewAsRoom, setViewAsRoom, logoutRoom, t, lang } = useApp();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const th = lang === 'th' ? 'font-thai' : '';

  if (viewAsRoom) {
    return (
      <button
        onClick={() => {
          setViewAsRoom('');
          window.history.pushState(null, '', '/#admin');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }}
        className={`mb-3 w-full rounded-xl bg-neutral-800 px-3 py-2 text-xs font-bold text-white ${th}`}>
        {t('viewingAs', { room: viewAsRoom })}
      </button>
    );
  }

  const close = () => { setOpen(false); setPin(''); setError(false); };

  return (
    <>
      <div className={`mb-3 flex items-center justify-between text-xs text-neutral-500 ${th}`}>
        <span>{t('roomBar', { room: myRoom })} | {t('changeInSettings')}</span>
        <button onClick={() => setOpen(true)} aria-label={t('settings')} className="rounded-lg border border-neutral-200 bg-white p-1.5">
          <Settings size={14} />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={close}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className={`mb-1 text-base font-bold text-neutral-800 ${th}`}>{t('settings')}</h3>
            <p className={`mb-3 text-sm text-neutral-600 ${th}`}>{t('currentRoom', { room: myRoom })}</p>
            <input
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(false); }}
              inputMode="numeric"
              type="password"
              placeholder={t('enterPinToChange')}
              className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base outline-none focus:border-primary-400"
            />
            {error && <p className={`mt-1.5 text-xs font-semibold text-red-600 ${th}`}>{t('roomWrongPin')}</p>}
            <button
              onClick={() => (logoutRoom(pin) ? close() : setError(true))}
              className={`mt-3 w-full rounded-2xl bg-neutral-800 py-3 text-sm font-bold text-white ${th}`}
            >
              {t('logoutChange')}
            </button>
            <button onClick={close} className={`mt-2 w-full py-2 text-xs font-semibold text-neutral-500 ${th}`}>{t('settingsClose')}</button>
          </div>
        </div>
      )}
    </>
  );
}
