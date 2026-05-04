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

import {
  createStaff,
  getStaff,
  softDeleteStaff,
  updateStaff,
  type StaffMember,
} from '@/api/service';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const POSITIONS = [
  'Manager', 'Staff Member', 'Customer', 'Restaurant Manager',
  'Event Manager', 'Housekeeper', 'Maintenance Staff',
] as const;

const BLANK: Omit<StaffMember, '_id'> = {
  name: '', username: '', password: '', position: 'Manager', basicSalary: 0,
  attendance: 0, overtimeHours: 0, absentDays: 0, overtimeRate: 0, dailyRate: 0,
};

const errMsg = (err: unknown) => {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? 'An error occurred.';
};

// ── Staff Form Modal ──────────────────────────────────────────────────────────

function StaffFormModal({
  visible, editing, theme, onClose, onSaved,
}: Readonly<{
  visible: boolean;
  editing: StaffMember | null;
  theme: ReturnType<typeof useTheme>;
  onClose: () => void;
  onSaved: () => void;
}>) {
  const [form, setForm] = useState<Omit<StaffMember, '_id'>>(BLANK);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    if (editing === null) {
      setForm(BLANK);
    } else {
      setForm({
        name: editing.name ?? '',
        username: editing.username ?? '',
        password: '',
        position: editing.position ?? '',
        basicSalary: editing.basicSalary ?? 0,
        attendance: editing.attendance ?? 0,
        overtimeHours: editing.overtimeHours ?? 0,
        absentDays: editing.absentDays ?? 0,
        overtimeRate: editing.overtimeRate ?? 0,
        dailyRate: editing.dailyRate ?? 0,
      });
    }
    setError('');
  }, [editing, visible]);

  const set = (key: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  const setNum = (key: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [key]: Number(v) || 0 }));

  const inputStyle = [
    styles.input,
    { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement },
  ];

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('Staff name is required.');
      return;
    }
    if (editing === null && !form.username?.trim()) {
      setError('Username is required.');
      return;
    }
    if (editing === null && !form.password?.trim()) {
      setError('Password is required for new staff.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const payload: Omit<StaffMember, '_id'> = {
        ...form,
        position: form.position.toUpperCase().replaceAll(' ', '_'),
        basicSalary: Number(form.basicSalary),
        attendance: Number(form.attendance),
        overtimeHours: Number(form.overtimeHours),
        absentDays: Number(form.absentDays),
        overtimeRate: Number(form.overtimeRate),
        dailyRate: Number(form.dailyRate),
      };
      // Don't send empty password on edit
      if (editing !== null && !payload.password?.trim()) {
        delete payload.password;
      }
      if (editing === null) {
        await createStaff(payload);
      } else {
        await updateStaff(editing._id, payload);
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
      <SafeAreaView style={[styles.modalSafe, { backgroundColor: theme.background }]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {editing === null ? 'Add Staff Member' : 'Edit Staff Member'}
            </Text>
            <Pressable onPress={onClose}>
              <Text style={[styles.closeBtn, { color: theme.textSecondary }]}>✕</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Full Name</Text>
            <TextInput
              style={inputStyle}
              value={form.name}
              onChangeText={set('name')}
              placeholder="Enter full name"
              placeholderTextColor={theme.textSecondary}
            />

            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Username</Text>
                <TextInput
                  style={inputStyle}
                  value={form.username ?? ''}
                  onChangeText={set('username')}
                  placeholder="e.g. john_doe"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                  {editing === null ? 'Password' : 'New Password (optional)'}
                </Text>
                <TextInput
                  style={inputStyle}
                  value={form.password ?? ''}
                  onChangeText={set('password')}
                  placeholder={editing === null ? 'Set password' : 'Leave blank to keep'}
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry
                />
              </View>
            </View>

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Position</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {POSITIONS.map((pos) => {
                const active = form.position === pos;
                return (
                  <Pressable
                    key={pos}
                    onPress={() => setForm((f) => ({ ...f, position: pos }))}
                    style={[
                      styles.chip,
                      active && { backgroundColor: theme.primary, borderColor: theme.primary },
                    ]}>
                    <Text style={[styles.chipText, { color: active ? '#fff' : theme.textSecondary }]}>
                      {pos}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Basic Salary (Rs.)</Text>
                <TextInput style={inputStyle} value={String(form.basicSalary)} onChangeText={setNum('basicSalary')} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Daily Rate (Rs.)</Text>
                <TextInput style={inputStyle} value={String(form.dailyRate ?? 0)} onChangeText={setNum('dailyRate')} keyboardType="numeric" />
              </View>
            </View>

            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Attendance (days)</Text>
                <TextInput style={inputStyle} value={String(form.attendance ?? 0)} onChangeText={setNum('attendance')} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Absent Days</Text>
                <TextInput style={inputStyle} value={String(form.absentDays ?? 0)} onChangeText={setNum('absentDays')} keyboardType="numeric" />
              </View>
            </View>

            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Overtime Hours</Text>
                <TextInput style={inputStyle} value={String(form.overtimeHours ?? 0)} onChangeText={setNum('overtimeHours')} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Overtime Rate (Rs./hr)</Text>
                <TextInput style={inputStyle} value={String(form.overtimeRate ?? 0)} onChangeText={setNum('overtimeRate')} keyboardType="numeric" />
              </View>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                { backgroundColor: theme.primary },
                pressed && { opacity: 0.7 },
                submitting && { opacity: 0.6 },
              ]}
              onPress={handleSubmit}
              disabled={submitting}>
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>{editing === null ? 'Add Staff Member' : 'Save Changes'}</Text>}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Stat Item ─────────────────────────────────────────────────────────────────

function StatItem({ label, value, color }: Readonly<{ label: string; value: string | number; color: string }>) {
  return (
    <View style={[styles.statItem, { borderLeftColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function StaffManagementScreen() {
  const theme = useTheme();

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [search, setSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await getStaff({ size: 100 });
      // Handle both paginated { content: [] } and plain array responses
      const list = Array.isArray(res) ? res : (res.content ?? []);
      setStaffList(list);
    } catch {
      setStaffList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const filtered = useMemo(() => {
    let list = staffList;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q));
    }
    if (positionFilter) {
      list = list.filter((s) => s.position === positionFilter);
    }
    return list;
  }, [staffList, search, positionFilter]);

  const withOvertime = useMemo(
    () => staffList.filter((s) => (s.overtimeHours ?? 0) > 0).length,
    [staffList],
  );

  const positions = useMemo(
    () => [...new Set(staffList.map((s) => s.position).filter(Boolean))].sort(),
    [staffList],
  );

  const handleDelete = (s: StaffMember) => {
    Alert.alert('Remove Staff', `Remove ${s.name} from the system?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try { await softDeleteStaff(s._id); load(); }
          catch (err) { Alert.alert('Error', errMsg(err)); }
        },
      },
    ]);
  };

  const openAdd = () => { setEditing(null); setModalVisible(true); };
  const openEdit = (s: StaffMember) => { setEditing(s); setModalVisible(true); };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.eyebrow, { color: theme.textSecondary }]}>PEOPLE</Text>
          <Text style={[styles.screenTitle, { color: theme.text }]}>Staff Management</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.newBtn, { backgroundColor: theme.primary }, pressed && { opacity: 0.7 }]}
          onPress={openAdd}>
          <Text style={styles.newBtnText}>+ Add Staff</Text>
        </Pressable>
      </View>

      {/* Stats + Filters */}
      <View style={[styles.controlPanel, { borderBottomColor: theme.border }]}>
        <View style={[styles.statsBlock, { borderBottomColor: theme.border }]}>
          <Text style={[styles.panelLabel, { color: theme.textSecondary }]}>OVERVIEW</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statsGridRow}>
              <StatItem label="Total Staff" value={staffList.length} color="#8b5cf6" />
              <StatItem label="With Overtime" value={withOvertime} color="#f59e0b" />
            </View>
          </View>
        </View>

        <View style={styles.filterSection}>
          <TextInput
            style={[styles.searchInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
            placeholder="Search by name..."
            placeholderTextColor={theme.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {positions.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
              <Pressable
                onPress={() => setPositionFilter('')}
                style={[
                  styles.filterChip,
                  { borderColor: theme.border },
                  positionFilter === '' && { backgroundColor: theme.text, borderColor: theme.text },
                ]}>
                <Text style={[styles.filterChipText, { color: positionFilter === '' ? theme.background : theme.textSecondary }]}>
                  All
                </Text>
              </Pressable>
              {positions.map((pos) => (
                <Pressable
                  key={pos}
                  onPress={() => setPositionFilter(pos === positionFilter ? '' : pos)}
                  style={[
                    styles.filterChip,
                    { borderColor: theme.border },
                    positionFilter === pos && { backgroundColor: theme.text, borderColor: theme.text },
                  ]}>
                  <Text style={[styles.filterChipText, { color: positionFilter === pos ? theme.background : theme.textSecondary }]}>
                    {pos.replaceAll('_', ' ')}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, index) => (item._id != null ? String(item._id) : `staff-${index}`)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardTop}>
                <View style={[styles.avatar, { backgroundColor: theme.primary + '18' }]}>
                  <Text style={[styles.avatarText, { color: theme.primary }]}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardName, { color: theme.text }]}>{item.name}</Text>
                  <View style={[styles.positionBadge, { backgroundColor: theme.primaryLight + '22', borderColor: theme.primaryLight + '55' }]}>
                    <Text style={[styles.positionBadgeText, { color: theme.primaryLight }]}>
                      {item.position?.replaceAll('_', ' ') ?? '—'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.cardSalary, { color: theme.accent }]}>
                  Rs. {(item.basicSalary ?? 0).toLocaleString()}
                </Text>
              </View>

              <View style={styles.cardMeta}>
                <Text style={[styles.metaItem, { color: theme.textSecondary }]}>📅 Attendance: {item.attendance ?? 0} days</Text>
                <Text style={[styles.metaItem, { color: theme.textSecondary }]}>⏰ Overtime: {item.overtimeHours ?? 0} hrs</Text>
                <Text style={[styles.metaItem, { color: theme.textSecondary }]}>🚫 Absent: {item.absentDays ?? 0} days</Text>
              </View>

              <View style={styles.cardActions}>
                <Pressable style={[styles.actionBtn, { backgroundColor: theme.accent + '22' }]} onPress={() => openEdit(item)}>
                  <Text style={[styles.actionText, { color: theme.accent }]}>Edit</Text>
                </Pressable>
                <Pressable style={[styles.actionBtn, { backgroundColor: '#ef444422' }]} onPress={() => handleDelete(item)}>
                  <Text style={[styles.actionText, { color: '#ef4444' }]}>Remove</Text>
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.textSecondary }]}>No staff members found.</Text>
          }
        />
      )}

      <StaffFormModal
        visible={modalVisible}
        editing={editing}
        theme={theme}
        onClose={() => setModalVisible(false)}
        onSaved={load}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, borderBottomWidth: 1,
  },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  screenTitle: { fontSize: 22, fontWeight: '700', marginTop: 2 },
  newBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  controlPanel: { borderBottomWidth: 1, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, gap: Spacing.two },
  panelLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 2 },
  statsBlock: { borderBottomWidth: 1, paddingBottom: Spacing.two, gap: Spacing.two },
  statsGrid: { gap: Spacing.two },
  statsGridRow: { flexDirection: 'row', gap: Spacing.two },
  statItem: { flex: 1, borderLeftWidth: 3, paddingLeft: 8, paddingVertical: 4 },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 11, color: '#9ca3af' },
  filterSection: { gap: Spacing.two },
  searchInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  filterChips: { flexDirection: 'row' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginRight: 6 },
  filterChipText: { fontSize: 12, fontWeight: '500' },
  list: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  card: { borderRadius: 12, borderWidth: 1, padding: Spacing.three, gap: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700' },
  cardName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  positionBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, borderWidth: 1 },
  positionBadgeText: { fontSize: 11, fontWeight: '600' },
  cardSalary: { fontSize: 15, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaItem: { fontSize: 12 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  actionText: { fontSize: 12, fontWeight: '600' },
  modalSafe: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.four, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  closeBtn: { fontSize: 20, padding: 4 },
  modalBody: { padding: Spacing.four, gap: Spacing.two, paddingBottom: 60 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  rowFields: { flexDirection: 'row', gap: Spacing.two },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', marginRight: 6 },
  chipText: { fontSize: 12, fontWeight: '500' },
  errorText: { color: '#ef4444', fontSize: 13, backgroundColor: '#ef444420', padding: 10, borderRadius: 8 },
  submitBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
