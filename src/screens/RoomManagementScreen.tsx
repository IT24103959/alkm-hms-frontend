import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import DateTimePickerField from "@/components/DateTimePickerField";
import { useAuth } from "@/context/AuthContext";

import {
  approveRoomBookingCancellation,
  createRoomBooking,
  createRoomRecord,
  deleteRoomBooking,
  deleteRoomRecord,
  getRoomBookings,
  getRooms,
  updateRoomRecord,
  type Room,
  type RoomBooking,
} from "@/api/service";
import { useTheme } from "@/hooks/use-theme";
import { Spacing } from "@/constants/theme";

const ROOM_TYPES = ["STANDARD", "DELUXE", "SUITE", "FAMILY"];
const ROOM_STATUSES = ["AVAILABLE", "OCCUPIED", "MAINTENANCE"];

const BLANK_ROOM: Omit<Room, "_id"> = {
  roomNumber: "",
  roomType: "STANDARD",
  photoUrl: "",
  roomDescription: "",
  capacity: 1,
  totalRooms: 1,
  normalPrice: 0,
  weekendPrice: 0,
  seasonalPrice: 0,
  roomStatus: "AVAILABLE",
};

const BLANK_BOOKING: Omit<RoomBooking, "_id"> = {
  bookingCustomer: "",
  customerEmail: "",
  roomNumber: "",
  bookedRooms: 1,
  guestCount: 1,
  checkInDate: "",
  checkOutDate: "",
};

const errMsg = (err: unknown) => {
  const e = err as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return e?.response?.data?.message ?? e?.message ?? "An error occurred.";
};

const roomStatusColor = (status?: string) => {
  if (status === "AVAILABLE") return "#10b981";
  if (status === "OCCUPIED") return "#ef4444";
  return "#f59e0b";
};

// ── Form Modal ────────────────────────────────────────────────────────────────

