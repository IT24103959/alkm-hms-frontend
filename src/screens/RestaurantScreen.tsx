import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import {
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getReservations,
  createReservation,
  updateReservation,
  deleteReservation,
  type MenuItem,
  type TableReservation,
  type MenuCategory,
  type ReservationStatus,
} from "@/api/service";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/use-theme";
import { Spacing } from "@/constants/theme";
import { useRouter } from "expo-router";

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES: MenuCategory[] = ["STARTER", "MAIN_COURSE", "DESSERT", "BEVERAGE", "SPECIAL"];
const RESERVATION_STATUSES: ReservationStatus[] = ["PENDING", "CONFIRMED", "SEATED", "COMPLETED", "CANCELLED"];

const CATEGORY_EMOJI: Record<MenuCategory, string> = {
  STARTER: "🥗",
  MAIN_COURSE: "🍽️",
  DESSERT: "🍰",
  BEVERAGE: "🍹",
  SPECIAL: "⭐",
};

const STATUS_COLORS: Record<ReservationStatus, string> = {
  PENDING: "#f59e0b",
  CONFIRMED: "#3b82f6",
  SEATED: "#8b5cf6",
  COMPLETED: "#10b981",
  CANCELLED: "#ef4444",
};

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = "hms_rooms";

const errMsg = (err: unknown) => {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? "An error occurred.";
};

// ── Image Upload Helper ───────────────────────────────────────────────────────

async function uploadBlobToCloudinary(blob: Blob, setUploading: (v: boolean) => void): Promise<string | null> {
  setUploading(true);
  try {
    const formData = new FormData();
    formData.append("file", blob, "restaurant-item.jpg");
    formData.append("upload_preset", UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (data.error) { console.error("Cloudinary error:", data.error.message); return null; }
    return data.secure_url ?? null;
  } catch (e) {
    console.error("Upload failed:", e);
    return null;
  } finally {
    setUploading(false);
  }
}

/** Web: resolves with a File from a hidden <input type="file"> dialog */
function pickFileOnWeb(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

async function pickAndUpload(setUploading: (v: boolean) => void): Promise<string | null> {
  // ── Web path ──────────────────────────────────────────────────────────────
  if (typeof document !== "undefined") {
    const file = await pickFileOnWeb();
    if (!file) return null;
    return uploadBlobToCloudinary(file, setUploading);
  }
  // ── Native path ───────────────────────────────────────────────────────────
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });
  if (result.canceled) return null;
  const localRes = await fetch(result.assets[0].uri);
  const blob = await localRes.blob();
  return uploadBlobToCloudinary(blob, setUploading);
}

// ── Chip Row ──────────────────────────────────────────────────────────────────

