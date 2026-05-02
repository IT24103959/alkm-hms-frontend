import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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

import DateTimePickerField from "@/components/DateTimePickerField";

import {
  createHousekeepingTask,
  deleteHousekeepingTask,
  getHousekeepingStats,
  getHousekeepingTasks,
  getRooms,
  updateHousekeepingTask,
  updateHousekeepingTaskStatus,
  type HousekeepingStats,
  type HousekeepingTask,
  type Room,
} from "@/api/roomService";
import { getStaff, type StaffMember } from "@/api/service";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/use-theme";
import { Spacing } from "@/constants/theme";

// ── Constants ────────────────────────────────────────────────────────────────

const TASK_TYPES = ["CLEANING", "INSPECTION", "TURNDOWN"] as const;
const ROOM_CONDITIONS = ["OCCUPIED", "CHECKOUT", "PRE_CHECK_IN"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
const ALL_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "CLEANED",
  "INSPECTED",
] as const;
const HOUSEKEEPER_STATUSES = ["IN_PROGRESS", "CLEANED", "INSPECTED"] as const;

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  IN_PROGRESS: "#3b82f6",
  CLEANED: "#10b981",
  INSPECTED: "#8b5cf6",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "#10b981",
  MEDIUM: "#f59e0b",
  HIGH: "#ef4444",
};

const initialForm = {
  roomNumber: "",
  roomCondition: "OCCUPIED" as string,
  taskType: "CLEANING" as string,
  status: "PENDING" as string,
  priority: "MEDIUM" as string,
  staff: "",
  deadline: "",
  notes: "",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatLabel = (v?: string) => (v ? v.replace(/_/g, " ") : "-");

const formatDateTime = (v?: string) => {
  if (!v) return "-";
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleString();
};

const getErrMsg = (err: unknown, fallback: string) => {
  const e = err as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return e?.response?.data?.message ?? e?.message ?? fallback;
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "#6b7280";
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: color + "22", borderColor: color + "55" },
      ]}
    >
      <Text style={[styles.badgeText, { color }]}>{formatLabel(status)}</Text>
    </View>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const color = PRIORITY_COLORS[priority] ?? "#6b7280";
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: color + "22", borderColor: color + "55" },
      ]}
    >
      <Text style={[styles.badgeText, { color }]}>{priority}</Text>
    </View>
  );
}

