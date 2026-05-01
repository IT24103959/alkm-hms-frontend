import { type Href } from 'expo-router';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import React from 'react';
import { Alert, Pressable, useColorScheme, View, StyleSheet, Text } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { useAuth } from '@/context/AuthContext';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';

interface TabConfig {
  name: string;
  href: string;
  label: string;
}

const ALL_TABS: TabConfig[] = [
  { name: 'home', href: '/', label: 'Dashboard' },
  { name: 'housekeeping', href: '/housekeeping', label: 'Housekeeping' },
  { name: 'maintenance', href: '/maintenance', label: 'Maintenance' },
];

const ROLE_TABS: Record<string, string[]> = {
  SUPER_ADMIN: ['home', 'housekeeping', 'maintenance'],
  MANAGER: ['home', 'housekeeping', 'maintenance'],
  HOUSEKEEPER: ['home', 'housekeeping'],
  MAINTENANCE_STAFF: ['home', 'maintenance'],
};

export default function AppTabs() {
  const { user } = useAuth();
  const allowedNames = ROLE_TABS[user?.role ?? ''] ?? ['home'];
  const tabs = ALL_TABS.filter((t) => allowedNames.includes(t.name));

  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          {tabs.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href as Href} asChild>
              <TabButton>{tab.label}</TabButton>
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}>
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (globalThis.window === undefined) {
      Alert.alert('Logout', 'Are you sure you want to log out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]);
    } else if (globalThis.window.confirm('Are you sure you want to log out?')) {
      logout();
    }
  };

  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        <ThemedText type="smallBold" style={styles.brandText}>
          ALKM HMS
        </ThemedText>

        {props.children}

        <View style={styles.rightSection}>
          {user?.fullName || user?.username ? (
            <Text style={[styles.usernameText, { color: colors.textSecondary }]}>
              {user.fullName ?? user.username}
            </Text>
          ) : null}
          <Pressable
            style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}
            onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  brandText: {
    marginRight: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  rightSection: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  usernameText: {
    fontSize: 13,
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#ef444422',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
});