function RoomFormModal({
  visible,
  editing,
  theme,
  onClose,
  onSaved,
}: Readonly<{
  visible: boolean;
  editing: Room | null;
  theme: ReturnType<typeof useTheme>;
  onClose: () => void;
  onSaved: () => void;
}>) {
  const [form, setForm] = useState<Omit<Room, "_id">>(BLANK_ROOM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = "hms_rooms";

  const pickAndUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Please allow photo library access to upload images.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (result.canceled) return;
    setUploading(true);
    try {
      const asset = result.assets[0];
      // Fetch the local file as a blob then upload to Cloudinary
      const localRes = await fetch(asset.uri);
      const blob = await localRes.blob();
      const formData = new FormData();
      formData.append("file", blob, "menu-item.jpg");
      formData.append("upload_preset", UPLOAD_PRESET);
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );
      const data = await res.json();
      if (data.secure_url) {
        setForm((f) => ({ ...f, imageUrl: data.secure_url as string }));
      } else {
        Alert.alert("Upload failed", data.error?.message ?? "Unknown error");
      }
    } catch (err) {
      const e = err as { message?: string };
      Alert.alert("Upload failed", e?.message ?? "Network error");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    if (editing === null) {
      setForm(BLANK_ROOM);
    } else {
      setForm({
        roomNumber: editing.roomNumber,
        roomType: editing.roomType,
        photoUrl: editing.photoUrl ?? "",
        roomDescription: editing.roomDescription ?? "",
        capacity: editing.capacity ?? 1,
        totalRooms: editing.totalRooms ?? 1,
        normalPrice: editing.normalPrice ?? 0,
        weekendPrice: editing.weekendPrice ?? 0,
        seasonalPrice: editing.seasonalPrice ?? 0,
        roomStatus: editing.roomStatus ?? "AVAILABLE",
      });
    }
    setError("");
  }, [editing, visible]);

  const set = (key: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  const setNum = (key: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [key]: Number(v) || 0 }));

  const inputStyle = [
    styles.input,
    {
      color: theme.text,
      borderColor: theme.border,
      backgroundColor: theme.backgroundElement,
    },
  ];

  const handleSubmit = async () => {
    if (!form.roomNumber.trim()) {
      setError("Room number is required.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        capacity: Number(form.capacity),
        totalRooms: Number(form.totalRooms),
        normalPrice: Number(form.normalPrice),
        weekendPrice: Number(form.weekendPrice),
        seasonalPrice: Number(form.seasonalPrice),
      };
      if (editing === null) {
        await createRoomRecord(payload);
      } else {
        await updateRoomRecord(editing._id, payload);
      }
      onClose();
      onSaved();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView
        style={[styles.modalSafe, { backgroundColor: theme.background }]}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={[styles.modalHeader, { borderBottomColor: "#e5e7eb" }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {editing === null ? "Add Room" : "Edit Room"}
            </Text>
            <Pressable onPress={onClose}>
              <Text style={[styles.closeBtn, { color: theme.textSecondary }]}>
                ✕
              </Text>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.modalBody}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Room Number
            </Text>
            <TextInput
              style={inputStyle}
              value={form.roomNumber}
              onChangeText={set("roomNumber")}
              placeholder="e.g. 101"
              placeholderTextColor={theme.textSecondary}
            />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Room Type
            </Text>
            <ChipRow
              options={ROOM_TYPES}
              value={form.roomType}
              onChange={set("roomType")}
              theme={theme}
            />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Room Image
            </Text>
            <Pressable
              onPress={pickAndUpload}
              disabled={uploading}
              style={[
                styles.imagePickerBtn,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundElement,
                },
              ]}
            >
              {uploading && <ActivityIndicator color={theme.text} />}
              {!uploading && form.photoUrl ? (
                <Image
                  source={{ uri: form.photoUrl }}
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
              ) : null}
              {!uploading && !form.photoUrl ? (
                <Text
                  style={[
                    styles.imagePickerText,
                    { color: theme.textSecondary },
                  ]}
                >
                  📷 Tap to select image
                </Text>
              ) : null}
            </Pressable>
            {form.photoUrl ? (
              <Pressable
                onPress={() => setForm((f) => ({ ...f, photoUrl: "" }))}
              >
                <Text style={[styles.removeImageText, { color: "#ef4444" }]}>
                  Remove image
                </Text>
              </Pressable>
            ) : null}

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Description
            </Text>
            <TextInput
              style={[...inputStyle, styles.textarea]}
              value={form.roomDescription}
              onChangeText={set("roomDescription")}
              multiline
              numberOfLines={3}
              placeholder="Room description"
              placeholderTextColor={theme.textSecondary}
            />

            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.fieldLabel, { color: theme.textSecondary }]}
                >
                  Capacity
                </Text>
                <TextInput
                  style={inputStyle}
                  value={String(form.capacity)}
                  onChangeText={setNum("capacity")}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.fieldLabel, { color: theme.textSecondary }]}
                >
                  Total Rooms
                </Text>
                <TextInput
                  style={inputStyle}
                  value={String(form.totalRooms)}
                  onChangeText={setNum("totalRooms")}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.fieldLabel, { color: theme.textSecondary }]}
                >
                  Normal Price
                </Text>
                <TextInput
                  style={inputStyle}
                  value={String(form.normalPrice)}
                  onChangeText={setNum("normalPrice")}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.fieldLabel, { color: theme.textSecondary }]}
                >
                  Weekend Price
                </Text>
                <TextInput
                  style={inputStyle}
                  value={String(form.weekendPrice)}
                  onChangeText={setNum("weekendPrice")}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={{ marginBottom: 4 }}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                Seasonal Price
              </Text>
              <TextInput
                style={inputStyle}
                value={String(form.seasonalPrice ?? 0)}
                onChangeText={setNum("seasonalPrice")}
                keyboardType="numeric"
              />
            </View>

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Status
            </Text>
            <ChipRow
              options={ROOM_STATUSES}
              value={form.roomStatus ?? "AVAILABLE"}
              onChange={set("roomStatus")}
              theme={theme}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && { opacity: 0.7 },
                submitting && { opacity: 0.6 },
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#1e293b" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {editing === null ? "Add Room" : "Update Room"}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Booking Form Modal ────────────────────────────────────────────────────────

