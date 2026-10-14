import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  CancelRecord,
  HistoryEntry,
  IssueType,
  Language,
  LineNotification,
  Priority,
  RepairTicket,
  TicketNote,
} from '@/types';
import { INITIAL_TICKETS, ISSUE_EMOJI, MAX_PHOTOS, STORAGE_KEY } from '@/lib/constants';
import { clearData, loadData, loadLang, parseStored, saveData, saveLang } from '@/lib/storage';
import { isAssigned } from '@/lib/permissions';
import {
  getActiveTickets,
  makeLineNotification,
  recalcQueueOrder,
} from '@/lib/queue';
import { t as translate } from '@/lib/i18n';

export interface AdminCorePatch {
  issueType?: IssueType;
  priority?: Priority;
  /** 'YYYY-MM-DD' or null to clear. Changing it REQUIRES a reason. */
  scheduledDate?: string | null;
  reason?: string;
  /** Resident note this change was requested through (for the audit log). */
  requestedNoteId?: string | null;
}

const newId = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function orderEntry(from: number, to: number): HistoryEntry {
  return {
    id: newId('hist'),
    field: 'queueOrder',
    from: `Q${from}`,
    to: `Q${to}`,
    reason: '',
    by: 'admin',
    timestamp: Date.now(),
    requestedViaNote: null,
  };
}

/** Apply a new order to the active tickets (immutably) and log the move. */
function applyOrder(
  current: RepairTicket[],
  reordered: RepairTicket[],
  movedId: string,
  oldPos: number,
): RepairTicket[] {
  const newPos = reordered.findIndex((tk) => tk.id === movedId) + 1;
  const ids = new Set(reordered.map((tk) => tk.id));
  const updated = reordered.map((tk, i) =>
    tk.id === movedId && newPos !== oldPos
      ? { ...tk, queueOrder: i + 1, history: [...tk.history, orderEntry(oldPos, newPos)] }
      : { ...tk, queueOrder: i + 1 },
  );
  return [...updated, ...current.filter((tk) => !ids.has(tk.id))];
}

export interface TicketDetailsPatch {
  title?: string;
  description?: string;
  photos?: string[];
  /** Optional new note appended (with timestamp) while saving. */
  note?: string;
}

interface AppContextValue {
  tickets: RepairTicket[];
  notifications: LineNotification[];
  cancelLog: CancelRecord[];
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
  /** Resident: edit ONLY title / description / photos (+ append note). Rejected once assigned. */
  updateTicketDetails: (ticketId: string, patch: TicketDetailsPatch) => boolean;
  /** Resident: append a timestamped note. Never touches core ticket fields. */
  addNote: (ticketId: string, text: string) => boolean;
  /** Resident: cancel a not-yet-assigned queue entry with a required reason. */
  cancelQueue: (ticketId: string, reason: string) => boolean;
  /** Admin only: change issue type / priority / date with an audit log entry. */
  adminUpdateTicket: (ticketId: string, patch: AdminCorePatch) => boolean;
  resetData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const initial = loadData();
  const [tickets, setTickets] = useState<RepairTicket[]>(initial.tickets);
  const [notifications, setNotifications] = useState<LineNotification[]>(initial.notifications);
  const [lang, setLangState] = useState<Language>(loadLang());
  const [cancelLog, setCancelLog] = useState<CancelRecord[]>(initial.cancelLog);
  const [isAdmin, setIsAdmin] = useState(false);

  // Always-fresh snapshot so permission checks never use stale state.
  const stateRef = useRef({ tickets, notifications, cancelLog });
  stateRef.current = { tickets, notifications, cancelLog };
  const isAdminRef = useRef(false);
  isAdminRef.current = isAdmin;

  useEffect(() => {
    saveData({ tickets, notifications, cancelLog });
  }, [tickets, notifications, cancelLog]);

