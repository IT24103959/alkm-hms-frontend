import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  createUser,
  deleteUser,
  getMyProfile,
  getUsers,
  type UserMutationPayload,
  type UserProfile,
  updateMyProfile,
  updateUser,
} from '@/api/service';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';

const STAFF_ROLES = [
  'SUPER_ADMIN',
  'MANAGER',
  'STAFF_MEMBER',
  'RESTAURANT_MANAGER',
  'EVENT_MANAGER',
  'HOUSEKEEPER',
  'MAINTENANCE_STAFF',
] as const;

const EMPTY_FORM: UserMutationPayload = {
  username: '',
  fullName: '',
  password: 'Password@123',
  role: 'STAFF_MEMBER',
  enabled: true,
  photoUrl: null,
  position: '',
  basicSalary: 0,
  attendance: 0,
  overtimeHours: 0,
  absentDays: 0,
  overtimeRate: 0,
  dailyRate: 0,
};

const parseNumber = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export default function StaffScreen() {
  const theme = useTheme();
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<UserMutationPayload>(EMPTY_FORM);

  const canManageStaff = authUser?.role === 'SUPER_ADMIN' || authUser?.role === 'MANAGER';

  const staffUsers = useMemo(
    () => users.filter((currentUser) => STAFF_ROLES.includes(currentUser.role as (typeof STAFF_ROLES)[number])),
    [users],
  );

  const currentUser = useMemo(
    () => users.find((entry) => entry.username === authUser?.username) ?? null,
    [authUser?.username, users],
  );

  const loadUsers = useCallback(async () => {
    try {
      if (canManageStaff) {
        const allUsers = await getUsers();
        setUsers(allUsers);
      } else {
        const profile = await getMyProfile();
        setUsers([profile]);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load staff data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canManageStaff]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const resetForm = () => {
    setEditingUser(null);
    setForm({ ...EMPTY_FORM });
    setFormError('');
  };

  const openCreateModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (selectedUser: UserProfile) => {
    setEditingUser(selectedUser);
    setForm({
      username: selectedUser.username,
      fullName: selectedUser.fullName,
      password: '',
      role: selectedUser.role,
      enabled: selectedUser.enabled ?? true,
      photoUrl: selectedUser.photoUrl ?? null,
      position: selectedUser.position ?? '',
      basicSalary: selectedUser.basicSalary ?? 0,
      attendance: selectedUser.attendance ?? 0,
      overtimeHours: selectedUser.overtimeHours ?? 0,
      absentDays: selectedUser.absentDays ?? 0,
      overtimeRate: selectedUser.overtimeRate ?? 0,
      dailyRate: selectedUser.dailyRate ?? 0,
    });
    setFormError('');
    setModalVisible(true);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const pickPhoto = async (selfUpdate = false) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow photo library access to upload a photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    const uri = asset.base64
      ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`
      : asset.uri;

    if (selfUpdate) {
      try {
        setPhotoSaving(true);
        await updateMyProfile({ photoUrl: uri });
        await loadUsers();
        Alert.alert('Success', 'Profile photo updated');
      } catch (error: any) {
        const msg = error.response?.data?.message || 'Failed to update profile photo';
        Alert.alert('Error', msg);
      } finally {
        setPhotoSaving(false);
      }
      return;
    }

    setForm((currentForm) => ({ ...currentForm, photoUrl: uri }));
  };

  const handleSave = async () => {
    if (!form.username.trim() || !form.fullName.trim() || !form.role) {
      setFormError('Username, full name, and role are required.');
      return;
    }

    if (!editingUser && !form.password?.trim()) {
      setFormError('Password is required for new staff members.');
      return;
    }

    const payload: Partial<UserMutationPayload> = {
      username: form.username.trim().toLowerCase(),
      fullName: form.fullName.trim(),
      role: form.role,
      enabled: form.enabled,
      photoUrl: form.photoUrl ?? null,
      position: form.position?.trim() ?? '',
      basicSalary: Number(form.basicSalary) || 0,
      attendance: Number(form.attendance) || 0,
      overtimeHours: Number(form.overtimeHours) || 0,
      absentDays: Number(form.absentDays) || 0,
      overtimeRate: Number(form.overtimeRate) || 0,
      dailyRate: Number(form.dailyRate) || 0,
    };

    if (form.password?.trim()) {
      payload.password = form.password.trim();
    }

    try {
      setSaving(true);
      setFormError('');

      if (editingUser) {
        await updateUser(editingUser._id, payload);
      } else {
        await createUser(payload as UserMutationPayload);
      }

      await loadUsers();
      setModalVisible(false);
      resetForm();
      Alert.alert('Success', editingUser ? 'Staff member updated' : 'Staff member created');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to save staff member';
      setFormError(msg);
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (selectedUser: UserProfile) => {
    Alert.alert('Delete staff member', `Delete ${selectedUser.fullName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteUser(selectedUser._id);
            await loadUsers();
          } catch (error: any) {
            const msg = error.response?.data?.message || 'Failed to delete staff member';
            Alert.alert('Error', msg);
          }
        },
      },
    ]);
  };

  const renderStaffCard = ({ item }: { item: UserProfile }) => (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.cardTopRow}>
        <View style={styles.profileRow}>
          {item.photoUrl ? (
            <Image source={{ uri: item.photoUrl }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: `${theme.primary}20` }]}>
              <Text style={[styles.avatarFallbackText, { color: theme.primary }]}>
                {(item.fullName || item.username).charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{item.fullName}</Text>
            <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
              @{item.username} • {item.role.replaceAll('_', ' ')}
            </Text>
            <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>
              {item.position || 'No position'} • {item.enabled === false ? 'Inactive' : 'Active'}
            </Text>
          </View>
        </View>
        {canManageStaff ? (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.outlineButton, { borderColor: theme.border }]}
              onPress={() => openEditModal(item)}>
              <Text style={[styles.outlineButtonText, { color: theme.text }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: `${theme.danger}15` }]}
              onPress={() => handleDelete(item)}>
              <Text style={[styles.deleteButtonText, { color: theme.danger }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <View style={styles.metricRow}>
        <View style={styles.metricBox}>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Basic</Text>
          <Text style={[styles.metricValue, { color: theme.text }]}>Rs. {(item.basicSalary ?? 0).toFixed(2)}</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>OT Hours</Text>
          <Text style={[styles.metricValue, { color: theme.text }]}>{item.overtimeHours ?? 0}</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Absent</Text>
          <Text style={[styles.metricValue, { color: theme.text }]}>{item.absentDays ?? 0}</Text>
        </View>
      </View>
    </View>
  );

  const renderSelfProfile = () => (
    <View style={[styles.selfCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.selfTitle, { color: theme.text }]}>My Staff Profile</Text>
      <Text style={[styles.selfSubtitle, { color: theme.textSecondary }]}>
        Upload your photo here. Staff users do not have access to admin CRUD actions.
      </Text>
      <View style={styles.selfProfileRow}>
        {currentUser?.photoUrl ? (
          <Image source={{ uri: currentUser.photoUrl }} style={styles.selfAvatar} contentFit="cover" />
        ) : (
          <View style={[styles.selfAvatarFallback, { backgroundColor: `${theme.primary}20` }]}>
            <Text style={[styles.avatarFallbackText, { color: theme.primary }]}>
              {(currentUser?.fullName || authUser?.username || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{currentUser?.fullName ?? authUser?.fullName}</Text>
          <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
            @{currentUser?.username ?? authUser?.username}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: theme.primary }, photoSaving && { opacity: 0.7 }]}
        disabled={photoSaving}
        onPress={() => pickPhoto(true)}>
        {photoSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Upload Photo</Text>}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: theme.text }]}>Staff Management</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                {canManageStaff ? 'Manage staff records, salaries, and payroll data.' : 'View your profile and upload your photo.'}
              </Text>
            </View>
            {canManageStaff ? (
              <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.primary }]} onPress={openCreateModal}>
                <Text style={styles.primaryButtonText}>Add Staff</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {!canManageStaff ? renderSelfProfile() : null}

          <FlatList
            data={canManageStaff ? staffUsers : currentUser ? [currentUser] : []}
            keyExtractor={(item) => item._id}
            renderItem={renderStaffCard}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No staff records found.</Text>
              </View>
            }
          />

          <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>
                    {editingUser ? 'Edit Staff Member' : 'Create Staff Member'}
                  </Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Text style={[styles.closeText, { color: theme.textSecondary }]}>Close</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.formContent}>
                  <TouchableOpacity
                    style={[styles.photoPicker, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                    onPress={() => pickPhoto(false)}>
                    {form.photoUrl ? (
                      <Image source={{ uri: form.photoUrl }} style={styles.formPhoto} contentFit="cover" />
                    ) : (
                      <Text style={[styles.photoPickerText, { color: theme.textSecondary }]}>Upload Photo</Text>
                    )}
                  </TouchableOpacity>

                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                    placeholder="Full name"
                    placeholderTextColor={theme.textSecondary}
                    value={form.fullName}
                    onChangeText={(value) => setForm((currentForm) => ({ ...currentForm, fullName: value }))}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                    placeholder="Username"
                    placeholderTextColor={theme.textSecondary}
                    value={form.username}
                    autoCapitalize="none"
                    onChangeText={(value) => setForm((currentForm) => ({ ...currentForm, username: value }))}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                    placeholder={editingUser ? 'Set new password (optional)' : 'Password'}
                    placeholderTextColor={theme.textSecondary}
                    value={form.password ?? ''}
                    secureTextEntry
                    onChangeText={(value) => setForm((currentForm) => ({ ...currentForm, password: value }))}
                  />

                  <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Role</Text>
                  <View style={styles.roleGrid}>
                    {STAFF_ROLES.map((roleOption) => (
                      <TouchableOpacity
                        key={roleOption}
                        style={[
                          styles.roleChip,
                          { borderColor: theme.border },
                          form.role === roleOption && { backgroundColor: `${theme.primary}18`, borderColor: theme.primary },
                        ]}
                        onPress={() => setForm((currentForm) => ({ ...currentForm, role: roleOption }))}>
                        <Text
                          style={[
                            styles.roleChipText,
                            { color: theme.textSecondary },
                            form.role === roleOption && { color: theme.primary },
                          ]}>
                          {roleOption.replaceAll('_', ' ')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                    placeholder="Position"
                    placeholderTextColor={theme.textSecondary}
                    value={form.position ?? ''}
                    onChangeText={(value) => setForm((currentForm) => ({ ...currentForm, position: value }))}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                    placeholder="Basic salary"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                    value={String(form.basicSalary ?? 0)}
                    onChangeText={(value) => setForm((currentForm) => ({ ...currentForm, basicSalary: parseNumber(value) }))}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                    placeholder="Attendance"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                    value={String(form.attendance ?? 0)}
                    onChangeText={(value) => setForm((currentForm) => ({ ...currentForm, attendance: parseNumber(value) }))}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                    placeholder="Overtime hours"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                    value={String(form.overtimeHours ?? 0)}
                    onChangeText={(value) => setForm((currentForm) => ({ ...currentForm, overtimeHours: parseNumber(value) }))}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                    placeholder="Overtime rate"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                    value={String(form.overtimeRate ?? 0)}
                    onChangeText={(value) => setForm((currentForm) => ({ ...currentForm, overtimeRate: parseNumber(value) }))}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                    placeholder="Absent days"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                    value={String(form.absentDays ?? 0)}
                    onChangeText={(value) => setForm((currentForm) => ({ ...currentForm, absentDays: parseNumber(value) }))}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                    placeholder="Daily rate"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                    value={String(form.dailyRate ?? 0)}
                    onChangeText={(value) => setForm((currentForm) => ({ ...currentForm, dailyRate: parseNumber(value) }))}
                  />

                  <View style={styles.switchRow}>
                    <Text style={[styles.switchLabel, { color: theme.text }]}>Active</Text>
                    <Switch
                      value={form.enabled ?? true}
                      onValueChange={(value) => setForm((currentForm) => ({ ...currentForm, enabled: value }))}
                      trackColor={{ true: theme.primary, false: theme.border }}
                    />
                  </View>

                  {formError ? <Text style={[styles.formError, { color: theme.danger }]}>{formError}</Text> : null}

                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: theme.primary }, saving && { opacity: 0.7 }]}
                    disabled={saving}
                    onPress={handleSave}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Save Staff Member</Text>}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </Modal>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { marginTop: 4, fontSize: 14, lineHeight: 20, maxWidth: 480 },
  listContent: { padding: Spacing.four, gap: Spacing.three, paddingTop: 0 },
  selfCard: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderRadius: 20,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  selfTitle: { fontSize: 20, fontWeight: '800' },
  selfSubtitle: { fontSize: 13, lineHeight: 18 },
  selfProfileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  selfAvatar: { width: 72, height: 72, borderRadius: 36 },
  selfAvatarFallback: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  cardTopRow: { gap: Spacing.three },
  profileRow: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  avatar: { width: 58, height: 58, borderRadius: 29 },
  avatarFallback: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { fontSize: 22, fontWeight: '800' },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  cardSubtitle: { marginTop: 2, fontSize: 13, fontWeight: '600' },
  cardMeta: { marginTop: 6, fontSize: 12 },
  cardActions: { flexDirection: 'row', gap: Spacing.two },
  metricRow: { flexDirection: 'row', gap: Spacing.two },
  metricBox: { flex: 1 },
  metricLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  metricValue: { marginTop: 4, fontSize: 15, fontWeight: '700' },
  primaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  outlineButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  outlineButtonText: { fontSize: 13, fontWeight: '700' },
  deleteButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  deleteButtonText: { fontSize: 13, fontWeight: '700' },
  emptyState: { paddingVertical: 80, alignItems: 'center' },
  emptyText: { fontSize: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContent: {
    maxHeight: '92%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  closeText: { fontSize: 14, fontWeight: '700' },
  formContent: { gap: Spacing.three, paddingBottom: Spacing.five },
  photoPicker: {
    alignSelf: 'center',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoPickerText: { fontSize: 13, fontWeight: '700' },
  formPhoto: { width: '100%', height: '100%' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  sectionLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  roleChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10 },
  roleChipText: { fontSize: 12, fontWeight: '700' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  switchLabel: { fontSize: 15, fontWeight: '700' },
  formError: { fontSize: 13, fontWeight: '600' },
});
