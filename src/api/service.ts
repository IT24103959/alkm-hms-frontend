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
    _id: string;
    username: string;
    fullName: string;
    role: string;
    email?: string;
    enabled?: boolean;
    photoUrl?: string | null;
    position?: string | null;
    basicSalary?: number;
    attendance?: number;
    overtimeHours?: number;
    absentDays?: number;
    overtimeRate?: number;
    dailyRate?: number;
}

export const getUsers = async (): Promise<UserProfile[]> => {
    const { data } = await http<{ users: UserProfile[] }>("/auth/users");
    return data.users;
};

export const getMyProfile = async (): Promise<UserProfile> => {
    const { data } = await http<{ user: UserProfile }>("/auth/me");
    return data.user;
};
export const updateMyProfile = async (payload: {
    fullName?: string;
    username?: string;
    photoUrl?: string | null;
}): Promise<UserProfile> => {
    const { data } = await http<{ user: UserProfile }>("/auth/update-profile", { method: "PUT", body: JSON.stringify(payload) });
    return data.user;
};
export const changeMyPassword = async (payload: { currentPassword: string; newPassword: string }): Promise<void> => {
    await http<void>("/auth/change-password", { method: "PUT", body: JSON.stringify(payload) });
};

export interface UserMutationPayload {
    username: string;
    fullName: string;
    password?: string;
    role: string;
    enabled?: boolean;
    photoUrl?: string | null;
    position?: string | null;
    basicSalary?: number;
    attendance?: number;
    overtimeHours?: number;
    absentDays?: number;
    overtimeRate?: number;
    dailyRate?: number;
}

export const createUser = async (payload: UserMutationPayload): Promise<UserProfile> => {
    const { data } = await http<{ user: UserProfile }>("/auth/users", {
        method: "POST",
        body: JSON.stringify(payload),
    });
    return data.user;
};

export const updateUser = async (id: string, payload: Partial<UserMutationPayload>): Promise<UserProfile> => {
    const { data } = await http<{ user: UserProfile }>(`/auth/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
    return data.user;
};

export const deleteUser = async (id: string): Promise<void> => {
    await http<void>(`/auth/users/${id}`, { method: "DELETE" });
};

// ─── Staff ───────────────────────────────────────────────────────────────────

export interface StaffMember {
    _id: string;
    name: string;
    username?: string;
    password?: string;
    fullName?: string;
    role?: string;
    position: string;
    basicSalary: number;
    attendance?: number;
    overtimeHours?: number;
    absentDays?: number;
    overtimeRate?: number;
    dailyRate?: number;
    status?: string;
    enabled?: boolean;
    photoUrl?: string | null;
    user?: { _id: string; username: string; fullName: string; role: string } | null;
}

export interface StaffListResponse {
    content: StaffMember[];
    total: number;
    totalPages: number;
}

export const getStaff = async (params?: { name?: string; page?: number; size?: number; role?: string }): Promise<StaffListResponse> => {
    const users = await getUsers();
    const staffRoles = new Set([
        "SUPER_ADMIN",
        "MANAGER",
        "STAFF_MEMBER",
        "RESTAURANT_MANAGER",
        "EVENT_MANAGER",
        "HOUSEKEEPER",
        "MAINTENANCE_STAFF",
    ]);
    let filtered = users.filter((user) => staffRoles.has(user.role));
    if (params?.name) {
        const query = params.name.toLowerCase();
        filtered = filtered.filter((user) =>
            user.fullName.toLowerCase().includes(query) ||
            user.username.toLowerCase().includes(query),
        );
    }
    if (params?.role) {
        filtered = filtered.filter((user) => user.role === params.role);
    }

    const content: StaffMember[] = filtered.map((user) => ({
        _id: user._id,
        name: user.fullName,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        position: user.position ?? "",
        basicSalary: user.basicSalary ?? 0,
        attendance: user.attendance ?? 0,
        overtimeHours: user.overtimeHours ?? 0,
        absentDays: user.absentDays ?? 0,
        overtimeRate: user.overtimeRate ?? 0,
        dailyRate: user.dailyRate ?? 0,
        enabled: user.enabled ?? true,
        status: user.enabled === false ? "INACTIVE" : "ACTIVE",
        photoUrl: user.photoUrl ?? null,
        user: {
            _id: user._id,
            username: user.username,
            fullName: user.fullName,
            role: user.role,
        },
    }));

    return {
        content,
        total: content.length,
        totalPages: 1,
    };
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

export const getRoomsforRoomService = () => http<Room[]>("/rooms");

// ─── Payroll ──────────────────────────────────────────────────────────────────

export interface Payroll {
    _id: string;
    user: {
        _id: string;
        username: string;
        fullName: string;
        role: string;
    };
    month: string;
    year: number;
    basicSalary: number;
    overtimeHours: number;
    overtimeRate: number;
    overtimePay: number;
    absentDays: number;
    dailyRate: number;
    deductions: number;
    bonuses: number;
    netSalary: number;
    status: "PENDING" | "PAID";
    paymentDate?: string;
    remarks?: string;
    createdAt?: string;
    updatedAt?: string;
}

export const getPayrolls = async (): Promise<Payroll[]> => {
    const { data } = await http<{ payrolls: Payroll[] }>("/payroll");
    return data.payrolls;
};

export const createPayroll = async (payload: {
    userId: string;
    month: string;
    year: number;
    bonuses?: number;
    remarks?: string;
}): Promise<Payroll> => {
    const { data } = await http<{ payroll: Payroll }>("/payroll", {
        method: "POST",
        body: JSON.stringify(payload),
    });
    return data.payroll;
};

export const updatePayroll = async (
    id: string,
    payload: Partial<Payroll> & {
        userId?: string;
        basicSalary?: number;
        overtimeHours?: number;
        overtimeRate?: number;
        absentDays?: number;
        dailyRate?: number;
        bonuses?: number;
        status?: "PENDING" | "PAID";
    },
): Promise<Payroll> => {
    const { data } = await http<{ payroll: Payroll }>(`/payroll/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
    return data.payroll;
};

export const deletePayroll = async (id: string): Promise<void> => {
    await http<void>(`/payroll/${id}`, { method: "DELETE" });
};

// ─── Restaurant & Dining ──────────────────────────────────────────────────────

export type MenuCategory = "STARTER" | "MAIN_COURSE" | "DESSERT" | "BEVERAGE" | "SPECIAL";

export interface MenuItem {
    _id: string;
    name: string;
    description?: string;
    category: MenuCategory;
    price: number;
    imageUrl?: string | null;
    available: boolean;
    preparationTime: number;
    tags?: string[];
    createdAt?: string;
    updatedAt?: string;
}

export const getMenuItems = async (params?: { category?: string; available?: boolean }): Promise<MenuItem[]> => {
    const q = new URLSearchParams();
    if (params?.category) q.set("category", params.category);
    if (params?.available !== undefined) q.set("available", String(params.available));
    const qs = q.toString();
    const { data } = await http<{ items: MenuItem[] }>(`/restaurant/menu${qs ? `?${qs}` : ""}`);
    return data.items;
};

export const createMenuItem = async (payload: Omit<MenuItem, "_id" | "createdAt" | "updatedAt">): Promise<MenuItem> => {
    const { data } = await http<{ item: MenuItem }>("/restaurant/menu", {
        method: "POST", body: JSON.stringify(payload),
    });
    return data.item;
};

export const updateMenuItem = async (id: string, payload: Partial<MenuItem>): Promise<MenuItem> => {
    const { data } = await http<{ item: MenuItem }>(`/restaurant/menu/${id}`, {
        method: "PATCH", body: JSON.stringify(payload),
    });
    return data.item;
};

export const deleteMenuItem = async (id: string): Promise<void> => {
    await http<void>(`/restaurant/menu/${id}`, { method: "DELETE" });
};

export type ReservationStatus = "PENDING" | "CONFIRMED" | "SEATED" | "COMPLETED" | "CANCELLED";

export interface TableReservation {
    _id: string;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    tableNumber: string;
    guestCount: number;
    reservationDate: string;
    reservationTime: string;
    status: ReservationStatus;
    specialRequests?: string;
    orderedItems?: { menuItem?: string; quantity: number; itemName: string; itemPrice: number }[];
    totalAmount?: number;
    createdAt?: string;
    updatedAt?: string;
}

export const getReservations = async (params?: { status?: string; date?: string }): Promise<TableReservation[]> => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.date) q.set("date", params.date);
    const qs = q.toString();
    const { data } = await http<{ reservations: TableReservation[] }>(`/restaurant/reservations${qs ? `?${qs}` : ""}`);
    return data.reservations;
};