function ChipGroup({
  options,
  value,
  onChange,
  theme,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.chipScroll}
    >
      {options.map((opt) => {
        const active = value === opt;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={[
              styles.chip,
              { borderColor: theme.backgroundSelected },
              active && {
                backgroundColor: theme.text,
                borderColor: theme.text,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: active ? theme.background : theme.textSecondary },
              ]}
            >
              {formatLabel(opt)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function HousekeepingScreen() {
  const { user } = useAuth();
  const theme = useTheme();

  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [stats, setStats] = useState<HousekeepingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [search, setSearch] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<HousekeepingTask | null>(null);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canManage = ["SUPER_ADMIN", "MANAGER"].includes(user?.role ?? "");
  const isHousekeeper = user?.role === "HOUSEKEEPER";

  const loadData = useCallback(async () => {
    const [tasksRes, statsRes, staffRes, roomsRes] = await Promise.allSettled([
      getHousekeepingTasks(),
      getHousekeepingStats(),
      getStaff({ role: 'HOUSEKEEPER', size: 200 }),
      getRooms(),
    ]);
    if (tasksRes.status === "fulfilled") {
      const raw = tasksRes.value.data;
      setTasks(Array.isArray(raw) ? raw : ((raw as { content?: HousekeepingTask[] }).content ?? []));
    }
    if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
    if (staffRes.status === "fulfilled") setStaff(staffRes.value.content ?? []);
    if (roomsRes.status === "fulfilled") {
      const raw = roomsRes.value.data;
      setRooms(Array.isArray(raw) ? raw : ((raw as { content?: Room[] }).content ?? []));
    }
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

  const filteredTasks = useMemo(
    () =>
      tasks.filter((t) => {
        if (statusFilter && t.status !== statusFilter) return false;
        if (priorityFilter && t.priority !== priorityFilter) return false;
        if (
          search &&
          !t.roomNumber?.toLowerCase().includes(search.toLowerCase())
        )
          return false;
        return true;
      }),
    [tasks, statusFilter, priorityFilter, search],
  );

  const openCreate = () => {
    setEditingTask(null);
    setForm(initialForm);
    setFormError("");
    setModalVisible(true);
  };

  const openEdit = (task: HousekeepingTask) => {
    setEditingTask(task);
    setForm({
      roomNumber: task.roomNumber ?? "",
      roomCondition: task.roomCondition ?? "OCCUPIED",
      taskType: task.taskType ?? "CLEANING",
      status: task.status ?? "PENDING",
      priority: task.priority ?? "MEDIUM",
      staff: task.assignedStaff?._id ?? task.staff ?? "",
      deadline: task.deadline?.slice(0, 16) ?? "",
      notes: task.notes ?? "",
    });
    setFormError("");
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!form.roomNumber.trim()) {
      setFormError("Room number is required.");
      return;
    }
    setFormError("");
    setSubmitting(true);
    const deadlineIso = form.deadline ? new Date(form.deadline).toISOString() : undefined;
    const basePayload = {
      roomNumber: form.roomNumber.trim(),
      roomCondition: form.roomCondition,
      taskType: form.taskType,
      priority: form.priority,
      notes: form.notes || undefined,
      deadline: deadlineIso,
      staff: form.staff || undefined,
    };
    const payload = editingTask
      ? { ...basePayload, status: form.status }
      : basePayload;
    try {
      if (editingTask) {
        await updateHousekeepingTask(editingTask._id, payload);
      } else {
        await createHousekeepingTask(payload);
      }
      setModalVisible(false);
      loadData();
    } catch (err) {
      setFormError(getErrMsg(err, "Unable to save task."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (task: HousekeepingTask) => {
    Alert.alert(
      "Delete Task",
      `Delete housekeeping task for room ${task.roomNumber}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteHousekeepingTask(task._id);
              loadData();
            } catch (err) {
              Alert.alert("Error", getErrMsg(err, "Unable to delete task."));
            }
          },
        },
      ],
    );
  };

  const handleQuickStatus = (task: HousekeepingTask) => {
    const statusOptions = canManage ? ALL_STATUSES : HOUSEKEEPER_STATUSES;
    Alert.alert(
      `Room ${task.roomNumber} — Update Status`,
      `Current: ${formatLabel(task.status)}`,
      [
        ...statusOptions.map((s) => ({
          text: formatLabel(s),
          onPress: async () => {
            try {
              await updateHousekeepingTaskStatus(task._id, s);
              loadData();
            } catch (err) {
              Alert.alert("Error", getErrMsg(err, "Could not update status."));
            }
          },
        })),
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  const renderTask = ({ item }: { item: HousekeepingTask }) => (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.cardRoom, { color: theme.text }]}>
          Room {item.roomNumber}
        </Text>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.cardRow}>
        <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>
          {formatLabel(item.taskType)}
        </Text>
        <Text style={[styles.cardDot, { color: theme.textSecondary }]}>·</Text>
        <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>
          {formatLabel(item.roomCondition)}
        </Text>
        <View style={{ marginLeft: "auto" }}>
          <PriorityBadge priority={item.priority} />
        </View>
      </View>

      {item.assignedStaff?.name && (
        <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>
          👤 {item.assignedStaff.name}
        </Text>
      )}
      {item.deadline && (
        <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>
          🕐 {formatDateTime(item.deadline)}
        </Text>
      )}
      {item.notes && (
        <Text
          style={[styles.cardNotes, { color: theme.textSecondary }]}
          numberOfLines={2}
        >
          {item.notes}
        </Text>
      )}

      <View style={styles.cardActions}>
        <Pressable
          style={({ pressed }) => [
            styles.actionBtn,
            styles.statusBtn,
            pressed && styles.pressed,
          ]}
          onPress={() => handleQuickStatus(item)}
        >
          <Text style={styles.actionBtnText}>Set Status</Text>
        </Pressable>
        {canManage && (
          <>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                styles.editBtn,
                pressed && styles.pressed,
              ]}
              onPress={() => openEdit(item)}
            >
              <Text style={styles.actionBtnText}>Edit</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                styles.deleteBtn,
                pressed && styles.pressed,
              ]}
              onPress={() => handleDelete(item)}
            >
              <Text style={[styles.actionBtnText, { color: "#ef4444" }]}>
                Delete
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      {/* Header */}
      <View style={[styles.pageHeader, { borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.pageEyebrow, { color: theme.textSecondary }]}>
            ROOM OPERATIONS
          </Text>
          <Text style={[styles.pageTitle, { color: theme.text }]}>
            Housekeeping
          </Text>
        </View>
        {canManage && (
          <Pressable
            style={({ pressed }) => [
              styles.newBtn,
              { backgroundColor: theme.primary },
              pressed && styles.pressed,
            ]}
            onPress={openCreate}
          >
            <Text style={styles.newBtnText}>+ New Task</Text>
          </Pressable>
        )}
      </View>

      {/* Stats + Filters panel */}
      <View style={[styles.controlPanel, { borderBottomColor: theme.border }]}>

        <View style={[styles.statsBlock, { borderBottomColor: theme.border }]}>
          <Text style={[styles.panelLabel, { color: theme.textSecondary }]}>OVERVIEW</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statsGridRow}>
                <StatItem label="Total" value={stats?.totalTasks ?? 0} color="#8b5cf6" />
                <StatItem label="Pending" value={stats?.pendingTasks ?? 0} color="#ef4444" />
              </View>
              <View style={styles.statsGridRow}>
                <StatItem
                  label="In Progress"
                  value={stats?.inProgressTasks ?? 0}
                  color="#3b82f6"
                />
                <StatItem label="Completed" value={stats?.completedTasks ?? 0} color="#10b981" />
            </View>
          </View>
        </View>

        {/* Search + Filters */}
        <View style={styles.filterSection}>
        <TextInput
          style={[
            styles.searchInput,
            {
              color: theme.text,
              borderColor: theme.border,
              backgroundColor: theme.backgroundElement,
            },
          ]}
          placeholder="Search room..."
          placeholderTextColor={theme.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterChips}
        >
          {[
            { label: "All", value: "" },
            ...ALL_STATUSES.map((s) => ({ label: formatLabel(s), value: s })),
          ].map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setStatusFilter(opt.value)}
              style={[
                styles.filterChip,
                { borderColor: theme.border },
                statusFilter === opt.value && {
                  backgroundColor: theme.text,
                  borderColor: theme.text,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color:
                      statusFilter === opt.value
                        ? theme.background
                        : theme.textSecondary,
                  },
                ]}
              >
                {opt.label || "All"}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={theme.text}
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item, index) => item._id ?? `task-${index}`}
          renderItem={renderTask}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No tasks found.
            </Text>
          }
        />
      )}

      {/* Create / Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView
          style={[styles.modalSafeArea, { backgroundColor: theme.background }]}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            {/* Modal Header */}
            <View
              style={[styles.modalHeader, { borderBottomColor: theme.border }]}
            >
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {editingTask ? "Edit Task" : "New Housekeeping Task"}
              </Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Text
                  style={[styles.modalClose, { color: theme.textSecondary }]}
                >
                  ✕
                </Text>
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalBody}
              keyboardShouldPersistTaps="handled"
            >
              <FormField label="Room Number" theme={theme}>
                <SelectField
                  options={rooms.map((r) => ({ label: r.roomNumber, value: r.roomNumber }))}
                  value={form.roomNumber}
                  onChange={(v) => setForm((f) => ({ ...f, roomNumber: v }))}
                  placeholder="No rooms loaded"
                  theme={theme}
                />
              </FormField>

              <FormField label="Task Type" theme={theme}>
                <ChipGroup
                  options={TASK_TYPES}
                  value={form.taskType}
                  onChange={(v) => setForm((f) => ({ ...f, taskType: v }))}
                  theme={theme}
                />
              </FormField>

              <FormField label="Room Condition" theme={theme}>
                <ChipGroup
                  options={ROOM_CONDITIONS}
                  value={form.roomCondition}
                  onChange={(v) => setForm((f) => ({ ...f, roomCondition: v }))}
                  theme={theme}
                />
              </FormField>

              <FormField label="Priority" theme={theme}>
                <ChipGroup
                  options={PRIORITIES}
                  value={form.priority}
                  onChange={(v) => setForm((f) => ({ ...f, priority: v }))}
                  theme={theme}
                />
              </FormField>

              <FormField label="Status" theme={theme}>
                <ChipGroup
                  options={ALL_STATUSES}
                  value={form.status}
                  onChange={(v) => setForm((f) => ({ ...f, status: v }))}
                  theme={theme}
                />
              </FormField>

              <FormField label="Staff Member (optional)" theme={theme}>
                <SelectField
                  options={staff.map((s) => ({ label: s.name, subLabel: s.position, value: s._id }))}
                  value={form.staff}
                  onChange={(v) => setForm((f) => ({ ...f, staff: v }))}
                  placeholder="No housekeepers loaded"
                  theme={theme}
                />
              </FormField>

              <FormField label="Deadline (optional)" theme={theme}>
                <DateTimePickerField
                  value={form.deadline}
                  onChange={(v) => setForm((f) => ({ ...f, deadline: v }))}
                  mode="datetime"
                />
              </FormField>

              <FormField label="Notes (optional)" theme={theme}>
                <TextInput
                  style={[
                    styles.input,
                    styles.textarea,
                    {
                      color: theme.text,
                      borderColor: theme.border,
                      backgroundColor: theme.backgroundElement,
                    },
                  ]}
                  placeholder="Additional notes..."
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={3}
                  value={form.notes}
                  onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
                />
              </FormField>

              {formError ? (
                <Text style={styles.formError}>{formError}</Text>
              ) : null}

              <Pressable
                style={({ pressed }) => [
                  styles.submitBtn,
                  pressed && styles.pressed,
                  submitting && styles.disabledBtn,
                ]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#1e293b" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {editingTask ? "Update Task" : "Create Task"}
                  </Text>
                )}
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function SelectField({
  options,
  value,
  onChange,
  placeholder,
  theme,
}: Readonly<{
  options: { label: string; subLabel?: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  theme: ReturnType<typeof useTheme>;
}>) {
  return (
    <ScrollView
      style={[styles.selectScroll, { borderColor: theme.border }]}
      nestedScrollEnabled>
      {options.length === 0 ? (
        <Text style={[styles.selectEmpty, { color: theme.textSecondary }]}>{placeholder}</Text>
      ) : options.map((opt) => (
        <Pressable
          key={opt.value}
          style={[styles.selectOption, value === opt.value && { backgroundColor: theme.primary + '22' }]}
          onPress={() => onChange(opt.value)}>
          <Text style={{ color: theme.text }}>{opt.label}</Text>
          {opt.subLabel ? <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{opt.subLabel}</Text> : null}
        </Pressable>
      ))}
    </ScrollView>
  );
}

function FormField({
  label,
  children,
  theme,
}: {
  label: string;
  children: React.ReactNode;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={styles.formField}>
      <Text style={[styles.formLabel, { color: theme.textSecondary }]}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function StatItem({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  pageEyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5 },
  pageTitle: { fontSize: 22, fontWeight: "700", marginTop: 2 },
  newBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  controlPanel: {
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  panelLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5, marginBottom: 2 },
  statsBlock: {
    borderBottomWidth: 1,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  statsGrid: {
    gap: Spacing.two,
  },
  statsGridRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  statItem: {
    flex: 1,
    borderLeftWidth: 3,
    paddingLeft: 8,
    paddingVertical: 4,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  statValue: { fontSize: 20, fontWeight: "700" },
  statLabel: { fontSize: 11, color: "#9ca3af" },
  filterSection: { gap: Spacing.two },
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
  filterChips: { flexDirection: "row" },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 6,
  },
  filterChipText: { fontSize: 12, fontWeight: "500" },
  listContent: {
    padding: Spacing.three,
    gap: Spacing.two,
    paddingBottom: Spacing.six,
  },
  emptyText: { textAlign: "center", marginTop: 40, fontSize: 14 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.three,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardRoom: { fontSize: 17, fontWeight: "700" },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardDot: { fontSize: 16 },
  cardMeta: { fontSize: 13 },
  cardNotes: { fontSize: 12, fontStyle: "italic" },
  cardActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusBtn: { backgroundColor: "#1d4ed822" },
  editBtn: { backgroundColor: "#f59e0b22" },
  deleteBtn: { backgroundColor: "#ef444422" },
  actionBtnText: { fontSize: 12, fontWeight: "600", color: "#3b82f6" },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: "600" },
  chipScroll: { flexDirection: "row" },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 6,
  },
  chipText: { fontSize: 12, fontWeight: "500" },
  selectScroll: { maxHeight: 160, borderWidth: 1, borderRadius: 8, marginBottom: 4 },
  selectOption: { padding: 12, borderRadius: 6, gap: 2 },
  selectEmpty: { padding: 12, fontSize: 13, textAlign: 'center' },
  pressed: { opacity: 0.7 },
  // Modal
  modalSafeArea: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.four,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalClose: { fontSize: 20, padding: 4 },
  modalBody: { padding: Spacing.four, gap: Spacing.three, paddingBottom: 60 },
  formField: { gap: 6 },
  formLabel: { fontSize: 13, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textarea: { minHeight: 80, textAlignVertical: "top" },
  formError: {
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
  disabledBtn: { opacity: 0.6 },
});