function BookingFormModal({
  visible,
  availableRooms,
  theme,
  onClose,
  onSaved,
}: Readonly<{
  visible: boolean;
  availableRooms: Room[];
  theme: ReturnType<typeof useTheme>;
  onClose: () => void;
  onSaved: () => void;
}>) {
  const [form, setForm] = useState<Omit<RoomBooking, "_id">>(BLANK_BOOKING);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) {
      setForm(BLANK_BOOKING);
      setError("");
    }
  }, [visible]);

  const set = (key: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  const inputStyle = [
    styles.input,
    {
      color: theme.text,
      borderColor: theme.border,
      backgroundColor: theme.backgroundElement,
    },
  ];

  const handleSubmit = async () => {
    if (!form.roomNumber.trim() || !form.checkInDate || !form.checkOutDate) {
      setError("Room number, check-in and check-out dates are required.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await createRoomBooking(form);
      onClose();
      onSaved();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView
        style={[styles.modalSafe, { backgroundColor: theme.background }]}
      >
        <View style={[styles.modalHeader, { borderBottomColor: "#e5e7eb" }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>
            New Booking
          </Text>
          <Pressable onPress={onClose}>
            <Text style={[styles.closeBtn, { color: theme.textSecondary }]}>
              ✕
            </Text>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={styles.modalBody}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            Customer Name
          </Text>
          <TextInput
            style={inputStyle}
            value={form.bookingCustomer}
            onChangeText={set("bookingCustomer")}
            placeholder="Full name"
            placeholderTextColor={theme.textSecondary}
          />
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            Customer Email
          </Text>
          <TextInput
            style={inputStyle}
            value={form.customerEmail}
            onChangeText={set("customerEmail")}
            placeholder="email@example.com"
            placeholderTextColor={theme.textSecondary}
            keyboardType="email-address"
          />
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            Room Number
          </Text>
          {availableRooms.length === 0 ? (
            <View style={[styles.input, { borderColor: theme.border, backgroundColor: theme.backgroundElement, justifyContent: 'center' }]}>
              <Text style={{ color: theme.textSecondary, fontSize: 14 }}>No available rooms</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {availableRooms.map((r) => {
                const active = form.roomNumber === r.roomNumber;
                return (
                  <Pressable
                    key={r._id}
                    onPress={() => set('roomNumber')(r.roomNumber)}
                    style={[styles.roomPickerChip, active && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                  >
                    <Text style={[styles.roomPickerChipText, { color: active ? '#fff' : theme.text }]}>Room {r.roomNumber}</Text>
                    <Text style={[styles.roomPickerChipSub, { color: active ? '#ffffffaa' : theme.textSecondary }]}>{r.roomType}</Text>
                    <Text style={[styles.roomPickerChipSub, { color: active ? '#ffffffaa' : '#10b981' }]}>{r.remainingRooms ?? 0} left</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          <View style={styles.rowFields}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                Check-In
              </Text>
              <DateTimePickerField
                value={form.checkInDate}
                onChange={set("checkInDate")}
                mode="date"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                Check-Out
              </Text>
              <DateTimePickerField
                value={form.checkOutDate}
                onChange={set("checkOutDate")}
                mode="date"
              />
            </View>
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              pressed && { opacity: 0.7 },
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#1e293b" />
            ) : (
              <Text style={styles.submitBtnText}>Create Booking</Text>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ChipRow({
  options,
  value,
  onChange,
  theme,
}: Readonly<{
  options: string[];
  value: string;
  onChange: (v: string) => void;
  theme: ReturnType<typeof useTheme>;
}>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginBottom: 8 }}
    >
      {options.map((opt) => {
        const active = value === opt;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={[styles.chip, active && { backgroundColor: theme.text }]}
          >
            <Text
              style={[
                styles.chipText,
                { color: active ? theme.background : theme.textSecondary },
              ]}
            >
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function RoomManagementScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const isCustomer = user?.role === "CUSTOMER";

  const [tab, setTab] = useState<"rooms" | "bookings">("rooms");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<RoomBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [roomModal, setRoomModal] = useState(false);
  const [bookingModal, setBookingModal] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [roomStatusFilter, setRoomStatusFilter] = useState<string>('ALL');

  const load = useCallback(async () => {
    const [r, b] = await Promise.allSettled([getRooms(), getRoomBookings()]);
    if (r.status === "fulfilled") setRooms(r.value);
    if (b.status === "fulfilled") setBookings(b.value);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  // Room numbers that have an active booking — treat those rooms as OCCUPIED
  const bookedRoomNumbers = useMemo(
    () => new Set(
      bookings
        .filter((b) => ['BOOKED', 'CHECKED_IN'].includes(b.bookingStatus ?? ''))
        .map((b) => b.roomNumber),
    ),
    [bookings],
  );

  // Derived status: bookings override roomStatus for OCCUPIED
  const effectiveStatus = useCallback(
    (r: Room) => bookedRoomNumbers.has(r.roomNumber) ? 'OCCUPIED' : (r.roomStatus ?? 'AVAILABLE'),
    [bookedRoomNumbers],
  );

  const availableRooms = useMemo(
    () => rooms.filter((r) => effectiveStatus(r) === 'AVAILABLE'),
    [rooms, effectiveStatus],
  );

  const filteredRooms = useMemo(
    () => roomStatusFilter === 'ALL' ? rooms : rooms.filter((r) => effectiveStatus(r) === roomStatusFilter),
    [rooms, roomStatusFilter, effectiveStatus],
  );

  const summary = useMemo(
    () => ({
      total: rooms.length,
      available: availableRooms.length,
      occupied: rooms.filter((r) => effectiveStatus(r) === 'OCCUPIED').length,
      activeBookings: bookings.filter((b) =>
        ["BOOKED", "CHECKED_IN"].includes(b.bookingStatus ?? ""),
      ).length,
    }),
    [rooms, availableRooms, bookings, effectiveStatus],
  );

  const handleDeleteRoom = (room: Room) => {
    Alert.alert("Delete Room", `Delete room ${room.roomNumber}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteRoomRecord(room._id);
            load();
          } catch (err) {
            Alert.alert("Error", errMsg(err));
          }
        },
      },
    ]);
  };

  const handleDeleteBooking = (b: RoomBooking) => {
    Alert.alert("Delete Booking", `Delete booking for room ${b.roomNumber}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteRoomBooking(b._id);
            load();
          } catch (err) {
            Alert.alert("Error", errMsg(err));
          }
        },
      },
    ]);
  };

  const handleApproveCancel = async (b: RoomBooking) => {
    try {
      await approveRoomBookingCancellation(b._id);
      load();
    } catch (err) {
      Alert.alert("Error", errMsg(err));
    }
  };

  const openAddRoom = () => {
    setEditing(null);
    setRoomModal(true);
  };
  const openEditRoom = (r: Room) => {
    setEditing(r);
    setRoomModal(true);
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: "#e5e7eb" }]}>
        <View>
          <Text style={[styles.eyebrow, { color: theme.textSecondary }]}>
            ACCOMMODATION
          </Text>
          <Text style={[styles.screenTitle, { color: theme.text }]}>
            Room Management
          </Text>
        </View>
        {!isCustomer && (
          <Pressable
            style={({ pressed }) => [
              styles.newBtn,
              { backgroundColor: theme.primary },
              pressed && { opacity: 0.7 },
            ]}
            onPress={tab === "rooms" ? openAddRoom : () => setBookingModal(true)}
          >
            <Text style={styles.newBtnText}>
              {tab === "rooms" ? "+ Room" : "+ Booking"}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatChip label="Total" value={summary.total} color="#3b82f6" />
        <StatChip label="Available" value={summary.available} color="#10b981" />
        <StatChip label="Occupied" value={summary.occupied} color="#ef4444" />
        <StatChip label="Bookings" value={summary.activeBookings} color="#f59e0b" />
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: "#e5e7eb" }]}>
        {(isCustomer ? (["rooms"] as const) : (["rooms", "bookings"] as const)).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tabBtn, tab === t && styles.tabActive]}
          >
            <Text
              style={[
                styles.tabBtnText,
                { color: tab === t ? theme.text : theme.textSecondary },
              ]}
            >
              {t === "rooms" ? "Rooms" : "Bookings"}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={theme.text}
          style={{ marginTop: 40 }}
        />
      ) : null}

      {!loading && tab === "rooms" && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterBar, { borderBottomColor: '#e5e7eb' }]}>
          {(['ALL', ...ROOM_STATUSES]).map((s) => (
            <Pressable
              key={s}
              onPress={() => setRoomStatusFilter(s)}
              style={[styles.filterChip, { borderColor: roomStatusFilter === s ? theme.primary : theme.border }, roomStatusFilter === s && { backgroundColor: theme.primary }]}
            >
              <Text style={[styles.filterChipText, { color: roomStatusFilter === s ? '#fff' : theme.textSecondary }]}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {!loading && tab === "rooms" && (
        <FlatList
          data={filteredRooms}
          keyExtractor={(item, index) => item._id ?? `room-${index}`}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => {
            const es = effectiveStatus(item);
            return (
            <View
              style={[
                styles.card,
                { backgroundColor: "#f9fafb", borderColor: "#e5e7eb" },
              ]}
            >
              {item.photoUrl ? (
                <Image
                  source={{ uri: item.photoUrl }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              ) : null}
              <View style={styles.cardRow}>
                <Text style={[styles.cardPrimary, { color: theme.text }]}>
                  Room {item.roomNumber}
                </Text>
                <View style={[styles.badge, { backgroundColor: roomStatusColor(es) + '22' }]}>
                  <Text style={[styles.badgeText, { color: roomStatusColor(es) }]}>{es}</Text>
                </View>
              </View>
              <View style={styles.cardRow}>
                <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>
                  {item.roomType} · Cap: {item.capacity}
                </Text>
                <Text style={[styles.cardMeta, { color: '#10b981', fontWeight: '600' }]}>
                  {item.remainingRooms ?? 0}/{item.totalRooms ?? 0} available
                </Text>
              </View>
              {item.roomDescription ? (
                <Text
                  style={[styles.cardDesc, { color: theme.textSecondary }]}
                  numberOfLines={2}
                >
                  {item.roomDescription}
                </Text>
              ) : null}
              <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>
                Normal: Rs. {item.normalPrice?.toLocaleString()} · Weekend: Rs.{" "}
                {item.weekendPrice?.toLocaleString()}
              </Text>
              {!isCustomer && (
                <View style={styles.cardActions}>
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: "#f59e0b22" }]}
                    onPress={() => openEditRoom(item)}
                  >
                    <Text style={[styles.actionText, { color: "#f59e0b" }]}>
                      Edit
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: "#ef444422" }]}
                    onPress={() => handleDeleteRoom(item)}
                  >
                    <Text style={[styles.actionText, { color: "#ef4444" }]}>
                      Delete
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
            );
          }}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.textSecondary }]}>
              No rooms found.
            </Text>
          }
        />
      )}

      {!loading && tab === "bookings" && (
        <FlatList
          data={bookings}
          keyExtractor={(item, index) => item._id ?? `booking-${index}`}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.card,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <View style={styles.cardRow}>
                <Text style={[styles.cardPrimary, { color: theme.text }]}>
                  Room {item.roomNumber}
                </Text>
                <View style={[styles.badge, { backgroundColor: "#005f7322" }]}>
                  <Text style={[styles.badgeText, { color: "#005f73" }]}>
                    {item.bookingStatus ?? "-"}
                  </Text>
                </View>
              </View>
              <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>
                {item.bookingCustomer} · {item.customerEmail}
              </Text>
              <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>
                Check-in: {item.checkInDate} · Check-out: {item.checkOutDate}
              </Text>
              <View style={styles.cardActions}>
                {item.bookingStatus === "CANCELLATION_REQUESTED" && (
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: "#1d7f4922" }]}
                    onPress={() => handleApproveCancel(item)}
                  >
                    <Text style={[styles.actionText, { color: "#1d7f49" }]}>
                      Approve Cancel
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: "#ef444422" }]}
                  onPress={() => handleDeleteBooking(item)}
                >
                  <Text style={[styles.actionText, { color: "#ef4444" }]}>
                    Delete
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.textSecondary }]}>
              No bookings found.
            </Text>
          }
        />
      )}

      <RoomFormModal
        visible={roomModal}
        editing={editing}
        theme={theme}
        onClose={() => setRoomModal(false)}
        onSaved={load}
      />
      <BookingFormModal
        visible={bookingModal}
        availableRooms={availableRooms}
        theme={theme}
        onClose={() => setBookingModal(false)}
        onSaved={load}
      />
    </SafeAreaView>
  );
}

