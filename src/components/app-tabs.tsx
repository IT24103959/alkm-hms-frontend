import { Image } from 'expo-image';
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
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { Colors, Spacing } from '@/constants/theme';

interface TabConfig {
  name: string;
  href: string;
  label: string;
  icon: string;
}

const ALL_TABS: TabConfig[] = [
  { name: 'index',         href: '/',              label: 'Dashboard',    icon: '🏠' },
  { name: 'housekeeping',  href: '/housekeeping',  label: 'Housekeeping', icon: '🛏️' },
  { name: 'maintenance',   href: '/maintenance',   label: 'Maintenance',  icon: '🔧' },
  { name: 'rooms',         href: '/rooms',         label: 'Rooms',        icon: '🏨' },
  { name: 'staff',         href: '/staff',         label: 'Staff',        icon: '👥' },
  { name: 'payroll',       href: '/payroll',       label: 'Payroll',      icon: '💰' },
  { name: 'menu',          href: '/menu',          label: 'Menu',         icon: '🍽️' },
  { name: 'dining',        href: '/dining',        label: 'Dining',       icon: '🍴' },
  { name: 'events',        href: '/events',        label: 'Events',       icon: '🎉' },
];

const ROLE_TABS: Record<string, string[]> = {
  SUPER_ADMIN:        ['index', 'rooms', 'staff', 'payroll', 'housekeeping', 'maintenance', 'menu', 'dining', 'events'],
  MANAGER:            ['index', 'rooms', 'staff', 'payroll', 'housekeeping', 'maintenance', 'menu', 'dining', 'events'],
  HOUSEKEEPER:        ['index', 'housekeeping'],
  MAINTENANCE_STAFF:  ['index', 'maintenance'],
  STAFF_MEMBER:       ['index', 'payroll'],
  RESTAURANT_MANAGER: ['index', 'menu', 'dining'],
  EVENT_MANAGER:      ['index', 'events'],
  CUSTOMER:           ['index', 'dining'],
};

const DrawerContext = createContext<() => void>(() => {});