export const createReservation = async (payload: Omit<TableReservation, "_id" | "createdAt" | "updatedAt" | "status" | "totalAmount">): Promise<TableReservation> => {
    const { data } = await http<{ reservation: TableReservation }>("/restaurant/reservations", {
        method: "POST", body: JSON.stringify(payload),
    });
    return data.reservation;
};

export const updateReservation = async (id: string, payload: Partial<TableReservation>): Promise<TableReservation> => {
    const { data } = await http<{ reservation: TableReservation }>(`/restaurant/reservations/${id}`, {
        method: "PATCH", body: JSON.stringify(payload),
    });
    return data.reservation;
};

export const deleteReservation = async (id: string): Promise<void> => {
    await http<void>(`/restaurant/reservations/${id}`, { method: "DELETE" });
};


// ─── Event Management ────────────────────────────────────────────────────────

export type EventStatus = "INQUIRY" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

export interface EventBooking {
    _id: string;
    customerName: string;
    customerEmail: string;
    customerMobile: string;
    eventType: string;
    hallName: string;
    packageName: string;
    eventDateTime: string;
    endDateTime: string;
    durationHours?: number;
    attendees: number;
    pricePerGuest: number;
    totalPrice?: number;
    totalCost?: number;
    notes?: string;
    status: EventStatus;
    createdAt?: string;
    updatedAt?: string;
}

export const getEventBookings = async (): Promise<EventBooking[]> => {
    const { data } = await http<{ data: EventBooking[] }>("/events");
    return data.data;
};

export const createEventBooking = async (payload: Omit<EventBooking, "_id" | "status" | "createdAt" | "updatedAt">): Promise<EventBooking> => {
    const { data } = await http<{ data: EventBooking }>("/events", {
        method: "POST",
        body: JSON.stringify(payload),
    });
    return data.data;
};

export const updateEventBooking = async (id: string, payload: Partial<EventBooking>): Promise<EventBooking> => {
    const { data } = await http<{ data: EventBooking }>(`/events/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
    return data.data;
};

export const deleteEventBooking = async (id: string): Promise<void> => {
    await http<void>(`/events/${id}`, { method: "DELETE" });
};
