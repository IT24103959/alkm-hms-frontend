import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { getMenuItems, type MenuItem } from '@/api/service';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

const CUISINES = [
  { label: 'All', value: 'ALL' },
  { label: 'Western', value: 'WESTERN' },
  { label: 'Thai/Chinese', value: 'THAI_CHINESE' },
  { label: 'Sri Lankan', value: 'SRI_LANKAN' },
  { label: 'Indian', value: 'INDIAN' },
  { label: 'Italian', value: 'ITALIAN' },
];

const AMENITIES = [
  '🌊 Panoramic Ocean Views',
  '❄️ Fully Air-Conditioned',
  '🅿️ Dedicated Parking',
  '♿ Wheelchair Accessible',
];

const formatLabel = (v: string) => v.replaceAll('_', ' ');

function MenuCard({ item, theme }: Readonly<{ item: MenuItem; theme: ReturnType<typeof useTheme> }>) {
  return (
    <View style={[styles.menuCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.menuCardTop}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
          {item.badge ? <Text style={styles.itemBadge}>{item.badge}</Text> : null}
        </View>
        <Text style={[styles.itemPrice, { color: theme.primary }]}>Rs. {item.price.toLocaleString()}</Text>
      </View>
      {item.description ? (
        <Text style={[styles.itemDesc, { color: theme.textSecondary }]} numberOfLines={2}>{item.description}</Text>
      ) : null}
      <Text style={[styles.itemMeta, { color: theme.textSecondary }]}>{formatLabel(item.mealService ?? '')}</Text>
    </View>
  );
}

export default function DiningScreen() {
  const { user } = useAuth();
  const theme = useTheme();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCuisine, setActiveCuisine] = useState('ALL');

  const canReserve = (user?.permissions ?? []).includes('CREATE_RESERVATIONS') ||
    ['CUSTOMER'].includes(user?.role ?? '');

  useEffect(() => {
    getMenuItems()
      .then((items) => setMenuItems(items.filter((i) => i.available)))
      .catch((err) => {
        const e = err as { response?: { data?: { message?: string } }; message?: string };
        setError(e?.response?.data?.message ?? 'Unable to load menu.');
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => activeCuisine === 'ALL' ? menuItems : menuItems.filter((i) => i.cuisine === activeCuisine),
    [menuItems, activeCuisine],
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor:  '#f2fdff' }]}>
          <Text style={styles.heroEyebrow}>ALKM HOTEL</Text>
          <Text style={[styles.heroTitle, { color: theme.text }]}>Restaurant & Dining</Text>
          <Text style={[styles.heroSub, { color: theme.textSecondary }]}>
            Experience exceptional dining with panoramic ocean views and personalised service.
          </Text>
          <View style={styles.infoRow}>
            <InfoPill icon="🛎️" label="A la carte" />
            <InfoPill icon="👔" label="Smart Casual" />
            <InfoPill icon="👥" label="Indoor 60 · Outdoor 40" />
          </View>
        </View>

        {/* Amenities */}
        <View style={[styles.section, { borderBottomColor: theme.border }]}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>AMENITIES</Text>
          <View style={styles.amenitiesRow}>
            {AMENITIES.map((a) => (
              <View key={a} style={[styles.amenityPill, { backgroundColor: theme.backgroundElement }]}>
                <Text style={[styles.amenityText, { color: theme.text }]}>{a}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Menu */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>MENU</Text>

          {/* Cuisine filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            {CUISINES.map((c) => {
              const active = activeCuisine === c.value;
              return (
                <Pressable key={c.value} onPress={() => setActiveCuisine(c.value)}
                  style={[styles.cuisineChip, { borderColor: active ? theme.primary : theme.border }, active && { backgroundColor: theme.primary }]}>
                  <Text style={[styles.cuisineChipText, { color: active ? '#fff' : theme.textSecondary }]}>{c.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {loading && <ActivityIndicator size="large" color={theme.text} style={{ marginTop: 24 }} />}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {!loading && filtered.length === 0 && (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No items available for this cuisine.</Text>
          )}

          {!loading && (
            <FlatList
              data={filtered}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => <MenuCard item={item} theme={theme} />}
              contentContainerStyle={styles.menuList}
              scrollEnabled={false}
            />
          )}
        </View>

        {/* Reserve CTA */}
        {canReserve && (
          <View style={styles.reserveSection}>
            <Pressable
              style={({ pressed }) => [styles.reserveBtn, pressed && { opacity: 0.8 }]}
              onPress={() => router.navigate('/reserve-table')}>
              <Text style={styles.reserveBtnText}>Reserve a Table →</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoPill({ icon, label }: Readonly<{ icon: string; label: string }>) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.infoPillIcon}>{icon}</Text>
      <Text style={styles.infoPillLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  hero: { padding: Spacing.four, gap: Spacing.two, paddingBottom: Spacing.four },
  heroEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: '#005f73' },
  heroTitle: { fontSize: 28, fontWeight: '800' },
  heroSub: { fontSize: 14, lineHeight: 22 },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  infoPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#005f7318' },
  infoPillIcon: { fontSize: 14 },
  infoPillLabel: { fontSize: 12, color: '#005f73', fontWeight: '600' },
  section: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, borderBottomWidth: 1 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: Spacing.two },
  amenitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  amenityText: { fontSize: 13 },
  filterRow: { marginBottom: Spacing.two },
  cuisineChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  cuisineChipText: { fontSize: 13, fontWeight: '500' },
  menuList: { gap: 10 },
  menuCard: { borderRadius: 12, borderWidth: 1, padding: Spacing.three, gap: 4 },
  menuCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemName: { fontSize: 15, fontWeight: '700' },
  itemBadge: { fontSize: 11, color: '#f59e0b', fontWeight: '600' },
  itemPrice: { fontSize: 15, fontWeight: '700', marginLeft: 8 },
  itemDesc: { fontSize: 13 },
  itemMeta: { fontSize: 11 },
  errorText: { color: '#ef4444', padding: 12 },
  emptyText: { textAlign: 'center', marginTop: 24, fontSize: 14 },
  reserveSection: { padding: Spacing.four },
  reserveBtn: { backgroundColor: '#005f73', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  reserveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
