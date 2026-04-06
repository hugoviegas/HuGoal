import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Search, Database, Cloud } from "lucide-react-native";

import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import { useNutritionStore } from "@/stores/nutrition.store";

import {
  getEdamamUsageToday,
  searchFoods,
  toNutritionItemFromSearch,
  type FoodSearchResult,
} from "@/lib/food-service";
import { upsertFoodLibraryItemFromNutritionItem } from "@/lib/firestore/nutrition";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { radius } from "@/constants/radius";
import type { NutritionItem } from "@/types";

type AddFoodMode = "pick" | "library" | "manual";

function toSafeString(value: number | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "0";
  return String(value);
}

function parsePositiveNumber(value: string, fallback = 0): number {
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.round(parsed * 100) / 100);
}

function scaleNutritionValue(baseValue: number | undefined, ratio: number): number {
  if (typeof baseValue !== "number" || !Number.isFinite(baseValue)) return 0;
  return Math.max(0, Math.round(baseValue * ratio));
}

function buildScaledNutritionItem(
  baseItem: NutritionItem,
  servingSize: number,
): NutritionItem {
  const baseServing = baseItem.serving_size_g > 0 ? baseItem.serving_size_g : 100;
  const ratio = servingSize > 0 ? servingSize / baseServing : 0;

  return {
    ...baseItem,
    serving_size_g: servingSize,
    calories: scaleNutritionValue(baseItem.calories, ratio),
    protein_g: scaleNutritionValue(baseItem.protein_g, ratio),
    carbs_g: scaleNutritionValue(baseItem.carbs_g, ratio),
    fat_g: scaleNutritionValue(baseItem.fat_g, ratio),
    fiber_g: scaleNutritionValue(baseItem.fiber_g, ratio),
    sugar_g: scaleNutritionValue(baseItem.sugar_g, ratio),
  };
}

