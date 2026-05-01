import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { createReservation } from '@/api/service';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER'];
const SEATING = ['INDOOR', 'OUTDOOR'];

const formatLabel = (v: string) => v.replaceAll('_', ' ');

export default function ReserveTableScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const isDark = theme.background === '#000000';

  const [form, setForm] = useState({
    customerName: user?.fullName ?? '',
    customerEmail: '',
    reservationDate: '',
    guestCount: '2',
    mealType: 'LUNCH',
    seatingPreference: 'INDOOR',
    specialRequests: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const set = (key: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  const inputStyle = [styles.input, {
    color: theme.text, borderColor: isDark ? '#374151' : '#e5e7eb',
    backgroundColor: isDark ? '#111827' : '#f9fafb',
  }];

  const handleSubmit = async () => {
    if (!form.customerName.trim() || !form.reservationDate || !form.mealType) {
      setError('Name, date, and meal type are required.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await createReservation({
        customerName: form.customerName.trim(),
        customerEmail: form.customerEmail.trim(),
        reservationDate: form.reservationDate,
        guestCount: Number(form.guestCount) || 1,
        mealType: form.mealType,
        seatingPreference: form.seatingPreference,
        specialRequests: form.specialRequests || undefined,
      });
      setSuccess(true);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to create reservation.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={styles.successState}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={[styles.successTitle, { color: theme.text }]}>Reservation Confirmed!</Text>
          <Text style={[styles.successSub, { color: theme.textSecondary }]}>
            Your table has been reserved. We look forward to welcoming you.
          </Text>
          <Pressable style={[styles.btn, { marginTop: Spacing.four }]} onPress={() => router.back()}>
            <Text style={styles.btnText}>Back to Dining</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { borderBottomColor: isDark ? '#1f2937' : '#e5e7eb' }]}>
          <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
            <Text style={[styles.back, { color: theme.textSecondary }]}>← Back</Text>
          </Pressable>
          <Text style={[styles.title, { color: theme.text }]}>Reserve a Table</Text>
        </View>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Your Name</Text>
          <TextInput style={inputStyle} value={form.customerName} onChangeText={set('customerName')} placeholder="Full name" placeholderTextColor={theme.textSecondary} />

          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Email</Text>
          <TextInput style={inputStyle} value={form.customerEmail} onChangeText={set('customerEmail')} placeholder="email@example.com" placeholderTextColor={theme.textSecondary} keyboardType="email-address" />

          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Date & Time (YYYY-MM-DDTHH:MM)</Text>
          <TextInput style={inputStyle} value={form.reservationDate} onChangeText={set('reservationDate')} placeholder="2024-12-25T19:00" placeholderTextColor={theme.textSecondary} />

          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Number of Guests</Text>
          <TextInput style={inputStyle} value={form.guestCount} onChangeText={set('guestCount')} keyboardType="numeric" />

          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Meal Type</Text>
          <View style={styles.chipRow}>
            {MEAL_TYPES.map((m) => {
              const active = form.mealType === m;
              return (
                <Pressable key={m} onPress={() => set('mealType')(m)} style={[styles.chip, active && { backgroundColor: '#ec4899' }]}>
                  <Text style={[styles.chipText, { color: active ? '#fff' : theme.textSecondary }]}>{m}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Seating Preference</Text>
          <View style={styles.chipRow}>
            {SEATING.map((s) => {
              const active = form.seatingPreference === s;
              return (
                <Pressable key={s} onPress={() => set('seatingPreference')(s)} style={[styles.chip, active && { backgroundColor: '#ec4899' }]}>
                  <Text style={[styles.chipText, { color: active ? '#fff' : theme.textSecondary }]}>{formatLabel(s)}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Special Requests (optional)</Text>
          <TextInput style={[...inputStyle, styles.textarea]} value={form.specialRequests} onChangeText={set('specialRequests')} multiline numberOfLines={3} placeholder="Dietary requirements, allergies, occasion..." placeholderTextColor={theme.textSecondary} />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#1e293b" /> : <Text style={styles.btnText}>Confirm Reservation</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, borderBottomWidth: 1, gap: 4 },
  back: { fontSize: 14 },
  title: { fontSize: 22, fontWeight: '700' },
  body: { padding: Spacing.four, gap: Spacing.two, paddingBottom: 60 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb' },
  chipText: { fontSize: 13, fontWeight: '500' },
  errorText: { color: '#ef4444', fontSize: 13, backgroundColor: '#ef444420', padding: 10, borderRadius: 8 },
  btn: { backgroundColor: '#ec4899', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  successState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.six, gap: Spacing.two },
  successIcon: { fontSize: 64 },
  successTitle: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  successSub: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
