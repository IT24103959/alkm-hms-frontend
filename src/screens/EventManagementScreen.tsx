import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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

import DateTimePickerField from "@/components/DateTimePickerField";
import { useAuth } from "@/context/AuthContext";
import {
  getEventBookings,
  createEventBooking,
  updateEventBooking,
  deleteEventBooking,
  type EventBooking,
  type EventStatus,
} from "@/api/service";
import { useTheme } from "@/hooks/use-theme";
import { Spacing } from "@/constants/theme";

const EVENT_STATUSES: EventStatus[] = ["INQUIRY", "CONFIRMED", "COMPLETED", "CANCELLED"];
const HALLS = ["GRAND BALLROOM", "GARDEN PAVILION", "CONFERENCE ROOM", "MINI HALL"];
const PACKAGES = ["Standard", "Premium"];

const BLANK_EVENT: Omit<EventBooking, "_id" | "status" | "createdAt" | "updatedAt"> = {
  customerName: "",
  customerEmail: "",
  customerMobile: "",
  eventType: "Wedding",
  hallName: "GRAND BALLROOM",
  packageName: "Standard",
  eventDateTime: new Date().toISOString(),
  endDateTime: new Date(Date.now() + 4 * 3600000).toISOString(),
  attendees: 50,
  pricePerGuest: 2500,
  notes: "",
};

const statusColor = (status: string) => {
  if (status === "CONFIRMED") return "#3b82f6";
  if (status === "COMPLETED") return "#10b981";
  if (status === "CANCELLED") return "#ef4444";
  return "#f59e0b"; // INQUIRY
};

// ── Form Modal ────────────────────────────────────────────────────────────────

