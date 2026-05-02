import React, { useCallback, useEffect, useState } from 'react';
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
  getReservations,
  getMyReservations,
  createReservation,
  updateReservationStatus,
  assignReservationTable,
  cancelReservation,
  type TableReservation,
} from '@/api/service';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER'];
const SEATING_PREFS = ['INDOOR', 'OUTDOOR', 'OCEAN_VIEW', 'PRIVATE'];
const STATUSES = ['PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED'];

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  CONFIRMED: '#10b981',
  SEATED: '#3b82f6',
  COMPLETED: '#6366f1',
  CANCELLED: '#ef4444',
};

const BLANK: Omit<TableReservation, '_id'> = {
  name: '', email: '', phone: '',
  reservationDate: '', mealType: 'DINNER',
  guestCount: 2, seatingPreference: 'INDOOR',
  specialRequests: '',
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

const fmtLabel = (v: string) => v.replaceAll('_', ' ');

// ── Chip Row ──────────────────────────────────────────────────────────────────

function ChipRow({
  options, value, onChange, theme,
}: Readonly<{ options: string[]; value: string; onChange: (v: string) => void; theme: ReturnType<typeof useTheme> }>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <Pressable key={opt} onPress={() => onChange(opt)}
            style={[styles.chip, active && { backgroundColor: theme.text, borderColor: theme.text }]}>
            <Text style={[styles.chipText, { color: active ? theme.background : theme.textSecondary }]}>{fmtLabel(opt)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ── Reservation Form Modal ────────────────────────────────────────────────────

function ReservationFormModal({
  visible, theme, onClose, onSaved,
}: Readonly<{
  visible: boolean;
  theme: ReturnType<typeof useTheme>;
  onClose: () => void;
  onSaved: () => void;
}>) {
  const [form, setForm] = useState<Omit<TableReservation, '_id'>>(BLANK);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) { setForm(BLANK); setError(''); }
  }, [visible]);

  const set = (key: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  const inputStyle = [styles.input, {
    color: theme.text, borderColor: theme.border,
    backgroundColor: theme.backgroundElement,
  }];

  const handleSubmit = async () => {
    if (!form.name?.trim() || !form.reservationDate) {
      setError('Name and reservation date/time are required.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await createReservation({ ...form, guestCount: Number(form.guestCount) });
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
            <Text style={[styles.modalTitle, { color: theme.text }]}>New Reservation</Text>
            <Pressable onPress={onClose}><Text style={[styles.closeBtn, { color: theme.textSecondary }]}>✕</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Full Name</Text>
            <TextInput style={inputStyle} value={form.name ?? ''} onChangeText={set('name')} placeholder="Kamal Silva" placeholderTextColor={theme.textSecondary} />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Email</Text>
            <TextInput style={inputStyle} value={form.email ?? ''} onChangeText={set('email')} placeholder="email@example.com" placeholderTextColor={theme.textSecondary} keyboardType="email-address" autoCapitalize="none" />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Phone</Text>
            <TextInput style={inputStyle} value={form.phone ?? ''} onChangeText={set('phone')} placeholder="0712345678" placeholderTextColor={theme.textSecondary} keyboardType="phone-pad" />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Reservation Date & Time</Text>
            <DateTimePickerField value={form.reservationDate} onChange={set('reservationDate')} mode="datetime" />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Meal Type</Text>
            <ChipRow options={MEAL_TYPES} value={form.mealType} onChange={set('mealType')} theme={theme} />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Guests (1–20)</Text>
            <TextInput
              style={inputStyle}
              value={String(form.guestCount)}
              onChangeText={(v) => {
                const n = Number(v) || 1;
                setForm((f) => ({ ...f, guestCount: Math.min(20, Math.max(1, n)) }));
              }}
              keyboardType="numeric"
            />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Seating Preference</Text>
            <ChipRow options={SEATING_PREFS} value={form.seatingPreference ?? 'INDOOR'} onChange={set('seatingPreference')} theme={theme} />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Special Requests (optional)</Text>
            <TextInput
              style={[...inputStyle, styles.textarea]}
              value={form.specialRequests ?? ''}
              onChangeText={set('specialRequests')}
              multiline
              numberOfLines={3}
              placeholder="Dietary requirements, preferences..."
              placeholderTextColor={theme.textSecondary}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.7 }, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}>
              {submitting
                ? <ActivityIndicator color="#1e293b" />
                : <Text style={styles.submitBtnText}>Create Reservation</Text>}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Assign Table Modal ────────────────────────────────────────────────────────

function AssignTableModal({
  reservationId, visible, theme, onClose, onSaved,
}: Readonly<{
  reservationId: string | null;
  visible: boolean;
  theme: ReturnType<typeof useTheme>;
  onClose: () => void;
  onSaved: () => void;
}>) {
  const [tableNo, setTableNo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (visible) { setTableNo(''); setError(''); } }, [visible]);

  const inputStyle = [styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }];

  const handleSubmit = async () => {
    if (!tableNo.trim()) { setError('Table number is required.'); return; }
    if (reservationId === null) return;
    setSubmitting(true);
    try {
      await assignReservationTable(reservationId, tableNo.trim());
      onClose();
      onSaved();
    } catch (err) { setError(errMsg(err)); }
    finally { setSubmitting(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <View style={[styles.sheetContainer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Assign Table</Text>
            <Pressable onPress={onClose}><Text style={[styles.closeBtn, { color: theme.textSecondary }]}>✕</Text></Pressable>
          </View>
          <View style={styles.sheetBody}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Table Number</Text>
            <TextInput style={inputStyle} value={tableNo} onChangeText={setTableNo} placeholder="e.g. T-05" placeholderTextColor={theme.textSecondary} />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable
              style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.7 }, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}>
              {submitting ? <ActivityIndicator color="#1e293b" /> : <Text style={styles.submitBtnText}>Assign</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Update Status Modal ───────────────────────────────────────────────────────

function UpdateStatusModal({
  reservationId, current, visible, theme, onClose, onSaved,
}: Readonly<{
  reservationId: string | null;
  current: string;
  visible: boolean;
  theme: ReturnType<typeof useTheme>;
  onClose: () => void;
  onSaved: () => void;
}>) {
  const [selected, setSelected] = useState(current);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (visible) { setSelected(current); setError(''); } }, [visible, current]);

  const handleSubmit = async () => {
    if (reservationId === null) return;
    setSubmitting(true);
    try {
      await updateReservationStatus(reservationId, selected);
      onClose();
      onSaved();
    } catch (err) { setError(errMsg(err)); }
    finally { setSubmitting(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <View style={[styles.sheetContainer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Update Status</Text>
            <Pressable onPress={onClose}><Text style={[styles.closeBtn, { color: theme.textSecondary }]}>✕</Text></Pressable>
          </View>
          <View style={styles.sheetBody}>
            <ChipRow options={STATUSES} value={selected} onChange={setSelected} theme={theme} />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable
              style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.7 }, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}>
              {submitting ? <ActivityIndicator color="#1e293b" /> : <Text style={styles.submitBtnText}>Save Status</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function DiningScreen() {
  const { user } = useAuth();
  const theme = useTheme();

  const isManager = ['ADMIN', 'MANAGER', 'RESTAURANT_MANAGER'].includes(user?.role ?? '');

  const [reservations, setReservations] = useState<TableReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [newModalVisible, setNewModalVisible] = useState(false);
  const [assignTarget, setAssignTarget] = useState<TableReservation | null>(null);
  const [statusTarget, setStatusTarget] = useState<TableReservation | null>(null);

  const load = useCallback(async () => {
    try {
      const raw = isManager ? await getReservations() : await getMyReservations();
      setReservations(Array.isArray(raw) ? raw : []);
    } catch (err) {
      const e = err as { message?: string };
      if (e?.message) { /* silently fall back to empty list */ }
      setReservations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isManager]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const filtered = statusFilter === 'ALL'
    ? reservations
    : reservations.filter((r) => r.status === statusFilter);

  const handleCancel = (r: TableReservation) => {
    Alert.alert('Cancel Reservation', `Cancel reservation for ${r.name ?? 'this guest'}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
          try { await cancelReservation(r._id); load(); }
          catch (err) { Alert.alert('Error', errMsg(err)); }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.eyebrow, { color: theme.textSecondary }]}>DINING</Text>
          <Text style={[styles.screenTitle, { color: theme.text }]}>Table Reservations</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.newBtn, { backgroundColor: theme.accent }, pressed && { opacity: 0.7 }]}
          onPress={() => setNewModalVisible(true)}>
          <Text style={styles.newBtnText}>+ Reserve</Text>
        </Pressable>
      </View>

      {/* Status Filter (managers only) */}
      {isManager && (
        <View style={[styles.filterBar, { borderBottomColor: theme.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(['ALL', ...STATUSES]).map((s) => {
              const active = statusFilter === s;
              const color = STATUS_COLORS[s] ?? '#6b7280';
              return (
                <Pressable key={s} onPress={() => setStatusFilter(s)}
                  style={[styles.statusChip, {
                    borderColor: active ? color : theme.border,
                    backgroundColor: active ? `${color}22` : 'transparent',
                  }]}>
                  <Text style={[styles.statusChipText, { color: active ? color : theme.textSecondary }]}>
                    {s === 'ALL' ? 'All' : fmtLabel(s)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={theme.text} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, index) => item._id ?? `res-${index}`}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => {
            const color = STATUS_COLORS[item.status ?? ''] ?? '#6b7280';
            return (
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardName, { color: theme.text }]}>{item.name ?? '—'}</Text>
                    {item.email ? <Text style={[styles.cardSub, { color: theme.textSecondary }]}>{item.email}</Text> : null}
                    {item.phone ? <Text style={[styles.cardSub, { color: theme.textSecondary }]}>📞 {item.phone}</Text> : null}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${color}22`, borderColor: `${color}55` }]}>
                    <Text style={[styles.statusBadgeText, { color }]}>{item.status ?? 'PENDING'}</Text>
                  </View>
                </View>

                <Text style={[styles.cardMeta, { color: theme.text }]}>🗓 {fmtDate(item.reservationDate)}</Text>
                <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>
                  🍽 {fmtLabel(item.mealType)} · 👥 {item.guestCount} guests · 🪑 {fmtLabel(item.seatingPreference ?? 'INDOOR')}
                </Text>
                {item.assignedTable ? (
                  <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>🪧 Table: {item.assignedTable}</Text>
                ) : null}
                {item.specialRequests ? (
                  <Text style={[styles.cardNotes, { color: theme.textSecondary }]} numberOfLines={2}>
                    📝 {item.specialRequests}
                  </Text>
                ) : null}

                <View style={styles.cardActions}>
                  {isManager && (
                    <>
                      <Pressable
                        style={[styles.actionBtn, { backgroundColor: `${theme.primary}22` }]}
                        onPress={() => setStatusTarget(item)}>
                        <Text style={[styles.actionText, { color: theme.primary }]}>Status</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.actionBtn, { backgroundColor: `${theme.accent}22` }]}
                        onPress={() => setAssignTarget(item)}>
                        <Text style={[styles.actionText, { color: theme.accent }]}>Assign Table</Text>
                      </Pressable>
                    </>
                  )}
                  {item.status !== 'CANCELLED' && item.status !== 'COMPLETED' && (
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: '#ef444422' }]}
                      onPress={() => handleCancel(item)}>
                      <Text style={[styles.actionText, { color: '#ef4444' }]}>Cancel</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.textSecondary }]}>No reservations found.</Text>
          }
        />
      )}

      <ReservationFormModal
        visible={newModalVisible}
        theme={theme}
        onClose={() => setNewModalVisible(false)}
        onSaved={load}
      />

      <AssignTableModal
        reservationId={assignTarget?._id ?? null}
        visible={assignTarget !== null}
        theme={theme}
        onClose={() => setAssignTarget(null)}
        onSaved={() => { setAssignTarget(null); load(); }}
      />

      <UpdateStatusModal
        reservationId={statusTarget?._id ?? null}
        current={statusTarget?.status ?? 'PENDING'}
        visible={statusTarget !== null}
        theme={theme}
        onClose={() => setStatusTarget(null)}
        onSaved={() => { setStatusTarget(null); load(); }}
      />
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
  filterBar: { borderBottomWidth: 1, paddingHorizontal: Spacing.four, paddingVertical: 10 },
  statusChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginRight: 6 },
  statusChipText: { fontSize: 12, fontWeight: '600' },
  list: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  card: { borderRadius: 12, borderWidth: 1, padding: Spacing.three, gap: 6 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardName: { fontSize: 16, fontWeight: '700' },
  cardSub: { fontSize: 12, marginTop: 1 },
  cardMeta: { fontSize: 13 },
  cardNotes: { fontSize: 12, fontStyle: 'italic' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  actionText: { fontSize: 12, fontWeight: '600' },
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
  errorText: { color: '#ef4444', fontSize: 13, backgroundColor: '#ef444420', padding: 10, borderRadius: 8 },
  submitBtn: { backgroundColor: '#f4d28f', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#1e293b', fontSize: 16, fontWeight: '700' },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000055' },
  sheetContainer: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1 },
  sheetBody: { padding: Spacing.four, gap: Spacing.two, paddingBottom: 40 },
});
