import { useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';

/** Top-of-screen toast (e.g. "LINE simulated"). Auto-dismisses after a few seconds. */
export function ToastHost() {
  const { toast, dismissToast, lang } = useApp();

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(dismissToast, 4500);
    return () => clearTimeout(id);
  }, [toast, dismissToast]);

  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed left-1/2 top-3 z-[70] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2" role="status">
      <div
        key={toast.id}
        onClick={dismissToast}
        className="pointer-events-auto animate-slide-up flex items-start gap-2.5 rounded-2xl border border-accent-200 bg-white p-3 shadow-lg"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-500 text-white">
          <MessageCircle size={16} fill="white" />
        </span>
        <div className={`min-w-0 ${lang === 'th' ? 'font-thai' : ''}`}>
          <p className="break-words text-sm font-bold leading-snug text-neutral-800">{toast.text}</p>
          {toast.sub && <p className="mt-0.5 text-[11px] text-neutral-500">{toast.sub}</p>}
        </div>
      </div>
    </div>
  );
}
