import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import type { LineLogEntry, RepairTicket } from '@/types';
import { LINE_SIMULATED } from '@/lib/line';
import { LineMessagePreview, SimulatedBadge } from './LineMessagePreview';
import { PhotoPicker, Sheet, SheetHeader } from './TicketModals';

const field = (lang: string) =>
  `w-full resize-none rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-800 outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-100 ${
    lang === 'th' ? 'font-thai' : ''
  }`;

/** Step 1 of dual-confirm: juristic marks the work as fixed - a photo is mandatory. */
export function MarkFixedModal({ ticket, onClose }: { ticket: RepairTicket; onClose: () => void }) {
  const { markFixed, tickets, t, lang } = useApp();
  const [photos, setPhotos] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [simulate, setSimulate] = useState(false);
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState<LineLogEntry | null>(null);
  const missingPhoto = photos.length === 0;
  // In demo mode the "Simulate LINE push to resident" box must be ticked.
  const missingLine = LINE_SIMULATED && !simulate;
  const blocked = missingPhoto || missingLine;
  const th = lang === 'th' ? 'font-thai' : '';

  const save = () => {
    setTouched(true);
    if (blocked) return;
    const log = markFixed(ticket.id, photos, note, simulate);
    if (log) setSent(log);
  };

  // After sending: show the LINE message exactly as the resident receives it.
  if (sent) {
    const live = tickets.find((tk) => tk.id === ticket.id) ?? ticket;
    return (
      <Sheet onClose={onClose}>
        <SheetHeader title={`${t('linePreviewTitle')} · ${ticket.ticketId}`} onClose={onClose} />
        <div className="space-y-4 px-5 py-5">
          <p className={`flex items-center gap-2 text-sm font-bold text-accent-700 ${th}`}>
            {t('lineSimulatedToast')}
            <SimulatedBadge />
          </p>
          <LineMessagePreview log={sent} ticket={live} />
          <p className={`text-xs text-neutral-500 ${th}`}>{t('lineDemoNote')}</p>
          <button
            onClick={onClose}
            className={`w-full rounded-xl bg-neutral-800 py-3 text-sm font-semibold text-white transition-all hover:bg-neutral-700 active:scale-95 ${th}`}
          >
            {t('lineDone')}
          </button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet onClose={onClose}>
      <SheetHeader title={`${t('markFixedTitle')} · ${ticket.ticketId}`} onClose={onClose} />
      <div className="space-y-4 px-5 py-5">
        <p className={`text-sm text-neutral-600 ${th}`}>{t('markFixedHint')}</p>
        <div>
          <label className={`mb-1.5 block text-xs font-semibold text-neutral-600 ${th}`}>
            {t('fixedProof')} <span className="text-red-500">*</span>
          </label>
          <PhotoPicker photos={photos} setPhotos={setPhotos} invalid={touched && missingPhoto} />
          {touched && missingPhoto && <p className={`mt-1 text-xs font-medium text-red-500 ${th}`}>{t('fixedPhotoRequired')}</p>}
        </div>
        <textarea
          value={note}
          rows={2}
          maxLength={500}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('fixedNotePlaceholder')}
          className={field(lang)}
        />
        <div>
          <label
            className={`flex cursor-pointer items-start gap-2.5 rounded-xl border bg-accent-50 px-3 py-2.5 ${
              touched && missingLine ? 'border-red-400 ring-2 ring-red-100' : 'border-accent-200'
            }`}
          >
            <input
              type="checkbox"
              checked={simulate}
              onChange={(e) => setSimulate(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-green-600"
            />
            <span className={`text-sm font-semibold leading-snug text-neutral-700 ${th}`}>
              {t('simulateLineLabel')} {LINE_SIMULATED && <span className="text-red-500">*</span>}
              {LINE_SIMULATED && <SimulatedBadge className="ml-1.5 align-middle" />}
            </span>
          </label>
          {touched && missingLine && <p className={`mt-1 text-xs font-medium text-red-500 ${th}`}>{t('simulateLineRequired')}</p>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className={`flex-1 rounded-xl border border-neutral-200 bg-white py-3 text-sm font-semibold text-neutral-600 ${th}`}
          >
            {t('cancel')}
          </button>
          <button
            onClick={save}
            className={`flex-1 rounded-xl bg-accent-500 py-3 text-sm font-semibold text-white transition-all hover:bg-accent-600 active:scale-95 ${blocked ? 'opacity-60' : ''} ${th}`}
          >
            {t('markFixedBtn')}
          </button>
        </div>
      </div>
    </Sheet>
  );
}

/** Administrative close (e.g. duplicate / abandoned). Needs a reason and is audit-logged. */
export function CloseTicketModal({ ticket, onClose }: { ticket: RepairTicket; onClose: () => void }) {
  const { closeTicket, t, lang } = useApp();
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const missing = reason.trim().length === 0;
  const th = lang === 'th' ? 'font-thai' : '';

  const save = () => {
    setTouched(true);
    if (missing) return;
    if (closeTicket(ticket.id, reason)) onClose();
  };

  return (
    <Sheet onClose={onClose}>
      <SheetHeader title={`${t('closeReasonTitle')} · ${ticket.ticketId}`} onClose={onClose} />
      <div className="space-y-4 px-5 py-5">
        <div>
          <label className={`mb-1.5 block text-xs font-semibold text-neutral-600 ${th}`}>
            {t('closeReasonLabel')} <span className="text-red-500">*</span>
          </label>
          <textarea
            autoFocus
            value={reason}
            rows={3}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('closeReasonPlaceholder')}
            className={`${field(lang)} ${touched && missing ? '!border-red-400 !ring-2 !ring-red-100' : ''}`}
          />
          {touched && missing && <p className={`mt-1 text-xs font-medium text-red-500 ${th}`}>{t('cancelReasonRequired')}</p>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className={`flex-1 rounded-xl border border-neutral-200 bg-white py-3 text-sm font-semibold text-neutral-600 ${th}`}
          >
            {t('cancel')}
          </button>
          <button
            onClick={save}
            className={`flex-1 rounded-xl bg-neutral-800 py-3 text-sm font-semibold text-white transition-all hover:bg-neutral-700 active:scale-95 ${missing ? 'opacity-60' : ''} ${th}`}
          >
            {t('closeTicket')}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
