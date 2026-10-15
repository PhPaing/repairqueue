import { useState } from 'react';
import { Shield, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ISSUE_TYPES } from '@/lib/constants';
import { formatStamp } from '@/lib/history';
import { formatBookingDate, todayISO } from '@/lib/dates';
import { nextDisplayQ } from '@/lib/queue';
import type { IssueType, Priority } from '@/types';

const issueKey = (v: string) =>
  `issue${v.charAt(0).toUpperCase() + v.slice(1).replace(/_./g, (m) => m[1].toUpperCase())}`;

const PRIORITIES: { value: Priority; key: string; cls: string }[] = [
  { value: 'normal', key: 'priorityNormal', cls: 'border-neutral-400 bg-neutral-100 text-neutral-700' },
  { value: 'high', key: 'priorityHigh', cls: 'border-primary-400 bg-primary-50 text-primary-700' },
  { value: 'urgent', key: 'priorityUrgent', cls: 'border-red-400 bg-red-50 text-red-600' },
];

/** Juristic-only editor for core fields. Every change is written to the ticket's audit log. */
export function AdminCoreEditModal({ ticketId, onClose }: { ticketId: string; onClose: () => void }) {
  const { tickets, adminUpdateTicket, t, lang } = useApp();
  const today = todayISO();
  const ticket = tickets.find((tk) => tk.id === ticketId);

  const residentNotes = (ticket?.notes ?? []).filter((n) => n.author === 'resident');
  const latest = [...residentNotes].sort((a, b) => b.createdAt - a.createdAt)[0];

  const [issueType, setIssueType] = useState<IssueType>(ticket?.issueType ?? 'other');
  const [priority, setPriority] = useState<Priority>(ticket?.priority ?? 'normal');
  const [date, setDate] = useState(ticket?.repairDate ?? today);
  const [reason, setReason] = useState('');
  const [noteId, setNoteId] = useState(latest?.id ?? '');
  const [touched, setTouched] = useState(false);

  if (!ticket) return null;

  const dateChanged = !!date && date !== ticket.repairDate;
  const urgentSet = priority === 'urgent' && ticket.priority !== 'urgent';
  const anyChange = dateChanged || issueType !== ticket.issueType || priority !== ticket.priority;
  // Reason is mandatory for a date change and for marking a ticket urgent.
  const reasonRequired = dateChanged || urgentSet;
  const reasonMissing = reasonRequired && reason.trim().length === 0;
  const movedQ = dateChanged ? nextDisplayQ(tickets.filter((tk) => tk.id !== ticket.id), date) : 0;
  const th = lang === 'th' ? 'font-thai' : '';
  const field = `w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-800 outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-100 ${th}`;
  const label = `mb-1.5 block text-xs font-semibold text-neutral-600 ${th}`;

  const save = () => {
    setTouched(true);
    if (!anyChange || reasonMissing) return;
    if (
      adminUpdateTicket(ticketId, {
        issueType,
        priority,
        repairDate: date || ticket.repairDate,
        reason,
        requestedNoteId: noteId || null,
      })
    )
      onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="animate-slide-up max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-neutral-100 bg-white px-5 py-4">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-primary-500" />
            <h2 className={`text-base font-bold text-neutral-800 ${th}`}>
              {t('adminEditTitle')} · {ticket.room}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div>
            <label className={label}>{t('issueType')}</label>
            <div className="grid grid-cols-3 gap-2">
              {ISSUE_TYPES.map((i) => (
                <button
                  key={i.value}
                  type="button"
                  onClick={() => setIssueType(i.value)}
                  className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 transition-all ${
                    issueType === i.value
                      ? 'border-primary-400 bg-primary-50 ring-1 ring-primary-200'
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                  }`}
                >
                  <span className="text-xl">{i.emoji}</span>
                  <span className={`text-[10px] font-medium ${th} ${issueType === i.value ? 'text-primary-700' : 'text-neutral-500'}`}>
                    {t(issueKey(i.value))}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={label}>{t('fieldPriority')}</label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={`rounded-xl border py-2.5 text-xs font-bold transition-all ${th} ${
                    priority === p.value ? `${p.cls} ring-1` : 'border-neutral-200 bg-white text-neutral-500'
                  }`}
                >
                  {t(p.key)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={label}>{t('fieldRepairDate')}</label>
            <input
              type="date"
              min={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={field}
            />
            {dateChanged && (
              <p className={`mt-1 text-[11px] font-medium text-primary-600 ${th}`}>
                {t('movesToDate', { date: formatBookingDate(date, lang), n: movedQ })}
              </p>
            )}
          </div>

          <div>
            <label className={label}>
              {t('changeReasonLabel')}
              {reasonRequired && <span className="text-red-500"> *</span>}
            </label>
            <textarea
              value={reason}
              rows={2}
              maxLength={500}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('changeReasonPlaceholder')}
              className={`${field} resize-none ${touched && reasonMissing ? '!border-red-400 !ring-2 !ring-red-100' : ''}`}
            />
            {touched && reasonMissing && (
              <p className={`mt-1 text-xs font-medium text-red-500 ${th}`}>{t('dateReasonRequired')}</p>
            )}
          </div>

          {residentNotes.length > 0 && (
            <div>
              <label className={label}>{t('requestedViaNote')}</label>
              <select value={noteId} onChange={(e) => setNoteId(e.target.value)} className={field}>
                <option value="">{t('noneOption')}</option>
                {[...residentNotes]
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .map((n) => (
                    <option key={n.id} value={n.id}>
                      {formatStamp(n.createdAt, lang)} — {n.text.length > 48 ? `${n.text.slice(0, 48)}…` : n.text}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className={`flex-1 rounded-xl border border-neutral-200 bg-white py-3 text-sm font-semibold text-neutral-600 ${th}`}
            >
              {t('cancel')}
            </button>
            <button
              onClick={save}
              disabled={!anyChange}
              className={`flex-1 rounded-xl bg-primary-400 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${th}`}
            >
              {t('adminSave')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
