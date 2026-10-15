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
  LineLogEntry,
  LineNotification,
  Priority,
  RepairTicket,
  TicketNote,
} from '@/types';
import { INITIAL_TICKETS, ISSUE_EMOJI, MAX_BOOKING_DAYS, MAX_PHOTOS, STORAGE_KEY, TECHNICIAN_MAP } from '@/lib/constants';
import { LINE_SIMULATED, confirmedMessage, fixedMessage, pushLine, rejectedMessage } from '@/lib/line';
import { clearData, loadData, loadLang, parseStored, saveData, saveLang } from '@/lib/storage';
import { isAssigned } from '@/lib/permissions';
import {
  findActiveDuplicate,
  getQueueForDate,
  inQueue,
  isOpenTicket,
  makeLineNotification,
  nextDisplayQ,
  normalizeQueue,
} from '@/lib/queue';
import { addDaysISO, buildTicketId, isValidISO, nextTicketSeq, todayISO } from '@/lib/dates';
import { t as translate } from '@/lib/i18n';
import { clearRoom, clearRoomParam, isValidPin, loadPin, loadRoom, normalizeRoom, saveSession } from '@/lib/session';

export interface AdminCorePatch {
  issueType?: IssueType;
  priority?: Priority;
  /** New repair date 'YYYY-MM-DD'. Changing it REQUIRES a reason. */
  repairDate?: string;
  /** Required for a date change and when setting priority to urgent. */
  reason?: string;
  /** Resident note this change was requested through (for the audit log). */
  requestedNoteId?: string | null;
}

export type AddTicketResult =
  | { ok: true; ticketId: string; displayQ: number; position: number; repairDate: string }
  | { ok: false; error: 'room' | 'date' | 'duplicate'; ticketId?: string };

export interface TicketDetailsPatch {
  title?: string;
  description?: string;
  photos?: string[];
  /** Optional new note appended (with timestamp) while saving. */
  note?: string;
}

export interface ToastMsg {
  id: string;
  text: string;
  sub?: string;
}

const newId = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function entry(
  field: HistoryEntry['field'],
  from: string,
  to: string,
  by: HistoryEntry['by'],
  extra: Partial<HistoryEntry> = {},
): HistoryEntry {
  return {
    id: newId('hist'),
    field,
    from,
    to,
    reason: '',
    by,
    timestamp: Date.now(),
    requestedViaNote: null,
    ...extra,
  };
}

/** Apply a new order to ONE date's queue (immutably) and log the move. */
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
      ? { ...tk, queueOrder: i + 1, history: [...tk.history, entry('queueOrder', `#${oldPos}`, `#${newPos}`, 'admin')] }
      : { ...tk, queueOrder: i + 1 },
  );
  return [...updated, ...current.filter((tk) => !ids.has(tk.id))];
}

/** After a ticket leaves a date's Q list, close the gap in the other open tickets' Q labels. */
function closeQGap(list: RepairTicket[], date: string, removedQ: number, exceptId: string): RepairTicket[] {
  return list.map((tk) =>
    tk.id !== exceptId && tk.repairDate === date && isOpenTicket(tk) && tk.displayQ > removedQ
      ? { ...tk, displayQ: tk.displayQ - 1 }
      : tk,
  );
}

