import type { HistoryEntry, Language } from '@/types';
import { ISSUE_EMOJI } from '@/lib/constants';
import { t } from '@/lib/i18n';
import type { IssueType } from '@/types';

const issueKey = (v: string) =>
  `issue${v.charAt(0).toUpperCase() + v.slice(1).replace(/_./g, (m) => m[1].toUpperCase())}`;

const locale = (lang: Language) => (lang === 'th' ? 'th-TH' : 'en-GB');

export function formatDay(iso: string | null | undefined, lang: Language): string {
  if (!iso) return t(lang, 'notScheduled');
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(locale(lang), { dateStyle: 'medium' });
}

export function formatStamp(ts: number, lang: Language): string {
  return new Date(ts).toLocaleString(locale(lang), { dateStyle: 'medium', timeStyle: 'short' });
}

export function priorityLabel(p: string, lang: Language): string {
  return t(lang, p === 'urgent' ? 'priorityUrgent' : p === 'high' ? 'priorityHigh' : 'priorityNormal');
}

function value(field: HistoryEntry['field'], raw: string, lang: Language): string {
  switch (field) {
    case 'issueType':
      return `${ISSUE_EMOJI[raw as IssueType] ?? ''} ${t(lang, issueKey(raw))}`.trim();
    case 'priority':
      return priorityLabel(raw, lang);
    case 'scheduledDate':
      return formatDay(raw || null, lang);
    default:
      return raw;
  }
}

const FIELD_LABEL: Record<HistoryEntry['field'], string> = {
  issueType: 'fieldIssueTypeLocked',
  priority: 'fieldPriority',
  scheduledDate: 'fieldScheduledDate',
  queueOrder: 'fieldQueueOrder',
};

/** "Date: 12 Oct → 16 Oct" */
export function describeChange(e: HistoryEntry, lang: Language): string {
  return `${t(lang, FIELD_LABEL[e.field])}: ${value(e.field, e.from, lang)} → ${value(e.field, e.to, lang)}`;
}

/** "Changed by Admin - Reason: … - <timestamp> - Requested via resident note: "…"" */
export function describeAudit(e: HistoryEntry, lang: Language): string {
  const base = t(lang, 'auditLine', { reason: e.reason || '-', time: formatStamp(e.timestamp, lang) });
  return e.requestedViaNote ? base + t(lang, 'auditVia', { note: e.requestedViaNote }) : base;
}
