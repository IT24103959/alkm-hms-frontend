import http from './http';

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginPayload { username: string; password: string; }
export interface LoginResponse {
  token: string;
  data: { user: { username: string; fullName: string; role: string; permissions: string[] } };
}

export const loginApi = (payload: LoginPayload) =>
  http<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify(payload) });

// ─── Profile ─────────────────────────────────────────────────────────────────

export interface UserProfile { username: string; fullName: string; role: string; email?: string; }

export const getMyProfile = async (): Promise<UserProfile> => {
  const { data } = await http<UserProfile>('/users/me'); return data;
};
export const updateMyProfile = async (payload: { fullName: string }): Promise<UserProfile> => {
  const { data } = await http<UserProfile>('/users/me', { method: 'PUT', body: JSON.stringify(payload) }); return data;
};
export const changeMyPassword = async (payload: { currentPassword: string; newPassword: string }): Promise<void> => {
  await http<void>('/users/me/change-password', { method: 'POST', body: JSON.stringify(payload) });
};

// ─── Staff ───────────────────────────────────────────────────────────────────

export interface StaffMember {
  id: number; name: string; position: string; basicSalary: number;
  attendance?: number; overtimeHours?: number; absentDays?: number;
  overtimeRate?: number; dailyRate?: number;
}
export interface StaffListResponse { content: StaffMember[]; totalElements: number; }

export const getStaff = async (params?: { name?: string; page?: number; size?: number }): Promise<StaffListResponse> => {
  const q = new URLSearchParams();
  if (params?.name) q.set('name', params.name);
  if (params?.page !== undefined) q.set('page', String(params.page));
  if (params?.size !== undefined) q.set('size', String(params.size));
  const { data } = await http<StaffListResponse>(`/staff?${q.toString()}`); return data;
};
export const getStaffById = async (id: number): Promise<StaffMember> => {
  const { data } = await http<StaffMember>(`/staff/${id}`); return data;
};
export const createStaff = async (payload: Omit<StaffMember, 'id'>): Promise<StaffMember> => {
  const { data } = await http<StaffMember>('/staff', { method: 'POST', body: JSON.stringify(payload) }); return data;
};
export const updateStaff = async (id: number, payload: Partial<StaffMember>): Promise<StaffMember> => {
  const { data } = await http<StaffMember>(`/staff/${id}`, { method: 'PUT', body: JSON.stringify(payload) }); return data;
};
export const softDeleteStaff = async (id: number): Promise<void> => {
  await http<void>(`/staff/${id}`, { method: 'DELETE' });
};

// ─── Payroll ─────────────────────────────────────────────────────────────────

export interface PayrollRecord {
  id: number; staffId?: number; staffName?: string; month: number; year: number;
  basicSalary?: number; overtimePay?: number; deductions?: number; netSalary?: number;
}

export const getAllPayroll = async (): Promise<PayrollRecord[]> => {
  const { data } = await http<PayrollRecord[]>('/payroll'); return data;
};
export const getMyPayroll = async (): Promise<PayrollRecord[]> => {
  const { data } = await http<PayrollRecord[]>('/payroll/my'); return data;
};
export const calculatePayroll = async (payload: { staffId: number; month: number; year: number }): Promise<PayrollRecord> => {
  const { data } = await http<PayrollRecord>('/payroll/calculate', { method: 'POST', body: JSON.stringify(payload) }); return data;
};

// ─── Rooms ───────────────────────────────────────────────────────────────────

export interface Room {
  id: number; roomNumber: string; roomType: string;
  photoUrl?: string; roomDescription?: string;
  capacity?: number; totalRooms?: number; remainingRooms?: number;
  normalPrice?: number; weekendPrice?: number; seasonalPrice?: number;
  roomStatus?: string;
}

export const getRooms = async (params?: { checkInDate?: string; checkOutDate?: string }): Promise<Room[]> => {
  const q = new URLSearchParams();
  if (params?.checkInDate) q.set('checkInDate', params.checkInDate);
  if (params?.checkOutDate) q.set('checkOutDate', params.checkOutDate);
  const qs = q.toString();
  const path = qs.length > 0 ? `/rooms?${qs}` : '/rooms';
  const { data } = await http<Room[]>(path); return data;
};
export const createRoomRecord = async (payload: Omit<Room, 'id'>): Promise<Room> => {
  const { data } = await http<Room>('/rooms', { method: 'POST', body: JSON.stringify(payload) }); return data;
};
export const updateRoomRecord = async (id: number, payload: Partial<Room>): Promise<Room> => {
  const { data } = await http<Room>(`/rooms/${id}`, { method: 'PUT', body: JSON.stringify(payload) }); return data;
};
export const deleteRoomRecord = async (id: number): Promise<void> => {
  await http<void>(`/rooms/${id}`, { method: 'DELETE' });
};

// ─── Room Bookings ────────────────────────────────────────────────────────────

export interface RoomBooking {
  id: number; bookingCustomer?: string; customerEmail?: string;
  roomNumber: string; bookedRooms?: number; guestCount?: number;
  checkInDate: string; checkOutDate: string; bookingStatus?: string;
}