function FoodSearchCard({
  item,
  loading,
  onSave,
  onSaveAndUse,
}: {
  item: FoodSearchResult;
  loading: boolean;
  onSave: (item: FoodSearchResult) => void;
  onSaveAndUse: (item: FoodSearchResult) => void;
}) {
  const colors = useThemeStore((s) => s.colors);

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        padding: spacing.md,
        gap: spacing.sm,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[typography.bodyMedium, { color: colors.foreground }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[typography.caption, { color: colors.mutedForeground }]} numberOfLines={1}>
            {item.brand ?? "No brand"}
          </Text>
        </View>

        <View
          style={{
            borderRadius: radius.full,
            paddingHorizontal: 8,
            paddingVertical: 4,
            backgroundColor: colors.primary + "1A",
            alignSelf: "flex-start",
          }}
        >
          <Text style={[typography.caption, { color: colors.primary }]}> 
            {item.source === "library" ? "Library" : item.source === "edamam" ? "Edamam" : "USDA"}
          </Text>
        </View>
      </View>

      <Text style={[typography.caption, { color: colors.mutedForeground }]}>
        {item.serving_size_g}g · {item.calories} kcal · P {item.protein_g}g · C {item.carbs_g}g · F {item.fat_g}g
      </Text>

      <View style={{ flexDirection: "row", gap: spacing.xs }}>
        <Pressable
          onPress={() => onSave(item)}
          disabled={loading}
          style={{
            flex: 1,
            minHeight: 44,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.background,
            opacity: loading ? 0.6 : 1,
          }}
        >
          <Text style={[typography.smallMedium, { color: colors.foreground }]}>Save to library</Text>
        </Pressable>

        <Pressable
          onPress={() => onSaveAndUse(item)}
          disabled={loading}
          style={{
            flex: 1,
            minHeight: 44,
            borderRadius: radius.md,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.primary,
            opacity: loading ? 0.6 : 1,
          }}
        >
          <Text style={[typography.smallMedium, { color: "#fff" }]}>Save and use</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function AddFoodScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode: modeParam } = useLocalSearchParams<{ mode?: string }>();
  const mode: AddFoodMode =
    modeParam === "library"
      ? "library"
      : modeParam === "manual"
        ? "manual"
        : "pick";

  const user = useAuthStore((s) => s.user);
  const colors = useThemeStore((s) => s.colors);
  const showToast = useToastStore((s) => s.show);
  const selectedFoodSelection = useNutritionStore((s) => s.selectedFoodSelection);
  const setSelectedFoodSelection = useNutritionStore((s) => s.setSelectedFoodSelection);

  const [manualFoodName, setManualFoodName] = useState("");
  const [manualBrand, setManualBrand] = useState("");
  const [manualServingSize, setManualServingSize] = useState("100");
  const [manualCalories, setManualCalories] = useState("0");
  const [manualProtein, setManualProtein] = useState("0");
  const [manualCarbs, setManualCarbs] = useState("0");
  const [manualFat, setManualFat] = useState("0");
  const [manualFiber, setManualFiber] = useState("0");
  const [manualSugar, setManualSugar] = useState("0");
  const [manualNotes, setManualNotes] = useState("");
  const [manualReferenceItem, setManualReferenceItem] = useState<NutritionItem | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [searchingLocal, setSearchingLocal] = useState(false);
  const [searchingRemote, setSearchingRemote] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ count: number; limit: number; remaining: number | null } | null>(null);

  const canRemoteSearch = useMemo(() => query.trim().length >= 2, [query]);

  const loadUsage = useCallback(async () => {
    const info = await getEdamamUsageToday();
    setUsage(info);
  }, []);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  useEffect(() => {
    if (mode !== "manual") return;
    if (!selectedFoodSelection?.item) {
      setManualReferenceItem(null);
      setManualFoodName("");
      setManualBrand("");
      setManualServingSize("100");
      setManualCalories("0");
      setManualProtein("0");
      setManualCarbs("0");
      setManualFat("0");
      setManualFiber("0");
      setManualSugar("0");
      setManualNotes("");
      return;
    }

    const item = selectedFoodSelection.item;
    setManualReferenceItem(item);
    setManualFoodName(item.food_name ?? "");
    setManualBrand(item.brand ?? "");
    setManualServingSize(toSafeString(item.serving_size_g));
    setManualCalories(toSafeString(item.calories));
    setManualProtein(toSafeString(item.protein_g));
    setManualCarbs(toSafeString(item.carbs_g));
    setManualFat(toSafeString(item.fat_g));
    setManualFiber(toSafeString(item.fiber_g));
    setManualSugar(toSafeString(item.sugar_g));
    setManualNotes(item.notes ?? "");
  }, [mode, selectedFoodSelection]);

  const isEditingManualItem =
    mode === "manual" && Boolean(manualReferenceItem && selectedFoodSelection?.editIndex !== null);

  useEffect(() => {
    if (!isEditingManualItem || !manualReferenceItem) return;

    const servingSize = parsePositiveNumber(manualServingSize, manualReferenceItem.serving_size_g || 100);
    const scaled = buildScaledNutritionItem(manualReferenceItem, servingSize);

    setManualCalories(toSafeString(scaled.calories));
    setManualProtein(toSafeString(scaled.protein_g));
    setManualCarbs(toSafeString(scaled.carbs_g));
    setManualFat(toSafeString(scaled.fat_g));
    setManualFiber(toSafeString(scaled.fiber_g));
    setManualSugar(toSafeString(scaled.sugar_g));
  }, [isEditingManualItem, manualReferenceItem, manualServingSize]);

  const runLibrarySearch = useCallback(async () => {
    if (!user?.uid || query.trim().length < 2) {
      setResults([]);
      return;
    }

    try {
      setSearchingLocal(true);
      const local = await searchFoods(user.uid, query, 20);
      setResults(local);
    } finally {
      setSearchingLocal(false);
    }
  }, [query, user?.uid]);

  useEffect(() => {
    runLibrarySearch();
  }, [runLibrarySearch]);

  const runRemoteSearch = async () => {
    if (!user?.uid || !canRemoteSearch) return;
    try {
      setSearchingRemote(true);
      const remote = await searchFoods(user.uid, query, 20, { forceRemote: true });
      setResults(remote);
      await loadUsage();

      if (remote.length === 0) {
        showToast("No remote results for this search", "info");
      }
    } catch {
      showToast("Failed to search external food API", "error");
    } finally {
      setSearchingRemote(false);
    }
  };

  const saveToLibrary = async (result: FoodSearchResult, alsoUse: boolean) => {
    if (!user?.uid) return;

    try {
      setSavingId(result.id);
      const item = toNutritionItemFromSearch(result);
      await upsertFoodLibraryItemFromNutritionItem(user.uid, item);

      if (alsoUse && mode === "pick") {
        setSelectedFoodSelection(item, null);
        showToast("Food saved and selected", "success");
        router.back();
        return;
      }

      showToast("Food saved to your library", "success");
      await runLibrarySearch();
    } catch {
      showToast("Failed to save food", "error");
    } finally {
      setSavingId(null);
    }
  };

  const buildManualItem = (): NutritionItem | null => {
    const name = manualFoodName.trim();
    if (!name) return null;

    const servingSize = parsePositiveNumber(manualServingSize, manualReferenceItem?.serving_size_g ?? 100);
    const baseItem = manualReferenceItem;

    const derived = baseItem
      ? buildScaledNutritionItem(baseItem, servingSize)
      : null;

    const item: NutritionItem = {
      food_name: name,
      brand: manualBrand.trim() || undefined,
      notes: manualNotes.trim() || undefined,
      serving_size_g: servingSize,
      calories: derived ? derived.calories : parsePositiveNumber(manualCalories, 0),
      protein_g: derived ? derived.protein_g : parsePositiveNumber(manualProtein, 0),
      carbs_g: derived ? derived.carbs_g : parsePositiveNumber(manualCarbs, 0),
      fat_g: derived ? derived.fat_g : parsePositiveNumber(manualFat, 0),
      fiber_g: derived ? derived.fiber_g : parsePositiveNumber(manualFiber, 0),
      sugar_g: derived ? derived.sugar_g : parsePositiveNumber(manualSugar, 0),
      source: "manual",
    };

    return item;
  };

  const saveManual = async (alsoUse: boolean) => {
    if (!user?.uid) return;

    const item = buildManualItem();
    if (!item) {
      showToast("Enter food name to continue", "info");
      return;
    }

    try {
      setSavingId("manual-item");
      await upsertFoodLibraryItemFromNutritionItem(user.uid, item);

      if (alsoUse && (mode === "pick" || mode === "manual")) {
        const editIndex = selectedFoodSelection?.editIndex ?? null;
        setSelectedFoodSelection(item, editIndex);
        showToast("Food saved and selected", "success");
        router.back();
        return;
      }

      showToast("Manual food saved to library", "success");
      if (mode === "manual") {
        router.back();
        return;
      }

      await runLibrarySearch();
    } catch {
      showToast("Failed to save manual food", "error");
    } finally {
      setSavingId(null);
    }
  };

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
          hitSlop={8}
          style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
        >
          <ArrowLeft size={22} color={colors.foreground} strokeWidth={2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[typography.h3, { color: colors.foreground }]}>Add food</Text>
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>Search library first, API only when needed</Text>
        </View>
      </View>

      {mode === "manual" ? (
        <View style={{ flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>Fill in food details. When editing an item from the daily log, macros are calculated automatically from the weight or quantity.</Text>

          <View
            style={{
              borderWidth: 1,
              borderColor: colors.cardBorder,
              borderRadius: radius.md,
              backgroundColor: colors.card,
              paddingHorizontal: spacing.sm,
              minHeight: 48,
              justifyContent: "center",
            }}
          >
            <TextInput
              value={manualFoodName}
              onChangeText={setManualFoodName}
              placeholder="Food name"
              placeholderTextColor={colors.muted}
              style={[typography.body, { color: colors.foreground }]}
            />
          </View>

          <View
            style={{
              borderWidth: 1,
              borderColor: colors.cardBorder,
              borderRadius: radius.md,
              backgroundColor: colors.card,
              paddingHorizontal: spacing.sm,
              minHeight: 48,
              justifyContent: "center",
            }}
          >
            <TextInput
              value={manualBrand}
              onChangeText={setManualBrand}
              placeholder="Brand (optional)"
              placeholderTextColor={colors.muted}
              style={[typography.body, { color: colors.foreground }]}
            />
          </View>

          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                borderRadius: radius.md,
                backgroundColor: colors.card,
                paddingHorizontal: spacing.sm,
                minHeight: 48,
                justifyContent: "center",
              }}
            >
              <TextInput
                value={manualServingSize}
                onChangeText={setManualServingSize}
                placeholder={isEditingManualItem ? "Quantity or weight (g)" : "Serving (g)"}
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                style={[typography.body, { color: colors.foreground }]}
              />
            </View>

            <View
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                borderRadius: radius.md,
                backgroundColor: colors.card,
                paddingHorizontal: spacing.sm,
                minHeight: 48,
                justifyContent: "center",
              }}
            >
              <TextInput
                value={manualCalories}
                onChangeText={setManualCalories}
                placeholder="Calories"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                editable={!isEditingManualItem}
                style={[typography.body, { color: colors.foreground }]}
              />
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.md, backgroundColor: colors.card, paddingHorizontal: spacing.sm, minHeight: 48, justifyContent: "center" }}>
              <TextInput
                value={manualProtein}
                onChangeText={setManualProtein}
                placeholder="Protein (g)"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                editable={!isEditingManualItem}
                style={[typography.body, { color: colors.foreground }]}
              />
            </View>
            <View style={{ flex: 1, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.md, backgroundColor: colors.card, paddingHorizontal: spacing.sm, minHeight: 48, justifyContent: "center" }}>
              <TextInput
                value={manualCarbs}
                onChangeText={setManualCarbs}
                placeholder="Carbs (g)"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                editable={!isEditingManualItem}
                style={[typography.body, { color: colors.foreground }]}
              />
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.md, backgroundColor: colors.card, paddingHorizontal: spacing.sm, minHeight: 48, justifyContent: "center" }}>
              <TextInput
                value={manualFat}
                onChangeText={setManualFat}
                placeholder="Fat (g)"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                editable={!isEditingManualItem}
                style={[typography.body, { color: colors.foreground }]}
              />
            </View>
            <View style={{ flex: 1, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.md, backgroundColor: colors.card, paddingHorizontal: spacing.sm, minHeight: 48, justifyContent: "center" }}>
              <TextInput
                value={manualFiber}
                onChangeText={setManualFiber}
                placeholder="Fiber (g)"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                editable={!isEditingManualItem}
                style={[typography.body, { color: colors.foreground }]}
              />
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.md, backgroundColor: colors.card, paddingHorizontal: spacing.sm, minHeight: 48, justifyContent: "center" }}>
              <TextInput
                value={manualSugar}
                onChangeText={setManualSugar}
                placeholder="Sugar (g)"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                editable={!isEditingManualItem}
                style={[typography.body, { color: colors.foreground }]}
              />
            </View>
            <View style={{ flex: 1 }} />
          </View>

          {isEditingManualItem ? (
            <Text style={[typography.caption, { color: colors.mutedForeground }]}>Macros are read-only here and update automatically as you change the weight.</Text>
          ) : null}

          <View
            style={{
              borderWidth: 1,
              borderColor: colors.cardBorder,
              borderRadius: radius.md,
              backgroundColor: colors.card,
              paddingHorizontal: spacing.sm,
              minHeight: 88,
              justifyContent: "center",
            }}
          >
            <TextInput
              value={manualNotes}
              onChangeText={setManualNotes}
              placeholder="Notes (optional)"
              placeholderTextColor={colors.muted}
              multiline
              style={[typography.body, { color: colors.foreground, minHeight: 68, textAlignVertical: "top", paddingTop: 8 }]}
            />
          </View>

          <View style={{ gap: spacing.xs, paddingBottom: insets.bottom + spacing.md }}>
            <Pressable
              onPress={() => saveManual(true)}
              disabled={savingId === "manual-item"}
              style={{
                minHeight: 46,
                borderRadius: radius.md,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.primary,
                opacity: savingId === "manual-item" ? 0.6 : 1,
              }}
            >
              {savingId === "manual-item" ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[typography.smallMedium, { color: "#fff" }]}>Save and use in daily log</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => saveManual(false)}
              disabled={savingId === "manual-item"}
              style={{
                minHeight: 46,
                borderRadius: radius.md,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: colors.cardBorder,
                backgroundColor: colors.card,
                opacity: savingId === "manual-item" ? 0.6 : 1,
              }}
            >
              <Text style={[typography.smallMedium, { color: colors.foreground }]}>Save only to library</Text>
            </Pressable>
          </View>
        </View>
      ) : (
      <FlatList
        data={results}
        keyExtractor={(item) => `${item.source}-${item.id}`}
        renderItem={({ item }) => (
          <FoodSearchCard
            item={item}
            loading={savingId === item.id}
            onSave={(it) => saveToLibrary(it, false)}
            onSaveAndUse={(it) => saveToLibrary(it, true)}
          />
        )}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.sm }}>
            <View
              style={{
                borderWidth: 1,
                borderColor: colors.cardBorder,
                borderRadius: radius.md,
                backgroundColor: colors.card,
                minHeight: 48,
                paddingHorizontal: spacing.sm,
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.xs,
              }}
            >
              <Search size={18} color={colors.mutedForeground} strokeWidth={2} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search food"
                placeholderTextColor={colors.muted}
                style={[typography.body, { flex: 1, color: colors.foreground }]}
              />
            </View>

            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                padding: spacing.sm,
                gap: spacing.xs,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                <Database size={14} color={colors.primary} strokeWidth={2} />
                <Text style={[typography.caption, { color: colors.mutedForeground }]}>Local library results are always shown first.</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                <Cloud size={14} color={colors.primary} strokeWidth={2} />
                <Text style={[typography.caption, { color: colors.mutedForeground }]}>Edamam calls are cached and tracked daily to save your free quota.</Text>
              </View>
              {usage ? (
                <Text style={[typography.caption, { color: colors.mutedForeground }]}>Edamam today: {usage.count} used{usage.remaining !== null ? ` · ${usage.remaining} remaining` : ""}</Text>
              ) : null}
            </View>

            <Pressable
              onPress={runRemoteSearch}
              disabled={!canRemoteSearch || searchingRemote}
              style={{
                minHeight: 46,
                borderRadius: radius.md,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.primary,
                opacity: !canRemoteSearch || searchingRemote ? 0.6 : 1,
              }}
            >
              {searchingRemote ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[typography.smallMedium, { color: "#fff" }]}>Search in Edamam / USDA</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => router.push({ pathname: "/nutrition/add-food", params: { mode: "manual" } })}
              style={{
                minHeight: 46,
                borderRadius: radius.md,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: colors.cardBorder,
                backgroundColor: colors.card,
              }}
            >
              <Text style={[typography.smallMedium, { color: colors.foreground }]}>Manual add</Text>
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xl, alignItems: "center", gap: spacing.xs }}>
            {searchingLocal ? <ActivityIndicator size="small" color={colors.primary} /> : null}
            <Text style={[typography.body, { color: colors.mutedForeground, textAlign: "center" }]}>No food in your library for this term. Use external search to fetch and save once.</Text>
          </View>
        }
        contentContainerStyle={{
          gap: spacing.sm,
          paddingBottom: insets.bottom + spacing.xl,
        }}
      />
      )}
    </View>
  );
}
