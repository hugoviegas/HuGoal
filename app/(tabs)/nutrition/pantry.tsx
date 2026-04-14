import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Camera, Pencil, Plus, Search, Trash2 } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import {
  deletePantryItem,
  listPantryItems,
  type PantryItem,
  type PantryItemInput,
  upsertPantryItem,
} from "@/lib/firestore/pantry";
import { analyzeNutritionLabelToPantryDraft } from "@/lib/ai/nutritionImageAI";

const TUTORIAL_KEY = "nutrition:pantry:tutorial-v1";

interface PantryFormState {
  name: string;
  brand: string;
  calories_per_100g: string;
  protein_per_100g: string;
  carbs_per_100g: string;
  fat_per_100g: string;
  serving_size_g: string;
  serving_unit: string;
}

const EMPTY_FORM: PantryFormState = {
  name: "",
  brand: "",
  calories_per_100g: "",
  protein_per_100g: "",
  carbs_per_100g: "",
  fat_per_100g: "",
  serving_size_g: "100",
  serving_unit: "g",
};

function toInputNumber(value: string, fallback = 0): number {
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, parsed);
}

function toFormFromItem(item: PantryItem): PantryFormState {
  return {
    name: item.name,
    brand: item.brand ?? "",
    calories_per_100g: String(item.calories_per_100g),
    protein_per_100g: String(item.protein_per_100g),
    carbs_per_100g: String(item.carbs_per_100g),
    fat_per_100g: String(item.fat_per_100g),
    serving_size_g: String(item.serving_size_g),
    serving_unit: item.serving_unit,
  };
}

function toInputFromForm(form: PantryFormState): PantryItemInput | null {
  const name = form.name.trim();
  if (!name) {
    return null;
  }

  return {
    name,
    brand: form.brand.trim() || undefined,
    calories_per_100g: toInputNumber(form.calories_per_100g),
    protein_per_100g: toInputNumber(form.protein_per_100g),
    carbs_per_100g: toInputNumber(form.carbs_per_100g),
    fat_per_100g: toInputNumber(form.fat_per_100g),
    serving_size_g: Math.max(1, toInputNumber(form.serving_size_g, 100)),
    serving_unit: form.serving_unit.trim() || "g",
  };
}

function PantryRow({
  item,
  onEdit,
  onDelete,
}: {
  item: PantryItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const colors = useThemeStore((s) => s.colors);

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.cardBorder,
        borderRadius: 12,
        backgroundColor: colors.card,
        padding: spacing.sm,
        flexDirection: "row",
        gap: spacing.sm,
        alignItems: "center",
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[typography.smallMedium, { color: colors.foreground }]}>
          {item.name}
        </Text>
        {item.brand ? (
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>
            {item.brand}
          </Text>
        ) : null}
        <Text style={[typography.caption, { color: colors.mutedForeground }]}>
          100g: {Math.round(item.calories_per_100g)} kcal · P {item.protein_per_100g}g · C {item.carbs_per_100g}g · F {item.fat_per_100g}g
        </Text>
      </View>

      <Pressable
        onPress={onEdit}
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: colors.cardBorder,
          backgroundColor: colors.background,
        }}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${item.name}`}
      >
        <Pencil size={16} color={colors.foreground} />
      </Pressable>

      <Pressable
        onPress={onDelete}
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: colors.destructive + "66",
          backgroundColor: colors.destructive + "15",
        }}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${item.name}`}
      >
        <Trash2 size={16} color={colors.destructive} />
      </Pressable>
    </View>
  );
}

