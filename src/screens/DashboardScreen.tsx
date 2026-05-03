import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getDashboardSummary, type DashboardSummary } from "@/api/service";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/use-theme";
import { Spacing } from "@/constants/theme";

const HOTEL_IMAGE =
  "https://images.pexels.com/photos/30738386/pexels-photo-30738386.jpeg";

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  SUPER_ADMIN: { label: "Super Admin", color: "#8b5cf6" },
  MANAGER: { label: "Manager", color: "#3b82f6" },
  HOUSEKEEPER: { label: "Housekeeper", color: "#10b981" },
  MAINTENANCE_STAFF: { label: "Maintenance Staff", color: "#f97316" },
  CUSTOMER: { label: "Customer", color: "#6b7280" },
  RESTAURANT_MANAGER: { label: "Restaurant Manager", color: "#ec4899" },
  EVENT_MANAGER: { label: "Event Manager", color: "#f59e0b" },
  STAFF_MEMBER: { label: "Staff Member", color: "#64748b" },
};

interface ModuleNav {
  key: string;
  label: string;
  description: string;
  route: string;
  color: string;
  roles: string[];
}

const ALL_MODULES: ModuleNav[] = [
  {
    key: "rooms",
    label: "Room Management",
    description: "Manage rooms & bookings",
    route: "/rooms",
    color: "#10b981",
    roles: ["SUPER_ADMIN", "MANAGER"],
  },
  {
    key: "staff",
    label: "Staff Management",
    description: "Add, edit & manage staff",
    route: "/staff",
    color: "#8b5cf6",
    roles: ["SUPER_ADMIN", "MANAGER"],
  },
  {
    key: "payroll",
    label: "Payroll",
    description: "Staff salary & payroll records",
    route: "/payroll",
    color: "#3b82f6",
    roles: ["SUPER_ADMIN", "MANAGER", "STAFF_MEMBER"],
  },
  {
    key: "housekeeping",
    label: "Housekeeping",
    description: "Manage cleaning & inspection tasks",
    route: "/housekeeping",
    color: "#005f73",
    roles: ["SUPER_ADMIN", "MANAGER", "HOUSEKEEPER"],
  },
  {
    key: "maintenance",
    label: "Maintenance",
    description: "Track repairs & technical staff",
    route: "/maintenance",
    color: "#0a9396",
    roles: ["SUPER_ADMIN", "MANAGER", "MAINTENANCE_STAFF"],
  },
  {
    key: "menu",
    label: "Menu Management",
    description: "Add & edit menu items",
    route: "/menu",
    color: "#ec4899",
    roles: ["SUPER_ADMIN", "MANAGER", "RESTAURANT_MANAGER"],
  },
  {
    key: "dining",
    label: "Restaurant & Dining",
    description: "Table reservations",
    route: "/dining",
    color: "#f97316",
    roles: ["SUPER_ADMIN", "MANAGER", "RESTAURANT_MANAGER", "CUSTOMER"],
  },
  {
    key: "events",
    label: "Event Management",
    description: "Event bookings & analytics",
    route: "/events",
    color: "#f59e0b",
    roles: ["SUPER_ADMIN", "MANAGER", "EVENT_MANAGER"],
  },
];

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color,
  theme,
}: Readonly<{
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  theme: ReturnType<typeof useTheme>;
}>) {
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: `${color}18`, borderColor: `${color}44` },
      ]}
    >
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
        {label}
      </Text>
      {sub ? (
        <Text style={[styles.statSub, { color: theme.textSecondary }]}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const roleInfo = ROLE_LABELS[user?.role ?? ""] ?? {
    label: user?.role ?? "",
    color: "#6b7280",
  };
  const isManager = ["SUPER_ADMIN", "MANAGER"].includes(user?.role ?? "");

  const load = useCallback(async () => {
    if (isManager) {
      try {
        const data = await getDashboardSummary();
        setSummary(data);
      } catch (err) {
        const e = err as { message?: string };
        if (e?.message) {
          /* silently fall back */
        }
        setSummary(null);
      }
    }
    setLoading(false);
    setRefreshing(false);
  }, [isManager]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: logout },
    ]);
  };

  const myModules = ALL_MODULES.filter((m) =>
    m.roles.includes(user?.role ?? ""),
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Hero Image */}
        <Image
          source={{ uri: HOTEL_IMAGE }}
          style={styles.heroImage}
          resizeMode="cover"
        />

        {/* Hotel Brief */}
        <View
          style={[
            styles.hotelBrief,
            { backgroundColor: theme.card, borderBottomColor: theme.border },
          ]}
        >
          <Text style={[styles.hotelTagline, { color: theme.primary }]}>
            Where Comfort Meets Excellence
          </Text>
          <Text style={[styles.hotelDesc, { color: theme.textSecondary }]}>
            Welcome to ALKM Hotel — a premium hospitality destination offering
            world-class rooms, fine dining, curated events, and seamless
            service. This management app gives your team full control over
            operations across every department.
          </Text>
        </View>

        <View style={styles.content}>
          {/* User Header */}
          <View style={styles.userHeader}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={[styles.welcomeLabel, { color: theme.textSecondary }]}
              >
                WELCOME BACK
              </Text>
              <Text style={[styles.welcomeName, { color: theme.text }]}>
                {user?.fullName ?? user?.username ?? "User"}
              </Text>
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: `${roleInfo.color}22` },
                ]}
              >
                <Text style={[styles.roleText, { color: roleInfo.color }]}>
                  {roleInfo.label}
                </Text>
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.logoutBtn,
                {
                  borderColor: theme.border,
                  backgroundColor: `${theme.danger}18`,
                },
                pressed && { opacity: 0.7 },
              ]}
              onPress={handleLogout}
            >
              <Text style={[styles.logoutText, { color: theme.danger }]}>
                Logout
              </Text>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator
              size="large"
              color={theme.text}
              style={{ marginTop: Spacing.four }}
            />
          ) : (
            <>
              {/* Analytics (managers only) */}
              {isManager && summary !== null && (
                <View style={styles.section}>
                  <Text
                    style={[
                      styles.sectionLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    OVERVIEW
                  </Text>

                  <View style={styles.statsGrid}>
                    <StatCard
                      label="Total Staff"
                      value={summary.totalStaff}
                      color="#8b5cf6"
                      theme={theme}
                    />
                    <StatCard
                      label="Total Rooms"
                      value={summary.totalRooms}
                      color="#10b981"
                      theme={theme}
                    />
                    <StatCard
                      label="Room Bookings"
                      value={summary.roomBookings}
                      color="#3b82f6"
                      theme={theme}
                    />
                    <StatCard
                      label="Salary Paid"
                      value={`Rs. ${summary.totalSalaryPaid.toLocaleString()}`}
                      color="#f59e0b"
                      theme={theme}
                    />
                  </View>

                  {summary.mostBookedRooms.length > 0 && (
                    <View
                      style={[
                        styles.roomsCard,
                        {
                          backgroundColor: theme.card,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.roomsCardTitle, { color: theme.text }]}
                      >
                        Most Booked Rooms
                      </Text>
                      {summary.mostBookedRooms.map((r) => (
                        <View key={r.roomNumber} style={styles.roomRow}>
                          <Text
                            style={[styles.roomNumber, { color: theme.text }]}
                          >
                            Room {r.roomNumber}
                          </Text>
                          <Text
                            style={[
                              styles.roomBookings,
                              { color: theme.primary },
                            ]}
                          >
                            {r.bookings} bookings
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Module Navigation */}
              {myModules.length > 0 && (
                <View style={styles.section}>
                  <Text
                    style={[
                      styles.sectionLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    QUICK ACCESS
                  </Text>
                  {myModules.map((mod) => (
                    <Pressable
                      key={mod.key}
                      style={({ pressed }) => [
                        styles.navCard,
                        {
                          backgroundColor: theme.card,
                          borderLeftColor: mod.color,
                        },
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={() => router.navigate(mod.route as "/rooms")}
                    >
                      <Text style={[styles.navCardTitle, { color: mod.color }]}>
                        {mod.label}
                      </Text>
                      <Text
                        style={[
                          styles.navCardSub,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {mod.description}
                      </Text>
                      <Text style={[styles.navCardArrow, { color: mod.color }]}>
                        →
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {myModules.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>
                    No modules available
                  </Text>
                  <Text
                    style={[styles.emptyText, { color: theme.textSecondary }]}
                  >
                    Your role ({roleInfo.label}) does not have access to any
                    management modules.
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  heroImage: { width: "100%", height: 220 },
  hotelBrief: {
    padding: Spacing.four,
    borderBottomWidth: 1,
    gap: 6,
    alignItems: "center",
  },
  hotelLogo: { width: 50, height: 50, marginBottom: 4 },
  hotelName: { fontSize: 26, fontWeight: "800" },
  hotelTagline: { fontSize: 14, fontWeight: "600", letterSpacing: 0.5 },
  hotelDesc: { fontSize: 13, lineHeight: 20 },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  userHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  welcomeLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5 },
  welcomeName: { fontSize: 20, fontWeight: "700" },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  roleText: { fontSize: 12, fontWeight: "600" },
  logoutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  logoutText: { fontSize: 13, fontWeight: "600" },
  section: { gap: Spacing.two },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  statCard: {
    width: "47%",
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
  },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 12, fontWeight: "500" },
  statSub: { fontSize: 11 },
  roomsCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.three,
    gap: 8,
  },
  roomsCardTitle: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  roomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roomNumber: { fontSize: 13, fontWeight: "600" },
  roomBookings: { fontSize: 13 },
  navCard: {
    padding: Spacing.three,
    borderRadius: 14,
    borderLeftWidth: 4,
    gap: 4,
    elevation: 1,
    shadowColor: "#0f1f2e",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  navCardTitle: { fontSize: 15, fontWeight: "700" },
  navCardSub: { fontSize: 13 },
  navCardArrow: {
    fontSize: 18,
    fontWeight: "700",
    alignSelf: "flex-end",
    marginTop: 2,
  },
  emptyState: {
    paddingTop: Spacing.six,
    alignItems: "center",
    gap: Spacing.two,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600" },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: Spacing.four,
  },
});
