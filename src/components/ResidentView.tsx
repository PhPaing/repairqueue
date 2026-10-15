import { useState } from 'react';
import { Plus, List } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { isOpenTicket } from '@/lib/queue';
import { QueueCard } from '@/components/QueueCard';
import { RepairList } from '@/components/RepairList';
import { SubmitRepairModal } from '@/components/SubmitRepairModal';
import { ConfirmOverlay } from '@/components/ConfirmFixed';
import { RoomLogin } from '@/components/RoomLogin';
import { RoomBar } from '@/components/RoomBar';

export function ResidentView() {
  const { tickets, myRoom, t, lang } = useApp();
  const [showModal, setShowModal] = useState(false);

  if (!myRoom) return <RoomLogin />;

  // Your nearest open ticket (earliest repair date, then position).
  const yourTicket =
    tickets
      .filter((tk) => tk.isYou && isOpenTicket(tk))
      .sort((a, b) => a.repairDate.localeCompare(b.repairDate) || a.queueOrder - b.queueOrder)[0] ?? null;

  return (
    <div className="mx-auto max-w-2xl px-4 pt-5 pb-[120px]">
      <RoomBar />
      {/* Your Queue Card - Hero */}
      {yourTicket && (
        <div className="mb-4">
          <QueueCard yourTicket={yourTicket} />
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={() => setShowModal(true)}
        className={`mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-800 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-neutral-700 active:scale-[0.98] ${lang === 'th' ? 'font-thai' : ''}`}
      >
        <Plus size={18} strokeWidth={2.5} />
        {t('submitRepair')}
      </button>

      {/* All Repairs List */}
      <div>
        <div className="mb-2.5 flex items-center gap-2">
          <List size={16} className="text-neutral-400" />
          <h2 className={`text-sm font-bold text-neutral-700 ${lang === 'th' ? 'font-thai' : ''}`}>
            {t('yourRepairsHeader', { room: myRoom })}
          </h2>
        </div>
        <RepairList />
      </div>

      {/* Submit modal */}
      <SubmitRepairModal open={showModal} onClose={() => setShowModal(false)} />

      {/* Full-screen "Technician marked as fixed - please confirm" card */}
      <ConfirmOverlay />
    </div>
  );
}