function StatChip({
  label,
  value,
  color,
}: Readonly<{ label: string; value: number; color: string }>) {
  return (
    <View
      style={[
        styles.statChip,
        { backgroundColor: color + "18", borderColor: color + "44" },
      ]}
    >
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  eyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5 },
  screenTitle: { fontSize: 22, fontWeight: "700", marginTop: 2 },
  newBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  newBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  statChip: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  statValue: { fontSize: 20, fontWeight: "700" },
  statLabel: { fontSize: 11, color: "#9ca3af" },
  filterBar: { height: 46, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderBottomWidth: 1, flexGrow: 0 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, marginRight: 6 },
  filterChipText: { fontSize: 12, fontWeight: '500' },
  roomPickerChip: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, marginRight: 8, minWidth: 90, alignItems: 'center', gap: 2 },
  roomPickerChipText: { fontSize: 13, fontWeight: '700' },
  roomPickerChipSub: { fontSize: 11 },
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#005f73" },
  tabBtnText: { fontSize: 14, fontWeight: "600" },
  list: {
    padding: Spacing.three,
    gap: Spacing.two,
    paddingBottom: Spacing.six,
  },
  empty: { textAlign: "center", marginTop: 40, fontSize: 14 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.three,
    gap: 6,
    elevation: 2,
    shadowColor: "#0f1f2e",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardPrimary: { fontSize: 16, fontWeight: "700" },
  cardMeta: { fontSize: 13 },
  cardDesc: { fontSize: 13, fontStyle: "italic" },
  cardActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  actionText: { fontSize: 12, fontWeight: "600" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginRight: 6,
  },
  chipText: { fontSize: 12, fontWeight: "500" },
  modalSafe: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.four,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  closeBtn: { fontSize: 20, padding: 4 },
  modalBody: { padding: Spacing.four, gap: Spacing.two, paddingBottom: 60 },
  fieldLabel: { fontSize: 13, fontWeight: "600", marginBottom: 2 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textarea: { minHeight: 80, textAlignVertical: "top" },
  rowFields: { flexDirection: "row", gap: Spacing.two },
  imagePickerBtn: {
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: "dashed",
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  imagePickerText: { fontSize: 14 },
  removeImageText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
  },
  imagePreview: { width: "100%", height: 160, borderRadius: 8 },
  cardImage: { width: '100%', height: 140, borderRadius: 8, marginBottom: 6 },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
    backgroundColor: "#ef444420",
    padding: 10,
    borderRadius: 8,
  },
  submitBtn: {
    backgroundColor: "#f4d28f",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnText: { color: "#1e293b", fontSize: 16, fontWeight: "700" },
});