import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  calculatePayroll,
  getAllPayroll,
  getMyPayroll,
  getStaff,
  type PayrollRecord,
  type StaffMember,
} from '@/api/service';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const fmt = (n?: number) =>
  n === undefined ? '-' : `Rs. ${Number(n).toLocaleString()}`;

const monthLabel = (month: number, year: number) =>
  `${MONTHS[(month - 1) % 12]} ${year}`;

// ── Sub-components ────────────────────────────────────────────────────────────

function PayrollRow({
  item,
  theme,
}: Readonly<{ item: PayrollRecord; theme: ReturnType<typeof useTheme> }>) {
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.cardTop}>
        <Text style={[styles.cardName, { color: theme.text }]}>{item.staff?.name ?? `Staff #${item._id}`}</Text>
        <Text style={[styles.cardPeriod, { color: theme.textSecondary }]}>{monthLabel(item.month, item.year)}</Text>
      </View>
      <View style={styles.cardGrid}>
        <GridItem label="Basic" value={fmt(item.basicSalary)} theme={theme} />
        <GridItem label="Overtime" value={fmt(item.overtimePay)} theme={theme} />
        <GridItem label="Deductions" value={fmt(item.deductions)} theme={theme} />
        <View style={[styles.gridItem, { backgroundColor: theme.success + '18', borderColor: theme.success + '44' }]}>
          <Text style={[styles.gridLabel, { color: theme.textSecondary }]}>Net Salary</Text>
          <Text style={[styles.gridValue, { color: theme.success }]}>{fmt(item.netSalary)}</Text>
        </View>
      </View>
    </View>
  );
}

function GridItem({
  label,
  value,
  theme,
}: Readonly<{ label: string; value: string; theme: ReturnType<typeof useTheme> }>) {
  return (
    <View style={[styles.gridItem, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
      <Text style={[styles.gridLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.gridValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

function CalculateModal({
  visible,
  staff,
  theme,
  onClose,
  onDone,
}: Readonly<{
  visible: boolean;
  staff: StaffMember[];
  theme: ReturnType<typeof useTheme>;
  onClose: () => void;
  onDone: () => void;
}>) {
  const now = new Date();
  const [staffId, setStaffId] = useState('');
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const inputStyle = [
    styles.input,
    { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement },
  ];

  const handleSubmit = async () => {
    if (!staffId) { setError('Please select a staff member.'); return; }
    const m = Number(month);
    const y = Number(year);
    if (m < 1 || m > 12) { setError('Month must be 1–12.'); return; }
    if (y < 2000 || y > 2100) { setError('Enter a valid year.'); return; }
    setError('');
    setSubmitting(true);
    try {
      await calculatePayroll({ staffId: staffId, month: m, year: y });
      onClose();
      onDone();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to calculate payroll.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.card }]}>
          <Text style={[styles.sheetTitle, { color: theme.text }]}>Calculate Payroll</Text>

          <Text style={[styles.label, { color: theme.textSecondary }]}>Staff Member</Text>
          <ScrollView style={[styles.staffPicker, { borderColor:  '#e5e7eb' }]} nestedScrollEnabled>
            {staff.map((s) => (
              <Pressable
                key={s._id}
                style={[styles.staffOption, staffId === s._id && { backgroundColor: '#3b82f622' }]}
                onPress={() => setStaffId(s._id)}>
                <Text style={{ color: theme.text }}>{s.name}</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{s.position}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Month (1–12)</Text>
              <TextInput style={inputStyle} keyboardType="numeric" value={month} onChangeText={setMonth} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Year</Text>
              <TextInput style={inputStyle} keyboardType="numeric" value={year} onChangeText={setYear} />
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.row}>
            <Pressable style={[styles.btn, styles.ghost, { borderColor:  '#e5e7eb' }]} onPress={onClose}>
              <Text style={{ color: theme.textSecondary }}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.primary, submitting && styles.disabled]} onPress={handleSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#1e293b" /> : <Text style={styles.primaryText}>Calculate</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function PayrollScreen() {
  const { user } = useAuth();
  const theme = useTheme();

  const isManager = user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER';

  const [rows, setRows] = useState<PayrollRecord[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [calcVisible, setCalcVisible] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (isManager) {
        const [payroll, staffList] = await Promise.all([getAllPayroll(), getStaff({ page: 0, size: 200 })]);
        setRows(payroll);
        const list = Array.isArray(staffList) ? staffList : (staffList.content ?? []);
        setStaff(list);
      } else {
        const payroll = await getMyPayroll();
        setRows(payroll);
      }
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      Alert.alert('Error', e?.response?.data?.message ?? e?.message ?? 'Failed to load payroll.');
    } finally {
      setLoading(false);
    }
  }, [isManager]);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor:  '#e5e7eb' }]}>
        <View>
          <Text style={[styles.eyebrow, { color: theme.textSecondary }]}>FINANCE</Text>
          <Text style={[styles.title, { color: theme.text }]}>{isManager ? 'Payroll Management' : 'My Salary'}</Text>
        </View>
        {isManager && (
          <Pressable style={({ pressed }) => [styles.newBtn, { backgroundColor: theme.primary }, pressed && { opacity: 0.7 }]} onPress={() => setCalcVisible(true)}>
            <Text style={styles.newBtnText}>Calculate</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.text} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <PayrollRow item={item} theme={theme} />}
          ListEmptyComponent={<Text style={[styles.empty, { color: theme.textSecondary }]}>No payroll records found.</Text>}
        />
      )}

      {isManager && (
        <CalculateModal
          visible={calcVisible}
          staff={staff}
          theme={theme}
          onClose={() => setCalcVisible(false)}
          onDone={load}
        />
      )}
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
  title: { fontSize: 22, fontWeight: '700', marginTop: 2 },
  newBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  list: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  card: { borderRadius: 12, borderWidth: 1, padding: Spacing.three, gap: Spacing.two, elevation: 2, shadowColor: '#0f1f2e', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontSize: 16, fontWeight: '700' },
  cardPeriod: { fontSize: 13 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridItem: { flex: 1, minWidth: '44%', padding: 10, borderRadius: 8, borderWidth: 1, gap: 2 },
  gridLabel: { fontSize: 11, fontWeight: '600', color: '#9ca3af' },
  gridValue: { fontSize: 15, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.four, gap: Spacing.two, paddingBottom: 40 },
  sheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  staffPicker: { maxHeight: 160, borderWidth: 1, borderRadius: 8, marginBottom: 8 },
  staffOption: { padding: 12, borderRadius: 6, gap: 2 },
  row: { flexDirection: 'row', gap: Spacing.two },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  errorText: { color: '#ef4444', fontSize: 13, backgroundColor: '#ef444420', padding: 10, borderRadius: 8 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  ghost: { borderWidth: 1 },
  primary: { backgroundColor: '#f4d28f' },
  primaryText: { color: '#1e293b', fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.6 },
});