export default function PantryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const showToast = useToastStore((s) => s.show);

  const [items, setItems] = useState<PantryItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PantryFormState>(EMPTY_FORM);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [scanningLabel, setScanningLabel] = useState(false);

  const filtered = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (!text) {
      return items;
    }

    return items.filter((item) => {
      const inName = item.name.toLowerCase().includes(text);
      const inBrand = (item.brand ?? "").toLowerCase().includes(text);
      return inName || inBrand;
    });
  }, [items, search]);

  const loadItems = useCallback(async () => {
    if (!user?.uid) {
      setItems([]);
      return;
    }

    try {
      setLoading(true);
      const result = await listPantryItems(user.uid);
      setItems(result);
    } catch {
      showToast("Failed to load pantry", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, user?.uid]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    const checkTutorial = async () => {
      if (!user?.uid) {
        return;
      }

      const key = `${TUTORIAL_KEY}:${user.uid}`;
      const value = await AsyncStorage.getItem(key);
      if (!value) {
        setShowTutorial(true);
      }
    };

    void checkTutorial();
  }, [user?.uid]);

  const closeTutorial = useCallback(async () => {
    if (!user?.uid) {
      setShowTutorial(false);
      return;
    }

    const key = `${TUTORIAL_KEY}:${user.uid}`;
    await AsyncStorage.setItem(key, "1");
    setShowTutorial(false);
  }, [user?.uid]);

  const openCreateForm = useCallback(() => {
    setEditingItemId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }, []);

  const openEditForm = useCallback((item: PantryItem) => {
    setEditingItemId(item.id);
    setForm(toFormFromItem(item));
    setShowForm(true);
  }, []);

  const handleSaveForm = useCallback(async () => {
    if (!user?.uid) {
      return;
    }

    const input = toInputFromForm(form);
    if (!input) {
      showToast("Name is required", "error");
      return;
    }

    try {
      setSaving(true);
      await upsertPantryItem(user.uid, input, editingItemId ?? undefined);
      showToast(editingItemId ? "Pantry item updated" : "Pantry item added", "success");
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditingItemId(null);
      await loadItems();
    } catch {
      showToast("Failed to save pantry item", "error");
    } finally {
      setSaving(false);
    }
  }, [editingItemId, form, loadItems, showToast, user?.uid]);

  const handleDelete = useCallback(
    async (item: PantryItem) => {
      if (!user?.uid) {
        return;
      }

      try {
        await deletePantryItem(user.uid, item.id);
        setItems((prev) => prev.filter((entry) => entry.id !== item.id));
        showToast("Pantry item removed", "success");
      } catch {
        showToast("Failed to remove pantry item", "error");
      }
    },
    [showToast, user?.uid],
  );

  const handleScanLabel = useCallback(async () => {
    if (scanningLabel) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast("Media library permission denied", "error");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.85,
      base64: true,
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    const asset = result.assets[0];
    const base64 = asset.base64;

    if (!base64) {
      showToast("Could not read image data", "error");
      return;
    }

    try {
      setScanningLabel(true);
      const draft = await analyzeNutritionLabelToPantryDraft(
        base64,
        profile?.preferred_ai_provider ?? "gemini",
      );
      setForm({
        name: draft.name,
        brand: draft.brand ?? "",
        calories_per_100g: String(draft.calories_per_100g),
        protein_per_100g: String(draft.protein_per_100g),
        carbs_per_100g: String(draft.carbs_per_100g),
        fat_per_100g: String(draft.fat_per_100g),
        serving_size_g: String(draft.serving_size_g),
        serving_unit: draft.serving_unit,
      });
      setShowForm(true);
      showToast("Label analyzed. Review before saving.", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to analyze label";
      showToast(message, "error");
    } finally {
      setScanningLabel(false);
    }
  }, [profile?.preferred_ai_provider, scanningLabel, showToast]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.cardBorder,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            alignItems: "center",
            justifyContent: "center",
          }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color={colors.foreground} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={[typography.h3, { color: colors.foreground }]}>Minha dispensa</Text>
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>Food catalog prioritized by nutrition chat AI</Text>
        </View>

        <Pressable
          onPress={openCreateForm}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.primary,
          }}
          accessibilityRole="button"
          accessibilityLabel="Add pantry item"
        >
          <Plus size={18} color={colors.primaryForeground} />
        </Pressable>
      </View>

      <View
        style={{
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          gap: spacing.sm,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: 11,
            paddingHorizontal: 10,
            minHeight: 42,
            backgroundColor: colors.card,
            gap: 8,
          }}
        >
          <Search size={16} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by item or brand"
            placeholderTextColor={colors.mutedForeground}
            style={{ flex: 1, color: colors.foreground }}
          />
        </View>

        <Pressable
          onPress={() => void handleScanLabel()}
          disabled={scanningLabel}
          style={{
            minHeight: 42,
            borderRadius: 11,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.secondary,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            flexDirection: "row",
            gap: 8,
            opacity: scanningLabel ? 0.7 : 1,
          }}
          accessibilityRole="button"
          accessibilityLabel="Analyze nutrition label image"
        >
          {scanningLabel ? (
            <ActivityIndicator color={colors.secondaryForeground} size="small" />
          ) : (
            <Camera size={16} color={colors.secondaryForeground} />
          )}
          <Text style={[typography.smallMedium, { color: colors.secondaryForeground }]}>Add item with AI label scan</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: spacing.md,
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + 120,
            gap: spacing.sm,
          }}
          renderItem={({ item }) => (
            <PantryRow
              item={item}
              onEdit={() => openEditForm(item)}
              onDelete={() => void handleDelete(item)}
            />
          )}
          ListEmptyComponent={
            <View style={{ paddingTop: spacing.lg, alignItems: "center" }}>
              <Text style={[typography.body, { color: colors.mutedForeground, textAlign: "center" }]}>No pantry items yet. Add your first product to improve AI accuracy.</Text>
            </View>
          }
        />
      )}

      <Modal visible={showTutorial} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.35)",
            padding: spacing.lg,
            justifyContent: "center",
          }}
        >
          <View
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              backgroundColor: colors.card,
              padding: spacing.md,
              gap: spacing.sm,
            }}
          >
            <Text style={[typography.h3, { color: colors.foreground }]}>How to use Minha dispensa</Text>
            <Text style={[typography.small, { color: colors.mutedForeground }]}>1. Add your frequent foods manually or with AI label scan.</Text>
            <Text style={[typography.small, { color: colors.mutedForeground }]}>2. Confirm nutrition values once and keep your catalog accurate.</Text>
            <Text style={[typography.small, { color: colors.mutedForeground }]}>3. In chat, AI prioritizes these items when matching what you ate.</Text>

            <Pressable
              onPress={() => void closeTutorial()}
              style={{
                marginTop: spacing.xs,
                minHeight: 42,
                borderRadius: 11,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.primary,
              }}
            >
              <Text style={[typography.smallMedium, { color: colors.primaryForeground }]}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.35)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              padding: spacing.md,
              gap: spacing.sm,
              paddingBottom: insets.bottom + spacing.md,
            }}
          >
            <Text style={[typography.h3, { color: colors.foreground }]}> {editingItemId ? "Edit item" : "New pantry item"} </Text>

            {(
              [
                ["Name", "name", "e.g. Biscoito Digestive"],
                ["Brand", "brand", "optional"],
                ["Calories / 100g", "calories_per_100g", "0"],
                ["Protein / 100g", "protein_per_100g", "0"],
                ["Carbs / 100g", "carbs_per_100g", "0"],
                ["Fat / 100g", "fat_per_100g", "0"],
                ["Serving size (g)", "serving_size_g", "100"],
                ["Serving unit", "serving_unit", "g"],
              ] as const
            ).map(([label, key, placeholder]) => (
              <View key={key} style={{ gap: 4 }}>
                <Text style={[typography.caption, { color: colors.mutedForeground }]}>{label}</Text>
                <TextInput
                  value={form[key]}
                  onChangeText={(value) =>
                    setForm((current) => ({
                      ...current,
                      [key]: value,
                    }))
                  }
                  placeholder={placeholder}
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType={key.includes("100g") || key.includes("size") ? "numeric" : "default"}
                  style={{
                    minHeight: 40,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    color: colors.foreground,
                    backgroundColor: colors.background,
                  }}
                />
              </View>
            ))}

            <View style={{ flexDirection: "row", gap: spacing.xs }}>
              <Pressable
                onPress={() => setShowForm(false)}
                style={{
                  flex: 1,
                  minHeight: 42,
                  borderRadius: 11,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                }}
              >
                <Text style={[typography.smallMedium, { color: colors.foreground }]}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={() => void handleSaveForm()}
                disabled={saving}
                style={{
                  flex: 1,
                  minHeight: 42,
                  borderRadius: 11,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.primary,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? (
                  <ActivityIndicator color={colors.primaryForeground} size="small" />
                ) : (
                  <Text style={[typography.smallMedium, { color: colors.primaryForeground }]}>
                    {editingItemId ? "Update" : "Save"}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
