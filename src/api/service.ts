import http from "./http";

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardSummary {
    totalStaff: number;
    totalSalaryPaid: number;
    totalPayrollRecords: number;
    totalRooms: number;
    roomBookings: number;
    totalRoomsChangePercent: number;
    roomBookingsChangePercent: number;
    mostBookedRooms: Array<{ bookings: number; roomNumber: string }>;
    leastBookedRooms: Array<{ bookings: number; roomNumber: string }>;
}
export const getDashboardSummary = async (): Promise<DashboardSummary> => {
    const { data } = await http<DashboardSummary>("/dashboard/summary");
    return data;
};

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginPayload {
    username: string;
    password: string;
}
export interface LoginResponse {
    token: string;
    data: { user: { username: string; fullName: string; role: string; permissions: string[] } };
}

export const loginApi = (payload: LoginPayload) => http<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify(payload) });

// ─── Profile ─────────────────────────────────────────────────────────────────

export interface UserProfile {
    username: string;
    fullName: string;
    role: string;
    email?: string;
}

export const getMyProfile = async (): Promise<UserProfile> => {
    const { data } = await http<UserProfile>("/users/me");
    return data;
};
export const updateMyProfile = async (payload: { fullName: string }): Promise<UserProfile> => {
    const { data } = await http<UserProfile>("/users/me", { method: "PUT", body: JSON.stringify(payload) });
    return data;
};
export const changeMyPassword = async (payload: { currentPassword: string; newPassword: string }): Promise<void> => {
    await http<void>("/users/me/change-password", { method: "POST", body: JSON.stringify(payload) });
};

// ─── Staff ───────────────────────────────────────────────────────────────────

export interface StaffMember {
    _id: string;
    name: string;
    username?: string;
    password?: string;
    position: string;
    basicSalary: number;
    attendance?: number;
    overtimeHours?: number;
    absentDays?: number;
    overtimeRate?: number;
    dailyRate?: number;
    status?: string;
    user?: { _id: string; username: string; fullName: string; role: string } | null;
}

export interface StaffListResponse {
    content: StaffMember[];
    total: number;
    totalPages: number;
}

export const getStaff = async (params?: { name?: string; page?: number; size?: number; role?: string }): Promise<StaffListResponse> => {
    const q = new URLSearchParams();
    if (params?.name) q.set("name", params.name);
    if (params?.page !== undefined) q.set("page", String(params.page));
    if (params?.size !== undefined) q.set("size", String(params.size));
    if (params?.role) q.set("role", params.role);
    const { data } = await http<StaffListResponse>(`/staff?${q.toString()}`);
    return data;
};

// ── Housekeeping & Maintenance ────────────────────────────────────────────────────────────

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

// ── Housekeeping ────────────────────────────────────────────────────────────

export const getHousekeepingTasks = () => http<HousekeepingTask[]>("/housekeeping");

export const getHousekeepingStats = () => http<HousekeepingStats>("/housekeeping/stats");

export const createHousekeepingTask = (payload: Partial<HousekeepingTask>) =>
    http<HousekeepingTask>("/housekeeping", {
        method: "POST",
        body: JSON.stringify(payload),
    });

export const updateHousekeepingTask = (_id: string, payload: Partial<HousekeepingTask>) =>
    http<HousekeepingTask>(`/housekeeping/${_id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });

export const updateHousekeepingTaskStatus = (_id: string, status: string) =>
    http<HousekeepingTask>(`/housekeeping/${_id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
    });

export const deleteHousekeepingTask = (_id: string) => http<void>(`/housekeeping/${_id}`, { method: "DELETE" });

// ─── Rooms ───────────────────────────────────────────────────────────────────

export interface Room {
    _id: string;
    roomNumber: string;
    roomType: string;
    photoUrl?: string;
    roomDescription?: string;
    capacity?: number;
    totalRooms?: number;
    remainingRooms?: number;
    normalPrice?: number;
    weekendPrice?: number;
    seasonalPrice?: number;
    roomStatus?: string;
}

