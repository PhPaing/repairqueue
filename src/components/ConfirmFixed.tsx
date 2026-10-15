import { useState } from 'react';
import { CheckCircle2, MessageCircle, X, XCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { TECHNICIAN_MAP } from '@/lib/constants';
import { formatBookingDate } from '@/lib/dates';
import { formatStamp, issueKey } from '@/lib/history';
import { SimulatedBadge } from './LineMessagePreview';
import { RejectFixedModal } from './TicketModals';
import type { RepairTicket } from '@/types';

/**
 * Resident step 2 of dual-confirm. The app is the source of truth: LINE only notifies,
 * the resident must answer here ("Yes, Fixed" or "No, Still Broken").
 */
export function ConfirmFixedCard({
  ticket,
  variant,
  onConfirmed,
}: {
  ticket: RepairTicket;
  variant: 'inline' | 'full';
  onConfirmed?: (ticket: RepairTicket) => void;
}) {
  const { t, lang, confirmFixed } = useApp();
  const [armed, setArmed] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const th = lang === 'th' ? 'font-thai' : '';
  const full = variant === 'full';

  const fixed = [...ticket.history].reverse().find((h) => h.field === 'status' && h.to === 'waiting_confirm');
  const line = [...ticket.lineLog].reverse().find((l) => l.type === 'markFixed');
  const tech = ticket.technicianId ? TECHNICIAN_MAP[ticket.technicianId] : null;
  const photos = fixed?.photos ?? [];

  const yes = () => {
    if (!armed) {
      setArmed(true);
      setTimeout(() => setArmed(false), 4000);
      return;
    }
    if (confirmFixed(ticket.id)) onConfirmed?.(ticket);
    setArmed(false);
  };

  return (
    <div className={full ? 'space-y-4' : 'space-y-2.5'}>
      <div className="rounded-2xl border border-accent-200 bg-accent-50 p-4">
        <h2 className={`flex items-start gap-2 font-extrabold leading-snug text-accent-800 ${full ? 'text-lg' : 'text-sm'} ${th}`}>
          <CheckCircle2 size={full ? 22 : 16} className="mt-0.5 shrink-0 text-accent-600" />
          {t('confirmHeader')}
        </h2>
        <p className={`mt-1.5 text-xs font-semibold text-neutral-600 ${th}`}>
          {ticket.room} · {ticket.ticketId} · {formatBookingDate(ticket.repairDate, lang)} - Q{ticket.displayQ} ·{' '}
          {t(issueKey(ticket.issueType))}
        </p>
      </div>

      {line && (
        <div className={`flex flex-wrap items-center gap-1.5 rounded-xl border border-accent-200 bg-white px-3 py-2 ${th}`}>
          <MessageCircle size={14} className="shrink-0 text-accent-500" fill="currentColor" />
          <span className="text-xs font-semibold text-neutral-700">{t('lineSentAt', { time: formatStamp(line.sentAt, lang) })}</span>
          {line.simulated && <SimulatedBadge />}
        </div>
      )}

      {photos.length > 0 && (
        <div>
          <p className={`mb-1.5 text-[11px] font-semibold text-neutral-500 ${th}`}>{t('fixedProof')}</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {photos.map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                className={`shrink-0 rounded-xl border border-neutral-200 object-cover ${full ? 'h-48 w-48' : 'h-20 w-20'}`}
              />
            ))}
          </div>
        </div>
      )}

      <div className={`grid grid-cols-2 gap-2 text-xs ${th}`}>
        <div className="rounded-xl bg-neutral-100 px-3 py-2">
          <p className="text-[10px] font-semibold text-neutral-400">{t('confirmTech')}</p>
          <p className="font-bold text-neutral-700">{tech ? `${tech.avatar} ${tech.name}` : '-'}</p>
        </div>
        <div className="rounded-xl bg-neutral-100 px-3 py-2">
          <p className="text-[10px] font-semibold text-neutral-400">{t('confirmTime')}</p>
          <p className="font-bold text-neutral-700">{formatStamp(fixed?.timestamp ?? Date.now(), lang)}</p>
        </div>
      </div>

      {fixed?.reason && <p className={`break-words rounded-xl bg-neutral-50 px-3 py-2 text-xs text-neutral-600 ${th}`}>{fixed.reason}</p>}

      <p className={`text-center text-[11px] text-neutral-400 ${th}`}>{t('confirmSourceOfTruth')}</p>

      <div className="grid grid-cols-1 gap-2.5">
        <button
          onClick={yes}
          className={`flex min-h-[56px] items-center justify-center gap-2 rounded-2xl px-4 py-3 text-base font-extrabold text-white shadow-sm transition-all active:scale-[0.98] ${
            armed ? 'bg-accent-700 ring-4 ring-accent-200' : 'bg-accent-500 hover:bg-accent-600'
          } ${th}`}
        >
          <CheckCircle2 size={20} />
          {armed ? t('confirmYesAgain') : t('confirmYesBtn')}
        </button>
        <button
          onClick={() => setRejecting(true)}
          className={`flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 py-3 text-base font-extrabold text-white shadow-sm transition-all hover:bg-red-600 active:scale-[0.98] ${th}`}
        >
          <XCircle size={20} />
          {t('confirmNoBtn')}
        </button>
      </div>

      {rejecting && <RejectFixedModal ticket={ticket} onClose={() => setRejecting(false)} />}
    </div>
  );
}

/**
 * Full-screen confirm card: appears on the resident view as soon as their ticket is
 * "Waiting Resident Confirm". "Decide later" closes it (the inline card on the ticket stays).
 */
export function ConfirmOverlay() {
  const { tickets, t, lang } = useApp();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [thanks, setThanks] = useState<RepairTicket | null>(null);
  const th = lang === 'th' ? 'font-thai' : '';

  const waiting = tickets.find((tk) => tk.isYou && tk.status === 'waiting_confirm' && !dismissed.includes(tk.id));
  if (!thanks && !waiting) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-neutral-50">
      <div className="mx-auto flex min-h-full max-w-md flex-col px-4 py-5">
        {thanks ? (
          <div className="my-auto text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent-100">
              <CheckCircle2 size={44} className="text-accent-600" />
            </div>
            <h2 className={`mt-4 text-2xl font-extrabold text-neutral-800 ${th}`}>{t('thanksTitle')}</h2>
            <p className={`mt-2 text-sm leading-relaxed text-neutral-600 ${th}`}>
              {t('thanksBody', { id: thanks.ticketId, type: t(issueKey(thanks.issueType)) })}
            </p>
            <p className={`mt-3 inline-flex items-center gap-1.5 text-xs text-neutral-500 ${th}`}>
              <MessageCircle size={13} className="text-accent-500" fill="currentColor" />
              {t('thanksLine')}
              <SimulatedBadge />
            </p>
            <button
              onClick={() => setThanks(null)}
              className={`mt-6 w-full rounded-2xl bg-neutral-800 py-3.5 text-sm font-bold text-white transition-all hover:bg-neutral-700 active:scale-[0.98] ${th}`}
            >
              {t('lineDone')}
            </button>
          </div>
        ) : (
          waiting && (
            <>
              <div className="mb-3 flex justify-end">
                <button
                  onClick={() => setDismissed((d) => [...d, waiting.id])}
                  className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-neutral-500 hover:bg-neutral-100 ${th}`}
                >
                  {t('decideLater')}
                  <X size={14} />
                </button>
              </div>
              <ConfirmFixedCard ticket={waiting} variant="full" onConfirmed={setThanks} />
            </>
          )
        )}
      </div>
    </div>
  );
}
