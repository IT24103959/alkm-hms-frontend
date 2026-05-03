import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import DateTimePickerField from '@/components/DateTimePickerField';

import {
  createEventBooking,
  deleteEventBooking,
  getEventAnalytics,
  type EventAnalytics,
  getEventBookings,
  updateEventBooking,
  type EventBooking,
} from '@/api/service';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

const HALLS = ['GRAND BALLROOM', 'GARDEN PAVILION', 'CONFERENCE ROOM', 'MINI HALL'];
const PACKAGES = ['Standard', 'Premium'];
const STATUSES = ['INQUIRY', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

const STATUS_COLORS: Record<string, string> = {
  INQUIRY: '#f59e0b',
  CONFIRMED: '#10b981',
  CANCELLED: '#ef4444',
  COMPLETED: '#3b82f6',
};

const BLANK: Omit<EventBooking, '_id'> = {
  customerName: '', customerEmail: '', customerMobile: '',
  eventType: '', hallName: 'GRAND BALLROOM',
  eventDateTime: '', endDateTime: '', attendees: 50,
  packageName: 'Standard', pricePerGuest: 0, status: 'INQUIRY', notes: '',
};

const errMsg = (err: unknown) => {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? 'An error occurred.';
};

const fmtDate = (v?: string) => {
  if (!v) return '-';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString();
};

// ── Event Form Modal ──────────────────────────────────────────────────────────

function EventFormModal({
  visible, editing, theme,  onClose, onSaved,
}: Readonly<{
  visible: boolean; editing: EventBooking | null;
  theme: ReturnType<typeof useTheme>; 
  onClose: () => void; onSaved: () => void;
}>) {
  const [form, setForm] = useState<Omit<EventBooking, '_id'>>(BLANK);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    if (editing === null) {
      setForm(BLANK);
    } else {
      setForm({
        customerName: editing.customerName ?? '',
        customerEmail: editing.customerEmail ?? '',
        customerMobile: editing.customerMobile ?? '',
        eventType: editing.eventType ?? '',
        hallName: editing.hallName,
        eventDateTime: editing.eventDateTime?.slice(0, 16) ?? '',
        endDateTime: editing.endDateTime?.slice(0, 16) ?? '',
        attendees: editing.attendees,
        packageName: editing.packageName ?? 'Standard',
        pricePerGuest: editing.pricePerGuest ?? 0,
        status: editing.status ?? 'PENDING',
        notes: editing.notes ?? '',
      });
    }
    setError('');
  }, [editing, visible]);

  const set = (key: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  const inputStyle = [styles.input, {
    color: theme.text, borderColor: theme.border,
    backgroundColor: theme.backgroundElement,
  }];

  const handleSubmit = async () => {
    if (!form.customerName?.trim() || !form.eventDateTime || !form.endDateTime) {
      setError('Customer name, event start and end date/time are required.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const toIso = (v: string) => (v ? new Date(v).toISOString() : v);
      const payload = {
        ...form,
        attendees: Number(form.attendees),
        pricePerGuest: Number(form.pricePerGuest),
        eventDateTime: toIso(form.eventDateTime),
        endDateTime: toIso(form.endDateTime),
      };
      if (editing === null) {
        await createEventBooking(payload);
      } else {
        await updateEventBooking(editing._id, { ...payload, _id: editing._id });
      }
      onClose();
      onSaved();
    } catch (err) { setError(errMsg(err)); }
    finally { setSubmitting(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalSafe, { backgroundColor: theme.background }]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{editing === null ? 'New Event Booking' : 'Edit Event'}</Text>
            <Pressable onPress={onClose}><Text style={[styles.closeBtn, { color: theme.textSecondary }]}>✕</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Customer Name</Text>
            <TextInput style={inputStyle} value={form.customerName} onChangeText={set('customerName')} placeholder="Full name" placeholderTextColor={theme.textSecondary} />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Customer Email</Text>
            <TextInput style={inputStyle} value={form.customerEmail} onChangeText={set('customerEmail')} placeholder="email@example.com" placeholderTextColor={theme.textSecondary} keyboardType="email-address" />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Customer Mobile</Text>
            <TextInput style={inputStyle} value={form.customerMobile ?? ''} onChangeText={set('customerMobile')} placeholder="0771234567" placeholderTextColor={theme.textSecondary} keyboardType="phone-pad" />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Event Type</Text>
            <TextInput style={inputStyle} value={form.eventType ?? ''} onChangeText={set('eventType')} placeholder="e.g. Wedding, Conference, Birthday" placeholderTextColor={theme.textSecondary} />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Hall</Text>
            <ChipRow options={HALLS} value={form.hallName} onChange={set('hallName')} theme={theme} />

            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Event Start</Text>
                <DateTimePickerField
                  value={form.eventDateTime}
                  onChange={set('eventDateTime')}
                  mode="datetime"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Event End</Text>
                <DateTimePickerField
                  value={form.endDateTime}
                  onChange={set('endDateTime')}
                  mode="datetime"
                />
              </View>
            </View>

            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Attendees</Text>
                <TextInput style={inputStyle} value={String(form.attendees)} onChangeText={(v) => setForm((f) => ({ ...f, attendees: Number(v) || 0 }))} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Price/Guest (Rs.)</Text>
                <TextInput style={inputStyle} value={String(form.pricePerGuest)} onChangeText={(v) => setForm((f) => ({ ...f, pricePerGuest: Number(v) || 0 }))} keyboardType="numeric" />
              </View>
            </View>

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Package</Text>
            <ChipRow options={PACKAGES} value={form.packageName ?? 'Standard'} onChange={set('packageName')} theme={theme} />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Status</Text>
            <ChipRow options={STATUSES} value={form.status ?? 'INQUIRY'} onChange={set('status')} theme={theme} />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Notes (optional)</Text>
            <TextInput style={[...inputStyle, styles.textarea]} value={form.notes} onChangeText={set('notes')} multiline numberOfLines={3} placeholder="Special requirements..." placeholderTextColor={theme.textSecondary} />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.7 }, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#1e293b" /> : <Text style={styles.submitBtnText}>{editing === null ? 'Create Booking' : 'Update Booking'}</Text>}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ChipRow({
  options, value, onChange, theme,
}: Readonly<{ options: string[]; value: string; onChange: (v: string) => void; theme: ReturnType<typeof useTheme> }>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <Pressable key={opt} onPress={() => onChange(opt)} style={[styles.chip, active && { backgroundColor: theme.text }]}>
            <Text style={[styles.chipText, { color: active ? theme.background : theme.textSecondary }]}>{opt}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function EventManagementScreen() {
  const theme = useTheme();

  const [bookings, setBookings] = useState<EventBooking[]>([]);
  const [analytics, setAnalytics] = useState<EventAnalytics | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<EventBooking | null>(null);

  const load = useCallback(async () => {
    const [evRes, anaRes] = await Promise.allSettled([getEventBookings(), getEventAnalytics()]);
    if (evRes.status === 'fulfilled') setBookings(evRes.value);
    if (anaRes.status === 'fulfilled') setAnalytics(anaRes.value);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const filtered = useMemo(
    () => statusFilter === 'ALL' ? bookings : bookings.filter((b) => b.status === statusFilter),
    [bookings, statusFilter],
  );

  const handleDelete = (b: EventBooking) => {
    Alert.alert('Delete Booking', `Delete event for ${b.customerName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try { await deleteEventBooking(b._id); load(); }
          catch (err) { Alert.alert('Error', errMsg(err)); }
        },
      },
    ]);
  };

  const openAdd = () => { setEditing(null); setModalVisible(true); };
  const openEdit = (b: EventBooking) => { setEditing(b); setModalVisible(true); };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.eyebrow, { color: theme.textSecondary }]}>EVENTS</Text>
          <Text style={[styles.screenTitle, { color: theme.text }]}>Event Management</Text>
        </View>
        <Pressable style={({ pressed }) => [styles.newBtn, { backgroundColor: theme.accent }, pressed && { opacity: 0.7 }]} onPress={openAdd}>
          <Text style={styles.newBtnText}>+ New Booking</Text>
        </Pressable>
      </View>

      {/* Analytics + Status Filter */}
      <View style={[styles.sidebar, { borderBottomColor: theme.border }]}>

        {/* Analytics */}
        <View style={[styles.analyticsBlock, { borderBottomColor: theme.border }]}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>ANALYTICS</Text>
          <View style={styles.analyticsGrid}>
            <View style={[styles.analyticsChip, { flex: 1 }]}>
              <Text style={[styles.analyticsVal, { color: theme.accent }]}>{analytics?.events ?? 0}</Text>
              <Text style={[styles.analyticsKey, { color: theme.textSecondary }]}>BOOKINGS</Text>
            </View>
            <View style={[styles.analyticsChip, { flex: 1 }]}>
              <Text style={[styles.analyticsVal, { color: theme.accent }]}>Rs. {(analytics?.eventRevenue ?? 0).toLocaleString()}</Text>
              <Text style={[styles.analyticsKey, { color: theme.textSecondary }]}>REVENUE</Text>
            </View>
          </View>
        </View>

        {/* Status Filter */}
        <View style={styles.filterBlock}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>FILTER BY STATUS</Text>
          <View style={styles.statusChips}>
            {(['ALL', ...STATUSES]).map((s) => {
              const active = statusFilter === s;
              const color = STATUS_COLORS[s] ?? '#6b7280';
              return (
                <Pressable key={s} onPress={() => setStatusFilter(s)}
                  style={[styles.statusChip, { borderColor: active ? color : theme.border, backgroundColor: active ? color + '22' : 'transparent' }]}>
                  <Text style={[styles.statusChipText, { color: active ? color : theme.textSecondary }]}>{s === 'ALL' ? 'All' : s}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.text} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => {
            const color = STATUS_COLORS[item.status ?? ''] ?? '#6b7280';
            return (
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardCustomer, { color: theme.text }]}>{item.customerName}</Text>
                    <Text style={[styles.cardEmail, { color: theme.textSecondary }]}>{item.customerEmail}</Text>
                    {item.customerMobile ? <Text style={[styles.cardEmail, { color: theme.textSecondary }]}>📞 {item.customerMobile}</Text> : null}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
                    <Text style={[styles.statusBadgeText, { color }]}>{item.status}</Text>
                  </View>
                </View>
                {item.eventType ? <Text style={[styles.cardHall, { color: theme.textSecondary }]}>🎉 {item.eventType}</Text> : null}
                <Text style={[styles.cardHall, { color: theme.text }]}>🏛 {item.hallName}</Text>
                <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>
                  {fmtDate(item.eventDateTime)} → {fmtDate(item.endDateTime)}
                </Text>
                <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>
                  👥 {item.attendees} guests · {item.packageName} Package
                </Text>
                {item.totalPrice ? (
                  <Text style={[styles.cardPrice, { color: theme.accent }]}>Rs. {Number(item.totalPrice).toLocaleString()}</Text>
                ) : null}
                {item.notes ? (
                  <Text style={[styles.cardNotes, { color: theme.textSecondary }]} numberOfLines={2}>📝 {item.notes}</Text>
                ) : null}
                <View style={styles.cardActions}>
                  <Pressable style={[styles.actionBtn, { backgroundColor: theme.accent + '22' }]} onPress={() => openEdit(item)}>
                    <Text style={[styles.actionText, { color: theme.accent }]}>Edit</Text>
                  </Pressable>
                  <Pressable style={[styles.actionBtn, { backgroundColor: '#ef444422' }]} onPress={() => handleDelete(item)}>
                    <Text style={[styles.actionText, { color: '#ef4444' }]}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={[styles.empty, { color: theme.textSecondary }]}>No event bookings found.</Text>}
        />
      )}

      <EventFormModal visible={modalVisible} editing={editing} theme={theme}  onClose={() => setModalVisible(false)} onSaved={load} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, borderBottomWidth: 1 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  screenTitle: { fontSize: 22, fontWeight: '700', marginTop: 2 },
  newBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  analyticsRow: { borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  analyticsContent: { paddingHorizontal: Spacing.four, paddingVertical: 10, gap: 12 },
  sidebar: { borderBottomWidth: 1, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, gap: Spacing.three },
  analyticsBlock: { borderBottomWidth: 1, paddingBottom: Spacing.two, gap: Spacing.two },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 2 },
  analyticsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  analyticsChip: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: '#ffb70318' },
  analyticsVal: { fontSize: 20, fontWeight: '700' },
  analyticsKey: { fontSize: 11, textTransform: 'uppercase' },
  filterBlock: { gap: Spacing.two },
  filterRow: { borderBottomWidth: 1 },
  statusChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statusChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  statusChipText: { fontSize: 12, fontWeight: '600' },
  list: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  card: { borderRadius: 12, borderWidth: 1, padding: Spacing.three, gap: 6 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardCustomer: { fontSize: 16, fontWeight: '700' },
  cardEmail: { fontSize: 12 },
  cardHall: { fontSize: 14, fontWeight: '600' },
  cardMeta: { fontSize: 13 },
  cardPrice: { fontSize: 15, fontWeight: '700' },
  cardNotes: { fontSize: 12, fontStyle: 'italic' },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  actionText: { fontSize: 12, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', marginRight: 6 },
  chipText: { fontSize: 12, fontWeight: '500' },
  modalSafe: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.four, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  closeBtn: { fontSize: 20, padding: 4 },
  modalBody: { padding: Spacing.four, gap: Spacing.two, paddingBottom: 60 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  rowFields: { flexDirection: 'row', gap: Spacing.two },
  errorText: { color: '#ef4444', fontSize: 13, backgroundColor: '#ef444420', padding: 10, borderRadius: 8 },
  submitBtn: { backgroundColor: '#f4d28f', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#1e293b', fontSize: 16, fontWeight: '700' },
});
