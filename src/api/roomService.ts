import { roomServiceHttp } from './roomServiceHttp';

// ── Types ──────────────────────────────────────────────────────────────────

export interface HousekeepingTask {
  _id: string;
  roomNumber: string;
  roomCondition: string;
  taskType: string;
  status: string;
  priority: string;
  staff?: string;
  assignedStaff?: { _id?: string; name: string };
  deadline?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HousekeepingStats {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
  avgCompletionTimeHours: string;
}

export interface MaintenanceTicket {
  _id: string;
  roomNumber: string;
  facilityType: string;
  issueDescription: string;
  status: string;
  priority: string;
  staff?: string;
  assignedStaff?: { _id?: string; name: string };
  deadline?: string;
  resolutionNotes?: string;
  partsUsed?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MaintenanceStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  overdueTickets: number;
  avgResolutionTimeHours: string;
  recurringIssues: Array<{ _id: string; count: number }>;
}

export interface RoomServiceStaff {
  id: number;
  name: string;
  role: string;
}

export interface Room {
  _id: string;
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

export const updateHousekeepingTask = (_id: string, payload: Partial<HousekeepingTask>) =>
  roomServiceHttp<HousekeepingTask>(`/housekeeping/${_id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const updateHousekeepingTaskStatus = (_id: string, status: string) =>
  roomServiceHttp<HousekeepingTask>(`/housekeeping/${_id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export const deleteHousekeepingTask = (_id: string) =>
  roomServiceHttp<void>(`/housekeeping/${_id}`, { method: 'DELETE' });

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

export const updateMaintenanceTicket = (_id: string, payload: Partial<MaintenanceTicket>) =>
  roomServiceHttp<MaintenanceTicket>(`/maintenance/${_id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const updateMaintenanceTicketStatus = (_id: string, status: string) =>
  roomServiceHttp<MaintenanceTicket>(`/maintenance/${_id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export const deleteMaintenanceTicket = (_id: string) =>
  roomServiceHttp<void>(`/maintenance/${_id}`, { method: 'DELETE' });

// ── Staff & Rooms ──────────────────────────────────────────────────────────

export const getRoomServiceStaff = () =>
  roomServiceHttp<RoomServiceStaff[]>('/staff');

export const getRooms = () =>
  roomServiceHttp<Room[]>('/rooms');