export const getRooms = async (params?: { checkInDate?: string; checkOutDate?: string }): Promise<Room[]> => {
    const q = new URLSearchParams();
    if (params?.checkInDate) q.set("checkInDate", params.checkInDate);
    if (params?.checkOutDate) q.set("checkOutDate", params.checkOutDate);
    const qs = q.toString();
    const path = qs.length > 0 ? `/rooms?${qs}` : "/rooms";
    const { data } = await http<Room[]>(path);
    return data;
};
export const createRoomRecord = async (payload: Omit<Room, "_id">): Promise<Room> => {
    const { data } = await http<Room>("/rooms", { method: "POST", body: JSON.stringify(payload) });
    return data;
};
export const updateRoomRecord = async (id: string, payload: Partial<Room>): Promise<Room> => {
    const { data } = await http<Room>(`/rooms/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    return data;
};
export const deleteRoomRecord = async (id: string): Promise<void> => {
    await http<void>(`/rooms/${id}`, { method: "DELETE" });
};

// ─── Room Bookings ────────────────────────────────────────────────────────────

export interface RoomBooking {
    _id: string;
    bookingCustomer?: string;
    customerEmail?: string;
    roomNumber: string;
    bookedRooms?: number;
    guestCount?: number;
    checkInDate: string;
    checkOutDate: string;
    bookingStatus?: string;
}

export const getRoomBookings = async (): Promise<RoomBooking[]> => {
    const { data } = await http<RoomBooking[]>("/room-bookings");
    return data;
};
export const getMyRoomBookings = async (): Promise<RoomBooking[]> => {
    const { data } = await http<RoomBooking[]>("/room-bookings/my");
    return data;
};
export const createRoomBooking = async (payload: Omit<RoomBooking, "_id">): Promise<RoomBooking> => {
    const { data } = await http<RoomBooking>("/room-bookings", { method: "POST", body: JSON.stringify(payload) });
    return data;
};
export const updateRoomBooking = async (id: string, payload: Partial<RoomBooking>): Promise<RoomBooking> => {
    const { data } = await http<RoomBooking>(`/room-bookings/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    return data;
};
export const deleteRoomBooking = async (id: string): Promise<void> => {
    await http<void>(`/room-bookings/${id}`, { method: "DELETE" });
};
export const requestRoomBookingCancellation = async (id: string): Promise<void> => {
    await http<void>(`/room-bookings/${id}/request-cancellation`, { method: "PATCH" });
};
export const approveRoomBookingCancellation = async (id: string): Promise<void> => {
    await http<void>(`/room-bookings/${id}/approve-cancellation`, { method: "PATCH" });
};

// ── Maintenance ────────────────────────────────────────────────────────────

export const getMaintenanceTickets = () => http<MaintenanceTicket[]>("/maintenance");

export const getMaintenanceStats = () => http<MaintenanceStats>("/maintenance/stats");

export const createMaintenanceTicket = (payload: Partial<MaintenanceTicket>) =>
    http<MaintenanceTicket>("/maintenance", {
        method: "POST",
        body: JSON.stringify(payload),
    });

export const updateMaintenanceTicket = (_id: string, payload: Partial<MaintenanceTicket>) =>
    http<MaintenanceTicket>(`/maintenance/${_id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });

export const updateMaintenanceTicketStatus = (_id: string, status: string) =>
    http<MaintenanceTicket>(`/maintenance/${_id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
    });

export const deleteMaintenanceTicket = (_id: string) => http<void>(`/maintenance/${_id}`, { method: "DELETE" });

// ── Staff & Rooms for Housekeeping & Maintenance ──────────────────────────────────────────────────────────

export const getRoomServiceStaff = () => http<RoomServiceStaff[]>("/staff");

export const getRooms = () => http<Room[]>("/rooms");
