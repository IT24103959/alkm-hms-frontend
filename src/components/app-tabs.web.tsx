import { type Href } from 'expo-router';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  type TabTriggerSlotProps,
  type TabListProps,
} from 'expo-router/ui';
import React, { createContext, useCallback, useContext, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { Colors, Spacing } from '@/constants/theme';

interface TabConfig {
  name: string;
  href: string;
  label: string;
  icon: string;
}

const ALL_TABS: TabConfig[] = [
  { name: 'home',          href: '/',             label: 'Dashboard',    icon: '🏠' },
  { name: 'housekeeping',  href: '/housekeeping',  label: 'Housekeeping', icon: '🛏️' },
  { name: 'maintenance',   href: '/maintenance',   label: 'Maintenance',  icon: '🔧' },
  { name: 'rooms',         href: '/rooms',         label: 'Rooms',        icon: '🏨' },
  { name: 'payroll',       href: '/payroll',       label: 'Payroll',      icon: '💰' },
  { name: 'menu',          href: '/menu',          label: 'Menu',         icon: '🍽️' },
  { name: 'dining',        href: '/dining',        label: 'Dining',       icon: '🍴' },
  { name: 'events',        href: '/events',        label: 'Events',       icon: '🎉' },
];

const ROLE_TABS: Record<string, string[]> = {
  SUPER_ADMIN:        ['home', 'rooms', 'payroll', 'housekeeping', 'maintenance', 'menu', 'dining', 'events'],
  MANAGER:            ['home', 'rooms', 'payroll', 'housekeeping', 'maintenance', 'menu', 'dining', 'events'],
  HOUSEKEEPER:        ['home', 'housekeeping'],
  MAINTENANCE_STAFF:  ['home', 'maintenance'],
  STAFF_MEMBER:       ['home', 'payroll'],
  RESTAURANT_MANAGER: ['home', 'menu', 'dining'],
  EVENT_MANAGER:      ['home', 'events'],
  CUSTOMER:           ['home', 'dining'],
};

// Context so TabButton can close the drawer when a nav item is tapped
const DrawerContext = createContext<() => void>(() => {});

// ── App shell ─────────────────────────────────────────────────────────────────

export default function AppTabs() {
  const { user } = useAuth();
  const allowedNames = ROLE_TABS[user?.role ?? ''] ?? ['home'];
  const tabs = ALL_TABS.filter((t) => allowedNames.includes(t.name));

  return (
    <Tabs>
      {/* Content area sits below the 56px top bar */}
      <TabSlot style={{ flex: 1, marginTop: 56 }} />
      <TabList asChild>
        <CustomTabList>
          {tabs.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href as Href} asChild>
              <TabButton icon={tab.icon}>{tab.label}</TabButton>
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

// ── Tab button rendered inside the drawer ────────────────────────────────────

export function TabButton({
  children, isFocused, icon, ...props
}: TabTriggerSlotProps & { icon?: string }) {
  const closeDrawer = useContext(DrawerContext);
  const originalOnPress = props.onPress;

  return (
    <Pressable
      {...props}
      onPress={(e) => { originalOnPress?.(e); closeDrawer(); }}
      style={({ pressed }) => [
        styles.navItem,
        isFocused && styles.navItemActive,
        pressed && styles.pressed,
      ]}
    >
      {icon ? <Text style={styles.navItemIcon}>{icon}</Text> : null}
      <Text style={[styles.navItemText, isFocused && styles.navItemTextActive]}>
        {children}
      </Text>
    </Pressable>
  );
}

// ── Custom tab list: top bar + hamburger sidebar ─────────────────────────────

export function CustomTabList(props: TabListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const C = Colors.light;

  const closeDrawer = useCallback(() => setIsOpen(false), []);

  const handleLogout = () => {
    if (globalThis.window?.confirm('Are you sure you want to log out?')) {
      logout();
    }
  };

  return (
    <DrawerContext.Provider value={closeDrawer}>
      {/* Container: covers full screen, passes pointer events through to content */}
      <View {...props} pointerEvents="box-none" style={styles.container}>

        {/* ── Top bar ── */}
        <View
          pointerEvents="auto"
          style={[styles.topBar, { backgroundColor: C.card, borderBottomColor: C.border }]}
        >
          <Text style={[styles.brand, { color: C.primary }]}>🏨 ALKM HMS</Text>

          <View style={styles.topBarRight}>
            {(user?.fullName || user?.username) ? (
              <Text style={[styles.topBarUser, { color: C.textSecondary }]}>
                {user.fullName ?? user.username}
              </Text>
            ) : null}
            <Pressable
              pointerEvents="auto"
              onPress={() => setIsOpen(true)}
              style={({ pressed }) => [styles.hamburgerBtn, { backgroundColor: C.backgroundElement }, pressed && styles.pressed]}
              accessibilityLabel="Open navigation menu"
            >
              <Text style={[styles.hamburgerIcon, { color: C.primary }]}>☰</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Overlay (tap to close drawer) ── */}
        {isOpen && (
          <Pressable
            pointerEvents="auto"
            style={styles.overlay}
            onPress={() => setIsOpen(false)}
            accessibilityLabel="Close navigation menu"
          />
        )}

        {/* ── Sidebar drawer ── */}
        {isOpen && (
          <View
            pointerEvents="auto"
            style={[styles.drawer, { backgroundColor: C.card, borderRightColor: C.border }]}
          >
            {/* Drawer header */}
            <View style={[styles.drawerHeader, { borderBottomColor: C.border }]}>
              <Text style={[styles.drawerBrand, { color: C.primary }]}>🏨 ALKM HMS</Text>
              <Pressable
                onPress={() => setIsOpen(false)}
                style={({ pressed }) => [
                  styles.closeBtn,
                  { backgroundColor: C.backgroundElement },
                  pressed && styles.pressed,
                ]}
                hitSlop={8}
                accessibilityLabel="Close menu"
              >
                <Text style={[styles.closeIcon, { color: C.textSecondary }]}>✕</Text>
              </Pressable>
            </View>

            {/* Nav items */}
            <ScrollView style={styles.drawerNav} showsVerticalScrollIndicator={false}>
              {props.children}
            </ScrollView>

            {/* Footer: avatar + logout */}
            <View style={[styles.drawerFooter, { borderTopColor: C.border }]}>
              {(user?.fullName || user?.username) ? (
                <View style={styles.drawerUserRow}>
                  <View style={[styles.avatar, { backgroundColor: C.backgroundSelected }]}>
                    <Text style={[styles.avatarText, { color: C.primary }]}>
                      {(user.fullName ?? user.username ?? '?')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.drawerUserName, { color: C.text }]} numberOfLines={1}>
                      {user.fullName ?? user.username}
                    </Text>
                    {user.role ? (
                      <Text style={[styles.drawerUserRole, { color: C.textSecondary }]}>
                        {user.role.replaceAll('_', ' ')}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}
              <Pressable
                style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}
                onPress={handleLogout}
              >
                <Text style={styles.logoutText}>Sign Out</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </DrawerContext.Provider>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const C = Colors.light;

const styles = StyleSheet.create({
  // Root container — full screen, pointer events pass through to content
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },

  // ── Top bar ──────────────────────────────────────────────────────────────
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    borderBottomWidth: 1,
    zIndex: 110,
    shadowColor: '#0f1f2e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  brand: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  topBarUser: {
    fontSize: 13,
    fontWeight: '500',
  },
  hamburgerBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hamburgerIcon: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
  },

  // ── Overlay ───────────────────────────────────────────────────────────────
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 31, 46, 0.35)',
    zIndex: 120,
  },

  // ── Drawer ────────────────────────────────────────────────────────────────
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 260,
    borderRightWidth: 1,
    zIndex: 130,
    shadowColor: '#0f1f2e',
    shadowOffset: { width: 8, height: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 20,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  drawerBrand: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 14,
    fontWeight: '700',
  },

  // ── Nav items ─────────────────────────────────────────────────────────────
  drawerNav: {
    flex: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 2,
  },
  navItemActive: {
    backgroundColor: C.backgroundSelected,
  },
  navItemIcon: {
    fontSize: 16,
    width: 22,
    textAlign: 'center',
  },
  navItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textSecondary,
  },
  navItemTextActive: {
    color: C.primary,
    fontWeight: '700',
  },

  // ── Drawer footer ─────────────────────────────────────────────────────────
  drawerFooter: {
    padding: Spacing.three,
    gap: Spacing.two,
    borderTopWidth: 1,
  },
  drawerUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '800',
  },
  drawerUserName: {
    fontSize: 13,
    fontWeight: '600',
  },
  drawerUserRole: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  logoutBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#c1121f18',
    alignItems: 'center',
  },
  logoutText: {
    color: '#c1121f',
    fontSize: 14,
    fontWeight: '600',
  },

  pressed: {
    opacity: 0.65,
  },
});

