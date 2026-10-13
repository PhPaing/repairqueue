import { useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatTimeAgo } from '@/lib/queue';

export function LineNotificationToast() {
  const { notifications, t, lang } = useApp();
  const [first, ...rest] = notifications;

  useEffect(() => {
    if (notifications.length === 0) return;
    const timer = setTimeout(() => {
      // Notifications auto-dismiss after 5 seconds by being scrolled past
    }, 5000);
    return () => clearTimeout(timer);
  }, [notifications.length]);

  if (!first) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 px-2">
      <div className="animate-slide-up rounded-2xl border border-accent-200 bg-white p-3 shadow-lg">
        <div className="flex items-start gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-500 text-white">
            <MessageCircle size={18} fill="white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-accent-600">
                {t('lineBot')}
              </span>
              <span className="text-[10px] text-neutral-400">
                {formatTimeAgo(first.timestamp, lang)}
              </span>
            </div>
            <p className={`mt-0.5 text-sm leading-snug text-neutral-700 ${lang === 'th' ? 'font-thai' : ''}`}>
              {first.message}
            </p>
            <p className="mt-1 text-[11px] font-medium text-accent-500">
              {t('lineSent', { room: first.room })}
            </p>
          </div>
        </div>
      </div>
      {rest.length > 0 && (
        <p className="mt-1.5 text-center text-[10px] text-neutral-400">
          +{rest.length} more
        </p>
      )}
    </div>
  );
}

export function NotificationList() {
  const { notifications, t, lang } = useApp();

  if (notifications.length === 0) return null;

  return (
    <div className="space-y-2">
      {notifications.slice(0, 5).map((n) => (
        <div
          key={n.id}
          className="flex items-start gap-2.5 rounded-xl border border-accent-100 bg-accent-50 p-2.5"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-500 text-white">
            <MessageCircle size={14} fill="white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-xs leading-snug text-neutral-700 ${lang === 'th' ? 'font-thai' : ''}`}>
              {n.message}
            </p>
            <p className="mt-0.5 text-[10px] text-neutral-400">
              {t('lineSent', { room: n.room })} • {formatTimeAgo(n.timestamp, lang)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
