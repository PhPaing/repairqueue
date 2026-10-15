import type { IssueType, RepairTicket, Technician } from '@/types';
import { addDaysISO, buildTicketId, todayISO } from './dates';

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

/**
 * Juristic contact channels used by "Contact Juristic to Cancel".
 * - LINE_OA_ID: your LINE Official Account id including "@" (e.g. '@mycondo').
 *   Leave '' to open LINE's share sheet so the resident picks the juristic chat.
 * - PHONE: e.g. '+66212345678'. Leave '' to hide the call button.
 */
export const JURISTIC_LINE_OA_ID = '';
export const JURISTIC_PHONE = '';

/**
 * LINE Messaging API. Leave the token empty to run in DEMO mode: every LINE push is simulated
 * (logged + previewed with a "Simulated" badge, nothing leaves the browser).
 * A real CHANNEL_ACCESS_TOKEN is a secret - it must live in a server function (e.g. a Netlify function),
 * never in this client bundle, so do not paste it here.
 */
export const LINE_CHANNEL_ACCESS_TOKEN = '';
/** Shown inside LINE messages. */
export const APP_HOST = 'repairqueue.netlify.app';

export const MAX_PHOTOS = 4;
/** How far ahead a resident may book a repair date. */
export const MAX_BOOKING_DAYS = 90;

export const STORAGE_KEY = 'condo-repair-queue-v1';
export const LANG_KEY = 'condo-repair-queue-lang';

const now = Date.now();
const today = todayISO();
const inTwoDays = addDaysISO(today, 2);

const base = {
  title: '',
  photos: [] as string[],
  notes: [],
  priority: 'normal' as const,
  history: [],
  lineLog: [],
};

export const INITIAL_TICKETS: RepairTicket[] = [
  {
    ...base,
    id: 'ticket-1',
    ticketId: buildTicketId(today, 'A-101', 1),
    repairDate: today,
    displayQ: 1,
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
    ...base,
    id: 'ticket-2',
    ticketId: buildTicketId(today, 'B-205', 1),
    repairDate: today,
    displayQ: 2,
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
    ...base,
    id: 'ticket-3',
    ticketId: buildTicketId(today, 'C-302', 1),
    repairDate: today,
    displayQ: 3,
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
    ...base,
    id: 'ticket-4',
    ticketId: buildTicketId(inTwoDays, 'D-110', 1),
    repairDate: inTwoDays,
    displayQ: 1,
    room: 'D-110',
    issueType: 'electric',
    description: 'Ceiling light flickering in the living room.',
    status: 'queued',
    queueOrder: 1,
    reportedAt: now - 1000 * 60 * 45,
    technicianId: null,
    isYou: false,
    photoEmoji: '💡',
  },
];
