export type RepairStatus = 'in_progress' | 'queued' | 'waiting' | 'completed' | 'closed';

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
