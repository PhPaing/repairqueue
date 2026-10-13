import { useState } from 'react';
import { X, Camera, Check, Wrench } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ISSUE_TYPES, ROOMS } from '@/lib/constants';
import { getActiveTickets, getEstimatedTime, getQueuePosition } from '@/lib/queue';
import type { IssueType } from '@/types';

interface SubmitRepairModalProps {
  open: boolean;
  onClose: () => void;
}

export function SubmitRepairModal({ open, onClose }: SubmitRepairModalProps) {
  const { addTicket, tickets, t, lang } = useApp();
  const [room, setRoom] = useState('');
  const [issueType, setIssueType] = useState<IssueType>('air_con');
  const [description, setDescription] = useState('');
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedPosition, setSubmittedPosition] = useState(0);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;
    addTicket(room, issueType, description);
    const active = getActiveTickets(tickets);
    const newPosition = active.length + 1;
    setSubmittedPosition(newPosition);
    setSubmitted(true);
  };

  const handleClose = () => {
    setRoom('');
    setIssueType('air_con');
    setDescription('');
    setPhotoUploaded(false);
    setSubmitted(false);
    setSubmittedPosition(0);
    onClose();
  };

  if (submitted) {
    const estimated = getEstimatedTime(submittedPosition, lang);
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={handleClose}>
        <div
          className="animate-slide-up w-full max-w-md rounded-t-3xl bg-white p-6 sm:rounded-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-100">
              <Check size={32} className="text-accent-600" strokeWidth={3} />
            </div>
            <p className={`mt-4 text-2xl font-extrabold text-neutral-800 ${lang === 'th' ? 'font-thai' : ''}`}>
              {t('nowQ', { n: submittedPosition })}
            </p>
            <p className={`mt-1 text-sm font-medium text-primary-600 ${lang === 'th' ? 'font-thai' : ''}`}>
              {t('estimated')}: {estimated}
            </p>
            <button
              onClick={handleClose}
              className="mt-6 w-full rounded-xl bg-neutral-800 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 active:scale-95"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={handleClose}
    >
      <div
        className="animate-slide-up w-full max-w-md rounded-t-3xl bg-white sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Wrench size={18} className="text-primary-500" />
            <h2 className={`text-base font-bold text-neutral-800 ${lang === 'th' ? 'font-thai' : ''}`}>
              {t('submitRepair')}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          {/* Room dropdown */}
          <div>
            <label className={`mb-1.5 block text-xs font-semibold text-neutral-600 ${lang === 'th' ? 'font-thai' : ''}`}>
              {t('room')}
            </label>
            <select
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              required
              className={`w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-800 outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-100 ${lang === 'th' ? 'font-thai' : ''}`}
            >
              <option value="">{t('selectRoom')}</option>
              {ROOMS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Issue type */}
          <div>
            <label className={`mb-1.5 block text-xs font-semibold text-neutral-600 ${lang === 'th' ? 'font-thai' : ''}`}>
              {t('issueType')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ISSUE_TYPES.map((issue) => (
                <button
                  key={issue.value}
                  type="button"
                  onClick={() => setIssueType(issue.value)}
                  className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 transition-all ${
                    issueType === issue.value
                      ? 'border-primary-400 bg-primary-50 ring-1 ring-primary-200'
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                  }`}
                >
                  <span className="text-xl">{issue.emoji}</span>
                  <span className={`text-[10px] font-medium ${lang === 'th' ? 'font-thai' : ''} ${
                    issueType === issue.value ? 'text-primary-700' : 'text-neutral-500'
                  }`}>
                    {t(`issue${issue.value.charAt(0).toUpperCase() + issue.value.slice(1).replace(/_./g, (m) => m[1].toUpperCase())}`)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={`mb-1.5 block text-xs font-semibold text-neutral-600 ${lang === 'th' ? 'font-thai' : ''}`}>
              {t('description')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder={t('descriptionPlaceholder')}
              className={`w-full resize-none rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-800 outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-100 ${lang === 'th' ? 'font-thai' : ''}`}
            />
          </div>

          {/* Photo upload mock */}
          <div>
            <label className={`mb-1.5 block text-xs font-semibold text-neutral-600 ${lang === 'th' ? 'font-thai' : ''}`}>
              {t('photoUpload')}
            </label>
            <button
              type="button"
              onClick={() => setPhotoUploaded(true)}
              className={`flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed py-4 transition-all ${
                photoUploaded
                  ? 'border-accent-300 bg-accent-50'
                  : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300'
              }`}
            >
              {photoUploaded ? (
                <>
                  <Check size={24} className="text-accent-500" />
                  <span className={`text-xs font-medium text-accent-600 ${lang === 'th' ? 'font-thai' : ''}`}>
                    ✓ {t('photoHint')}
                  </span>
                </>
              ) : (
                <>
                  <Camera size={24} className="text-neutral-400" />
                  <span className={`text-xs font-medium text-neutral-400 ${lang === 'th' ? 'font-thai' : ''}`}>
                    {t('photoHint')}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className={`flex-1 rounded-xl border border-neutral-200 bg-white py-3 text-sm font-semibold text-neutral-600 transition-colors hover:bg-neutral-50 active:scale-95 ${lang === 'th' ? 'font-thai' : ''}`}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={!room}
              className={`flex-1 rounded-xl bg-primary-400 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${lang === 'th' ? 'font-thai' : ''}`}
            >
              {t('submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
