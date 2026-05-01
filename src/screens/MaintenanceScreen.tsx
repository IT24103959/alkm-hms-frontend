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
  createMaintenanceTicket,
  deleteMaintenanceTicket,
  getMaintenanceStats,
  getMaintenanceTickets,
  updateMaintenanceTicket,
  updateMaintenanceTicketStatus,
  type MaintenanceStats,
  type MaintenanceTicket,
} from '@/api/roomService';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

// ── Constants ────────────────────────────────────────────────────────────────

const FACILITY_TYPES = ['AC', 'PLUMBING', 'ELECTRICAL', 'FURNITURE', 'OTHER'] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
const ALL_STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
const STAFF_STATUSES = ['IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#ef4444',
  ASSIGNED: '#f97316',
  IN_PROGRESS: '#3b82f6',
  RESOLVED: '#10b981',
  CLOSED: '#6b7280',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#10b981',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
};

const initialForm = {
  roomNumber: '',
  facilityType: 'AC' as string,
  issueDescription: '',
  status: 'OPEN' as string,
  priority: 'MEDIUM' as string,
  staffId: '',
  deadline: '',
  resolutionNotes: '',
  partsUsed: '',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatLabel = (v?: string) => (v ? v.replaceAll('_', ' ') : '-');

const formatDateTime = (v?: string) => {
  if (!v) return '-';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString();
};

const getErrMsg = (err: unknown, fallback: string) => {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: Readonly<{ status: string }>) {
  const color = STATUS_COLORS[status] ?? '#6b7280';
  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
      <Text style={[styles.badgeText, { color }]}>{formatLabel(status)}</Text>
    </View>
  );
}

function PriorityBadge({ priority }: Readonly<{ priority: string }>) {
  const color = PRIORITY_COLORS[priority] ?? '#6b7280';
  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
      <Text style={[styles.badgeText, { color }]}>{priority}</Text>
    </View>
  );
}

