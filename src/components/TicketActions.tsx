import { useState } from 'react';
import { AlertTriangle, Lock, MessageCircle, MessageSquarePlus, Pencil, PhoneCall, Trash2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { tBoth } from '@/lib/i18n';
import { canResidentAddNote, canResidentEdit, getTechnicianName, isAssigned } from '@/lib/permissions';
import type { HistoryEntry, LineLogEntry, RepairTicket } from '@/types';
import { describeAudit, describeChange, formatStamp } from '@/lib/history';
import {
  AddNoteModal,
  CancelQueueModal,
  ContactJuristicSheet,
  EditTicketModal,
} from './TicketModals';
import { ConfirmFixedCard } from './ConfirmFixed';
import { SimulatedBadge, lineTypeKey } from './LineMessagePreview';

type Dialog = 'edit' | 'cancel' | 'note' | 'contact' | null;

/** Two-line bilingual button label: current language on top, the other below. */
function BiLabel({ k }: { k: string }) {
  const { lang } = useApp();
  const { main, sub } = tBoth(lang, k);
  return (
    <span className="flex flex-col items-center leading-tight">
      <span className={`text-xs font-bold ${lang === 'th' ? 'font-thai' : ''}`}>{main}</span>
      <span className={`text-[10px] font-medium opacity-70 ${lang === 'th' ? '' : 'font-thai'}`}>{sub}</span>
    </span>
  );
}

/**
 * Permission-aware actions for the resident's own ticket.
 *  - Before assigned: [Edit] [Cancel Queue]
 *  - After assigned:  locked badge + [Add Note] [Contact Juristic to Cancel]
 */
export function TicketActions({ ticket }: { ticket: RepairTicket }) {
  const { t, lang } = useApp();
  const [dialog, setDialog] = useState<Dialog>(null);

  if (!ticket.isYou || !canResidentAddNote(ticket)) return null;

  // Step 2 of dual-confirm: technician marked it fixed, the resident decides in the app.
  if (ticket.status === 'waiting_confirm') {
    return (
      <div className="mt-3 border-t border-neutral-100 pt-3">
        <ConfirmFixedCard ticket={ticket} variant="inline" />
        <button
          onClick={() => setDialog('note')}
          className="mt-2.5 flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-2 py-2 text-neutral-700 transition-colors hover:bg-neutral-50 active:scale-95"
        >
          <MessageSquarePlus size={15} />
          <BiLabel k="addNoteBtn" />
        </button>
        {dialog === 'note' && <AddNoteModal ticket={ticket} onClose={() => setDialog(null)} />}
      </div>
    );
  }

  const assigned = isAssigned(ticket);
  const technicianName = getTechnicianName(ticket);
  const close = () => setDialog(null);

  return (
    <div className="mt-3 border-t border-neutral-100 pt-3">
      {assigned ? (
        <>
          <div className="mb-2.5 flex items-start gap-2 rounded-xl bg-neutral-100 px-3 py-2">
            <Lock size={14} className="mt-0.5 shrink-0 text-neutral-500" />
            <p className={`text-xs font-semibold leading-snug text-neutral-600 ${lang === 'th' ? 'font-thai' : ''}`}>
              {t('lockedBadge', { name: technicianName ?? '' })}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDialog('note')}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-2 py-2 text-neutral-700 transition-colors hover:bg-neutral-50 active:scale-95"
            >
              <MessageSquarePlus size={15} />
              <BiLabel k="addNoteBtn" />
            </button>
            <button
              onClick={() => setDialog('contact')}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-accent-200 bg-accent-50 px-2 py-2 text-accent-700 transition-colors hover:bg-accent-100 active:scale-95"
            >
              <PhoneCall size={15} />
              <BiLabel k="contactJuristicBtn" />
            </button>
          </div>
        </>
      ) : (
        canResidentEdit(ticket) && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDialog('edit')}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-2 py-2 text-neutral-700 transition-colors hover:bg-neutral-50 active:scale-95"
            >
              <Pencil size={15} />
              <BiLabel k="editTicket" />
            </button>
            <button
              onClick={() => setDialog('cancel')}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-2 py-2 text-red-600 transition-colors hover:bg-red-100 active:scale-95"
            >
              <Trash2 size={15} />
              <BiLabel k="cancelQueueBtn" />
            </button>
          </div>
        )
      )}

      {dialog === 'edit' && <EditTicketModal ticketId={ticket.id} onClose={close} />}
      {dialog === 'cancel' && <CancelQueueModal ticketId={ticket.id} onClose={close} />}
      {dialog === 'note' && <AddNoteModal ticket={ticket} onClose={close} />}
      {dialog === 'contact' && <ContactJuristicSheet ticket={ticket} onClose={close} />}
    </div>
  );
}

