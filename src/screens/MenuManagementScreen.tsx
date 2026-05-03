import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import {
  createMenuItem,
  deleteMenuItem,
  getMenuItems,
  toggleMenuItemAvailability,
  updateMenuItem,
  type MenuItem,
} from "@/api/service";
import { useTheme } from "@/hooks/use-theme";
import { Spacing } from "@/constants/theme";

const CUISINES = ["WESTERN", "THAI_CHINESE", "SRI_LANKAN", "INDIAN", "ITALIAN"];
const MEAL_SERVICES = ["BREAKFAST", "LUNCH", "DINNER", "ALL_DAY"];

const BLANK_FORM: Omit<MenuItem, "_id"> = {
  name: "",
  cuisine: "WESTERN",
  price: 0,
  description: "",
  badge: "",
  mealService: "LUNCH",
  available: true,
  imageUrl: "",
};

const errMsg = (err: unknown) => {
  const e = err as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return e?.response?.data?.message ?? e?.message ?? "An error occurred.";
};

const formatLabel = (v: string) => v.replaceAll("_", " ");

// ── Item Form Modal ───────────────────────────────────────────────────────────

function ItemFormModal({
  visible,
  editing,
  theme,
  onClose,
  onSaved,
}: Readonly<{
  visible: boolean;
  editing: MenuItem | null;
  theme: ReturnType<typeof useTheme>;
  onClose: () => void;
  onSaved: () => void;
}>) {
  const [form, setForm] = useState<Omit<MenuItem, "_id">>(BLANK_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = "hms_menu_items";

  const pickAndUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Please allow photo library access to upload images.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (result.canceled) return;
    setUploading(true);
    try {
      const asset = result.assets[0];
      // Fetch the local file as a blob then upload to Cloudinary
      const localRes = await fetch(asset.uri);
      const blob = await localRes.blob();
      const formData = new FormData();
      formData.append("file", blob, "menu-item.jpg");
      formData.append("upload_preset", UPLOAD_PRESET);
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );
      const data = await res.json();
      if (data.secure_url) {
        setForm((f) => ({ ...f, imageUrl: data.secure_url as string }));
      } else {
        Alert.alert("Upload failed", data.error?.message ?? "Unknown error");
      }
    } catch (err) {
      const e = err as { message?: string };
      Alert.alert("Upload failed", e?.message ?? "Network error");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    if (editing === null) {
      setForm(BLANK_FORM);
    } else {
      setForm({
        name: editing.name,
        cuisine: editing.cuisine,
        price: editing.price,
        description: editing.description ?? "",
        badge: editing.badge ?? "",
        mealService: editing.mealService ?? "LUNCH",
        available: editing.available,
        imageUrl: editing.imageUrl ?? "",
      });
    }
    setError("");
  }, [editing, visible]);

  const set = (key: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  const inputStyle = [
    styles.input,
    {
      color: theme.text,
      borderColor: theme.border,
      backgroundColor: theme.backgroundElement,
    },
  ];

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError("Item name is required.");
      return;
    }
    if (!form.price || form.price <= 0) {
      setError("Price must be greater than 0.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      if (editing === null) {
        await createMenuItem({ ...form, price: Number(form.price) });
      } else {
        await updateMenuItem(editing._id, {
          ...form,
          price: Number(form.price),
        });
      }
      onClose();
      onSaved();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView
        style={[styles.modalSafe, { backgroundColor: theme.background }]}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            style={[styles.modalHeader, { borderBottomColor: theme.border }]}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {editing === null ? "Add Item" : "Edit Item"}
            </Text>
            <Pressable onPress={onClose}>
              <Text style={[styles.closeBtn, { color: theme.textSecondary }]}>
                ✕
              </Text>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.modalBody}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Name
            </Text>
            <TextInput
              style={inputStyle}
              value={form.name}
              onChangeText={set("name")}
              placeholder="Item name"
              placeholderTextColor={theme.textSecondary}
            />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Price (Rs.)
            </Text>
            <TextInput
              style={inputStyle}
              value={String(form.price)}
              onChangeText={(v) =>
                setForm((f) => ({ ...f, price: Number(v) || 0 }))
              }
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={theme.textSecondary}
            />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Description
            </Text>
            <TextInput
              style={[...inputStyle, styles.textarea]}
              value={form.description}
              onChangeText={set("description")}
              multiline
              numberOfLines={3}
              placeholder="Description"
              placeholderTextColor={theme.textSecondary}
            />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Badge (optional)
            </Text>
            <TextInput
              style={inputStyle}
              value={form.badge}
              onChangeText={set("badge")}
              placeholder="e.g. Chef's Special"
              placeholderTextColor={theme.textSecondary}
            />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Cuisine
            </Text>
            <ChipRow
              options={CUISINES}
              value={form.cuisine}
              onChange={set("cuisine")}
              theme={theme}
            />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Meal Service
            </Text>
            <ChipRow
              options={MEAL_SERVICES}
              value={form.mealService ?? "LUNCH"}
              onChange={set("mealService")}
              theme={theme}
            />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Image (optional)
            </Text>
            <Pressable
              onPress={pickAndUpload}
              disabled={uploading}
              style={[
                styles.imagePickerBtn,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundElement,
                },
              ]}
            >
              {uploading && <ActivityIndicator color={theme.text} />}
              {!uploading && form.imageUrl ? (
                <Image
                  source={{ uri: form.imageUrl }}
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
              ) : null}
              {!uploading && !form.imageUrl ? (
                <Text
                  style={[
                    styles.imagePickerText,
                    { color: theme.textSecondary },
                  ]}
                >
                  📷 Tap to select image
                </Text>
              ) : null}
            </Pressable>
            {form.imageUrl ? (
              <Pressable
                onPress={() => setForm((f) => ({ ...f, imageUrl: "" }))}
              >
                <Text style={[styles.removeImageText, { color: "#ef4444" }]}>
                  Remove image
                </Text>
              </Pressable>
            ) : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && { opacity: 0.7 },
                submitting && { opacity: 0.6 },
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#1e293b" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {editing === null ? "Add Item" : "Update Item"}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ChipRow({
  options,
  value,
  onChange,
  theme,
}: Readonly<{
  options: string[];
  value: string;
  onChange: (v: string) => void;
  theme: ReturnType<typeof useTheme>;
}>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginBottom: 8 }}
    >
      {options.map((opt) => {
        const active = value === opt;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={[styles.chip, active && { backgroundColor: theme.text }]}
          >
            <Text
              style={[
                styles.chipText,
                { color: active ? theme.background : theme.textSecondary },
              ]}
            >
              {formatLabel(opt)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function MenuManagementScreen() {
  const theme = useTheme();

  const [items, setItems] = useState<MenuItem[]>([]);
  const [search, setSearch] = useState("");
  const [cuisineFilter, setCuisineFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);

  const load = useCallback(async () => {
    try {
      const params: { search?: string; cuisine?: string } = {};
      if (search.trim()) params.search = search.trim();
      if (cuisineFilter !== "ALL") params.cuisine = cuisineFilter;
      const result = await getMenuItems(params);
      setItems(result);
    } catch (err) {
      Alert.alert("Error", errMsg(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, cuisineFilter]);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      load();
    }, 250);
    return () => clearTimeout(t);
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const summary = useMemo(
    () => ({
      total: items.length,
      available: items.filter((i) => i.available).length,
    }),
    [items],
  );

  const handleDelete = (item: MenuItem) => {
    Alert.alert("Delete Item", `Delete "${item.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMenuItem(item._id);
            load();
          } catch (err) {
            Alert.alert("Error", errMsg(err));
          }
        },
      },
    ]);
  };

  const handleToggle = async (item: MenuItem) => {
    try {
      await toggleMenuItemAvailability(item._id, !item.available);
      load();
    } catch (err) {
      Alert.alert("Error", errMsg(err));
    }
  };

  const openAdd = () => {
    setEditing(null);
    setModalVisible(true);
  };
  const openEdit = (item: MenuItem) => {
    setEditing(item);
    setModalVisible(true);
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.eyebrow, { color: theme.textSecondary }]}>
            RESTAURANT
          </Text>
          <Text style={[styles.screenTitle, { color: theme.text }]}>
            Menu Management
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.newBtn,
            { backgroundColor: theme.primary },
            pressed && { opacity: 0.7 },
          ]}
          onPress={openAdd}
        >
          <Text style={styles.newBtnText}>+ Add Item</Text>
        </Pressable>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatChip label="Total" value={summary.total} color="#ec4899" />
        <StatChip label="Available" value={summary.available} color="#10b981" />
        <StatChip
          label="Unavailable"
          value={summary.total - summary.available}
          color="#9ca3af"
        />
      </View>

      {/* Search */}
      <View style={[styles.filterBar, { borderBottomColor: "#e5e7eb" }]}>
        <TextInput
          style={[
            styles.searchInput,
            {
              color: theme.text,
              borderColor: theme.border,
              backgroundColor: theme.backgroundElement,
            },
          ]}
          placeholder="Search items..."
          placeholderTextColor={theme.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {["ALL", ...CUISINES].map((c) => (
            <Pressable
              key={c}
              onPress={() => setCuisineFilter(c)}
              style={[
                styles.filterChip,
                {
                  borderColor:
                    cuisineFilter === c ? theme.primary : theme.border,
                },
                cuisineFilter === c && { backgroundColor: theme.primary },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: cuisineFilter === c ? "#fff" : theme.textSecondary },
                ]}
              >
                {c === "ALL" ? "All" : formatLabel(c)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={theme.text}
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => item._id ?? `menu-${index}`}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.card,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              ) : null}
              <View style={styles.cardTop}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.cardName, { color: theme.text }]}>
                    {item.name}
                  </Text>
                  {item.badge ? (
                    <Text style={styles.cardBadge}>{item.badge}</Text>
                  ) : null}
                </View>
                <Text style={[styles.cardPrice, { color: "#ec4899" }]}>
                  Rs. {item.price.toLocaleString()}
                </Text>
              </View>
              <View style={styles.cardMeta}>
                <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                  {formatLabel(item.cuisine)} ·{" "}
                  {formatLabel(item.mealService ?? "")}
                </Text>
                <View
                  style={[
                    styles.availBadge,
                    {
                      backgroundColor: item.available
                        ? "#10b98122"
                        : "#9ca3af22",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.availText,
                      { color: item.available ? "#10b981" : "#9ca3af" },
                    ]}
                  >
                    {item.available ? "Available" : "Unavailable"}
                  </Text>
                </View>
              </View>
              {item.description ? (
                <Text
                  style={[styles.cardDesc, { color: theme.textSecondary }]}
                  numberOfLines={2}
                >
                  {item.description}
                </Text>
              ) : null}
              <View style={styles.cardActions}>
                <Pressable
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: item.available
                        ? "#9ca3af22"
                        : "#10b98122",
                    },
                  ]}
                  onPress={() => handleToggle(item)}
                >
                  <Text
                    style={[
                      styles.actionText,
                      { color: item.available ? "#9ca3af" : "#10b981" },
                    ]}
                  >
                    {item.available ? "Disable" : "Enable"}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: "#f59e0b22" }]}
                  onPress={() => openEdit(item)}
                >
                  <Text style={[styles.actionText, { color: "#f59e0b" }]}>
                    Edit
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: "#ef444422" }]}
                  onPress={() => handleDelete(item)}
                >
                  <Text style={[styles.actionText, { color: "#ef4444" }]}>
                    Delete
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.textSecondary }]}>
              No menu items found.
            </Text>
          }
        />
      )}

      <ItemFormModal
        visible={modalVisible}
        editing={editing}
        theme={theme}
        onClose={() => setModalVisible(false)}
        onSaved={load}
      />
    </SafeAreaView>
  );
}

function StatChip({
  label,
  value,
  color,
}: Readonly<{ label: string; value: number; color: string }>) {
  return (
    <View
      style={[
        styles.statChip,
        { backgroundColor: color + "18", borderColor: color + "44" },
      ]}
    >
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  eyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5 },
  screenTitle: { fontSize: 22, fontWeight: "700", marginTop: 2 },
  newBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  newBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  statChip: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  statValue: { fontSize: 20, fontWeight: "700" },
  statLabel: { fontSize: 11, color: "#9ca3af" },
  filterBar: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    gap: Spacing.two,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginRight: 6,
  },
  filterChipText: { fontSize: 12, fontWeight: "500" },
  list: {
    padding: Spacing.three,
    gap: Spacing.two,
    paddingBottom: Spacing.six,
  },
  empty: { textAlign: "center", marginTop: 40, fontSize: 14 },
  card: { borderRadius: 12, borderWidth: 1, padding: Spacing.three, gap: 6 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardName: { fontSize: 16, fontWeight: "700" },
  cardBadge: { fontSize: 11, color: "#f59e0b", fontWeight: "600" },
  cardPrice: { fontSize: 16, fontWeight: "700", marginLeft: 8 },
  cardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaText: { fontSize: 12 },
  availBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  availText: { fontSize: 11, fontWeight: "600" },
  cardDesc: { fontSize: 13, fontStyle: "italic" },
  cardActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  actionText: { fontSize: 12, fontWeight: "600" },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginRight: 6,
  },
  chipText: { fontSize: 12, fontWeight: "500" },
  modalSafe: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.four,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  closeBtn: { fontSize: 20, padding: 4 },
  modalBody: { padding: Spacing.four, gap: Spacing.two, paddingBottom: 60 },
  fieldLabel: { fontSize: 13, fontWeight: "600", marginBottom: 2 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textarea: { minHeight: 80, textAlignVertical: "top" },
  imagePickerBtn: {
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: "dashed",
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  imagePickerText: { fontSize: 14 },
  removeImageText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
  },
  imagePreview: { width: "100%", height: 160, borderRadius: 8 },
  cardImage: { width: "100%", height: 140, borderRadius: 8, marginBottom: 6 },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
    backgroundColor: "#ef444420",
    padding: 10,
    borderRadius: 8,
  },
  submitBtn: {
    backgroundColor: "#f4d28f",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnText: { color: "#1e293b", fontSize: 16, fontWeight: "700" },
});