function ChipRow<T extends string>({
  options, value, onChange, theme, labelFn,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  theme: ReturnType<typeof useTheme>;
  labelFn?: (v: T) => string;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={[styles.chip, active && { backgroundColor: theme.primary }]}
          >
            <Text style={[styles.chipText, { color: active ? "#fff" : theme.textSecondary }]}>
              {labelFn ? labelFn(opt) : opt.replace(/_/g, " ")}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ── Menu Item Form Modal ──────────────────────────────────────────────────────

function MenuItemFormModal({
  visible, editing, theme, onClose, onSaved,
}: {
  visible: boolean;
  editing: MenuItem | null;
  theme: ReturnType<typeof useTheme>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const blank: Omit<MenuItem, "_id" | "createdAt" | "updatedAt"> = {
    name: "", description: "", category: "MAIN_COURSE", price: 0,
    imageUrl: null, available: true, preparationTime: 15, tags: [],
  };
  const [form, setForm] = useState(blank);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setForm(editing ? { ...editing } : blank);
    setError("");
  }, [visible, editing]);

  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));
  const setNum = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: Number(v) || 0 }));

  const handlePickImage = async () => {
    const url = await pickAndUpload(setUploading);
    if (url) setForm((f) => ({ ...f, imageUrl: url }));
    else if (!url && uploading === false) console.warn("Image upload returned null – check CLOUD_NAME and upload_preset.");
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (form.price < 0) { setError("Price cannot be negative."); return; }
    setError("");
    setSubmitting(true);
    try {
      if (editing) {
        await updateMenuItem(editing._id, form);
      } else {
        await createMenuItem(form);
      }
      onClose();
      onSaved();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = [styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalSafe, { backgroundColor: theme.background }]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {editing ? "Edit Menu Item" : "Add Menu Item"}
            </Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Item Name *</Text>
            <TextInput style={inputStyle} value={form.name} onChangeText={set("name")} placeholder="e.g. Grilled Salmon" placeholderTextColor={theme.textSecondary} />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Category *</Text>
            <ChipRow options={CATEGORIES} value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v }))} theme={theme} labelFn={(v) => `${CATEGORY_EMOJI[v]} ${v.replace(/_/g, " ")}`} />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Description</Text>
            <TextInput style={[...inputStyle, { height: 80 }]} value={form.description} onChangeText={set("description")} multiline placeholder="Brief description..." placeholderTextColor={theme.textSecondary} />

            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Price (Rs.) *</Text>
                <TextInput style={inputStyle} value={String(form.price)} onChangeText={setNum("price")} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Prep Time (min)</Text>
                <TextInput style={inputStyle} value={String(form.preparationTime)} onChangeText={setNum("preparationTime")} keyboardType="numeric" />
              </View>
            </View>

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Food Image</Text>
            <Pressable
              onPress={handlePickImage}
              disabled={uploading}
              style={[styles.imagePickerBtn, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
            >
              {uploading && <ActivityIndicator color={theme.primary} />}
              {!uploading && form.imageUrl ? (
                <Image source={{ uri: form.imageUrl }} style={styles.imagePreview} resizeMode="cover" />
              ) : null}
              {!uploading && !form.imageUrl ? (
                <View style={styles.imagePickerInner}>
                  <Ionicons name="camera-outline" size={32} color={theme.textSecondary} />
                  <Text style={[styles.imagePickerText, { color: theme.textSecondary }]}>Tap to upload photo</Text>
                </View>
              ) : null}
            </Pressable>
            {form.imageUrl ? (
              <Pressable onPress={() => setForm((f) => ({ ...f, imageUrl: null }))}>
                <Text style={{ color: "#ef4444", fontSize: 13, marginBottom: 8 }}>Remove image</Text>
              </Pressable>
            ) : null}

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Availability</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              {([true, false] as const).map((v) => (
                <Pressable
                  key={String(v)}
                  onPress={() => setForm((f) => ({ ...f, available: v }))}
                  style={[styles.chip, form.available === v && { backgroundColor: theme.primary }]}
                >
                  <Text style={[styles.chipText, { color: form.available === v ? "#fff" : theme.textSecondary }]}>
                    {v ? "✅ Available" : "❌ Unavailable"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.7 }, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{editing ? "Update Item" : "Add to Menu"}</Text>}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Reservation Form Modal ────────────────────────────────────────────────────

function ReservationFormModal({
  visible, editing, theme, menuItems, onClose, onSaved,
}: {
  visible: boolean;
  editing: TableReservation | null;
  theme: ReturnType<typeof useTheme>;
  menuItems: MenuItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const blank = {
    customerName: "", customerPhone: "", customerEmail: "",
    tableNumber: "", guestCount: 2,
    reservationDate: new Date().toISOString().split("T")[0],
    reservationTime: "19:00",
    specialRequests: "", orderedItems: [] as TableReservation["orderedItems"],
  };
  const [form, setForm] = useState(blank);
  const [status, setStatus] = useState<ReservationStatus>("PENDING");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setForm({
        customerName: editing.customerName,
        customerPhone: editing.customerPhone ?? "",
        customerEmail: editing.customerEmail ?? "",
        tableNumber: editing.tableNumber,
        guestCount: editing.guestCount,
        reservationDate: editing.reservationDate?.split("T")[0] ?? "",
        reservationTime: editing.reservationTime,
        specialRequests: editing.specialRequests ?? "",
        orderedItems: editing.orderedItems ?? [],
      });
      setStatus(editing.status);
    } else {
      setForm(blank);
      setStatus("PENDING");
    }
    setError("");
  }, [visible, editing]);

  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));
  const setNum = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: Number(v) || 0 }));

  const handleSubmit = async () => {
    if (!form.customerName.trim() || !form.tableNumber.trim()) {
      setError("Customer name and table number are required."); return;
    }
    setError("");
    setSubmitting(true);
    try {
      if (editing) {
        await updateReservation(editing._id, { ...form, status });
      } else {
        await createReservation(form);
      }
      onClose();
      onSaved();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = [styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalSafe, { backgroundColor: theme.background }]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {editing ? "Edit Reservation" : "New Reservation"}
            </Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Customer Name *</Text>
            <TextInput style={inputStyle} value={form.customerName} onChangeText={set("customerName")} placeholder="Full name" placeholderTextColor={theme.textSecondary} />

            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Phone</Text>
                <TextInput style={inputStyle} value={form.customerPhone} onChangeText={set("customerPhone")} keyboardType="phone-pad" placeholder="+94..." placeholderTextColor={theme.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Table # *</Text>
                <TextInput style={inputStyle} value={form.tableNumber} onChangeText={set("tableNumber")} placeholder="e.g. T5" placeholderTextColor={theme.textSecondary} />
              </View>
            </View>

            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Date</Text>
                <TextInput style={inputStyle} value={form.reservationDate} onChangeText={set("reservationDate")} placeholder="YYYY-MM-DD" placeholderTextColor={theme.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Time</Text>
                <TextInput style={inputStyle} value={form.reservationTime} onChangeText={set("reservationTime")} placeholder="19:00" placeholderTextColor={theme.textSecondary} />
              </View>
            </View>

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Guest Count</Text>
            <TextInput style={inputStyle} value={String(form.guestCount)} onChangeText={setNum("guestCount")} keyboardType="numeric" />

            {editing && (
              <>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Status</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {RESERVATION_STATUSES.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => setStatus(s)}
                      style={[styles.chip, status === s && { backgroundColor: STATUS_COLORS[s] }]}
                    >
                      <Text style={[styles.chipText, { color: status === s ? "#fff" : theme.textSecondary }]}>
                        {s}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Special Requests</Text>
            <TextInput style={[...inputStyle, { height: 72 }]} value={form.specialRequests} onChangeText={set("specialRequests")} multiline placeholder="Any special requests..." placeholderTextColor={theme.textSecondary} />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.7 }, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{editing ? "Update Reservation" : "Book Table"}</Text>}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Stat Chip ─────────────────────────────────────────────────────────────────

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.statChip, { backgroundColor: color + "18", borderColor: color + "44" }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel]}>{label}</Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function RestaurantScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  // ── All hooks must be called unconditionally (Rules of Hooks) ─────────────
  const [tab, setTab] = useState<"menu" | "reservations">("menu");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [reservations, setReservations] = useState<TableReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuModal, setMenuModal] = useState(false);
  const [reservationModal, setReservationModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
  const [editingReservation, setEditingReservation] = useState<TableReservation | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<MenuCategory | "ALL">("ALL");

  const load = useCallback(async () => {
    const [m, r] = await Promise.allSettled([getMenuItems(), getReservations()]);
    if (m.status === "fulfilled") setMenuItems(m.value);
    if (r.status === "fulfilled") setReservations(r.value);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const filteredMenu = useMemo(
    () => categoryFilter === "ALL" ? menuItems : menuItems.filter((i) => i.category === categoryFilter),
    [menuItems, categoryFilter]
  );

  const stats = useMemo(() => ({
    totalItems: menuItems.length,
    available: menuItems.filter((i) => i.available).length,
    pendingReservations: reservations.filter((r) => r.status === "PENDING").length,
    confirmedReservations: reservations.filter((r) => r.status === "CONFIRMED").length,
  }), [menuItems, reservations]);

  // ── Customer guard (after all hooks) ─────────────────────────────────────
  if (user?.role === "CUSTOMER") {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <Ionicons name="lock-closed" size={80} color={theme.border} />
        <Text style={[styles.emptyText, { color: theme.text, marginTop: 20 }]}>Access Denied</Text>
        <Text style={[styles.emptySub, { color: theme.textSecondary, textAlign: 'center', paddingHorizontal: 40, marginTop: 10 }]}>
            This management screen is reserved for hotel staff. Please visit your dedicated dining experience.
        </Text>
        <Pressable 
            style={({ pressed }) => [styles.newBtn, { backgroundColor: theme.primary, marginTop: 30 }, pressed && { opacity: 0.8 }]}
            onPress={() => router.replace("/restaurant")}
        >
            <Text style={styles.newBtnText}>Go to Restaurant</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const handleDeleteMenu = async (item: MenuItem) => {
    const ok = typeof window !== "undefined" && window.confirm
      ? window.confirm(`Delete "${item.name}" from menu?`)
      : false;
    if (!ok) return;
    try { await deleteMenuItem(item._id); load(); } catch (err) { console.error(err); }
  };

  const handleDeleteReservation = async (r: TableReservation) => {
    const ok = typeof window !== "undefined" && window.confirm
      ? window.confirm(`Delete reservation for ${r.customerName}?`)
      : false;
    if (!ok) return;
    try { await deleteReservation(r._id); load(); } catch (err) { console.error(err); }
  };

  const renderMenuItem = ({ item }: { item: MenuItem }) => (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.cardImage} resizeMode="cover" />
      ) : (
        <View style={[styles.cardImagePlaceholder, { backgroundColor: theme.backgroundElement }]}>
          <Text style={{ fontSize: 40 }}>{CATEGORY_EMOJI[item.category]}</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{item.name}</Text>
            <Text style={[styles.cardSub, { color: theme.textSecondary }]}>{item.category.replace(/_/g, " ")} · {item.preparationTime} min</Text>
          </View>
          <Text style={[styles.priceTag, { color: theme.primary }]}>Rs. {item.price}</Text>
        </View>
        {item.description ? (
          <Text style={[styles.cardDesc, { color: theme.textSecondary }]} numberOfLines={2}>{item.description}</Text>
        ) : null}
        <View style={styles.cardFooter}>
          <View style={[styles.availBadge, { backgroundColor: item.available ? "#10b98122" : "#ef444422" }]}>
            <Text style={{ color: item.available ? "#10b981" : "#ef4444", fontSize: 12, fontWeight: "700" }}>
              {item.available ? "✅ Available" : "❌ Unavailable"}
            </Text>
          </View>
          <View style={styles.cardActions}>
            <Pressable onPress={() => { setEditingMenu(item); setMenuModal(true); }}>
              <Ionicons name="create-outline" size={20} color={theme.primary} />
            </Pressable>
            <Pressable onPress={() => handleDeleteMenu(item)}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );

  const renderReservation = ({ item }: { item: TableReservation }) => (
    <View style={[styles.resCard, { backgroundColor: theme.card, borderColor: theme.border, borderLeftColor: STATUS_COLORS[item.status] }]}>
      <View style={styles.cardRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{item.customerName}</Text>
          <Text style={[styles.cardSub, { color: theme.textSecondary }]}>Table {item.tableNumber} · {item.guestCount} guests</Text>
          <Text style={[styles.cardSub, { color: theme.textSecondary }]}>{item.reservationDate?.split("T")[0] ?? ""} at {item.reservationTime}</Text>
        </View>
        <View>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + "22" }]}>
            <Text style={{ color: STATUS_COLORS[item.status], fontWeight: "700", fontSize: 11 }}>{item.status}</Text>
          </View>
          {(item.totalAmount ?? 0) > 0 && (
            <Text style={[styles.priceTag, { color: theme.primary, fontSize: 13 }]}>Rs. {item.totalAmount}</Text>
          )}
        </View>
      </View>
      {item.specialRequests ? (
        <Text style={[styles.cardDesc, { color: theme.textSecondary, marginTop: 6 }]}>💬 {item.specialRequests}</Text>
      ) : null}
      <View style={[styles.cardActions, { justifyContent: "flex-end", marginTop: 8 }]}>
        <Pressable onPress={() => { setEditingReservation(item); setReservationModal(true); }}>
          <Ionicons name="create-outline" size={20} color={theme.primary} />
        </Pressable>
        <Pressable onPress={() => handleDeleteReservation(item)}>
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </Pressable>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.eyebrow, { color: theme.textSecondary }]}>FOOD & HOSPITALITY</Text>
          <Text style={[styles.screenTitle, { color: theme.text }]}>Restaurant & Dining</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.newBtn, { backgroundColor: theme.primary }, pressed && { opacity: 0.7 }]}
          onPress={() => {
            if (tab === "menu") { setEditingMenu(null); setMenuModal(true); }
            else { setEditingReservation(null); setReservationModal(true); }
          }}
        >
          <Text style={styles.newBtnText}>{tab === "menu" ? "+ Item" : "+ Reserve"}</Text>
        </Pressable>
      </View>

      {/* Stats Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
        <StatChip label="Menu Items" value={stats.totalItems} color="#ec4899" />
        <StatChip label="Available" value={stats.available} color="#10b981" />
        <StatChip label="Pending" value={stats.pendingReservations} color="#f59e0b" />
        <StatChip label="Confirmed" value={stats.confirmedReservations} color="#3b82f6" />
      </ScrollView>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
        {(["menu", "reservations"] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && styles.tabActive]}>
            <Text style={[styles.tabBtnText, { color: tab === t ? theme.text : theme.textSecondary }]}>
              {t === "menu" ? "🍽️ Menu" : "📅 Reservations"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Category Filter (menu tab) */}
      {tab === "menu" && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {(["ALL", ...CATEGORIES] as const).map((cat) => (
            <Pressable
              key={cat}
              onPress={() => setCategoryFilter(cat as MenuCategory | "ALL")}
              style={[styles.filterChip, { borderColor: theme.border }, categoryFilter === cat && { backgroundColor: theme.primary, borderColor: theme.primary }]}
            >
              <Text style={[styles.filterChipText, { color: categoryFilter === cat ? "#fff" : theme.textSecondary }]}>
                {cat === "ALL" ? "All" : `${CATEGORY_EMOJI[cat as MenuCategory]} ${cat.replace(/_/g, " ")}`}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* List */}
      {tab === "menu" ? (
        <FlatList
          data={filteredMenu}
          keyExtractor={(item) => item._id}
          renderItem={renderMenuItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 60 }}>🍽️</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No menu items yet</Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>Tap "+ Item" to add dishes</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(item) => item._id}
          renderItem={renderReservation}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 60 }}>📅</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No reservations yet</Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>Tap "+ Reserve" to book a table</Text>
            </View>
          }
        />
      )}

      {/* Modals */}
      <MenuItemFormModal visible={menuModal} editing={editingMenu} theme={theme} onClose={() => setMenuModal(false)} onSaved={load} />
      <ReservationFormModal visible={reservationModal} editing={editingReservation} theme={theme} menuItems={menuItems} onClose={() => setReservationModal(false)} onSaved={load} />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.four, borderBottomWidth: 1 },
  eyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5, marginBottom: 2 },
  screenTitle: { fontSize: 22, fontWeight: "800" },
  newBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20 },
  newBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  statsRow: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, gap: 8 },
  statChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, alignItems: "center", minWidth: 80 },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 10, fontWeight: "600", color: "#64748b" },
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#005f73" },
  tabBtnText: { fontSize: 14, fontWeight: "600" },
  filterRow: { paddingHorizontal: Spacing.four, paddingVertical: 10, gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 12, fontWeight: "600" },
  listContent: { padding: Spacing.four, gap: Spacing.three },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  cardImage: { width: "100%", height: 160 },
  cardImagePlaceholder: { width: "100%", height: 120, justifyContent: "center", alignItems: "center" },
  cardBody: { padding: Spacing.three, gap: 6 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardSub: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  cardActions: { flexDirection: "row", gap: 12 },
  priceTag: { fontSize: 16, fontWeight: "800" },
  availBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  resCard: { borderRadius: 16, borderWidth: 1, borderLeftWidth: 4, padding: Spacing.three },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignItems: "center", marginBottom: 4 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: "600" },
  emptySub: { fontSize: 13 },
  // Modal styles
  modalSafe: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.four, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  modalBody: { padding: Spacing.four, paddingBottom: 60 },
  fieldLabel: { fontSize: 12, fontWeight: "700", marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, marginBottom: 16 },
  rowFields: { flexDirection: "row", gap: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#e5e7eb", marginRight: 8, marginBottom: 8 },
  chipText: { fontSize: 12, fontWeight: "700" },
  imagePickerBtn: { borderWidth: 1.5, borderStyle: "dashed", borderRadius: 16, height: 160, justifyContent: "center", alignItems: "center", marginBottom: 8, overflow: "hidden" },
  imagePickerInner: { alignItems: "center", gap: 8 },
  imagePickerText: { fontSize: 14, fontWeight: "500" },
  imagePreview: { width: "100%", height: "100%" },
  errorText: { color: "#ef4444", fontSize: 13, fontWeight: "600", marginBottom: 8 },
  submitBtn: { backgroundColor: "#005f73", padding: 16, borderRadius: 14, alignItems: "center", marginTop: 8 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