interface AppContextValue {
  /** All tickets (admin view). `isYou` is derived from the logged-in room. */
  tickets: RepairTicket[];
  /** Only the tickets of the room using this device (resident view). */
  myTickets: RepairTicket[];
  /** Room this device is logged in to ('' = show the Room Login). Admin "view as" overrides it. */
  myRoom: string;
  viewAsRoom: string;
  setViewAsRoom: (room: string) => void;
  loginRoom: (room: string, pin: string) => boolean;
  /** Needs the saved PIN. Clears myRoom so the login screen shows again. */
  logoutRoom: (pin: string) => boolean;
  notifications: LineNotification[];
  cancelLog: CancelRecord[];
  lang: Language;
  isAdmin: boolean;
  setLang: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  loginAdmin: (password: string) => boolean;
  logoutAdmin: () => void;
  /** Resident books a repair for a date. Blocks duplicates (same room + issue type). */
  addTicket: (
    room: string,
    issueType: RepairTicket['issueType'],
    description: string,
    repairDate: string,
  ) => AddTicketResult;
  assignTechnician: (ticketId: string, techId: string) => void;
  startRepair: (ticketId: string) => void;
  /**
   * Admin step 1 of dual-confirm: needs a photo of the fixed work (+ the "Simulate LINE push" box in demo mode).
   * Sets Waiting Resident Confirm, logs LINE notification 1 and returns that log entry (null = rejected).
   */
  markFixed: (ticketId: string, photos: string[], note: string | undefined, simulateLine: boolean) => LineLogEntry | null;
  /** Resident step 2: "Yes, confirm complete" -> Completed + LINE notification 2 to juristic. */
  confirmFixed: (ticketId: string) => boolean;
  /** Resident step 2: "No, still broken" - photo AND note required -> In Progress + LINE notification 3. */
  rejectFixed: (ticketId: string, reason: string, photos: string[]) => boolean;
  toast: ToastMsg | null;
  showToast: (text: string, sub?: string) => void;
  dismissToast: () => void;
  /** Admin: administrative close (reason required, audit-logged). */
  closeTicket: (ticketId: string, reason: string) => boolean;
  reorderTickets: (sourceId: string, targetId: string) => void;
  moveTicket: (ticketId: string, direction: 'up' | 'down') => void;
  /** Resident: edit ONLY title / description / photos (+ append note). Rejected once assigned. */
  updateTicketDetails: (ticketId: string, patch: TicketDetailsPatch) => boolean;
  /** Resident: append a timestamped note. Never touches core ticket fields. */
  addNote: (ticketId: string, text: string) => boolean;
  /** Resident: cancel a not-yet-assigned queue entry with a required reason. */
  cancelQueue: (ticketId: string, reason: string) => boolean;
  /** Admin only: change issue type / priority / repair date with an audit log entry. */
  adminUpdateTicket: (ticketId: string, patch: AdminCorePatch) => boolean;
  resetData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(loadData);
  const [rawTickets, setTickets] = useState<RepairTicket[]>(initial.tickets);
  const [notifications, setNotifications] = useState<LineNotification[]>(initial.notifications);
  const [lang, setLangState] = useState<Language>(loadLang());
  const [cancelLog, setCancelLog] = useState<CancelRecord[]>(initial.cancelLog);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deviceRoom, setDeviceRoom] = useState(loadRoom);
  const [viewAsRoom, setViewAsRoomState] = useState('');
  const myRoom = viewAsRoom || deviceRoom;
  const myRoomRef = useRef(myRoom);
  myRoomRef.current = myRoom;
  /** Room binding: a ticket is yours only if its room is this device's room. */
  const owns = useCallback((tk: RepairTicket) => !!myRoomRef.current && tk.room === myRoomRef.current, []);
  // `isYou` is derived from the room, never trusted from storage.
  const tickets = useMemo(() => rawTickets.map((tk) => ({ ...tk, isYou: !!myRoom && tk.room === myRoom })), [rawTickets, myRoom]);
  const myTickets = useMemo(() => tickets.filter((tk) => tk.isYou), [tickets]);
  const [toast, setToast] = useState<ToastMsg | null>(null);

  // Always-fresh snapshot so permission checks never use stale state.
  const stateRef = useRef({ tickets, notifications, cancelLog });
  stateRef.current = { tickets, notifications, cancelLog };
  const isAdminRef = useRef(false);
  isAdminRef.current = isAdmin;
  const langRef = useRef(lang);
  langRef.current = lang;
  // LINE log ids already seen, so a log written in another tab triggers exactly one toast here.
  const seenLog = useRef(new Set<string>(initial.tickets.flatMap((tk) => tk.lineLog.map((l) => l.id))));

  const showToast = useCallback((text: string, sub?: string) => {
    setToast({ id: newId('toast'), text, sub });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    saveData({ tickets, notifications, cancelLog });
  }, [tickets, notifications, cancelLog]);

  // Live data: pick up changes made in another tab/window (e.g. juristic marks a ticket fixed).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const incoming = parseStored(e.newValue);
      if (!incoming) return;
      const cur = stateRef.current;
      if (JSON.stringify(incoming.tickets) !== JSON.stringify(cur.tickets)) {
        // A LINE message written by the other side (e.g. juristic marked fixed) -> toast here.
        const fresh = incoming.tickets
          .flatMap((tk) => tk.lineLog.map((l) => ({ l, tk })))
          .filter(({ l }) => !seenLog.current.has(l.id));
        fresh.forEach(({ l }) => seenLog.current.add(l.id));
        const mine = fresh.find(({ l, tk }) => (isAdminRef.current ? l.to === 'juristic' : l.to === 'resident' && owns(tk)));
        if (mine) showToast(mine.l.text.split('\n')[0], translate(langRef.current, 'lineSimulatedToastSub'));
        setTickets(incoming.tickets);
      }
      if (JSON.stringify(incoming.notifications) !== JSON.stringify(cur.notifications))
        setNotifications(incoming.notifications);
      if (JSON.stringify(incoming.cancelLog) !== JSON.stringify(cur.cancelLog))
        setCancelLog(incoming.cancelLog);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [showToast]);

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

  const logoutAdmin = useCallback(() => {
    setIsAdmin(false);
    setViewAsRoomState('');
  }, []);

  const setViewAsRoom = useCallback((room: string) => setViewAsRoomState(normalizeRoom(room)), []);

  /** First login on a device creates the PIN; later logins must match it. */
  const loginRoom = useCallback((room: string, pin: string) => {
    const r = normalizeRoom(room);
    if (!r || !isValidPin(pin)) return false;
    const saved = loadPin();
    if (saved && saved !== pin) return false;
    saveSession(r, pin);
    setDeviceRoom(r);
    clearRoomParam();
    return true;
  }, []);

  const logoutRoom = useCallback((pin: string) => {
    if (pin !== loadPin()) return false;
    clearRoom();
    setDeviceRoom('');
    return true;
  }, []);

  const commitTickets = useCallback((next: RepairTicket[]) => {
    stateRef.current = { ...stateRef.current, tickets: next };
    setTickets(next);
  }, []);

  const makeNote = (text: string): TicketNote => ({
    id: newId('note'),
    text: text.trim(),
    createdAt: Date.now(),
    author: 'resident',
  });

  /** Tell residents on `date` whose position improved to `fromPos` or better. */
  const notifyMovedUp = useCallback((next: RepairTicket[], date: string, fromPos: number) => {
    const movedUp = next.filter(
      (tk) =>
        tk.repairDate === date &&
        (tk.status === 'queued' || tk.status === 'waiting') &&
        tk.queueOrder >= fromPos &&
        tk.queueOrder > 0,
    );
    if (movedUp.length > 0) {
      const notifs = movedUp.map((tk) => makeLineNotification(tk.room, tk.queueOrder, langRef.current));
      setNotifications((n) => [...notifs, ...n].slice(0, 20));
    }
  }, []);

  /* ---------------- Resident: book ---------------- */
  const addTicket = useCallback(
    (room: string, issueType: IssueType, description: string, repairDate: string): AddTicketResult => {
      const { tickets: current, cancelLog: log } = stateRef.current;
      if (!room) return { ok: false, error: 'room' };
      const today = todayISO();
      if (!isValidISO(repairDate) || repairDate < today || repairDate > addDaysISO(today, MAX_BOOKING_DAYS))
        return { ok: false, error: 'date' };

      // One active ticket per room per issue type.
      const dup = findActiveDuplicate(current, room, issueType);
      if (dup) return { ok: false, error: 'duplicate', ticketId: dup.ticketId };

      const used = [...current.map((tk) => tk.ticketId), ...log.map((c) => c.ticketId ?? '')];
      const seq = nextTicketSeq(repairDate, room, used);
      const ticketId = buildTicketId(repairDate, room, seq);
      const displayQ = nextDisplayQ(current, repairDate);
      const position = getQueueForDate(current, repairDate).length + 1;

      const ticket: RepairTicket = {
        id: newId('ticket'),
        ticketId,
        repairDate,
        displayQ,
        room,
        issueType,
        description: description.slice(0, 1000),
        status: 'queued',
        queueOrder: position,
        reportedAt: Date.now(),
        technicianId: null,
        isYou: true,
        photoEmoji: ISSUE_EMOJI[issueType],
        title: '',
        photos: [],
        notes: [],
        priority: 'normal',
        history: [entry('status', '', 'queued', 'resident')],
        lineLog: [],
      };
      commitTickets([...current, ticket]);
      return { ok: true, ticketId, displayQ, position, repairDate };
    },
    [commitTickets],
  );

  /* ---------------- Admin: workflow ---------------- */
  const assignTechnician = useCallback(
    (ticketId: string, techId: string) => {
      if (!isAdminRef.current) return;
      const nameOf = (id: string | null) => (id ? (TECHNICIAN_MAP[id]?.name ?? '') : '');
      commitTickets(
        stateRef.current.tickets.map((tk) => {
          if (tk.id !== ticketId || (tk.technicianId ?? '') === techId) return tk;
          return {
            ...tk,
            technicianId: techId || null,
            history: [...tk.history, entry('technician', nameOf(tk.technicianId), nameOf(techId || null), 'admin')],
          };
        }),
      );
    },
    [commitTickets],
  );

  const startRepair = useCallback(
    (ticketId: string) => {
      if (!isAdminRef.current) return;
      const current = stateRef.current.tickets;
      const ticket = current.find((tk) => tk.id === ticketId);
      if (!ticket || !ticket.technicianId || !inQueue(ticket)) return;
      // queueOrder 0 sorts first, so the in-progress repair is pinned to position 1 of its date.
      commitTickets(
        normalizeQueue(
          current.map((tk) =>
            tk.id === ticketId
              ? {
                  ...tk,
                  status: 'in_progress' as const,
                  queueOrder: 0,
                  history: [...tk.history, entry('status', tk.status, 'in_progress', 'admin')],
                }
              : tk,
          ),
        ),
      );
    },
    [commitTickets],
  );

  const markFixed = useCallback(
    (ticketId: string, photos: string[], note: string | undefined, simulateLine: boolean): LineLogEntry | null => {
      if (!isAdminRef.current) return null;
      const current = stateRef.current.tickets;
      const ticket = current.find((tk) => tk.id === ticketId);
      if (!ticket || (ticket.status !== 'in_progress' && ticket.status !== 'assigned')) return null;
      const proof = photos.slice(0, MAX_PHOTOS);
      if (proof.length === 0) return null; // photo of the fixed work is mandatory
      // Demo mode: juristic must tick "Simulate LINE push to resident" before the status changes.
      if (LINE_SIMULATED && !simulateLine) return null;

      const oldPos = ticket.queueOrder;
      const hist = entry('status', ticket.status, 'waiting_confirm', 'admin', {
        reason: (note ?? '').trim().slice(0, 500),
        photos: proof,
      });
      const techName = (ticket.technicianId && TECHNICIAN_MAP[ticket.technicianId]?.name) || '-';
      // Notification 1 (to resident). LINE only notifies - the app stays the source of truth.
      const log = pushLine('markFixed', fixedMessage(ticket, techName, hist.timestamp), hist.id);
      seenLog.current.add(log.id);

      const next = normalizeQueue(
        current.map((tk) =>
          tk.id === ticketId
            ? {
                ...tk,
                status: 'waiting_confirm' as const,
                queueOrder: 0,
                history: [...tk.history, hist],
                lineLog: [...tk.lineLog, log],
              }
            : tk,
        ),
      );
      commitTickets(next);
      notifyMovedUp(next, ticket.repairDate, oldPos);
      showToast(translate(langRef.current, 'lineSimulatedToast'), translate(langRef.current, 'lineSimulatedToastSub'));
      return log;
    },
    [commitTickets, notifyMovedUp, showToast],
  );

  const confirmFixed = useCallback(
    (ticketId: string): boolean => {
      const current = stateRef.current.tickets;
      const ticket = current.find((tk) => tk.id === ticketId);
      if (!ticket || !owns(ticket) || ticket.status !== 'waiting_confirm') return false;
      const hist = entry('status', 'waiting_confirm', 'completed', 'resident');
      // Notification 2 (to juristic).
      const log = pushLine('residentConfirmed', confirmedMessage(ticket, hist.timestamp), hist.id);
      seenLog.current.add(log.id);
      commitTickets(
        current.map((tk) =>
          tk.id === ticketId
            ? {
                ...tk,
                status: 'completed' as const,
                queueOrder: 0,
                history: [...tk.history, hist],
                lineLog: [...tk.lineLog, log],
              }
            : tk,
        ),
      );
      showToast(translate(langRef.current, 'thanksTitle'), translate(langRef.current, 'thanksLine'));
      return true;
    },
    [commitTickets, showToast],
  );

  const rejectFixed = useCallback(
    (ticketId: string, reason: string, photos: string[]): boolean => {
      const current = stateRef.current.tickets;
      const ticket = current.find((tk) => tk.id === ticketId);
      const clean = reason.trim();
      const proof = photos.slice(0, MAX_PHOTOS);
      // "No, still broken" needs BOTH a note and a photo.
      if (!ticket || !owns(ticket) || ticket.status !== 'waiting_confirm' || !clean || proof.length === 0) return false;
      const hist = entry('status', 'waiting_confirm', 'in_progress', 'resident', {
        reason: clean.slice(0, 500),
        photos: proof,
      });
      // Notification 3 (to juristic).
      const log = pushLine('residentRejected', rejectedMessage(ticket, clean.slice(0, 500), true), hist.id);
      seenLog.current.add(log.id);
      // Back to In Progress, pinned at the top of its date.
      commitTickets(
        normalizeQueue(
          current.map((tk) =>
            tk.id === ticketId
              ? {
                  ...tk,
                  status: 'in_progress' as const,
                  queueOrder: 0,
                  history: [...tk.history, hist],
                  lineLog: [...tk.lineLog, log],
                }
              : tk,
          ),
        ),
      );
      showToast(translate(langRef.current, 'rejectToast'), translate(langRef.current, 'lineSimulatedToastSub'));
      return true;
    },
    [commitTickets, showToast],
  );

  const closeTicket = useCallback(
    (ticketId: string, reason: string): boolean => {
      if (!isAdminRef.current) return false;
      const current = stateRef.current.tickets;
      const ticket = current.find((tk) => tk.id === ticketId);
      const clean = reason.trim();
      if (!ticket || !isOpenTicket(ticket) || !clean) return false;
      commitTickets(
        normalizeQueue(
          current.map((tk) =>
            tk.id === ticketId
              ? {
                  ...tk,
                  status: 'closed' as const,
                  queueOrder: 0,
                  history: [...tk.history, entry('status', tk.status, 'closed', 'admin', { reason: clean.slice(0, 500) })],
                }
              : tk,
          ),
        ),
      );
      return true;
    },
    [commitTickets],
  );

  const reorderTickets = useCallback(
    (sourceId: string, targetId: string) => {
      if (!isAdminRef.current) return;
      const current = stateRef.current.tickets;
      const source = current.find((tk) => tk.id === sourceId);
      const target = current.find((tk) => tk.id === targetId);
      // Reordering only happens inside ONE repair date - no cross-date moves.
      if (!source || !target || source.repairDate !== target.repairDate) return;
      const queue = getQueueForDate(current, source.repairDate);
      const sourceIdx = queue.findIndex((tk) => tk.id === sourceId);
      const targetIdx = queue.findIndex((tk) => tk.id === targetId);
      if (sourceIdx === -1 || targetIdx === -1 || sourceIdx === targetIdx) return;
      // The repair currently in progress stays at the top of its date.
      if (queue[sourceIdx].status === 'in_progress' || queue[targetIdx].status === 'in_progress') return;
      const reordered = [...queue];
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
      const ticket = current.find((tk) => tk.id === ticketId);
      if (!ticket) return;
      const queue = getQueueForDate(current, ticket.repairDate);
      const idx = queue.findIndex((tk) => tk.id === ticketId);
      if (idx === -1) return;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= queue.length) return;
      if (queue[swapIdx].status === 'in_progress') return;
      const reordered = [...queue];
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
      if (patch.repairDate !== undefined && !isValidISO(patch.repairDate)) return false;
      const dateChanged = patch.repairDate !== undefined && patch.repairDate !== ticket.repairDate;
      const urgentSet = patch.priority === 'urgent' && ticket.priority !== 'urgent';
      // Date changes and urgent priority must always carry a reason.
      if ((dateChanged || urgentSet) && !reason) return false;

      const note = patch.requestedNoteId ? ticket.notes.find((n) => n.id === patch.requestedNoteId) : null;
      const via = note ? note.text.slice(0, 120) : null;

      const entries: HistoryEntry[] = [];
      const push = (field: HistoryEntry['field'], from: string, to: string) =>
        entries.push(entry(field, from, to, 'admin', { reason, requestedViaNote: via }));

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
        const newDate = patch.repairDate!;
        push('repairDate', ticket.repairDate, newDate);
        updated.repairDate = newDate;
        // Joins the end of the new date's queue with the next Q label there.
        updated.displayQ = nextDisplayQ(current.filter((tk) => tk.id !== ticket.id), newDate);
        updated.queueOrder = 9999;
      }
      if (entries.length === 0) return false;

      updated.history = [...ticket.history, ...entries];
      let next = current.map((tk) => (tk.id === ticketId ? updated : tk));
      if (dateChanged) next = closeQGap(next, ticket.repairDate, ticket.displayQ, ticket.id);
      commitTickets(normalizeQueue(next));
      return true;
    },
    [commitTickets],
  );

  /* ---------------- Resident: add info only ---------------- */
  const updateTicketDetails = useCallback(
    (ticketId: string, patch: TicketDetailsPatch): boolean => {
      const current = stateRef.current.tickets;
      const ticket = current.find((tk) => tk.id === ticketId);
      // Permission gate: only the resident's own, still-unassigned ticket.
      if (!ticket || !owns(ticket) || isAssigned(ticket) || !isOpenTicket(ticket)) return false;

      // Whitelist: ONLY title / description / photos / note. Core fields are never copied from the patch.
      const updated: RepairTicket = {
        ...ticket,
        title: patch.title !== undefined ? patch.title.trim().slice(0, 80) : ticket.title,
        description:
          patch.description !== undefined ? patch.description.trim().slice(0, 1000) : ticket.description,
        photos: patch.photos !== undefined ? patch.photos.slice(0, MAX_PHOTOS) : ticket.photos,
        notes: patch.note?.trim() ? [...ticket.notes, makeNote(patch.note)] : ticket.notes,
      };
      const edited = [
        updated.title !== ticket.title && 'title',
        updated.description !== ticket.description && 'description',
        JSON.stringify(updated.photos) !== JSON.stringify(ticket.photos) && 'photos',
      ].filter(Boolean) as string[];
      if (edited.length > 0) updated.history = [...ticket.history, entry('details', '', edited.join(','), 'resident')];
      commitTickets(current.map((tk) => (tk.id === ticketId ? updated : tk)));
      return true;
    },
    [commitTickets],
  );

  const addNote = useCallback(
    (ticketId: string, text: string): boolean => {
      const current = stateRef.current.tickets;
      const ticket = current.find((tk) => tk.id === ticketId);
      if (!ticket || !owns(ticket) || !text.trim() || !isOpenTicket(ticket)) return false;
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
      if (!ticket || !owns(ticket) || !cleanReason) return false;
      // Assigned tickets can only be cancelled by juristic in /admin.
      if (isAssigned(ticket) || !isOpenTicket(ticket)) return false;

      const oldPos = ticket.queueOrder;
      // Delete, then recalculate Q labels and positions - for this repair date only.
      const remaining = current.filter((tk) => tk.id !== ticketId);
      const next = normalizeQueue(closeQGap(remaining, ticket.repairDate, ticket.displayQ, ticket.id));
      commitTickets(next);

      const record: CancelRecord = {
        id: newId('cancel'),
        ticketId: ticket.ticketId,
        repairDate: ticket.repairDate,
        room: ticket.room,
        queueNumber: ticket.displayQ,
        reason: cleanReason.slice(0, 500),
        title: ticket.title,
        issueType: ticket.issueType,
        timestamp: Date.now(),
      };
      setCancelLog((log) => [record, ...log].slice(0, 50));
      notifyMovedUp(next, ticket.repairDate, oldPos);
      return true;
    },
    [commitTickets, notifyMovedUp],
  );

  const resetData = useCallback(() => {
    clearData();
    seenLog.current = new Set();
    setTickets(INITIAL_TICKETS);
    setNotifications([]);
    setCancelLog([]);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      tickets,
      myTickets,
      myRoom,
      viewAsRoom,
      setViewAsRoom,
      loginRoom,
      logoutRoom,
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
      markFixed,
      confirmFixed,
      rejectFixed,
      toast,
      showToast,
      dismissToast,
      closeTicket,
      reorderTickets,
      moveTicket,
      updateTicketDetails,
      addNote,
      cancelQueue,
      adminUpdateTicket,
      resetData,
    }),
    [tickets, myTickets, myRoom, viewAsRoom, setViewAsRoom, loginRoom, logoutRoom, notifications, cancelLog, lang, isAdmin, setLang, t, loginAdmin, logoutAdmin, addTicket, assignTechnician, startRepair, markFixed, confirmFixed, rejectFixed, toast, showToast, dismissToast, closeTicket, reorderTickets, moveTicket, updateTicketDetails, addNote, cancelQueue, adminUpdateTicket, resetData],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

