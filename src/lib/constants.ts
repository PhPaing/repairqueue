import type { IssueType, RepairTicket, Technician } from '@/types';

export const TECHNICIANS: Technician[] = [
  { id: 'tech_chai', name: "P' Chai", avatar: '👷‍♂️' },
  { id: 'tech_som', name: "P' Som", avatar: '👷‍♀️' },
];

export const TECHNICIAN_MAP: Record<string, Technician> = TECHNICIANS.reduce(
  (acc, t) => ({ ...acc, [t.id]: t }),
  {} as Record<string, Technician>,
);

export const ROOMS = ['A-101', 'B-205', 'C-302', 'D-110', 'E-501', 'F-204'];

export const ISSUE_TYPES: { value: IssueType; emoji: string }[] = [
  { value: 'air_con', emoji: '❄️' },
  { value: 'door_lock', emoji: '🔒' },
  { value: 'water_pipe', emoji: '🚿' },
  { value: 'electric', emoji: '💡' },
  { value: 'plumbing', emoji: '🚽' },
  { value: 'other', emoji: '🛠️' },
];

export const ISSUE_EMOJI: Record<IssueType, string> = {
  air_con: '❄️',
  door_lock: '🔒',
  water_pipe: '🚿',
  electric: '💡',
  plumbing: '🚽',
  other: '🛠️',
};

export const ADMIN_PASSWORD = '1234';

export const STORAGE_KEY = 'condo-repair-queue-v1';
export const LANG_KEY = 'condo-repair-queue-lang';

const now = Date.now();

export const INITIAL_TICKETS: RepairTicket[] = [
  {
    id: 'ticket-1',
    room: 'A-101',
    issueType: 'air_con',
    description: 'Air conditioner leaking water onto the floor, dripping constantly.',
    status: 'in_progress',
    queueOrder: 1,
    reportedAt: now - 1000 * 60 * 60 * 5,
    technicianId: 'tech_chai',
    isYou: false,
    photoEmoji: '❄️',
  },
  {
    id: 'ticket-2',
    room: 'B-205',
    issueType: 'door_lock',
    description: 'Door lock is stuck, cannot lock from outside.',
    status: 'queued',
    queueOrder: 2,
    reportedAt: now - 1000 * 60 * 60 * 3,
    technicianId: null,
    isYou: true,
    photoEmoji: '🔒',
  },
  {
    id: 'ticket-3',
    room: 'C-302',
    issueType: 'water_pipe',
    description: 'Water pipe under sink is leaking slowly.',
    status: 'queued',
    queueOrder: 3,
    reportedAt: now - 1000 * 60 * 60 * 2,
    technicianId: null,
    isYou: false,
    photoEmoji: '🚿',
  },
  {
    id: 'ticket-4',
    room: 'D-110',
    issueType: 'electric',
    description: 'Ceiling light flickering in the living room.',
    status: 'queued',
    queueOrder: 4,
    reportedAt: now - 1000 * 60 * 45,
    technicianId: null,
    isYou: false,
    photoEmoji: '💡',
  },
];
