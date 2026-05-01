import { roomServiceHttp } from './roomServiceHttp';

// ── Types ──────────────────────────────────────────────────────────────────

export interface HousekeepingTask {
  id: number;
  roomNumber: string;
  roomCondition: string;
  taskType: string;
  status: string;
  priority: string;
  staffId?: number;
  assignedStaff?: { id: number; name: string };
  deadline?: string;
  notes?: string;
  cleaningNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HousekeepingStats {
  total: number;
  pending: number;
  inProgress?: number;
  inspected: number;
}

export interface MaintenanceTicket {
  id: number;
  roomNumber: string;
  facilityType: string;
  issueDescription: string;
  status: string;
  priority: string;
  staffId?: number;
  assignedStaff?: { id: number; name: string };
  deadline?: string;
  resolutionNotes?: string;
  partsUsed?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MaintenanceStats {
  total: number;
  open: number;
  inProgress?: number;
  resolved: number;
}

export interface RoomServiceStaff {
  id: number;
  name: string;
  role: string;
}

export interface Room {
  id: number;
  roomNumber: string;
  type?: string;
  status?: string;
}

// ── Housekeeping ───────────────────────────────────────────────────────────

export const getHousekeepingTasks = () =>
  roomServiceHttp<HousekeepingTask[]>('/housekeeping');

export const getHousekeepingStats = () =>
  roomServiceHttp<HousekeepingStats>('/housekeeping/stats');

export const createHousekeepingTask = (payload: Partial<HousekeepingTask>) =>
  roomServiceHttp<HousekeepingTask>('/housekeeping', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateHousekeepingTask = (id: number, payload: Partial<HousekeepingTask>) =>
  roomServiceHttp<HousekeepingTask>(`/housekeeping/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const updateHousekeepingTaskStatus = (id: number, status: string) =>
  roomServiceHttp<HousekeepingTask>(`/housekeeping/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export const deleteHousekeepingTask = (id: number) =>
  roomServiceHttp<void>(`/housekeeping/${id}`, { method: 'DELETE' });

// ── Maintenance ────────────────────────────────────────────────────────────

export const getMaintenanceTickets = () =>
  roomServiceHttp<MaintenanceTicket[]>('/maintenance');

export const getMaintenanceStats = () =>
  roomServiceHttp<MaintenanceStats>('/maintenance/stats');

export const createMaintenanceTicket = (payload: Partial<MaintenanceTicket>) =>
  roomServiceHttp<MaintenanceTicket>('/maintenance', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateMaintenanceTicket = (id: number, payload: Partial<MaintenanceTicket>) =>
  roomServiceHttp<MaintenanceTicket>(`/maintenance/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const updateMaintenanceTicketStatus = (id: number, status: string) =>
  roomServiceHttp<MaintenanceTicket>(`/maintenance/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export const deleteMaintenanceTicket = (id: number) =>
  roomServiceHttp<void>(`/maintenance/${id}`, { method: 'DELETE' });

// ── Staff & Rooms ──────────────────────────────────────────────────────────

export const getRoomServiceStaff = () =>
  roomServiceHttp<RoomServiceStaff[]>('/staff');

export const getRooms = () =>
  roomServiceHttp<Room[]>('/rooms');
