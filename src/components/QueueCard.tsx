import { Clock, Wrench, ChevronRight, User } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { TECHNICIAN_MAP } from '@/lib/constants';
import {
  getActiveTickets,
  getEstimatedTime,
  getPeopleAhead,
  getQueuePosition,
} from '@/lib/queue';
import type { RepairTicket } from '@/types';

export function QueueCard({ yourTicket }: { yourTicket: RepairTicket }) {
  const { tickets, t, lang } = useApp();
  const active = getActiveTickets(tickets);
  const position = getQueuePosition(yourTicket, tickets);
  const peopleAhead = getPeopleAhead(position);
  const estimated = getEstimatedTime(position, lang);
  const inProgress = active.find((tk) => tk.status === 'in_progress');
  const technician = inProgress?.technicianId
    ? TECHNICIAN_MAP[inProgress.technicianId]
    : null;

  const queueSlice = active.slice(0, 5);

  return (
    <div className="animate-slide-up rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      {/* Hero section */}
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary-600">
        <Wrench size={14} />
        {t('queuePosition')}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-sm font-medium text-neutral-500">{t('youAreQ')}</span>
        <span className="text-5xl font-extrabold leading-none text-primary-500">
          #{position}
        </span>
        <span className={`text-sm font-medium text-neutral-400 ${lang === 'th' ? 'font-thai' : ''}`}>
          {t('inQueue')}
        </span>
      </div>

      {/* Estimated + people ahead */}
      <div className="mt-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5">
          <Clock size={14} className="text-primary-600" />
          <span className={`text-sm font-semibold text-primary-700 ${lang === 'th' ? 'font-thai' : ''}`}>
            {t('estimated')}: {estimated}
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-neutral-100 px-3 py-1.5">
          <span className={`text-sm font-semibold text-neutral-600 ${lang === 'th' ? 'font-thai' : ''}`}>
            {peopleAhead === 0
              ? t('noOneAhead')
              : peopleAhead === 1
                ? t('personAhead', { n: peopleAhead })
                : t('peopleAhead', { n: peopleAhead })}
          </span>
        </div>
      </div>

      {/* Technician status */}
      {technician && inProgress && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-neutral-50 p-2.5">
          <span className="text-xl">{technician.avatar}</span>
          <p className={`text-xs leading-snug text-neutral-600 ${lang === 'th' ? 'font-thai' : ''}`}>
            <span className="font-semibold">{technician.name}</span>{' '}
            {t('isRepairing')} {inProgress.room} {t('now')}
          </p>
        </div>
      )}

      {/* Queue progress visual */}
      <div className="mt-5">
        <p className={`mb-2 text-xs font-semibold text-neutral-400 ${lang === 'th' ? 'font-thai' : ''}`}>
          {t('queueProgress')}
        </p>
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {queueSlice.map((tk, idx) => {
            const isYou = tk.id === yourTicket.id;
            const isCurrent = tk.status === 'in_progress';
            return (
              <div key={tk.id} className="flex items-center gap-1 shrink-0">
                <div
                  className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all ${
                    isYou
                      ? 'bg-primary-400 ring-2 ring-primary-200'
                      : isCurrent
                        ? 'bg-info-100 ring-2 ring-info-200'
                        : 'bg-neutral-50'
                  }`}
                >
                  <span className="text-lg">
                    {isYou ? '🏠' : ISSUE_EMOJI_MAP[tk.issueType]}
                  </span>
                  <span
                    className={`text-[11px] font-bold ${
                      isYou ? 'text-white' : isCurrent ? 'text-info-600' : 'text-neutral-500'
                    }`}
                  >
                    {tk.room}
                  </span>
                  <span
                    className={`text-[9px] font-medium ${
                      isYou ? 'text-white/90' : isCurrent ? 'text-info-500' : 'text-neutral-400'
                    }`}
                  >
                    {isCurrent ? t('statusInProgress') : isYou ? t('next') : t('waiting')}
                  </span>
                </div>
                {idx < queueSlice.length - 1 && (
                  <ChevronRight size={14} className="shrink-0 text-neutral-300" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const ISSUE_EMOJI_MAP: Record<string, string> = {
  air_con: '❄️',
  door_lock: '🔒',
  water_pipe: '🚿',
  electric: '💡',
  plumbing: '🚽',
  other: '🛠️',
};
