import { useRef, useState, type ReactNode } from 'react';
import { Camera, Check, Copy, ExternalLink, Lock, MessageCircle, Phone, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ISSUE_EMOJI, JURISTIC_LINE_OA_ID, JURISTIC_PHONE, MAX_PHOTOS } from '@/lib/constants';
import { compressImage } from '@/lib/image';
import { isAssigned } from '@/lib/permissions';
import { getQueuePosition } from '@/lib/queue';
import { t as translate } from '@/lib/i18n';
import { formatDay, priorityLabel } from '@/lib/history';
import type { RepairTicket } from '@/types';

const issueKey = (v: string) =>
  `issue${v.charAt(0).toUpperCase() + v.slice(1).replace(/_./g, (m) => m[1].toUpperCase())}`;

function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="animate-slide-up max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  const { lang } = useApp();
  return (
    <div className="sticky top-0 flex items-center justify-between border-b border-neutral-100 bg-white px-5 py-4">
      <h2 className={`text-base font-bold text-neutral-800 ${lang === 'th' ? 'font-thai' : ''}`}>{title}</h2>
      <button
        onClick={onClose}
        className="rounded-lg p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
        aria-label="Close"
      >
        <X size={20} />
      </button>
    </div>
  );
}

const inputCls = (lang: string) =>
  `w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-800 outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-100 ${
    lang === 'th' ? 'font-thai' : ''
  }`;

const labelCls = (lang: string) =>
  `mb-1.5 block text-xs font-semibold text-neutral-600 ${lang === 'th' ? 'font-thai' : ''}`;