  // Live data: pick up changes made in another tab/window (e.g. juristic assigns a technician).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const incoming = parseStored(e.newValue);
      if (!incoming) return;
      const cur = stateRef.current;
      if (JSON.stringify(incoming.tickets) !== JSON.stringify(cur.tickets)) setTickets(incoming.tickets);
      if (JSON.stringify(incoming.notifications) !== JSON.stringify(cur.notifications))
        setNotifications(incoming.notifications);
      if (JSON.stringify(incoming.cancelLog) !== JSON.stringify(cur.cancelLog))
        setCancelLog(incoming.cancelLog);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

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
          isYou: true,
          photoEmoji: { air_con: '❄️', door_lock: '🔒', water_pipe: '🚿', electric: '💡', plumbing: '🚽', other: '🛠️' }[issueType],
          title: '',
          photos: [],
          notes: [],
          priority: 'normal',
          scheduledDate: null,
          history: [],
        };
        return [...prev, newTicket];
      });
    },
    [],
  );

  const assignTechnician = useCallback((ticketId: string, techId: string) => {
    setTickets((prev) =>
      prev.map((tk) => (tk.id === ticketId ? { ...tk, technicianId: techId || null } : tk)),
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

  const commitTickets = useCallback((next: RepairTicket[]) => {
    stateRef.current = { ...stateRef.current, tickets: next };
    setTickets(next);
  }, []);

  const makeNote = (text: string): TicketNote => ({
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text: text.trim(),
    createdAt: Date.now(),
    author: 'resident',
  });

  const reorderTickets = useCallback(
    (sourceId: string, targetId: string) => {
      if (!isAdminRef.current) return;
      const current = stateRef.current.tickets;
      const active = getActiveTickets(current);
      const sourceIdx = active.findIndex((tk) => tk.id === sourceId);
      const targetIdx = active.findIndex((tk) => tk.id === targetId);
      if (sourceIdx === -1 || targetIdx === -1 || sourceIdx === targetIdx) return;
      // The repair currently in progress stays at the top of the queue.
      if (active[sourceIdx].status === 'in_progress' || active[targetIdx].status === 'in_progress') return;
      const reordered = [...active];
      const [moved] = reordered.splice(sourceIdx, 1);
      reordered.splice(targetIdx, 0, moved);
      commitTickets(applyOrder(current, reordered, sourceId, sourceIdx + 1));
    },
    [commitTickets],
  );

  const moveTicket = useCallback(
    (ticketId: string, direction: 'up' | 'down') => {
      if (!isAdminRef.current) return;
      const current = stateRef.current.tickets;
      const active = getActiveTickets(current);
      const idx = active.findIndex((tk) => tk.id === ticketId);
      if (idx === -1) return;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= active.length) return;
      const reordered = [...active];
      [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
      commitTickets(applyOrder(current, reordered, ticketId, idx + 1));
    },
    [commitTickets],
  );

  const adminUpdateTicket = useCallback(
    (ticketId: string, patch: AdminCorePatch): boolean => {
      // Only the juristic (admin session) can execute core changes.
      if (!isAdminRef.current) return false;
      const current = stateRef.current.tickets;
      const ticket = current.find((tk) => tk.id === ticketId);
      if (!ticket) return false;

      const reason = (patch.reason ?? '').trim().slice(0, 500);
      const dateChanged =
        patch.scheduledDate !== undefined && (patch.scheduledDate || null) !== ticket.scheduledDate;
      if (dateChanged && !reason) return false; // date change requires "Reason for change"

      const note = patch.requestedNoteId ? ticket.notes.find((n) => n.id === patch.requestedNoteId) : null;
      const via = note ? note.text.slice(0, 120) : null;

      const entries: HistoryEntry[] = [];
      const push = (field: HistoryEntry['field'], from: string, to: string) =>
        entries.push({ id: newId('hist'), field, from, to, reason, by: 'admin', timestamp: Date.now(), requestedViaNote: via });

      const updated: RepairTicket = { ...ticket };
      if (patch.issueType && patch.issueType !== ticket.issueType) {
        push('issueType', ticket.issueType, patch.issueType);
        updated.issueType = patch.issueType;
        updated.photoEmoji = ISSUE_EMOJI[patch.issueType];
      }
      if (patch.priority && patch.priority !== ticket.priority) {
        push('priority', ticket.priority, patch.priority);
        updated.priority = patch.priority;
      }
      if (dateChanged) {
        push('scheduledDate', ticket.scheduledDate ?? '', patch.scheduledDate ?? '');
        updated.scheduledDate = patch.scheduledDate || null;
      }
      if (entries.length === 0) return false;

      updated.history = [...ticket.history, ...entries];
      commitTickets(current.map((tk) => (tk.id === ticketId ? updated : tk)));
      return true;
    },
    [commitTickets],
  );

  const updateTicketDetails = useCallback(
    (ticketId: string, patch: TicketDetailsPatch): boolean => {
      const current = stateRef.current.tickets;
      const ticket = current.find((tk) => tk.id === ticketId);
      // Permission gate: only the resident's own, still-unassigned ticket.
      if (!ticket || !ticket.isYou || isAssigned(ticket)) return false;
      if (ticket.status === 'completed' || ticket.status === 'closed') return false;

      // Whitelist: ONLY title / description / photos / note. Core fields are never copied from the patch.
      const updated: RepairTicket = {
        ...ticket,
        title: patch.title !== undefined ? patch.title.trim().slice(0, 80) : ticket.title,
        description:
          patch.description !== undefined ? patch.description.trim().slice(0, 1000) : ticket.description,
        photos: patch.photos !== undefined ? patch.photos.slice(0, MAX_PHOTOS) : ticket.photos,
        notes: patch.note?.trim() ? [...ticket.notes, makeNote(patch.note)] : ticket.notes,
      };
      commitTickets(current.map((tk) => (tk.id === ticketId ? updated : tk)));
      return true;
    },
    [commitTickets],
  );

  const addNote = useCallback(
    (ticketId: string, text: string): boolean => {
      const current = stateRef.current.tickets;
      const ticket = current.find((tk) => tk.id === ticketId);
      if (!ticket || !ticket.isYou || !text.trim()) return false;
      if (ticket.status === 'completed' || ticket.status === 'closed') return false;
      // Append-only: existing notes and all core fields are left untouched.
      commitTickets(
        current.map((tk) =>
          tk.id === ticketId ? { ...tk, notes: [...tk.notes, makeNote(text.slice(0, 500))] } : tk,
        ),
      );
      return true;
    },
    [commitTickets],
  );

  const cancelQueue = useCallback(
    (ticketId: string, reason: string): boolean => {
      const current = stateRef.current.tickets;
      const ticket = current.find((tk) => tk.id === ticketId);
      const cleanReason = reason.trim();
      if (!ticket || !ticket.isYou || !cleanReason) return false;
      // Assigned tickets can only be cancelled by juristic in /admin.
      if (isAssigned(ticket)) return false;
      if (ticket.status === 'completed' || ticket.status === 'closed') return false;

      const activeBefore = getActiveTickets(current);
      const queueNumber = activeBefore.findIndex((tk) => tk.id === ticketId) + 1;

      // Delete from queue, then recalculate Q numbers (1..n, same relative order).
      const remaining = current.filter((tk) => tk.id !== ticketId);
      const order = new Map(getActiveTickets(remaining).map((tk, i) => [tk.id, i + 1]));
      const next = remaining.map((tk) => (order.has(tk.id) ? { ...tk, queueOrder: order.get(tk.id)! } : tk));
      commitTickets(next);

      const record: CancelRecord = {
        id: `cancel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        room: ticket.room,
        queueNumber,
        reason: cleanReason.slice(0, 500),
        title: ticket.title,
        issueType: ticket.issueType,
        timestamp: Date.now(),
      };
      setCancelLog((log) => [record, ...log].slice(0, 50));

      // Tell residents who just moved up (same behaviour as a completed repair).
      const movedUp = next.filter(
        (tk) =>
          (tk.status === 'queued' || tk.status === 'waiting') && tk.queueOrder >= queueNumber && tk.queueOrder > 0,
      );
      if (movedUp.length > 0) {
        const notifs = movedUp.map((tk) => makeLineNotification(tk.room, tk.queueOrder, lang));
        setNotifications((n) => [...notifs, ...n].slice(0, 20));
      }
      return true;
    },
    [commitTickets, lang],
  );

  const resetData = useCallback(() => {
    clearData();
    setTickets(INITIAL_TICKETS);
    setNotifications([]);
    setCancelLog([]);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      tickets,
      notifications,
      cancelLog,
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
      updateTicketDetails,
      addNote,
      cancelQueue,
      adminUpdateTicket,
      resetData,
    }),
    [tickets, notifications, cancelLog, lang, isAdmin, setLang, t, loginAdmin, logoutAdmin, addTicket, assignTechnician, startRepair, completeRepairWithNotify, closeTicket, reorderTickets, moveTicket, updateTicketDetails, addNote, cancelQueue, adminUpdateTicket, resetData],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