function ChipGroup({
  options,
  value,
  onChange,
  theme,
}: Readonly<{
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  theme: ReturnType<typeof useTheme>;
}>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={[
              styles.chip,
              { borderColor: theme.backgroundSelected },
              active && { backgroundColor: theme.text, borderColor: theme.text },
            ]}>
            <Text
              style={[
                styles.chipText,
                { color: active ? theme.background : theme.textSecondary },
              ]}>
              {formatLabel(opt)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function MaintenanceScreen() {
  const { user } = useAuth();
  const theme = useTheme();

  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [stats, setStats] = useState<MaintenanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [editingTicket, setEditingTicket] = useState<MaintenanceTicket | null>(null);

  const canManage = ['SUPER_ADMIN', 'MANAGER'].includes(user?.role ?? '');

  const loadData = useCallback(async () => {
    const [ticketsRes, statsRes] = await Promise.allSettled([
      getMaintenanceTickets(),
      getMaintenanceStats(),
    ]);
    if (ticketsRes.status === 'fulfilled') setTickets(ticketsRes.value.data ?? []);
    if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredTickets = useMemo(
    () =>
      tickets.filter((t) => {
        if (statusFilter && t.status !== statusFilter) return false;
        if (search && !t.roomNumber?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [tickets, statusFilter, search],
  );

  const openCreate = () => {
    setEditingTicket(null);
    setModalVisible(true);
  };

  const openEdit = (ticket: MaintenanceTicket) => {
    setEditingTicket(ticket);
    setModalVisible(true);
  };

  const handleDelete = (ticket: MaintenanceTicket) => {
    Alert.alert(
      'Delete Ticket',
      `Delete maintenance ticket for room ${ticket.roomNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMaintenanceTicket(ticket.id);
              loadData();
            } catch (err) {
              Alert.alert('Error', getErrMsg(err, 'Unable to delete ticket.'));
            }
          },
        },
      ],
    );
  };

  const handleQuickStatus = (ticket: MaintenanceTicket) => {
    const statusOptions = canManage ? ALL_STATUSES : STAFF_STATUSES;
    Alert.alert(
      `Room ${ticket.roomNumber} — Update Status`,
      `Current: ${formatLabel(ticket.status)}`,
      [
        ...statusOptions.map((s) => ({
          text: formatLabel(s),
          onPress: async () => {
            try {
              await updateMaintenanceTicketStatus(ticket.id, s);
              loadData();
            } catch (err) {
              Alert.alert('Error', getErrMsg(err, 'Could not update status.'));
            }
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const renderTicket = ({ item }: { item: MaintenanceTicket }) => (
    <TicketCard
      item={item}
      canManage={canManage}
      theme={theme}
      onStatus={handleQuickStatus}
      onEdit={openEdit}
      onDelete={handleDelete}
    />
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View
        style={[
          styles.pageHeader,
          { borderBottomColor: theme.border },
        ]}>
        <View>
          <Text style={[styles.pageEyebrow, { color: theme.textSecondary }]}>ROOM OPERATIONS</Text>
          <Text style={[styles.pageTitle, { color: theme.text }]}>Maintenance</Text>
        </View>
        {canManage && (
          <Pressable
            style={({ pressed }) => [styles.newBtn, { backgroundColor: theme.primary }, pressed && styles.pressed]}
            onPress={openCreate}>
            <Text style={styles.newBtnText}>+ New Ticket</Text>
          </Pressable>
        )}
      </View>

      {/* Stats */}
      {stats && (
        <View style={styles.statsRow}>
          <StatItem label="Total" value={stats.total} color="#8b5cf6" />
          <StatItem label="Open" value={stats.open} color="#ef4444" />
          <StatItem
            label="In Progress"
            value={tickets.filter((t) => t.status === 'IN_PROGRESS').length}
            color="#3b82f6"
          />
          <StatItem label="Resolved" value={stats.resolved} color="#10b981" />
        </View>
      )}

      {/* Search + Filters */}
      <View style={[styles.filterBar, { borderBottomColor: theme.border }]}>
        <TextInput
          style={[
            styles.searchInput,
            { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement },
          ]}
          placeholder="Search room..."
          placeholderTextColor={theme.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
          {[{ label: 'All', value: '' }, ...ALL_STATUSES.map((s) => ({ label: formatLabel(s), value: s }))].map(
            (opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setStatusFilter(opt.value)}
                style={[
                  styles.filterChip,
                  { borderColor: theme.border },
                  statusFilter === opt.value && { backgroundColor: theme.text, borderColor: theme.text },
                ]}>
                <Text
                  style={[
                    styles.filterChipText,
                    { color: statusFilter === opt.value ? theme.background : theme.textSecondary },
                  ]}>
                  {opt.label || 'All'}
                </Text>
              </Pressable>
            ),
          )}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.text} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredTickets}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTicket}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No tickets found.</Text>
          }
        />
      )}

      <MaintenanceFormModal
        visible={modalVisible}
        editingTicket={editingTicket}
        theme={theme}
        onClose={() => setModalVisible(false)}
        onSaved={loadData}
      />
    </SafeAreaView>
  );
}

function TicketCard({
  item,
  canManage,
  theme,
  onStatus,
  onEdit,
  onDelete,
}: Readonly<{
  item: MaintenanceTicket;
  canManage: boolean;
  theme: ReturnType<typeof useTheme>;
  onStatus: (ticket: MaintenanceTicket) => void;
  onEdit: (ticket: MaintenanceTicket) => void;
  onDelete: (ticket: MaintenanceTicket) => void;
}>) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardRoom, { color: theme.text }]}>Room {item.roomNumber}</Text>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.cardRow}>
        <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>
          🔧 {formatLabel(item.facilityType)}
        </Text>
        <View style={{ marginLeft: 'auto' }}>
          <PriorityBadge priority={item.priority} />
        </View>
      </View>

      {item.issueDescription ? (
        <Text style={[styles.cardDescription, { color: theme.text }]} numberOfLines={2}>
          {item.issueDescription}
        </Text>
      ) : null}

      {item.assignedStaff?.name ? (
        <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>
          👤 {item.assignedStaff.name}
        </Text>
      ) : null}
      {item.deadline ? (
        <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>
          🕐 {formatDateTime(item.deadline)}
        </Text>
      ) : null}
      {item.resolutionNotes ? (
        <Text style={[styles.cardNotes, { color: theme.textSecondary }]} numberOfLines={2}>
          ✅ {item.resolutionNotes}
        </Text>
      ) : null}

      <View style={styles.cardActions}>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, styles.statusBtn, pressed && styles.pressed]}
          onPress={() => onStatus(item)}>
          <Text style={styles.actionBtnText}>Set Status</Text>
        </Pressable>
        {canManage ? (
          <>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, styles.editBtn, pressed && styles.pressed]}
              onPress={() => onEdit(item)}>
              <Text style={[styles.actionBtnText, { color: '#f59e0b' }]}>Edit</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, styles.deleteBtn, pressed && styles.pressed]}
              onPress={() => onDelete(item)}>
              <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Delete</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </View>
  );
}

function MaintenanceFormModal({
  visible,
  editingTicket,
  theme,
  onClose,
  onSaved,
}: Readonly<{
  visible: boolean;
  editingTicket: MaintenanceTicket | null;
  theme: ReturnType<typeof useTheme>;
  onClose: () => void;
  onSaved: () => void;
}>) {
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const inputStyle = [styles.input, {
    color: theme.text,
    borderColor: theme.border,
    backgroundColor: theme.backgroundElement,
  }];

  useEffect(() => {
    if (!visible) return;
    if (editingTicket) {
      setForm({
        roomNumber: editingTicket.roomNumber ?? '',
        facilityType: editingTicket.facilityType ?? 'AC',
        issueDescription: editingTicket.issueDescription ?? '',
        status: editingTicket.status ?? 'OPEN',
        priority: editingTicket.priority ?? 'MEDIUM',
        staffId: editingTicket.staffId?.toString() ?? '',
        deadline: editingTicket.deadline?.slice(0, 16) ?? '',
        resolutionNotes: editingTicket.resolutionNotes ?? '',
        partsUsed: editingTicket.partsUsed ?? '',
      });
    } else {
      setForm(initialForm);
    }
    setFormError('');
  }, [editingTicket, visible]);

  const setField = useCallback(
    (key: keyof typeof initialForm) => (v: string) => setForm((f) => ({ ...f, [key]: v })),
    [],
  );

  const handleSubmit = async () => {
    if (!form.roomNumber.trim() || !form.issueDescription.trim()) {
      setFormError('Room number and issue description are required.');
      return;
    }
    setFormError('');
    setSubmitting(true);
    const payload = {
      roomNumber: form.roomNumber.trim(),
      facilityType: form.facilityType,
      issueDescription: form.issueDescription.trim(),
      status: form.status,
      priority: form.priority,
      resolutionNotes: form.resolutionNotes || undefined,
      partsUsed: form.partsUsed || undefined,
      deadline: form.deadline || undefined,
      staffId: form.staffId ? Number(form.staffId) : undefined,
    };
    try {
      if (editingTicket) {
        await updateMaintenanceTicket(editingTicket.id, payload);
      } else {
        await createMaintenanceTicket(payload);
      }
      onClose();
      onSaved();
    } catch (err) {
      setFormError(getErrMsg(err, 'Unable to save ticket.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalSafeArea, { backgroundColor: theme.background }]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {editingTicket ? 'Edit Ticket' : 'New Maintenance Ticket'}
            </Text>
            <Pressable onPress={onClose}>
              <Text style={[styles.modalClose, { color: theme.textSecondary }]}>✕</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <FormField label="Room Number" theme={theme}>
              <TextInput style={inputStyle} placeholder="e.g. 101" placeholderTextColor={theme.textSecondary}
                value={form.roomNumber} onChangeText={setField('roomNumber')} />
            </FormField>

            <FormField label="Facility Type" theme={theme}>
              <ChipGroup options={FACILITY_TYPES} value={form.facilityType} onChange={setField('facilityType')} theme={theme} />
            </FormField>

            <FormField label="Issue Description" theme={theme}>
              <TextInput style={[...inputStyle, styles.textarea]} placeholder="Describe the issue..."
                placeholderTextColor={theme.textSecondary} multiline numberOfLines={3}
                value={form.issueDescription} onChangeText={setField('issueDescription')} />
            </FormField>

            <FormField label="Priority" theme={theme}>
              <ChipGroup options={PRIORITIES} value={form.priority} onChange={setField('priority')} theme={theme} />
            </FormField>

            <FormField label="Status" theme={theme}>
              <ChipGroup options={ALL_STATUSES} value={form.status} onChange={setField('status')} theme={theme} />
            </FormField>

            <FormField label="Staff ID (optional)" theme={theme}>
              <TextInput style={inputStyle} placeholder="Enter staff ID" placeholderTextColor={theme.textSecondary}
                keyboardType="numeric" value={form.staffId} onChangeText={setField('staffId')} />
            </FormField>

            <FormField label="Deadline (optional)" theme={theme}>
              <TextInput style={inputStyle} placeholder="YYYY-MM-DDTHH:MM" placeholderTextColor={theme.textSecondary}
                value={form.deadline} onChangeText={setField('deadline')} />
            </FormField>

            <FormField label="Resolution Notes (optional)" theme={theme}>
              <TextInput style={[...inputStyle, styles.textarea]} placeholder="Resolution details..."
                placeholderTextColor={theme.textSecondary} multiline numberOfLines={3}
                value={form.resolutionNotes} onChangeText={setField('resolutionNotes')} />
            </FormField>

            <FormField label="Parts Used (optional)" theme={theme}>
              <TextInput style={inputStyle} placeholder="e.g. Filter x2, Pipe joint"
                placeholderTextColor={theme.textSecondary} value={form.partsUsed} onChangeText={setField('partsUsed')} />
            </FormField>

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}

            <Pressable
              style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed, submitting && styles.disabledBtn]}
              onPress={handleSubmit}
              disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#1e293b" />
              ) : (
                <Text style={styles.submitBtnText}>{editingTicket ? 'Update Ticket' : 'Create Ticket'}</Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function FormField({
  label,
  children,
  theme,
}: Readonly<{
  label: string;
  children: React.ReactNode;
  theme: ReturnType<typeof useTheme>;
}>) {
  return (
    <View style={styles.formField}>
      <Text style={[styles.formLabel, { color: theme.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

function StatItem({ label, value, color }: Readonly<{ label: string; value: number; color: string }>) {
  return (
    <View style={[styles.statItem, { borderLeftColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  pageEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  pageTitle: { fontSize: 22, fontWeight: '700', marginTop: 2 },
  newBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  statItem: {
    flex: 1,
    borderLeftWidth: 3,
    paddingLeft: 8,
  },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 11, color: '#9ca3af' },
  filterBar: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    gap: Spacing.two,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  filterChips: { flexDirection: 'row' },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 6,
  },
  filterChipText: { fontSize: 12, fontWeight: '500' },
  listContent: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.three,
    gap: 8,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardRoom: { fontSize: 17, fontWeight: '700' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardMeta: { fontSize: 13 },
  cardDescription: { fontSize: 14, lineHeight: 20 },
  cardNotes: { fontSize: 12, fontStyle: 'italic' },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  statusBtn: { backgroundColor: '#1d4ed822' },
  editBtn: { backgroundColor: '#f59e0b22' },
  deleteBtn: { backgroundColor: '#ef444422' },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: '#3b82f6' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  chipScroll: { flexDirection: 'row' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 6,
  },
  chipText: { fontSize: 12, fontWeight: '500' },
  pressed: { opacity: 0.7 },
  modalSafeArea: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.four,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalClose: { fontSize: 20, padding: 4 },
  modalBody: { padding: Spacing.four, gap: Spacing.three, paddingBottom: 60 },
  formField: { gap: 6 },
  formLabel: { fontSize: 13, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  formError: {
    color: '#ef4444',
    fontSize: 13,
    backgroundColor: '#ef444420',
    padding: 10,
    borderRadius: 8,
  },
  submitBtn: {
    backgroundColor: '#f4d28f',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: { color: '#1e293b', fontSize: 16, fontWeight: '700' },
  disabledBtn: { opacity: 0.6 },
});