/* ------------------------------------------------------------------ */
/* Edit (pending only): title, detail, photos, note                    */
/* ------------------------------------------------------------------ */
export function EditTicketModal({ ticketId, onClose }: { ticketId: string; onClose: () => void }) {
  const { tickets, updateTicketDetails, t, lang } = useApp();
  const live = tickets.find((tk) => tk.id === ticketId);
  const [title, setTitle] = useState(live?.title ?? '');
  const [description, setDescription] = useState(live?.description ?? '');
  const [photos, setPhotos] = useState<string[]>(live?.photos ?? []);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!live) return null;

  // Live data: if juristic assigned a technician while this was open, lock immediately.
  if (isAssigned(live)) {
    return (
      <Sheet onClose={onClose}>
        <SheetHeader title={t('editRequest')} onClose={onClose} />
        <div className="flex flex-col items-center gap-3 px-5 py-8 text-center">
          <Lock className="text-neutral-400" />
          <p className={`text-sm text-neutral-600 ${lang === 'th' ? 'font-thai' : ''}`}>{t('noPermission')}</p>
          <button onClick={onClose} className="mt-2 w-full rounded-xl bg-neutral-800 py-3 text-sm font-semibold text-white">
            {t('close')}
          </button>
        </div>
      </Sheet>
    );
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    setBusy(true);
    const room = MAX_PHOTOS - photos.length;
    const picked = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, room);
    const added: string[] = [];
    for (const f of picked) {
      try {
        added.push(await compressImage(f));
      } catch {
        // skip unreadable image
      }
    }
    setPhotos((p) => [...p, ...added].slice(0, MAX_PHOTOS));
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSave = () => {
    if (updateTicketDetails(ticketId, { title, description, photos, note })) onClose();
  };

  const q = getQueuePosition(live, tickets);

  return (
    <Sheet onClose={onClose}>
      <SheetHeader title={`${t('editRequest')} · ${live.room}`} onClose={onClose} />
      <div className="space-y-4 px-5 py-5">
        {/* Editable */}
        <div>
          <label className={labelCls(lang)}>{t('fieldTitle')}</label>
          <input
            value={title}
            maxLength={80}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('fieldTitlePlaceholder')}
            className={inputCls(lang)}
          />
        </div>

        <div>
          <label className={labelCls(lang)}>{t('fieldDetail')}</label>
          <textarea
            value={description}
            maxLength={1000}
            rows={3}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('descriptionPlaceholder')}
            className={`${inputCls(lang)} resize-none`}
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className={`${labelCls(lang)} !mb-0`}>{t('fieldPhotos')}</label>
            <span className="text-[11px] text-neutral-400">
              {t('photoCount', { n: photos.length, max: MAX_PHOTOS })}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {photos.map((src, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-neutral-200">
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                  aria-label={t('removePhoto')}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50 text-neutral-400 transition-colors hover:border-neutral-300 disabled:opacity-50"
              >
                <Camera size={20} />
                <span className={`text-[10px] font-medium ${lang === 'th' ? 'font-thai' : ''}`}>{t('addPhoto')}</span>
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        <div>
          <label className={labelCls(lang)}>{t('fieldNote')}</label>
          <textarea
            value={note}
            maxLength={500}
            rows={2}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('notePlaceholder')}
            className={`${inputCls(lang)} resize-none`}
          />
        </div>

        {/* Core fields: visible but locked */}
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
          <p className={`mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500 ${lang === 'th' ? 'font-thai' : ''}`}>
            <Lock size={12} />
            {t('lockedFieldsTitle')}
          </p>
          <div className="space-y-1.5">
            <LockedField label={t('fieldIssueTypeLocked')} value={`${ISSUE_EMOJI[live.issueType]} ${t(issueKey(live.issueType))}`} />
            <LockedField
              label={t('fieldDateCreated')}
              value={new Date(live.reportedAt).toLocaleString(lang === 'th' ? 'th-TH' : 'en-GB', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            />
            <LockedField label={t('fieldScheduledDate')} value={formatDay(live.scheduledDate, lang)} />
            <LockedField label={t('fieldPriority')} value={priorityLabel(live.priority, lang)} />
            <LockedField label={t('fieldQueueOrder')} value={`Q${q}`} />
          </div>
          <p className={`mt-2 text-[11px] text-neutral-400 ${lang === 'th' ? 'font-thai' : ''}`}>{t('dateRequestHint')}</p>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 rounded-xl border border-neutral-200 bg-white py-3 text-sm font-semibold text-neutral-600 transition-colors hover:bg-neutral-50 active:scale-95 ${lang === 'th' ? 'font-thai' : ''}`}
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleSave}
            className={`flex-1 rounded-xl bg-primary-400 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-500 active:scale-95 disabled:opacity-40 ${lang === 'th' ? 'font-thai' : ''}`}
          >
            {t('save')}
          </button>
        </div>
      </div>
    </Sheet>
  );
}

/** Disabled-looking field. Tooltip on hover (title) + tap-to-reveal hint for mobile. */
function LockedField({ label, value }: { label: string; value: string }) {
  const { t, lang } = useApp();
  const [hint, setHint] = useState(false);
  const tip = t('onlyJuristic');
  return (
    <button
      type="button"
      aria-disabled="true"
      title={tip}
      onClick={() => {
        setHint(true);
        setTimeout(() => setHint(false), 1800);
      }}
      className={`flex w-full cursor-not-allowed items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-left text-xs text-neutral-400 ${lang === 'th' ? 'font-thai' : ''}`}
    >
      <span className="flex items-center gap-1.5">
        <Lock size={11} />
        {label}
      </span>
      <span className="truncate text-right font-medium text-neutral-500">{hint ? tip : value}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Cancel Queue (pending only) - reason required                       */
/* ------------------------------------------------------------------ */
export function CancelQueueModal({ ticketId, onClose }: { ticketId: string; onClose: () => void }) {
  const { tickets, cancelQueue, t, lang } = useApp();
  const live = tickets.find((tk) => tk.id === ticketId);
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  if (!live) return null;
  const q = getQueuePosition(live, tickets);
  const missing = reason.trim().length === 0;

  if (isAssigned(live)) {
    return (
      <Sheet onClose={onClose}>
        <div className="flex flex-col items-center gap-3 px-5 py-8 text-center">
          <Lock className="text-neutral-400" />
          <p className={`text-sm text-neutral-600 ${lang === 'th' ? 'font-thai' : ''}`}>{t('noPermission')}</p>
          <button onClick={onClose} className="mt-2 w-full rounded-xl bg-neutral-800 py-3 text-sm font-semibold text-white">
            {t('close')}
          </button>
        </div>
      </Sheet>
    );
  }

  const confirm = () => {
    setTouched(true);
    if (missing) return;
    if (cancelQueue(ticketId, reason)) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="animate-scale-in w-full max-w-sm rounded-2xl bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-bold text-neutral-800">
          <span className={lang === 'th' ? 'font-thai' : ''}>{t('cancelConfirmTitle', { n: q })}</span>
        </p>
        <p className={`mt-0.5 text-[11px] text-neutral-400 ${lang === 'th' ? '' : 'font-thai'}`}>
          {translate(lang === 'th' ? 'en' : 'th', 'cancelConfirmTitle', { n: q })}
        </p>
        <textarea
          autoFocus
          value={reason}
          rows={3}
          maxLength={500}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('cancelReasonPlaceholder')}
          className={`mt-3 resize-none ${inputCls(lang)} ${touched && missing ? '!border-red-400 !ring-2 !ring-red-100' : ''}`}
        />
        {touched && missing && (
          <p className={`mt-1 text-xs font-medium text-red-500 ${lang === 'th' ? 'font-thai' : ''}`}>
            {t('cancelReasonRequired')}
          </p>
        )}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className={`flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-600 ${lang === 'th' ? 'font-thai' : ''}`}
          >
            {t('keepQueue')}
          </button>
          <button
            onClick={confirm}
            className={`flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white transition-opacity hover:bg-red-600 ${
              missing ? 'opacity-50' : ''
            } ${lang === 'th' ? 'font-thai' : ''}`}
          >
            {t('confirmCancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Add Note (append-only, allowed before and after assignment)         */
/* ------------------------------------------------------------------ */
export function AddNoteModal({ ticket, onClose }: { ticket: RepairTicket; onClose: () => void }) {
  const { addNote, t, lang } = useApp();
  const [text, setText] = useState('');

  const save = () => {
    if (addNote(ticket.id, text)) onClose();
  };

  return (
    <Sheet onClose={onClose}>
      <SheetHeader title={`${t('addNoteBtn')} · ${ticket.room}`} onClose={onClose} />
      <div className="space-y-4 px-5 py-5">
        <textarea
          autoFocus
          value={text}
          rows={4}
          maxLength={500}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('notePlaceholder')}
          className={`${inputCls(lang)} resize-none`}
        />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className={`flex-1 rounded-xl border border-neutral-200 bg-white py-3 text-sm font-semibold text-neutral-600 ${lang === 'th' ? 'font-thai' : ''}`}
          >
            {t('cancel')}
          </button>
          <button
            disabled={!text.trim()}
            onClick={save}
            className={`flex-1 rounded-xl bg-primary-400 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-500 active:scale-95 disabled:opacity-40 ${lang === 'th' ? 'font-thai' : ''}`}
          >
            {t('save')}
          </button>
        </div>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Contact Juristic (assigned) - opens LINE / phone, never cancels     */
/* ------------------------------------------------------------------ */
export function ContactJuristicSheet({ ticket, onClose }: { ticket: RepairTicket; onClose: () => void }) {
  const { tickets, t, lang } = useApp();
  const [copied, setCopied] = useState(false);
  const q = getQueuePosition(ticket, tickets);

  // Exact request text first, Thai translation + room underneath for the juristic office.
  const message = `${translate('en', 'juristicMsg', { n: q })}\n${translate('th', 'juristicMsg', { n: q })}\nRoom / ห้อง ${ticket.room}`;

  const lineHref = JURISTIC_LINE_OA_ID
    ? `https://line.me/R/oaMessage/${encodeURIComponent(JURISTIC_LINE_OA_ID)}/?${encodeURIComponent(message)}`
    : `https://line.me/R/msg/text/?${encodeURIComponent(message)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <Sheet onClose={onClose}>
      <SheetHeader title={t('juristicSheetTitle')} onClose={onClose} />
      <div className="space-y-4 px-5 py-5">
        <p className={`text-sm text-neutral-600 ${lang === 'th' ? 'font-thai' : ''}`}>{t('juristicSheetHint')}</p>
        <pre className="whitespace-pre-wrap rounded-xl border border-neutral-200 bg-neutral-50 p-3 font-thai text-xs leading-relaxed text-neutral-700">
          {message}
        </pre>

        <a
          href={lineHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 py-3 text-sm font-bold text-white transition-colors hover:bg-accent-600 active:scale-[0.98] ${lang === 'th' ? 'font-thai' : ''}`}
        >
          <MessageCircle size={18} fill="white" />
          {t('openLine')}
          <ExternalLink size={14} className="opacity-70" />
        </a>

        {JURISTIC_PHONE && (
          <a
            href={`tel:${JURISTIC_PHONE}`}
            className={`flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white py-3 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 ${lang === 'th' ? 'font-thai' : ''}`}
          >
            <Phone size={16} />
            {t('callJuristic')}
          </a>
        )}

        <button
          onClick={copy}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold text-neutral-500 transition-colors hover:bg-neutral-100 ${lang === 'th' ? 'font-thai' : ''}`}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? t('copied') : t('copyMessage')}
        </button>
      </div>
    </Sheet>
  );
}
