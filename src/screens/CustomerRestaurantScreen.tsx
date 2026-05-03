/**
 * Customer Restaurant & Dining Screen
 * Customers can browse menu items and make table reservations.
 * No create/edit/delete for menu items (read-only).
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import {
  getMenuItems,
  getReservations,
  createReservation,
  type MenuItem,
  type TableReservation,
  type MenuCategory,
} from "@/api/service";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/use-theme";
import { Spacing } from "@/constants/theme";

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES: MenuCategory[] = ["STARTER", "MAIN_COURSE", "DESSERT", "BEVERAGE", "SPECIAL"];
const CATEGORY_EMOJI: Record<MenuCategory, string> = {
  STARTER: "🥗", MAIN_COURSE: "🍽️", DESSERT: "🍰", BEVERAGE: "🍹", SPECIAL: "⭐",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "#f59e0b", CONFIRMED: "#3b82f6", SEATED: "#8b5cf6",
  COMPLETED: "#10b981", CANCELLED: "#ef4444",
};

const errMsg = (err: unknown) => {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? "An error occurred.";
};

// ── Reserve Table Modal ───────────────────────────────────────────────────────

function ReserveModal({
  visible, theme, onClose, onSaved,
}: {
  visible: boolean;
  theme: ReturnType<typeof useTheme>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [customerName, setCustomerName] = useState(user?.fullName ?? "");
  const [customerPhone, setCustomerPhone] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [guestCount, setGuestCount] = useState("2");
  const [reservationDate, setReservationDate] = useState(new Date().toISOString().split("T")[0]);
  const [reservationTime, setReservationTime] = useState("19:00");
  const [specialRequests, setSpecialRequests] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) { setError(""); setCustomerName(user?.fullName ?? ""); }
  }, [visible, user]);

  const handleSubmit = async () => {
    if (!customerName.trim() || !tableNumber.trim()) {
      setError("Your name and table number are required."); return;
    }
    setError("");
    setSubmitting(true);
    try {
      await createReservation({
        customerName, customerPhone, customerEmail: "",
        tableNumber, guestCount: Number(guestCount) || 1,
        reservationDate, reservationTime, specialRequests, orderedItems: [],
      });
      onClose();
      onSaved();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  const inp = [styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <SafeAreaView style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>🍴 Ready for Dining?</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 13 }}>Fill in the details to reserve your spot.</Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeBtn}><Ionicons name="close" size={24} color={theme.textSecondary} /></Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Your Name *</Text>
                <TextInput style={inp} value={customerName} onChangeText={setCustomerName} placeholder="Full name" placeholderTextColor={theme.textSecondary} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Phone Number</Text>
                <TextInput style={inp} value={customerPhone} onChangeText={setCustomerPhone} keyboardType="phone-pad" placeholder="+94 ..." placeholderTextColor={theme.textSecondary} />
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Table # *</Text>
                  <TextInput style={inp} value={tableNumber} onChangeText={setTableNumber} placeholder="e.g. T5" placeholderTextColor={theme.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Guests</Text>
                  <TextInput style={inp} value={guestCount} onChangeText={setGuestCount} keyboardType="numeric" />
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Preferred Date</Text>
                  <TextInput style={inp} value={reservationDate} onChangeText={setReservationDate} placeholder="YYYY-MM-DD" placeholderTextColor={theme.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Arrival Time</Text>
                  <TextInput style={inp} value={reservationTime} onChangeText={setReservationTime} placeholder="19:00" placeholderTextColor={theme.textSecondary} />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Special Preferences</Text>
                <TextInput style={[...inp, { height: 100, paddingTop: 12 }]} value={specialRequests} onChangeText={setSpecialRequests} multiline placeholder="Dietary needs, birthday, etc." placeholderTextColor={theme.textSecondary} />
              </View>

              {error ? <View style={styles.errorContainer}><Text style={styles.errorText}>{error}</Text></View> : null}

              <Pressable
                style={({ pressed }) => [styles.submitBtn, { backgroundColor: theme.primary }, pressed && { opacity: 0.8 }, submitting && { opacity: 0.6 }]}
                onPress={handleSubmit} disabled={submitting}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Book My Table</Text>}
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ── Menu Item Card ────────────────────────────────────────────────────────────

function MenuCard({ item, theme }: { item: MenuItem; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={[styles.menuCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.menuImgContainer}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.menuImg} resizeMode="cover" />
        ) : (
          <View style={[styles.menuImgPlaceholder, { backgroundColor: theme.backgroundElement }]}>
            <Text style={{ fontSize: 48 }}>{CATEGORY_EMOJI[item.category]}</Text>
          </View>
        )}
        <View style={[styles.cardCategoryBadge, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
           <Text style={styles.cardCategoryText}>{CATEGORY_EMOJI[item.category]} {item.category.replace(/_/g, " ")}</Text>
        </View>
      </View>
      <View style={{ padding: 16, gap: 6 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[styles.menuName, { color: theme.text }]}>{item.name}</Text>
            <View style={styles.prepRow}>
               <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
               <Text style={[styles.menuSub, { color: theme.textSecondary }]}>{item.preparationTime} min preparation</Text>
            </View>
          </View>
          <View style={[styles.priceTag, { backgroundColor: theme.primary + '15' }]}>
            <Text style={[styles.menuPrice, { color: theme.primary }]}>Rs. {item.price.toLocaleString()}</Text>
          </View>
        </View>
        {item.description ? <Text style={[styles.menuDesc, { color: theme.textSecondary }]} numberOfLines={2}>{item.description}</Text> : null}
        {!item.available && (
          <View style={styles.unavailableBadge}>
            <Ionicons name="close-circle-outline" size={14} color="#ef4444" />
            <Text style={styles.unavailableText}>Currently Unavailable</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function CustomerRestaurantScreen() {
  const theme = useTheme();
  const [tab, setTab] = useState<"menu" | "myReservations">("menu");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [myReservations, setMyReservations] = useState<TableReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorStr, setErrorStr] = useState<string | null>(null);
  const [reserveModal, setReserveModal] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<MenuCategory | "ALL">("ALL");
  const { user } = useAuth();

  const load = useCallback(async () => {
    setErrorStr(null);
    try {
      const m = await getMenuItems({ available: true });
      setMenuItems(m || []);
    } catch (err: any) {
      console.error("Menu error:", err);
      setErrorStr(`Menu error: ${err.message || String(err)}`);
    }

    try {
      const r = await getReservations();
      if (r) {
        setMyReservations(r.filter(res =>
          res.customerName?.toLowerCase() === (user?.fullName ?? "").toLowerCase()
        ));
      }
    } catch (err: any) {
      console.error("Reservations error:", err);
      // We don't fail the whole screen if reservations fail
    }

    setLoading(false);
    setRefreshing(false);
  }, [user?.fullName]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const filteredMenu = useMemo(
    () => categoryFilter === "ALL" ? menuItems : menuItems.filter(i => i.category === categoryFilter),
    [menuItems, categoryFilter]
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ marginTop: 20, color: theme.textSecondary, fontWeight: '600' }}>Preparing the menu...</Text>
      </View>
    );
  }

  if (errorStr) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background, padding: 20 }]}>
        <Ionicons name="warning-outline" size={60} color="#ef4444" />
        <Text style={{ marginTop: 16, color: theme.text, fontWeight: '700', fontSize: 16 }}>Failed to load</Text>
        <Text style={{ marginTop: 8, color: theme.textSecondary, textAlign: 'center' }}>{errorStr}</Text>
        <Pressable style={{ marginTop: 20, padding: 12, backgroundColor: theme.primary, borderRadius: 8 }} onPress={load}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      {/* Premium Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.eyebrow, { color: theme.primary }]}>ALAKAMANDA DINING</Text>
          <Text style={[styles.title, { color: theme.text }]}>Exquisite Flavors ✨</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.reserveBtn, { backgroundColor: theme.primary }, pressed && { opacity: 0.8 }]}
          onPress={() => setReserveModal(true)}
        >
          <Ionicons name="calendar" size={18} color="#fff" />
          <Text style={styles.reserveBtnText}>Reserve</Text>
        </Pressable>
      </View>

      {/* Glassmorphic Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: theme.border, backgroundColor: theme.card + '80' }]}>
        {(["menu", "myReservations"] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && { borderBottomColor: theme.primary, borderBottomWidth: 3 }]}>
            <Text style={[styles.tabText, { color: tab === t ? theme.text : theme.textSecondary, fontWeight: tab === t ? "800" : "600" }]}>
              {t === "menu" ? "Fine Dining" : "My Bookings"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Glassmorphic Category Filter */}
      {tab === "menu" && (
        <View style={{ backgroundColor: theme.background }}>
           <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {(["ALL", ...CATEGORIES] as const).map((cat) => (
                <Pressable
                key={cat}
                onPress={() => setCategoryFilter(cat as MenuCategory | "ALL")}
                style={[
                    styles.filterChip, 
                    { backgroundColor: theme.card + '99', borderColor: theme.border }, 
                    categoryFilter === cat && { backgroundColor: theme.primary, borderColor: theme.primary }
                ]}
                >
                <Text style={[styles.filterChipText, { color: categoryFilter === cat ? "#fff" : theme.textSecondary }]}>
                    {cat === "ALL" ? "All Items" : `${CATEGORY_EMOJI[cat as MenuCategory]} ${cat.replace(/_/g, " ")}`}
                </Text>
                </Pressable>
            ))}
            </ScrollView>
        </View>
      )}

      {/* Content */}
      <View style={{ flex: 1 }}>
        {tab === "menu" ? (
            <FlatList
            data={filteredMenu}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => <MenuCard item={item} theme={theme} />}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
                <View style={styles.emptyState}>
                <Ionicons name="restaurant-outline" size={80} color={theme.border} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>Nothing on the menu yet</Text>
                <Text style={[styles.emptySub, { color: theme.textSecondary }]}>We're updating our selection. Please check back later.</Text>
                </View>
            }
            />
        ) : (
            <FlatList
            data={myReservations}
            keyExtractor={(item) => item._id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
                <View style={[styles.resCard, { backgroundColor: theme.card, borderColor: theme.border, borderLeftColor: STATUS_COLOR[item.status] ?? "#888" }]}>
                <View style={styles.resHeader}>
                    <View>
                        <Text style={[styles.resName, { color: theme.text }]}>Table {item.tableNumber}</Text>
                        <Text style={[styles.resSub, { color: theme.textSecondary }]}>
                            {new Date(item.reservationDate).toLocaleDateString()} at {item.reservationTime}
                        </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[item.status] ?? "#888") + "15" }]}>
                        <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[item.status] ?? "#888" }]} />
                        <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] ?? "#888" }]}>{item.status}</Text>
                    </View>
                </View>
                <View style={[styles.resFooter, { borderTopColor: theme.border }]}>
                    <View style={styles.metaRow}>
                        <Ionicons name="people" size={14} color={theme.textSecondary} />
                        <Text style={[styles.resMeta, { color: theme.textSecondary }]}>{item.guestCount} guests</Text>
                    </View>
                    {item.specialRequests ? (
                        <View style={styles.metaRow}>
                            <Ionicons name="chatbox-ellipses" size={14} color={theme.textSecondary} />
                            <Text style={[styles.resMeta, { color: theme.textSecondary }]} numberOfLines={1}>"{item.specialRequests}"</Text>
                        </View>
                    ) : null}
                </View>
                </View>
            )}
            ListEmptyComponent={
                <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={80} color={theme.border} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No Upcoming Bookings</Text>
                <Text style={[styles.emptySub, { color: theme.textSecondary }]}>Planning a dinner? Tap "Reserve" to save your table.</Text>
                </View>
            }
            />
        )}
      </View>

      <ReserveModal visible={reserveModal} theme={theme} onClose={() => setReserveModal(false)} onSaved={load} />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.four, borderBottomWidth: 1, paddingBottom: 20 },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 2, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: "900" },
  reserveBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  reserveBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn: { flex: 1, paddingVertical: 16, alignItems: "center" },
  tabText: { fontSize: 15 },
  filterRow: { paddingHorizontal: Spacing.four, paddingVertical: 16, gap: 10 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 30, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  filterChipText: { fontSize: 13, fontWeight: "700" },
  listContent: { padding: Spacing.four, gap: 20, paddingBottom: 40 },
  menuCard: { borderRadius: 20, borderWidth: 1, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 4 },
  menuImgContainer: { width: "100%", height: 200, position: "relative" },
  menuImg: { width: "100%", height: "100%" },
  menuImgPlaceholder: { width: "100%", height: "100%", justifyContent: "center", alignItems: "center" },
  cardCategoryBadge: { position: "absolute", bottom: 12, left: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  cardCategoryText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  menuName: { fontSize: 18, fontWeight: "800" },
  prepRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  menuSub: { fontSize: 13, fontWeight: "600" },
  menuDesc: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  priceTag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  menuPrice: { fontSize: 17, fontWeight: "900" },
  unavailableBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#ef444410", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignSelf: "flex-start", marginTop: 8 },
  unavailableText: { color: "#ef4444", fontSize: 12, fontWeight: "800" },
  resCard: { borderRadius: 20, borderWidth: 1, borderLeftWidth: 6, padding: 16, gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 },
  resHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  resName: { fontSize: 18, fontWeight: "900" },
  resSub: { fontSize: 14, marginTop: 2 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: "800" },
  resFooter: { flexDirection: "row", gap: 16, borderTopWidth: 1, paddingTop: 12 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  resMeta: { fontSize: 13, fontWeight: "600" },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 100, paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  emptySub: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalContent: { height: "90%", borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: "hidden" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 24, borderBottomWidth: 1 },
  modalTitle: { fontSize: 24, fontWeight: "900" },
  closeBtn: { padding: 4 },
  modalBody: { padding: 24, paddingBottom: 60 },
  inputGroup: { marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: "800", marginBottom: 8, letterSpacing: 1, textTransform: "uppercase" },
  input: { borderWidth: 1, borderRadius: 16, padding: 16, fontSize: 16 },
  row: { flexDirection: "row", gap: 16, marginBottom: 20 },
  errorContainer: { backgroundColor: "#ef444415", padding: 12, borderRadius: 12, marginBottom: 20 },
  errorText: { color: "#ef4444", fontSize: 14, fontWeight: "700", textAlign: "center" },
  submitBtn: { padding: 20, borderRadius: 20, alignItems: "center", marginTop: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 8 },
  submitBtnText: { color: "#fff", fontSize: 18, fontWeight: "900" },
});