type TimelineItem =
  | { kind: 'note'; at: number; id: string; note: RepairTicket['notes'][number] }
  | { kind: 'line'; at: number; id: string; log: LineLogEntry }
  | { kind: 'audit'; at: number; id: string; entry: HistoryEntry };

/** Notes + admin audit log merged into one timeline (newest first). */
export function NoteHistory({ ticket }: { ticket: RepairTicket }) {
  const { t, lang } = useApp();
  const [expanded, setExpanded] = useState(false);

  const items: TimelineItem[] = [
    ...ticket.notes.map((n) => ({ kind: 'note' as const, at: n.createdAt, id: n.id, note: n })),
    ...ticket.history.map((e) => ({ kind: 'audit' as const, at: e.timestamp, id: e.id, entry: e })),
    ...ticket.lineLog.map((l) => ({ kind: 'line' as const, at: l.sentAt, id: l.id, log: l })),
  ].sort((a, b) => b.at - a.at);

  if (items.length === 0) return null;
  const shown = expanded ? items : items.slice(0, 3);

  return (
    <div className="mt-2.5 rounded-xl bg-neutral-50 p-2.5">
      <p className={`mb-1.5 text-[11px] font-semibold text-neutral-500 ${lang === 'th' ? 'font-thai' : ''}`}>
        {t('noteHistory')} ({items.length})
      </p>
      <ul className="space-y-1.5">
        {shown.map((item) =>
          item.kind === 'line' ? (
            <li
              key={item.id}
              className={`flex items-start gap-1.5 rounded-lg border border-accent-200 bg-accent-50 px-2 py-1.5 text-xs leading-snug ${lang === 'th' ? 'font-thai' : ''}`}
            >
              <MessageCircle size={12} className="mt-0.5 shrink-0 text-accent-600" fill="currentColor" />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-1 font-semibold text-accent-800">
                  {t('auditLineSimulated', {
                    to: t(item.log.to === 'resident' ? 'lineToResident' : 'lineToJuristic'),
                    what: t(lineTypeKey(item.log.type)),
                  })}
                  {item.log.simulated && <SimulatedBadge />}
                </p>
                <p className="text-[11px] text-neutral-500">{formatStamp(item.log.sentAt, lang)}</p>
              </div>
            </li>
          ) : item.kind === 'note' ? (
            <li key={item.id} className="text-xs leading-snug">
              <span className="text-[10px] font-medium text-neutral-400">
                {formatStamp(item.note.createdAt, lang)} ·{' '}
                {item.note.author === 'juristic' ? t('juristicLabel') : t('residentLabel')}
              </span>
              <p className={`whitespace-pre-wrap break-words text-neutral-700 ${lang === 'th' ? 'font-thai' : ''}`}>
                {item.note.text}
              </p>
            </li>
          ) : (
            <li
              key={item.id}
              className={`rounded-lg border border-primary-200 bg-primary-50 px-2 py-1.5 text-xs leading-snug ${lang === 'th' ? 'font-thai' : ''}`}
            >
              <p className="font-semibold text-primary-800">{describeChange(item.entry, lang)}</p>
              <p className="mt-0.5 break-words text-[11px] text-neutral-600">{describeAudit(item.entry, lang)}</p>
              {item.entry.photos && item.entry.photos.length > 0 && (
                <div className="mt-1.5 flex gap-1.5 overflow-x-auto scrollbar-hide">
                  {item.entry.photos.map((src, i) => (
                    <img key={i} src={src} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-neutral-200 object-cover" />
                  ))}
                </div>
              )}
            </li>
          ),
        )}
      </ul>
      {items.length > 3 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className={`mt-1.5 text-[11px] font-semibold text-primary-600 ${lang === 'th' ? 'font-thai' : ''}`}
        >
          {expanded ? t('showLess') : t('showAllNotes', { n: items.length })}
        </button>
      )}
    </div>
  );
}

/** Red banner shown on urgent tickets, with the reason juristic gave when marking it urgent. */
export function UrgentBanner({ ticket }: { ticket: RepairTicket }) {
  const { t, lang } = useApp();
  if (ticket.priority !== 'urgent') return null;
  const why = [...ticket.history].reverse().find((h) => h.field === 'priority' && h.to === 'urgent');
  return (
    <div className={`mt-2 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 ${lang === 'th' ? 'font-thai' : ''}`}>
      <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-500" />
      <p className="text-xs leading-snug text-red-700">
        <span className="font-extrabold">{t('urgentBanner')}</span>
        {why?.reason && (
          <>
            {' · '}
            {t('urgentReasonLabel')}: {why.reason}
          </>
        )}
      </p>
    </div>
  );
}
