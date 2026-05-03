import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { 
  getPayrolls, 
  createPayroll, 
  updatePayroll,
  deletePayroll, 
  getUsers, 
  type Payroll, 
  type UserProfile 
} from '@/api/service';

export default function PayrollScreen() {
  const theme = useTheme();
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [editingPayroll, setEditingPayroll] = useState<Payroll | null>(null);
  
  // New Payroll Form State
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [month, setMonth] = useState('January');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [bonuses, setBonuses] = useState('0');
  const [basicSalary, setBasicSalary] = useState('0');
  const [overtimeHours, setOvertimeHours] = useState('0');
  const [overtimeRate, setOvertimeRate] = useState('0');
  const [absentDays, setAbsentDays] = useState('0');
  const [dailyRate, setDailyRate] = useState('0');
  const [status, setStatus] = useState<'PENDING' | 'PAID'>('PENDING');
  const [remarks, setRemarks] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [payrollData, userData] = await Promise.all([
        getPayrolls(),
        getUsers(),
      ]);
      setPayrolls(payrollData);
      setUsers(userData.filter(u => u.role !== 'CUSTOMER'));
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load payroll data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCreatePayroll = async () => {
    if (!selectedUser || !month || !year) {
      setFormError('Please fill in all required fields.');
      return;
    }

    const parsedYear = Number.parseInt(year, 10);
    if (Number.isNaN(parsedYear)) {
      setFormError('Please enter a valid year.');
      return;
    }

    try {
      setFormError('');
      setSubmitting(true);
      if (editingPayroll) {
        await updatePayroll(editingPayroll._id, {
          userId: selectedUser,
          month,
          year: parsedYear,
          basicSalary: parseFloat(basicSalary) || 0,
          overtimeHours: parseFloat(overtimeHours) || 0,
          overtimeRate: parseFloat(overtimeRate) || 0,
          absentDays: parseFloat(absentDays) || 0,
          dailyRate: parseFloat(dailyRate) || 0,
          bonuses: parseFloat(bonuses) || 0,
          remarks,
          status,
        });
      } else {
        await createPayroll({
          userId: selectedUser,
          month,
          year: parsedYear,
          bonuses: parseFloat(bonuses) || 0,
          remarks,
        });
      }
      await loadData();
      setModalVisible(false);
      resetForm();
      Alert.alert('Success', editingPayroll ? 'Payroll updated successfully' : 'Payroll generated successfully');
    } catch (error: any) {
      console.error('Payroll creation error:', error);
      const msg = error.response?.data?.message || error.message || 'Failed to create payroll';
      setFormError(msg);
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePayroll = async (id: string) => {
    const confirmed =
      typeof window !== 'undefined' && window.confirm
        ? window.confirm('Are you sure you want to delete this payroll record?')
        : await new Promise<boolean>((resolve) =>
            Alert.alert('Delete Payroll', 'Are you sure you want to delete this record?', [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
            ])
          );

    if (!confirmed) return;

    try {
      await deletePayroll(id);
      loadData();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to delete payroll';
      Alert.alert('Error', msg);
    }
  };

  const resetForm = () => {
    setEditingPayroll(null);
    setSelectedUser('');
    setMonth('January');
    setYear(new Date().getFullYear().toString());
    setBonuses('0');
    setBasicSalary('0');
    setOvertimeHours('0');
    setOvertimeRate('0');
    setAbsentDays('0');
    setDailyRate('0');
    setStatus('PENDING');
    setRemarks('');
    setFormError('');
  };

  const openCreateModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (payroll: Payroll) => {
    setEditingPayroll(payroll);
    setSelectedUser(payroll.user._id);
    setMonth(payroll.month);
    setYear(String(payroll.year));
    setBonuses(String(payroll.bonuses ?? 0));
    setBasicSalary(String(payroll.basicSalary ?? 0));
    setOvertimeHours(String(payroll.overtimeHours ?? 0));
    setOvertimeRate(String(payroll.overtimeRate ?? 0));
    setAbsentDays(String(payroll.absentDays ?? 0));
    setDailyRate(String(payroll.dailyRate ?? 0));
    setStatus(payroll.status);
    setRemarks(payroll.remarks ?? '');
    setFormError('');
    setModalVisible(true);
  };

  const renderPayrollItem = ({ item }: { item: Payroll }) => (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={[styles.userName, { color: theme.text }]}>{item.user.fullName}</Text>
          <Text style={[styles.userRole, { color: theme.textSecondary }]}>{item.user.role}</Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => openEditModal(item)}>
            <Ionicons name="create-outline" size={20} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeletePayroll(item._id)}>
            <Ionicons name="trash-outline" size={20} color={theme.danger} />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.cardDivider} />
      
      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Period:</Text>
        <Text style={[styles.detailValue, { color: theme.text }]}>{item.month} {item.year}</Text>
      </View>
      
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Basic</Text>
          <Text style={[styles.statValue, { color: theme.text }]}>Rs.{item.basicSalary}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Overtime</Text>
          <Text style={[styles.statValue, { color: theme.success }]}>+Rs.{item.overtimePay.toFixed(2)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Deductions</Text>
          <Text style={[styles.statValue, { color: theme.danger }]}>-Rs.{item.deductions.toFixed(2)}</Text>
        </View>
      </View>

      <View style={[styles.netSalaryContainer, { backgroundColor: theme.primary + '10' }]}>
        <Text style={[styles.netSalaryLabel, { color: theme.primary }]}>Net Salary</Text>
        <Text style={[styles.netSalaryValue, { color: theme.primary }]}>Rs. {item.netSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {loading && !refreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      )}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Payroll Management</Text>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={openCreateModal}
        >
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Generate</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={payrolls}
        keyExtractor={(item) => item._id}
        renderItem={renderPayrollItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="wallet-outline" size={64} color={theme.textSecondary + '40'} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No payroll records found</Text>
          </View>
        }
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {editingPayroll ? 'Update Payroll' : 'Generate Payroll'}
              </Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.form}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Select Staff Member</Text>
              <View style={styles.userPicker}>
                {users.map(u => (
                  <TouchableOpacity 
                    key={u._id}
                    style={[
                      styles.userOption, 
                      { borderColor: theme.border },
                      selectedUser === u._id && { backgroundColor: theme.primary + '20', borderColor: theme.primary }
                    ]}
                    onPress={() => setSelectedUser(u._id)}
                  >
                    <Text style={[styles.userOptionText, { color: theme.text }, selectedUser === u._id && { color: theme.primary }]}>
                      {u.fullName} ({u.role})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Month</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                value={month}
                onChangeText={setMonth}
                placeholder="e.g. October"
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Year</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                value={year}
                onChangeText={setYear}
                keyboardType="numeric"
                placeholder="2024"
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Additional Bonuses (Rs.)</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                value={bonuses}
                onChangeText={setBonuses}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.textSecondary}
              />

              {editingPayroll ? (
                <>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Basic Salary (Rs.)</Text>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                    value={basicSalary}
                    onChangeText={setBasicSalary}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={theme.textSecondary}
                  />

                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Overtime Hours</Text>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                    value={overtimeHours}
                    onChangeText={setOvertimeHours}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={theme.textSecondary}
                  />

                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Overtime Rate (Rs.)</Text>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                    value={overtimeRate}
                    onChangeText={setOvertimeRate}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={theme.textSecondary}
                  />

                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Absent Days</Text>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                    value={absentDays}
                    onChangeText={setAbsentDays}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={theme.textSecondary}
                  />

                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Daily Rate (Rs.)</Text>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                    value={dailyRate}
                    onChangeText={setDailyRate}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={theme.textSecondary}
                  />

                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Status</Text>
                  <View style={styles.statusRow}>
                    {(['PENDING', 'PAID'] as const).map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.statusChip,
                          { borderColor: theme.border },
                          status === option && { borderColor: theme.primary, backgroundColor: theme.primary + '20' },
                        ]}
                        onPress={() => setStatus(option)}
                      >
                        <Text
                          style={[
                            styles.statusChipText,
                            { color: theme.textSecondary },
                            status === option && { color: theme.primary },
                          ]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : null}

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Remarks</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background, height: 80 }]}
                value={remarks}
                onChangeText={setRemarks}
                multiline
                placeholder="Add any notes here..."
                placeholderTextColor={theme.textSecondary}
              />

              {formError ? (
                <Text style={[styles.formError, { color: theme.danger }]}>{formError}</Text>
              ) : null}

              <TouchableOpacity 
                style={[styles.submitButton, { backgroundColor: theme.primary }, submitting && { opacity: 0.7 }]}
                onPress={handleCreatePayroll}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>{editingPayroll ? 'Update Payslip' : 'Generate Payslip'}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.four,
  },
  title: { fontSize: 24, fontWeight: '800' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  listContent: { padding: Spacing.four, gap: Spacing.four },
  card: {
    padding: Spacing.four,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  userName: { fontSize: 18, fontWeight: '700' },
  userRole: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  cardDivider: { height: 1, backgroundColor: '#eee', marginVertical: 12 },
  detailRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  detailLabel: { fontSize: 14, fontWeight: '500' },
  detailValue: { fontSize: 14, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  statBox: { flex: 1, padding: 8, gap: 2 },
  statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  statValue: { fontSize: 13, fontWeight: '700' },
  netSalaryContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  netSalaryLabel: { fontSize: 14, fontWeight: '700' },
  netSalaryValue: { fontSize: 18, fontWeight: '800' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100, gap: 16 },
  emptyText: { fontSize: 16, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '90%',
    padding: Spacing.four,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  form: { gap: 16 },
  inputLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  formError: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: -4,
  },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statusChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  statusChipText: { fontSize: 12, fontWeight: '700' },
  userPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  userOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  userOptionText: { fontSize: 13, fontWeight: '600' },
  submitButton: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20, marginBottom: 40 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
