import { Fragment, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { LINE_SIMULATED, PHOTO_LINK } from '@/lib/line';
import { formatStamp } from '@/lib/history';
import { formatTimeAgo } from '@/lib/queue';
import type { LineLogEntry, LineMessageType, RepairTicket } from '@/types';

const TYPE_KEY: Record<LineMessageType, string> = {
  markFixed: 'lineTypeMarkFixed',
  residentConfirmed: 'lineTypeConfirmed',
  residentRejected: 'lineTypeRejected',
};

export const lineTypeKey = (type: LineMessageType) => TYPE_KEY[type];

/** Amber "Simulated" badge - shown wherever a LINE message was not really sent (demo mode). */
export function SimulatedBadge({ className = '' }: { className?: string }) {
  const { t } = useApp();
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 ${className}`}
    >
      {t('simulated')}
    </span>
  );
}

const photosFor = (ticket: RepairTicket, log: LineLogEntry): string[] =>
  ticket.history.find((h) => h.id === log.historyId)?.photos ?? [];

function Thumbs({ photos }: { photos: string[] }) {
  if (photos.length === 0) return null;
  return (
    <span className="mt-1 flex gap-1.5 overflow-x-auto scrollbar-hide">
      {photos.map((src, i) => (
        <img key={i} src={src} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-neutral-200 object-cover" />
      ))}
    </span>
  );
}

/** A LINE-style chat bubble showing the exact message text, with the photo where "[link]" would be. */
export function LineMessagePreview({ log, ticket }: { log: LineLogEntry; ticket: RepairTicket }) {
  const { t, lang } = useApp();
  const photos = photosFor(ticket, log);
  const lines = log.text.split('\n');
  const toKey = log.to === 'resident' ? 'lineToResident' : 'lineToJuristic';

  return (
    <div className="rounded-2xl border border-accent-200 bg-accent-50 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-500 text-white">
          <MessageCircle size={13} fill="white" />
        </span>
        <span className="text-xs font-bold text-accent-700">{t('lineBot')}</span>
        <span className={`text-[11px] text-neutral-500 ${lang === 'th' ? 'font-thai' : ''}`}>{t(toKey)}</span>
        {log.simulated && <SimulatedBadge />}
        <span className="ml-auto text-[10px] text-neutral-400">{formatStamp(log.sentAt, lang)}</span>
      </div>

      <div className="rounded-2xl rounded-tl-sm bg-white px-3 py-2.5 shadow-sm">
        <div className="font-thai text-[13px] leading-relaxed text-neutral-800">
          {lines.map((line, i) => {
            if (line.includes(PHOTO_LINK)) {
              return (
                <div key={i}>
                  {line.replace(PHOTO_LINK, '').trim()}{' '}
                  {photos.length > 0 ? <Thumbs photos={photos} /> : <span className="text-info-600">{PHOTO_LINK}</span>}
                </div>
              );
            }
            const buttons = log.type === 'markFixed' ? [...line.matchAll(/\[([^\]]+)\]/g)] : [];
            if (buttons.length === 2 && line.trim().startsWith('[')) {
              // The two answer buttons. Display only - the resident must answer inside the app.
              return (
                <div key={i} className="mt-2 flex gap-2">
                  <span className="flex-1 rounded-lg border border-accent-300 bg-accent-50 px-2 py-1.5 text-center text-xs font-bold text-accent-700">
                    {buttons[0][1].trim()}
                  </span>
                  <span className="flex-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-center text-xs font-bold text-red-600">
                    {buttons[1][1].trim()}
                  </span>
                </div>
              );
            }
            return (
              <Fragment key={i}>
                <div className={i === 0 ? 'font-bold' : ''}>{line}</div>
                {log.type === 'residentRejected' && line.startsWith('Reason:') && <Thumbs photos={photos} />}
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Admin: latest LINE notifications across all tickets, newest first (tap to read the message). */
export function LineLogPanel() {
  const { tickets, t, lang } = useApp();
  const [openId, setOpenId] = useState<string | null>(null);
  const th = lang === 'th' ? 'font-thai' : '';

  const items = tickets
    .flatMap((tk) => tk.lineLog.map((l) => ({ l, tk })))
    .sort((a, b) => b.l.sentAt - a.l.sentAt)
    .slice(0, 6);

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-2">
        <MessageCircle size={14} className="text-accent-500" fill="currentColor" />
        <span className={`text-xs font-semibold text-neutral-500 ${th}`}>{t('lineLogTitle')}</span>
        {LINE_SIMULATED && <SimulatedBadge />}
      </div>
      {items.length === 0 ? (
        <p className={`rounded-xl bg-neutral-100 px-3 py-2 text-xs text-neutral-400 ${th}`}>{t('lineLogEmpty')}</p>
      ) : (
        <div className="space-y-2">
          {items.map(({ l, tk }) => (
            <div key={l.id} className="rounded-xl border border-accent-100 bg-white p-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-neutral-700">
                  {tk.room} · {tk.ticketId}
                </span>
                {l.simulated && <SimulatedBadge />}
                <span className="ml-auto text-[10px] text-neutral-400">{formatTimeAgo(l.sentAt, lang)}</span>
              </div>
              <p className={`mt-0.5 text-xs text-neutral-600 ${th}`}>
                {t(lineTypeKey(l.type))} · {t(l.to === 'resident' ? 'lineToResident' : 'lineToJuristic')}
              </p>
              <button
                onClick={() => setOpenId(openId === l.id ? null : l.id)}
                className={`mt-1 text-[11px] font-semibold text-primary-600 ${th}`}
              >
                {openId === l.id ? t('lineHideMessage') : t('lineShowMessage')}
              </button>
              {openId === l.id && (
                <div className="mt-2">
                  <LineMessagePreview log={l} ticket={tk} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
