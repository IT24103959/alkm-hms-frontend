import http from "./http";

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
