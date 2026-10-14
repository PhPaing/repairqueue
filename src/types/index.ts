export type RepairStatus =
  | 'in_progress'
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

/** Admin-only audit entry for a core-field change. */
export interface HistoryEntry {
  id: string;
  field: 'issueType' | 'priority' | 'scheduledDate' | 'queueOrder';
  /** Raw values: issue/priority keys, 'YYYY-MM-DD' for dates, 'Q3' for queue. */
  from: string;
  to: string;
  reason: string;
  by: 'admin';
  timestamp: number;
  /** Snapshot of the resident note this change was requested through, if any. */
  requestedViaNote: string | null;
}

export interface TicketNote {
  id: string;
  text: string;
  createdAt: number;
  author: 'resident' | 'juristic';
}

export interface CancelRecord {
  id: string;
  room: string;
  queueNumber: number;
  reason: string;
  title: string;
  issueType: IssueType;
  timestamp: number;
}

export interface RepairTicket {
  id: string;
  room: string;
  issueType: IssueType;
  description: string;
  status: RepairStatus;
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
  /** Scheduled service date ('YYYY-MM-DD'), set by juristic only. */
  scheduledDate: string | null;
  /** Audit log of admin changes to core fields. */
  history: HistoryEntry[];
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
