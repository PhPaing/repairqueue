import type { RepairTicket } from '@/types';
import { TECHNICIAN_MAP } from '@/lib/constants';

/** Technician display name for a ticket, or null when nobody is assigned. */
export function getTechnicianName(ticket: RepairTicket): string | null {
  if (!ticket.technicianId) return null;
  return TECHNICIAN_MAP[ticket.technicianId]?.name ?? null;
}

/**
 * Core state rule:
 *   isAssigned = status === 'assigned' || technicianName != null
 */
export function isAssigned(ticket: RepairTicket): boolean {
  return ticket.status === 'assigned' || getTechnicianName(ticket) != null;
}

/** Resident can still change title/description/photos or cancel the queue. */
export function canResidentEdit(ticket: RepairTicket): boolean {
  return ticket.isYou && isOpen(ticket) && !isAssigned(ticket);
}

/** Resident can always ADD notes to their own open ticket. */
export function canResidentAddNote(ticket: RepairTicket): boolean {
  return ticket.isYou && isOpen(ticket);
}

export function isOpen(ticket: RepairTicket): boolean {
  return ticket.status !== 'completed' && ticket.status !== 'closed';
}
