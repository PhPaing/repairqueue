export type RepairStatus =
  | 'in_progress'
  | 'waiting_confirm'
  | 'assigned'
  | 'queued'
  | 'waiting'
  | 'completed'
  | 'closed';

export type IssueType =
  | 'air_con'
  | 'door_lock'
  | 'water_pipe'
  | 'electric'
  | 'plumbing'
  | 'other';

export type Language = 'th' | 'en';

export interface Technician {
  id: string;
  name: string;
  avatar: string;
}

export type Priority = 'normal' | 'high' | 'urgent';

/** Audit entry for a core-field change or a status action (admin or resident). */
export interface HistoryEntry {
  id: string;
  field: 'issueType' | 'priority' | 'repairDate' | 'queueOrder' | 'status' | 'technician' | 'details';
  /** Raw values: issue/priority/status keys, 'YYYY-MM-DD' for dates, '#3' for position, technician name,
   *  comma-separated edited fields ('title,photos') for 'details'. An empty `from` means "did not exist yet". */
  from: string;
  to: string;
  reason: string;
  by: 'admin' | 'resident';
  /** Photos attached to this action (proof of fix / "still broken" photos). */
  photos?: string[];
  timestamp: number;
  /** Snapshot of the resident note this change was requested through, if any. */
  requestedViaNote: string | null;
}

export type LineMessageType = 'markFixed' | 'residentConfirmed' | 'residentRejected';

/**
 * One LINE message that was (or, in demo mode, would be) pushed. Stored on the ticket as an audit trail.
 * The app stays the source of truth - LINE only notifies.
 */
export interface LineLogEntry {
  id: string;
  type: LineMessageType;
  /** Who the message goes to. */
  to: 'resident' | 'juristic';
  sent: true;
  sentAt: number;
  /** true until a real CHANNEL_ACCESS_TOKEN is configured. */
  simulated: boolean;
  /** Exact message text. */
  text: string;
  /** History entry whose photos belong to this message (kept there to avoid storing photos twice). */
  historyId?: string;
}

export interface TicketNote {
  id: string;
  text: string;
  createdAt: number;
  author: 'resident' | 'juristic';
}

export interface CancelRecord {
  id: string;
  ticketId?: string;
  repairDate?: string;
  room: string;
  queueNumber: number;
  reason: string;
  title: string;
  issueType: IssueType;
  timestamp: number;
}

export interface RepairTicket {
  /** Internal key. */
  id: string;
  /** Permanent public id: DDMM-ROOM-SEQ (e.g. 1810-1201-1). Never changes. */
  ticketId: string;
  /** Booked repair date ('YYYY-MM-DD'). Q numbers are counted per date. */
  repairDate: string;
  /** Q label within repairDate (booking order, e.g. Q1, Q2). */
  displayQ: number;
  room: string;
  issueType: IssueType;
  description: string;
  status: RepairStatus;
  /** Dynamic position within repairDate (admin can reorder, e.g. urgent). 0 = not in queue. */
  queueOrder: number;
  reportedAt: number;
  technicianId: string | null;
  isYou: boolean;
  photoEmoji: string;
  /** Optional resident-editable title (falls back to issue type label). */
  title: string;
  /** Resident-added photos (compressed data URLs). */
  photos: string[];
  /** Append-only note history. */
  notes: TicketNote[];
  /** Core field set by juristic only. */
  priority: Priority;
  /** Audit log of every change (admin and resident). */
  history: HistoryEntry[];
  /** LINE notifications sent for this ticket (simulated in demo mode). */
  lineLog: LineLogEntry[];
}

export interface LineNotification {
  id: string;
  room: string;
  message: string;
  messageTh: string;
  timestamp: number;
  queueNumber: number;
}

export interface RepairStats {
  totalQueued: number;
  avgWaitDays: number;
  completedToday: number;
}
