import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Language, LineNotification, RepairTicket } from '@/types';
import { INITIAL_TICKETS } from '@/lib/constants';
import { clearData, loadData, loadLang, saveData, saveLang } from '@/lib/storage';
import {
  getActiveTickets,
  makeLineNotification,
  recalcQueueOrder,
} from '@/lib/queue';
import { t as translate } from '@/lib/i18n';

interface AppContextValue {
  tickets: RepairTicket[];
  notifications: LineNotification[];
  lang: Language;
  isAdmin: boolean;
  setLang: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  loginAdmin: (password: string) => boolean;
  logoutAdmin: () => void;
  addTicket: (room: string, issueType: RepairTicket['issueType'], description: string) => void;
  assignTechnician: (ticketId: string, techId: string) => void;
  startRepair: (ticketId: string) => void;
  completeRepair: (ticketId: string) => void;
  closeTicket: (ticketId: string) => void;
  reorderTickets: (sourceId: string, targetId: string) => void;
  moveTicket: (ticketId: string, direction: 'up' | 'down') => void;
  resetData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const initial = loadData();
  const [tickets, setTickets] = useState<RepairTicket[]>(initial.tickets);
  const [notifications, setNotifications] = useState<LineNotification[]>(initial.notifications);
  const [lang, setLangState] = useState<Language>(loadLang());
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    saveData({ tickets, notifications });
  }, [tickets, notifications]);

  useEffect(() => {
    saveLang(lang);
  }, [lang]);

  const setLang = useCallback((l: Language) => setLangState(l), []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(lang, key, params),
    [lang],
  );

  const loginAdmin = useCallback((password: string) => {
    if (password === '1234') {
      setIsAdmin(true);
      return true;
    }
    return false;
  }, []);

  const logoutAdmin = useCallback(() => setIsAdmin(false), []);

  const addTicket = useCallback(
    (room: string, issueType: RepairTicket['issueType'], description: string) => {
      setTickets((prev) => {
        const active = getActiveTickets(prev);
        const nextOrder = active.length + 1;
        const newTicket: RepairTicket = {
          id: `ticket-${Date.now()}`,
          room,
          issueType,
          description,
          status: 'queued',
          queueOrder: nextOrder,
          reportedAt: Date.now(),
          technicianId: null,
          isYou: false,
          photoEmoji: { air_con: '❄️', door_lock: '🔒', water_pipe: '🚿', electric: '💡', plumbing: '🚽', other: '🛠️' }[issueType],
        };
        return [...prev, newTicket];
      });
    },
    [],
  );

  const assignTechnician = useCallback((ticketId: string, techId: string) => {
    setTickets((prev) =>
      prev.map((tk) => (tk.id === ticketId ? { ...tk, technicianId: techId } : tk)),
    );
  }, []);

  const startRepair = useCallback((ticketId: string) => {
    setTickets((prev) => {
      const next = prev.map((tk) =>
        tk.id === ticketId ? { ...tk, status: 'in_progress' as const, queueOrder: 1 } : tk,
      );
      const others = next.filter((tk) => tk.id !== ticketId && tk.status !== 'in_progress');
      let order = 2;
      others.forEach((tk) => {
        tk.queueOrder = order++;
      });
      return [...next];
    });
  }, []);

  const completeRepairWithNotify = useCallback(
    (ticketId: string) => {
      setTickets((prev) => {
        const completed = prev.find((tk) => tk.id === ticketId);
        if (!completed) return prev;

        const next = prev.map((tk) =>
          tk.id === ticketId
            ? { ...tk, status: 'completed' as const, queueOrder: 0 }
            : tk,
        );

        const updated = recalcQueueOrder(next);

        const movedUp = updated.filter(
          (tk) =>
            (tk.status === 'queued' || tk.status === 'waiting') &&
            tk.queueOrder < completed.queueOrder &&
            tk.queueOrder > 0,
        );

        if (movedUp.length > 0) {
          const newNotifs = movedUp.map((tk) =>
            makeLineNotification(tk.room, tk.queueOrder, lang),
          );
          setNotifications((n) => [...newNotifs, ...n].slice(0, 20));
        }

        return updated;
      });
    },
    [lang],
  );

  const closeTicket = useCallback((ticketId: string) => {
    setTickets((prev) =>
      recalcQueueOrder(
        prev.map((tk) =>
          tk.id === ticketId ? { ...tk, status: 'closed' as const, queueOrder: 0 } : tk,
        ),
      ),
    );
  }, []);

  const reorderTickets = useCallback((sourceId: string, targetId: string) => {
    setTickets((prev) => {
      const active = getActiveTickets(prev);
      const sourceIdx = active.findIndex((tk) => tk.id === sourceId);
      const targetIdx = active.findIndex((tk) => tk.id === targetId);
      if (sourceIdx === -1 || targetIdx === -1 || sourceIdx === targetIdx) return prev;

      const reordered = [...active];
      const [moved] = reordered.splice(sourceIdx, 1);
      reordered.splice(targetIdx, 0, moved);
      reordered.forEach((tk, i) => {
        tk.queueOrder = i + 1;
      });

      const inactive = prev.filter((tk) => !active.includes(tk));
      return [...reordered, ...inactive];
    });
  }, []);

  const moveTicket = useCallback((ticketId: string, direction: 'up' | 'down') => {
    setTickets((prev) => {
      const active = getActiveTickets(prev);
      const idx = active.findIndex((tk) => tk.id === ticketId);
      if (idx === -1) return prev;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= active.length) return prev;

      const reordered = [...active];
      [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
      reordered.forEach((tk, i) => {
        tk.queueOrder = i + 1;
      });

      const inactive = prev.filter((tk) => !active.includes(tk));
      return [...reordered, ...inactive];
    });
  }, []);

  const resetData = useCallback(() => {
    clearData();
    setTickets(INITIAL_TICKETS);
    setNotifications([]);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      tickets,
      notifications,
      lang,
      isAdmin,
      setLang,
      t,
      loginAdmin,
      logoutAdmin,
      addTicket,
      assignTechnician,
      startRepair,
      completeRepair: completeRepairWithNotify,
      closeTicket,
      reorderTickets,
      moveTicket,
      resetData,
    }),
    [tickets, notifications, lang, isAdmin, setLang, t, loginAdmin, logoutAdmin, addTicket, assignTechnician, startRepair, completeRepairWithNotify, closeTicket, reorderTickets, moveTicket, resetData],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