export const getRoomBookings = async (): Promise<RoomBooking[]> => {
  const { data } = await http<RoomBooking[]>('/room-bookings'); return data;
};
export const getMyRoomBookings = async (): Promise<RoomBooking[]> => {
  const { data } = await http<RoomBooking[]>('/room-bookings/my'); return data;
};
export const createRoomBooking = async (payload: Omit<RoomBooking, 'id'>): Promise<RoomBooking> => {
  const { data } = await http<RoomBooking>('/room-bookings', { method: 'POST', body: JSON.stringify(payload) }); return data;
};
export const updateRoomBooking = async (id: number, payload: Partial<RoomBooking>): Promise<RoomBooking> => {
  const { data } = await http<RoomBooking>(`/room-bookings/${id}`, { method: 'PUT', body: JSON.stringify(payload) }); return data;
};
export const deleteRoomBooking = async (id: number): Promise<void> => {
  await http<void>(`/room-bookings/${id}`, { method: 'DELETE' });
};
export const requestRoomBookingCancellation = async (id: number): Promise<void> => {
  await http<void>(`/room-bookings/${id}/request-cancellation`, { method: 'PATCH' });
};
export const approveRoomBookingCancellation = async (id: number): Promise<void> => {
  await http<void>(`/room-bookings/${id}/approve-cancellation`, { method: 'PATCH' });
};

// ─── Table Reservations ───────────────────────────────────────────────────────

export interface TableReservation {
  id: number; customerName?: string; customerEmail?: string;
  reservationDate: string; guestCount: number; mealType: string;
  seatingPreference?: string; specialRequests?: string;
  status?: string; assignedTable?: string;
}

export const getReservations = async (): Promise<TableReservation[]> => {
  const { data } = await http<TableReservation[]>('/reservations'); return data;
};
export const getMyReservations = async (): Promise<TableReservation[]> => {
  const { data } = await http<TableReservation[]>('/reservations/my'); return data;
};
export const createReservation = async (payload: Omit<TableReservation, 'id'>): Promise<TableReservation> => {
  const { data } = await http<TableReservation>('/reservations', { method: 'POST', body: JSON.stringify(payload) }); return data;
};
export const updateReservationStatus = async (id: number, status: string): Promise<void> => {
  await http<void>(`/reservations/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
};
export const assignReservationTable = async (id: number, assignedTable: string): Promise<void> => {
  await http<void>(`/reservations/${id}/assign-table`, { method: 'PATCH', body: JSON.stringify({ assignedTable }) });
};
export const cancelReservation = async (id: number): Promise<void> => {
  await http<void>(`/reservations/${id}/cancel`, { method: 'POST' });
};

// ─── Menu Items ───────────────────────────────────────────────────────────────

export interface MenuItem {
  id: number; name: string; cuisine: string; price: number;
  description?: string; badge?: string; mealService?: string;
  available: boolean; imageUrl?: string;
}

export const getMenuItems = async (params?: { search?: string; cuisine?: string }): Promise<MenuItem[]> => {
  const q = new URLSearchParams();
  if (params?.search) q.set('search', params.search);
  if (params?.cuisine) q.set('cuisine', params.cuisine);
  const qs = q.toString();
  const path = qs.length > 0 ? `/menu-items?${qs}` : '/menu-items';
  const { data } = await http<MenuItem[]>(path); return data;
};
export const createMenuItem = async (payload: Omit<MenuItem, 'id'>): Promise<MenuItem> => {
  const { data } = await http<MenuItem>('/menu-items', { method: 'POST', body: JSON.stringify(payload) }); return data;
};
export const updateMenuItem = async (id: number, payload: Partial<MenuItem>): Promise<MenuItem> => {
  const { data } = await http<MenuItem>(`/menu-items/${id}`, { method: 'PUT', body: JSON.stringify(payload) }); return data;
};
export const deleteMenuItem = async (id: number): Promise<void> => {
  await http<void>(`/menu-items/${id}`, { method: 'DELETE' });
};
export const toggleMenuItemAvailability = async (id: number, available: boolean): Promise<void> => {
  await http<void>(`/menu-items/${id}/availability?available=${available}`, { method: 'PATCH' });
};

// ─── Event Bookings ───────────────────────────────────────────────────────────

export interface EventBooking {
  id: number; customerName?: string; customerEmail?: string;
  hallName: string; eventDateTime: string; endDateTime: string;
  guestCount: number; packageName?: string; pricePerGuest?: number;
  totalPrice?: number; status?: string; notes?: string;
}

export const getEventBookings = async (): Promise<EventBooking[]> => {
  const { data } = await http<EventBooking[]>('/event-bookings'); return data;
};
export const createEventBooking = async (payload: Omit<EventBooking, 'id'>): Promise<EventBooking> => {
  const { data } = await http<EventBooking>('/event-bookings', { method: 'POST', body: JSON.stringify(payload) }); return data;
};
export const updateEventBooking = async (id: number, payload: Partial<EventBooking>): Promise<EventBooking> => {
  const { data } = await http<EventBooking>(`/event-bookings/${id}`, { method: 'PUT', body: JSON.stringify(payload) }); return data;
};
export const deleteEventBooking = async (id: number): Promise<void> => {
  await http<void>(`/event-bookings/${id}`, { method: 'DELETE' });
};
export interface EventAnalytics { events: number; eventRevenue: number; popularTypes?: Record<string, number>; }
export const getEventAnalytics = async (): Promise<EventAnalytics> => {
  const { data } = await http<EventAnalytics>('/event-bookings/analytics'); return data;
};