export default function AppTabs() {
  const { user } = useAuth();
  const allowedNames = ROLE_TABS[user?.role ?? ''] ?? ['index'];
  const tabs = ALL_TABS.filter((t) => allowedNames.includes(t.name));

  return (
    <Tabs>
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

export function TabButton({
  children, isFocused, icon, ...props
}: TabTriggerSlotProps & { icon?: string }) {
  const closeDrawer = useContext(DrawerContext);
  const scheme = useColorScheme();
  const C = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const originalOnPress = props.onPress;

  return (
    <Pressable
      {...props}
      onPress={(e) => { originalOnPress?.(e); closeDrawer(); }}
      style={({ pressed }) => [
        styles.navItem,
        { backgroundColor: isFocused ? `${C.primary}18` : 'transparent' },
        pressed && { opacity: 0.7 },
      ]}
    >
      {icon ? <Text style={styles.navItemIcon}>{icon}</Text> : null}
      <Text style={[styles.navItemText, { color: isFocused ? C.primary : C.text }, isFocused && styles.navItemTextActive]}>
        {children}
      </Text>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const scheme = useColorScheme();
  const C = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();

  const closeDrawer = useCallback(() => setIsOpen(false), []);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <DrawerContext.Provider value={closeDrawer}>
      <View {...props} pointerEvents="box-none" style={styles.container}>

        <View
          pointerEvents="auto"
          style={[
            styles.topBar,
            { backgroundColor: C.card, borderBottomColor: C.border, height: 56 + insets.top, paddingTop: insets.top },
          ]}
        >
          <View style={styles.brand}>
            <Image source={require('../../assets/alkm-logo.png')} style={styles.brandLogo} contentFit="contain" />
            <Text style={[styles.brandText, { color: C.primary }]}>ALAKAMANDA</Text>
          </View>
          <Pressable
            pointerEvents="auto"
            onPress={() => setIsOpen(true)}
            style={({ pressed }) => [styles.hamburgerBtn, { backgroundColor: C.backgroundElement }, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.hamburgerIcon, { color: C.primary }]}>☰</Text>
          </Pressable>
        </View>

        {isOpen && (
          <Pressable pointerEvents="auto" style={styles.overlay} onPress={() => setIsOpen(false)} />
        )}

        {isOpen && (
          <View pointerEvents="auto" style={[styles.drawer, { backgroundColor: C.card, borderRightColor: C.border, paddingTop: insets.top }]}>
            <View style={[styles.drawerHeader, { borderBottomColor: C.border }]}>
              <View style={styles.drawerBrandRow}>
                <Image source={require('../../assets/alkm-logo.png')} style={styles.drawerBrandLogo} contentFit="contain" />
                <Text style={[styles.brandText, { color: C.primary }]}>ALAKAMANDA</Text>
              </View>
              <Pressable onPress={() => setIsOpen(false)} style={({ pressed }) => [styles.closeBtn, { backgroundColor: C.backgroundElement }, pressed && { opacity: 0.7 }]} hitSlop={8}>
                <Text style={[styles.closeIcon, { color: C.textSecondary }]}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.drawerNav} showsVerticalScrollIndicator={false}>
              {props.children}
            </ScrollView>

            <View style={[styles.drawerFooter, { borderTopColor: C.border, paddingBottom: insets.bottom + 8 }]}>
              {(user?.fullName || user?.username) ? (
                <View style={styles.drawerUserRow}>
                  <View style={[styles.avatar, { backgroundColor: `${C.primary}22` }]}>
                    <Text style={[styles.avatarText, { color: C.primary }]}>
                      {(user.fullName ?? user.username ?? '?')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.drawerUserName, { color: C.text }]} numberOfLines={1}>{user.fullName ?? user.username}</Text>
                    {user.role ? <Text style={[styles.drawerUserRole, { color: C.textSecondary }]}>{user.role.replaceAll('_', ' ')}</Text> : null}
                  </View>
                </View>
              ) : null}
              <Pressable style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.7 }]} onPress={handleLogout}>
                <Text style={styles.logoutText}>Sign Out</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </DrawerContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: Spacing.four, paddingBottom: 10,
    borderBottomWidth: 1, zIndex: 110,
    shadowColor: '#0f1f2e', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 4,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandLogo: { width: 22, height: 22, borderRadius: 5 },
  brandText: { fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  hamburgerBtn: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  hamburgerIcon: { fontSize: 18, fontWeight: '700' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,31,46,0.4)', zIndex: 120 },
  drawer: {
    position: 'absolute', top: 0, left: 0, bottom: 0, width: 280,
    borderRightWidth: 1, zIndex: 130,
    shadowColor: '#0f1f2e', shadowOffset: { width: 8, height: 0 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 20,
  },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, borderBottomWidth: 1 },
  drawerBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  drawerBrandLogo: { width: 22, height: 22, borderRadius: 5 },
  closeBtn: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  closeIcon: { fontSize: 14, fontWeight: '700' },
  drawerNav: { flex: 1, paddingVertical: Spacing.two },
  navItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.four, paddingVertical: 13, marginHorizontal: Spacing.two, marginVertical: 1, borderRadius: 10, gap: 12 },
  navItemIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  navItemText: { fontSize: 14, fontWeight: '500' },
  navItemTextActive: { fontWeight: '700' },
  drawerFooter: { padding: Spacing.four, borderTopWidth: 1, gap: Spacing.two },
  drawerUserRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700' },
  drawerUserName: { fontSize: 13, fontWeight: '600' },
  drawerUserRole: { fontSize: 11, marginTop: 1 },
  logoutBtn: { backgroundColor: '#ef444420', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  logoutText: { color: '#ef4444', fontWeight: '700', fontSize: 13 },
});