function EventFormModal({
  visible,
  editing,
  theme,
  isCustomer,
  onClose,
  onSaved,
}: {
  visible: boolean;
  editing: EventBooking | null;
  theme: ReturnType<typeof useTheme>;
  isCustomer: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState(BLANK_EVENT);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setForm({
        customerName: editing.customerName,
        customerEmail: editing.customerEmail,
        customerMobile: editing.customerMobile,
        eventType: editing.eventType,
        hallName: editing.hallName,
        packageName: editing.packageName,
        eventDateTime: editing.eventDateTime,
        endDateTime: editing.endDateTime,
        attendees: editing.attendees,
        pricePerGuest: editing.pricePerGuest,
        notes: editing.notes ?? "",
      });
    } else {
      setForm({
        ...BLANK_EVENT,
        customerName: user?.fullName ?? "",
        customerEmail: user?.username ? `${user.username}@hms.com` : "",
      });
    }
    setError("");
  }, [visible, editing, user]);

  const handleSubmit = async () => {
    if (!form.customerName || !form.eventType || !form.hallName) {
      setError("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        await updateEventBooking(editing._id, form);
      } else {
        await createEventBooking(form);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save booking");
    } finally {
      setSubmitting(false);
    }
  };

  const inp = [styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalSafe, { backgroundColor: theme.background }]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {editing ? "Edit Event" : "New Event Inquiry"}
            </Text>
            <Pressable onPress={onClose}><Ionicons name="close" size={24} color={theme.textSecondary} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Customer Name</Text>
            <TextInput style={inp} value={form.customerName} onChangeText={(v) => setForm({ ...form, customerName: v })} readOnly={isCustomer} />

            <View style={styles.row}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>
                    <TextInput style={inp} value={form.customerEmail} onChangeText={(v) => setForm({ ...form, customerEmail: v })} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Mobile</Text>
                    <TextInput style={inp} value={form.customerMobile} onChangeText={(v) => setForm({ ...form, customerMobile: v })} />
                </View>
            </View>

            <Text style={[styles.label, { color: theme.textSecondary }]}>Event Type</Text>
            <TextInput style={inp} value={form.eventType} onChangeText={(v) => setForm({ ...form, eventType: v })} placeholder="e.g. Wedding, Meeting" />

            <View style={styles.row}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Hall</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ gap: 8 }}>
                        {HALLS.map(h => (
                            <Pressable key={h} onPress={() => setForm({ ...form, hallName: h })} style={[styles.chip, form.hallName === h && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                                <Text style={[styles.chipText, { color: form.hallName === h ? "#fff" : theme.textSecondary }]}>{h}</Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>
            </View>

            <View style={styles.row}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Start Time</Text>
                    <DateTimePickerField value={form.eventDateTime} onChange={(v) => setForm({ ...form, eventDateTime: v })} mode="datetime" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>End Time</Text>
                    <DateTimePickerField value={form.endDateTime} onChange={(v) => setForm({ ...form, endDateTime: v })} mode="datetime" />
                </View>
            </View>

            {!isCustomer && (
              <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                      <Text style={[styles.label, { color: theme.textSecondary }]}>Price Per Guest</Text>
                      <TextInput style={inp} value={String(form.pricePerGuest)} onChangeText={(v) => setForm({ ...form, pricePerGuest: Number(v) || 0 })} keyboardType="numeric" />
                  </View>
                  <View style={{ flex: 1 }}>
                      <Text style={[styles.label, { color: theme.textSecondary }]}>Attendees</Text>
                      <TextInput style={inp} value={String(form.attendees)} onChangeText={(v) => setForm({ ...form, attendees: Number(v) || 0 })} keyboardType="numeric" />
                  </View>
              </View>
            )}

            <Text style={[styles.label, { color: theme.textSecondary }]}>Notes</Text>
            <TextInput style={[...inp, { height: 80 }]} value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} multiline placeholder="Additional requests..." />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable style={({ pressed }) => [styles.submitBtn, { backgroundColor: theme.primary }, pressed && { opacity: 0.8 }]} onPress={handleSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{editing ? "Update Booking" : "Submit Inquiry"}</Text>}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function EventManagementScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const isCustomer = user?.role === "CUSTOMER";
  
  const [bookings, setBookings] = useState<EventBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<EventBooking | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getEventBookings();
      if (isCustomer) {
        // Customer only sees their bookings (matched by name or email, depending on backend implementation)
        // Backend listBookings handles filtering if it's implemented correctly.
        setBookings(data);
      } else {
        setBookings(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isCustomer]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleDelete = (id: string) => {
    Alert.alert("Delete Event", "Are you sure you want to delete this event booking?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          await deleteEventBooking(id);
          load();
        } catch (err: any) {
          Alert.alert("Error", err.message);
        }
      }}
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.eyebrow, { color: theme.textSecondary }]}>ALAKAMANDA HOTEL</Text>
          <Text style={[styles.title, { color: theme.text }]}>Event Management 🎊</Text>
        </View>
        <Pressable style={({ pressed }) => [styles.addBtn, { backgroundColor: theme.primary }, pressed && { opacity: 0.8 }]} onPress={() => { setEditing(null); setModalVisible(true); }}>
          <Text style={styles.addBtnText}>+ {isCustomer ? "Inquiry" : "Event"}</Text>
        </Pressable>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, borderLeftColor: statusColor(item.status) }]}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>{item.eventType} at {item.hallName}</Text>
                  <Text style={[styles.cardSub, { color: theme.textSecondary }]}>{new Date(item.eventDateTime).toLocaleString()}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + "22" }]}>
                  <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{item.status}</Text>
                </View>
              </View>
              <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>👤 {item.customerName} · 👥 {item.attendees} guests</Text>
              {item.notes ? <Text style={[styles.cardNotes, { color: theme.textSecondary }]} numberOfLines={2}>📝 {item.notes}</Text> : null}
              
              {!isCustomer && (
                <View style={styles.cardActions}>
                  <Text style={[styles.priceTag, { color: theme.primary }]}>Rs. {item.totalPrice?.toLocaleString() ?? item.pricePerGuest * item.attendees}</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Pressable style={styles.iconBtn} onPress={() => { setEditing(item); setModalVisible(true); }}><Ionicons name="create-outline" size={20} color={theme.textSecondary} /></Pressable>
                    <Pressable style={styles.iconBtn} onPress={() => handleDelete(item._id)}><Ionicons name="trash-outline" size={20} color="#ef4444" /></Pressable>
                  </View>
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>🎉</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No events found</Text>
            </View>
          }
        />
      )}

      <EventFormModal visible={modalVisible} editing={editing} theme={theme} isCustomer={isCustomer} onClose={() => setModalVisible(false)} onSaved={load} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.four, borderBottomWidth: 1 },
  eyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  title: { fontSize: 20, fontWeight: "800" },
  addBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  list: { padding: Spacing.four, gap: 14 },
  card: { borderRadius: 16, borderWidth: 1, borderLeftWidth: 4, padding: 14, gap: 8 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardSub: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: "700" },
  cardMeta: { fontSize: 13 },
  cardNotes: { fontSize: 12, fontStyle: "italic" },
  cardActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4, borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 8 },
  priceTag: { fontSize: 15, fontWeight: "700" },
  iconBtn: { padding: 4 },
  empty: { alignItems: "center", marginTop: 100, gap: 10 },
  emptyText: { fontSize: 16, fontWeight: "600" },
  modalSafe: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.four, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: "800" },
  modalBody: { padding: Spacing.four, gap: 12 },
  label: { fontSize: 12, fontWeight: "700", marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 14 },
  row: { flexDirection: "row", gap: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "#ddd", marginRight: 8 },
  chipText: { fontSize: 12, fontWeight: "600" },
  errorText: { color: "#ef4444", fontSize: 13, textAlign: "center" },
  submitBtn: { padding: 16, borderRadius: 12, alignItems: "center", marginTop: 10 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
