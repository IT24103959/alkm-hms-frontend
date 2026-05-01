import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getHousekeepingStats,
  getMaintenanceStats,
  type HousekeepingStats,
  type MaintenanceStats,
} from '@/api/roomService';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', color: '#8b5cf6' },
  MANAGER: { label: 'Manager', color: '#3b82f6' },
  HOUSEKEEPER: { label: 'Housekeeper', color: '#10b981' },
  MAINTENANCE_STAFF: { label: 'Maintenance Staff', color: '#f97316' },
  CUSTOMER: { label: 'Customer', color: '#6b7280' },
  RESTAURANT_MANAGER: { label: 'Restaurant Manager', color: '#ec4899' },
  EVENT_MANAGER: { label: 'Event Manager', color: '#f59e0b' },
  STAFF_MEMBER: { label: 'Staff Member', color: '#64748b' },
};

const canViewHousekeeping = (role?: string) =>
  ['SUPER_ADMIN', 'MANAGER', 'HOUSEKEEPER'].includes(role ?? '');

const canViewMaintenance = (role?: string) =>
  ['SUPER_ADMIN', 'MANAGER', 'MAINTENANCE_STAFF'].includes(role ?? '');

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const [hkStats, setHkStats] = useState<HousekeepingStats | null>(null);
  const [mtStats, setMtStats] = useState<MaintenanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const roleInfo = ROLE_LABELS[user?.role ?? ''] ?? { label: user?.role ?? '', color: '#6b7280' };

  const loadStats = useCallback(async () => {
    const results = await Promise.allSettled([
      canViewHousekeeping(user?.role) ? getHousekeepingStats() : Promise.resolve(null),
      canViewMaintenance(user?.role) ? getMaintenanceStats() : Promise.resolve(null),
    ]);
    if (results[0].status === 'fulfilled' && results[0].value)
      setHkStats(results[0].value.data);
    if (results[1].status === 'fulfilled' && results[1].value)
      setMtStats(results[1].value.data);
    setLoading(false);
    setRefreshing(false);
  }, [user?.role]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  };

  const isDark = theme.background === '#000000';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.headerLabel, { color: theme.textSecondary }]}>
              ALKM HOTEL MANAGEMENT
            </Text>
            <Text style={[styles.welcomeText, { color: theme.text }]}>
              {user?.fullName ?? user?.username ?? 'Welcome'}
            </Text>
            <View style={[styles.roleBadge, { backgroundColor: roleInfo.color + '22' }]}>
              <Text style={[styles.roleText, { color: roleInfo.color }]}>
                {roleInfo.label}
              </Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.logoutButton,
              { borderColor: isDark ? '#374151' : '#e5e7eb' },
              pressed && styles.buttonPressed,
            ]}
            onPress={handleLogout}>
            <Text style={[styles.logoutText, { color: '#ef4444' }]}>Logout</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={theme.text}
            style={{ marginTop: Spacing.six }}
          />
        ) : (
          <>
            {/* Housekeeping Module */}
            {canViewHousekeeping(user?.role) && (
              <View style={styles.moduleSection}>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                  HOUSEKEEPING
                </Text>
                <View style={styles.statsRow}>
                  <StatCard label="Total" value={hkStats?.total ?? 0} color="#3b82f6" theme={theme} />
                  <StatCard label="Pending" value={hkStats?.pending ?? 0} color="#f59e0b" theme={theme} />
                  <StatCard
                    label="Inspected"
                    value={hkStats?.inspected ?? 0}
                    color="#10b981"
                    theme={theme}
                  />
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.navCard,
                    {
                      backgroundColor: isDark ? '#0f172a' : '#f0f9ff',
                      borderColor: '#3b82f6',
                    },
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => router.navigate('/housekeeping')}>
                  <Text style={[styles.navCardTitle, { color: '#3b82f6' }]}>
                    Housekeeping Tasks
                  </Text>
                  <Text style={[styles.navCardSub, { color: theme.textSecondary }]}>
                    Manage cleaning, inspection &amp; turndown
                  </Text>
                  <Text style={[styles.navCardArrow, { color: '#3b82f6' }]}>→</Text>
                </Pressable>
              </View>
            )}

            {/* Maintenance Module */}
            {canViewMaintenance(user?.role) && (
              <View style={styles.moduleSection}>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                  MAINTENANCE
                </Text>
                <View style={styles.statsRow}>
                  <StatCard label="Total" value={mtStats?.total ?? 0} color="#8b5cf6" theme={theme} />
                  <StatCard label="Open" value={mtStats?.open ?? 0} color="#ef4444" theme={theme} />
                  <StatCard label="Resolved" value={mtStats?.resolved ?? 0} color="#10b981" theme={theme} />
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.navCard,
                    {
                      backgroundColor: isDark ? '#0f172a' : '#fdf4ff',
                      borderColor: '#8b5cf6',
                    },
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => router.navigate('/maintenance')}>
                  <Text style={[styles.navCardTitle, { color: '#8b5cf6' }]}>
                    Maintenance Tickets
                  </Text>
                  <Text style={[styles.navCardSub, { color: theme.textSecondary }]}>
                    Track repairs, assign technical staff
                  </Text>
                  <Text style={[styles.navCardArrow, { color: '#8b5cf6' }]}>→</Text>
                </Pressable>
              </View>
            )}

            {!canViewHousekeeping(user?.role) && !canViewMaintenance(user?.role) && (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  No modules available
                </Text>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  Your role ({roleInfo.label}) does not have access to any modules in this app.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  color,
  theme,
}: Readonly<{
  label: string;
  value: number;
  color: string;
  theme: ReturnType<typeof useTheme>;
}>) {
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: color + '18', borderColor: color + '44' },
      ]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.two,
  },
  headerLeft: {
    flex: 1,
    gap: 4,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '700',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  logoutButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  moduleSection: {
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statCard: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  navCard: {
    padding: Spacing.three,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 4,
  },
  navCardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  navCardSub: {
    fontSize: 13,
  },
  navCardArrow: {
    fontSize: 20,
    fontWeight: '700',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  emptyState: {
    paddingTop: Spacing.six,
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
  },
});
