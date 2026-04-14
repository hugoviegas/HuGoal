import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  Image,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import {
  ChevronLeft,
  Search,
  Database,
  Cloud,
  Flame,
  Zap,
  Wheat,
  Droplets,
  Leaf,
  Candy,
  Sparkles,
  ImagePlus,
  X,
  ChevronDown,
  ChevronUp,
  Plus,
  Camera,
  Sun,
  UtensilsCrossed,
} from "lucide-react-native";

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
import { analyzeMealPhoto } from "@/lib/nutrition-ai";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { radius } from "@/constants/radius";
import type { NutritionItem } from "@/types";

// ─── Design tokens ──────────────────────────────────────────────────────────
const MACRO_COLORS = {
  calories: "#f97316",
  protein: "#3b82f6",
  carbs: "#eab308",
  fat: "#ef4444",
  fiber: "#22c55e",
  sugar: "#a855f7",
} as const;

// ─── Helpers ────────────────────────────────────────────────────────────────
type AddFoodMode = "pick" | "library" | "manual";
type ServingUnit = "g" | "ml" | "unit";

function toSafeString(value: number | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "0";
  return String(value);
}

function parsePositiveNumber(value: string, fallback = 0): number {
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.round(parsed * 100) / 100);
}

function scaleNutritionValue(
  baseValue: number | undefined,
  ratio: number,
): number {
  if (typeof baseValue !== "number" || !Number.isFinite(baseValue)) return 0;
  return Math.max(0, Math.round(baseValue * ratio));
}

function buildScaledNutritionItem(
  baseItem: NutritionItem,
  servingSize: number,
): NutritionItem {
  const baseServing =
    baseItem.serving_size_g > 0 ? baseItem.serving_size_g : 100;
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

// ─── FoodSearchCard ─────────────────────────────────────────────────────────
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
  const macroTotal = item.protein_g + item.carbs_g + item.fat_g;

  const sourceLabel =
    item.source === "library"
      ? "Library"
      : item.source === "edamam"
        ? "Edamam"
        : "USDA";

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        padding: spacing.sm,
        gap: spacing.sm,
      }}
    >
      {/* Top row */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        {/* Fallback icon (no photo on FoodSearchResult) */}
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <UtensilsCrossed size={22} color={colors.muted} />
        </View>

        <View style={{ flex: 1, gap: 3 }}>
          <Text
            style={[typography.bodyMedium, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            <Text
              style={[typography.caption, { color: colors.mutedForeground }]}
            >
              {item.serving_size_g}g
            </Text>
            <View
              style={{
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: radius.full,
                backgroundColor: `${colors.primary}1A`,
              }}
            >
              <Text
                style={{ fontSize: 11, fontWeight: "600", color: colors.primary }}
              >
                {sourceLabel}
              </Text>
            </View>
          </View>
        </View>

        <Text
          style={[typography.bodyMedium, { color: MACRO_COLORS.calories }]}
        >
          {item.calories} kcal
        </Text>
      </View>

      {/* Macro mini-bars */}
      {macroTotal > 0 ? (
        <View style={{ flexDirection: "row", height: 4, gap: 1 }}>
          {[
            { color: MACRO_COLORS.protein, value: item.protein_g },
            { color: MACRO_COLORS.carbs, value: item.carbs_g },
            { color: MACRO_COLORS.fat, value: item.fat_g },
          ].map((seg, i) =>
            seg.value > 0 ? (
              <View
                key={i}
                style={{
                  flex: Math.max(4, (seg.value / macroTotal) * 100),
                  height: 4,
                  backgroundColor: seg.color,
                  borderRadius: 2,
                }}
              />
            ) : null,
          )}
        </View>
      ) : null}

      {/* Actions */}
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
          accessibilityRole="button"
        >
          <Text
            style={[typography.smallMedium, { color: colors.foreground }]}
          >
            Save to library
          </Text>
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
          accessibilityRole="button"
        >
          <Text style={[typography.smallMedium, { color: "#fff" }]}>
            Save and use
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Section header ──────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  const colors = useThemeStore((s) => s.colors);
  return (
    <Text
      style={[
        typography.smallMedium,
        {
          color: colors.mutedForeground,
          marginBottom: spacing.xs,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          fontSize: 11,
        },
      ]}
    >
      {title}
    </Text>
  );
}

// ─── Input wrapper ────────────────────────────────────────────────────────────
function FieldBox({
  borderColor,
  children,
}: {
  borderColor?: string;
  children: React.ReactNode;
}) {
  const colors = useThemeStore((s) => s.colors);
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.cardBorder,
        borderLeftWidth: borderColor ? 3 : 1,
        borderLeftColor: borderColor ?? colors.cardBorder,
        borderRadius: radius.md,
        backgroundColor: colors.card,
        paddingHorizontal: spacing.sm,
        minHeight: 48,
        justifyContent: "center",
      }}
    >
      {children}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
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
  const profile = useAuthStore((s) => s.profile);
  const colors = useThemeStore((s) => s.colors);
  const showToast = useToastStore((s) => s.show);
  const selectedFoodSelection = useNutritionStore(
    (s) => s.selectedFoodSelection,
  );
  const setSelectedFoodSelection = useNutritionStore(
    (s) => s.setSelectedFoodSelection,
  );

  // ── Manual mode state ──────────────────────────────────────────────────────
  const [manualFoodName, setManualFoodName] = useState("");
  const [manualBrand, setManualBrand] = useState("");
  const [manualServingSize, setManualServingSize] = useState("100");
  const [manualUnit, setManualUnit] = useState<ServingUnit>("g");
  const [manualCalories, setManualCalories] = useState("0");
  const [manualProtein, setManualProtein] = useState("0");
  const [manualCarbs, setManualCarbs] = useState("0");
  const [manualFat, setManualFat] = useState("0");
  const [manualFiber, setManualFiber] = useState("0");
  const [manualSugar, setManualSugar] = useState("0");
  const [manualNotes, setManualNotes] = useState("");
  const [manualPhotoUri, setManualPhotoUri] = useState<string | undefined>(undefined);
  const [manualReferenceItem, setManualReferenceItem] =
    useState<NutritionItem | null>(null);

  const [extraExpanded, setExtraExpanded] = useState(false);
  const [aiFillBannerVisible, setAiFillBannerVisible] = useState(false);
  const [aiTipsVisible, setAiTipsVisible] = useState(false);
  const [aiFillingManual, setAiFillingManual] = useState(false);

  // ── Library/pick mode state ────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [searchingLocal, setSearchingLocal] = useState(false);
  const [searchingRemote, setSearchingRemote] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [usage, setUsage] = useState<{
    count: number;
    limit: number;
    remaining: number | null;
  } | null>(null);

  const canRemoteSearch = useMemo(
    () => query.trim().length >= 2,
    [query],
  );

  const loadUsage = useCallback(async () => {
    const info = await getEdamamUsageToday();
    setUsage(info);
  }, []);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  // Populate manual fields from selectedFoodSelection (edit mode)
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
      setManualPhotoUri(undefined);
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
    setManualPhotoUri(item.photo_url);
  }, [mode, selectedFoodSelection]);

  const isEditingManualItem =
    mode === "manual" &&
    Boolean(
      manualReferenceItem && selectedFoodSelection?.editIndex !== null,
    );

  // Auto-scale macros when editing and serving size changes
  useEffect(() => {
    if (!isEditingManualItem || !manualReferenceItem) return;
    const servingSize = parsePositiveNumber(
      manualServingSize,
      manualReferenceItem.serving_size_g || 100,
    );
    const scaled = buildScaledNutritionItem(manualReferenceItem, servingSize);
    setManualCalories(toSafeString(scaled.calories));
    setManualProtein(toSafeString(scaled.protein_g));
    setManualCarbs(toSafeString(scaled.carbs_g));
    setManualFat(toSafeString(scaled.fat_g));
    setManualFiber(toSafeString(scaled.fiber_g));
    setManualSugar(toSafeString(scaled.sugar_g));
  }, [isEditingManualItem, manualReferenceItem, manualServingSize]);

  // ── Library search ─────────────────────────────────────────────────────────
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
      const remote = await searchFoods(user.uid, query, 20, {
        forceRemote: true,
      });
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

  const saveToLibrary = async (
    result: FoodSearchResult,
    alsoUse: boolean,
  ) => {
    if (!user?.uid) return;
    try {
      setSavingId(result.id);
      const item = toNutritionItemFromSearch(result);
      await upsertFoodLibraryItemFromNutritionItem(user.uid, item);
      if (alsoUse && (mode === "pick" || mode === "library")) {
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

  // ── Manual item build ──────────────────────────────────────────────────────
  const buildManualItem = (): NutritionItem | null => {
    const name = manualFoodName.trim();
    if (!name) return null;
    const servingSize = parsePositiveNumber(
      manualServingSize,
      manualReferenceItem?.serving_size_g ?? 100,
    );
    const derived =
      manualReferenceItem && isEditingManualItem
        ? buildScaledNutritionItem(manualReferenceItem, servingSize)
        : null;

    return {
      food_name: name,
      brand: manualBrand.trim() || undefined,
      notes: manualNotes.trim() || undefined,
      serving_size_g: servingSize,
      calories: derived
        ? derived.calories
        : parsePositiveNumber(manualCalories, 0),
      protein_g: derived
        ? derived.protein_g
        : parsePositiveNumber(manualProtein, 0),
      carbs_g: derived
        ? derived.carbs_g
        : parsePositiveNumber(manualCarbs, 0),
      fat_g: derived ? derived.fat_g : parsePositiveNumber(manualFat, 0),
      fiber_g: derived
        ? derived.fiber_g
        : parsePositiveNumber(manualFiber, 0),
      sugar_g: derived
        ? derived.sugar_g
        : parsePositiveNumber(manualSugar, 0),
      source: "manual",
      photo_url: manualPhotoUri,
      // TODO: upload to Firebase Storage
    };
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

  // ── AI fill for manual form ────────────────────────────────────────────────
  const runAIFill = async (source: "camera" | "library") => {
    setAiTipsVisible(false);
    try {
      let base64: string | null | undefined = null;

      if (source === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          showToast("Camera permission denied", "error");
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          allowsEditing: false,
          quality: 0.85,
          base64: true,
        });
        if (result.canceled || !result.assets[0]) return;
        base64 = result.assets[0].base64;
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          showToast("Gallery permission denied", "error");
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: false,
          quality: 0.85,
          base64: true,
        });
        if (result.canceled || !result.assets[0]) return;
        base64 = result.assets[0].base64;
      }

      if (!base64) {
        showToast("Could not read selected image", "error");
        return;
      }

      setAiFillingManual(true);
      const provider = profile?.preferred_ai_provider ?? "gemini";
      const detected = await analyzeMealPhoto(provider, base64);

      if (!detected.length) {
        showToast("No foods detected in image", "info");
        return;
      }

      const fillFromItem = (foodItem: NutritionItem) => {
        setManualFoodName(foodItem.food_name);
        setManualBrand(foodItem.brand ?? "");
        setManualServingSize(toSafeString(foodItem.serving_size_g));
        setManualCalories(toSafeString(foodItem.calories));
        setManualProtein(toSafeString(foodItem.protein_g));
        setManualCarbs(toSafeString(foodItem.carbs_g));
        setManualFat(toSafeString(foodItem.fat_g));
        setManualFiber(toSafeString(foodItem.fiber_g));
        setManualSugar(toSafeString(foodItem.sugar_g));
        setManualNotes(foodItem.notes ?? "");
        setAiFillBannerVisible(true);
      };

      if (detected.length === 1) {
        fillFromItem(detected[0]);
      } else {
        Alert.alert(
          "Multiple foods detected",
          "Which item would you like to fill with?",
          [
            ...detected.map((foodItem) => ({
              text: foodItem.food_name,
              onPress: () => fillFromItem(foodItem),
            })),
            { text: "Cancel", style: "cancel" as const },
          ],
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to analyze image";
      if (message.toLowerCase().includes("no api key configured")) {
        showToast("Add your AI key in Settings > AI Provider Keys", "info");
        router.push("/settings/ai-keys");
        return;
      }
      showToast(message, "error");
    } finally {
      setAiFillingManual(false);
    }
  };

  const handlePickManualPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setManualPhotoUri(result.assets[0].uri);
      // TODO: upload to Firebase Storage
    }
  };

  // ─── Manual mode UI ─────────────────────────────────────────────────────
  if (mode === "manual") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
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
            style={{
              width: 36,
              height: 36,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronLeft size={24} color={colors.foreground} strokeWidth={2} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[typography.h3, { color: colors.foreground }]}>
              {isEditingManualItem ? "Edit food" : "Add food manually"}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.md,
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + spacing.xl,
            gap: spacing.md,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* AI fill banner */}
          {aiFillBannerVisible ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: `${colors.primary}1A`,
                borderRadius: radius.md,
                padding: spacing.sm,
                gap: spacing.sm,
              }}
            >
              <Sparkles size={16} color={colors.primary} />
              <Text
                style={[
                  typography.small,
                  { color: colors.primary, flex: 1 },
                ]}
              >
                Filled by AI — please review values before saving.
              </Text>
              <Pressable
                onPress={() => setAiFillBannerVisible(false)}
                hitSlop={8}
              >
                <X size={16} color={colors.primary} />
              </Pressable>
            </View>
          ) : null}

          {/* Photo field */}
          <View style={{ alignItems: "center" }}>
            <Pressable
              onPress={handlePickManualPhoto}
              style={{
                width: 80,
                height: 80,
                borderRadius: radius.md,
                borderWidth: 1.5,
                borderStyle: "dashed",
                borderColor: colors.cardBorder,
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                backgroundColor: colors.card,
              }}
              accessibilityRole="button"
              accessibilityLabel="Add food photo"
            >
              {manualPhotoUri ? (
                <>
                  <Image
                    source={{ uri: manualPhotoUri }}
                    style={{ width: 80, height: 80 }}
                  />
                  <Pressable
                    onPress={() => setManualPhotoUri(undefined)}
                    hitSlop={4}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: "rgba(0,0,0,0.55)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <X size={11} color="#fff" />
                  </Pressable>
                </>
              ) : (
                <View style={{ alignItems: "center", gap: 4 }}>
                  <ImagePlus size={24} color={colors.muted} />
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Add photo
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Section: Identification */}
          <View style={{ gap: spacing.xs }}>
            <SectionHeader title="Identification" />

            {/* Food name */}
            <FieldBox>
              <TextInput
                value={manualFoodName}
                onChangeText={setManualFoodName}
                placeholder="Food name *"
                placeholderTextColor={colors.muted}
                style={[typography.body, { color: colors.foreground }]}
                accessibilityLabel="Food name (required)"
              />
            </FieldBox>

            {/* Brand */}
            <FieldBox>
              <TextInput
                value={manualBrand}
                onChangeText={setManualBrand}
                placeholder="Brand (optional)"
                placeholderTextColor={colors.muted}
                style={[typography.body, { color: colors.foreground }]}
              />
            </FieldBox>

            {/* Fill with AI button */}
            <Pressable
              onPress={() => setAiTipsVisible(true)}
              disabled={aiFillingManual}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: spacing.xs,
                minHeight: 44,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.primary,
                backgroundColor: `${colors.primary}1A`,
                opacity: aiFillingManual ? 0.6 : 1,
              }}
              accessibilityRole="button"
            >
              {aiFillingManual ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Sparkles size={16} color={colors.primary} />
              )}
              <Text
                style={[typography.smallMedium, { color: colors.primary }]}
              >
                {aiFillingManual ? "Analyzing..." : "Fill with AI"}
              </Text>
            </Pressable>
          </View>

          {/* Section: Serving */}
          <View style={{ gap: spacing.xs }}>
            <SectionHeader title="Serving" />
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <View style={{ flex: 2 }}>
                <FieldBox>
                  <TextInput
                    value={manualServingSize}
                    onChangeText={setManualServingSize}
                    placeholder="Amount"
                    placeholderTextColor={colors.muted}
                    keyboardType="decimal-pad"
                    style={[typography.body, { color: colors.foreground }]}
                    accessibilityLabel="Serving amount"
                  />
                </FieldBox>
              </View>
              {/* Unit selector pills */}
              <View
                style={{
                  flex: 3,
                  flexDirection: "row",
                  gap: spacing.xs,
                  alignItems: "center",
                }}
              >
                {(["g", "ml", "unit"] as ServingUnit[]).map((u) => (
                  <Pressable
                    key={u}
                    onPress={() => setManualUnit(u)}
                    style={{
                      flex: 1,
                      minHeight: 48,
                      borderRadius: radius.md,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor:
                        manualUnit === u ? colors.primary : colors.card,
                      borderWidth: 1,
                      borderColor:
                        manualUnit === u ? colors.primary : colors.cardBorder,
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: manualUnit === u }}
                  >
                    <Text
                      style={[
                        typography.smallMedium,
                        {
                          color:
                            manualUnit === u ? "#fff" : colors.foreground,
                        },
                      ]}
                    >
                      {u}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          {/* Section: Macronutrients */}
          <View style={{ gap: spacing.xs }}>
            <SectionHeader title="Macronutrients" />
            {isEditingManualItem ? (
              <Text
                style={[
                  typography.caption,
                  { color: colors.mutedForeground },
                ]}
              >
                Macros update automatically from serving weight.
              </Text>
            ) : null}

            {/* 2-column grid */}
            <View style={{ gap: spacing.sm }}>
              {[
                [
                  {
                    label: "Calories",
                    value: manualCalories,
                    set: setManualCalories,
                    color: MACRO_COLORS.calories,
                    icon: <Flame size={16} color={MACRO_COLORS.calories} />,
                    placeholder: "kcal",
                  },
                  {
                    label: "Protein",
                    value: manualProtein,
                    set: setManualProtein,
                    color: MACRO_COLORS.protein,
                    icon: <Zap size={16} color={MACRO_COLORS.protein} />,
                    placeholder: "g",
                  },
                ],
                [
                  {
                    label: "Carbs",
                    value: manualCarbs,
                    set: setManualCarbs,
                    color: MACRO_COLORS.carbs,
                    icon: <Wheat size={16} color={MACRO_COLORS.carbs} />,
                    placeholder: "g",
                  },
                  {
                    label: "Fat",
                    value: manualFat,
                    set: setManualFat,
                    color: MACRO_COLORS.fat,
                    icon: <Droplets size={16} color={MACRO_COLORS.fat} />,
                    placeholder: "g",
                  },
                ],
              ].map((row, ri) => (
                <View
                  key={ri}
                  style={{ flexDirection: "row", gap: spacing.sm }}
                >
                  {row.map((field) => (
                    <View key={field.label} style={{ flex: 1 }}>
                      <View
                        style={{
                          borderWidth: 1,
                          borderLeftWidth: 3,
                          borderColor: colors.cardBorder,
                          borderLeftColor: field.color,
                          borderRadius: radius.md,
                          backgroundColor: colors.card,
                          paddingHorizontal: spacing.sm,
                          paddingVertical: spacing.xs,
                          gap: 2,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {field.icon}
                          <Text
                            style={[
                              typography.caption,
                              { color: colors.mutedForeground },
                            ]}
                          >
                            {field.label}
                          </Text>
                        </View>
                        <TextInput
                          value={field.value}
                          onChangeText={field.set}
                          keyboardType="decimal-pad"
                          editable={!isEditingManualItem}
                          style={[
                            typography.bodyMedium,
                            {
                              color: colors.foreground,
                              opacity: isEditingManualItem ? 0.55 : 1,
                            },
                          ]}
                          placeholder={field.placeholder}
                          placeholderTextColor={colors.muted}
                          accessibilityLabel={field.label}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>

          {/* Section: Extra (collapsible) */}
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.cardBorder,
              borderRadius: radius.lg,
              overflow: "hidden",
              backgroundColor: colors.card,
            }}
          >
            <Pressable
              onPress={() => setExtraExpanded((v) => !v)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                gap: spacing.sm,
              }}
              accessibilityRole="button"
              accessibilityLabel="Toggle extra fields"
            >
              <Text
                style={[
                  typography.smallMedium,
                  { color: colors.foreground, flex: 1 },
                ]}
              >
                Extra
              </Text>
              {extraExpanded ? (
                <ChevronUp size={18} color={colors.mutedForeground} />
              ) : (
                <ChevronDown size={18} color={colors.mutedForeground} />
              )}
            </Pressable>

            {extraExpanded ? (
              <View
                style={{
                  paddingHorizontal: spacing.md,
                  paddingBottom: spacing.md,
                  gap: spacing.sm,
                  borderTopWidth: 1,
                  borderTopColor: colors.cardBorder,
                }}
              >
                {/* Fiber */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.sm,
                    borderWidth: 1,
                    borderLeftWidth: 3,
                    borderColor: colors.cardBorder,
                    borderLeftColor: MACRO_COLORS.fiber,
                    borderRadius: radius.md,
                    backgroundColor: colors.background,
                    paddingHorizontal: spacing.sm,
                    minHeight: 48,
                  }}
                >
                  <Leaf size={16} color={MACRO_COLORS.fiber} />
                  <TextInput
                    value={manualFiber}
                    onChangeText={setManualFiber}
                    placeholder="Fiber (g)"
                    placeholderTextColor={colors.muted}
                    keyboardType="decimal-pad"
                    editable={!isEditingManualItem}
                    style={[typography.body, { flex: 1, color: colors.foreground }]}
                  />
                </View>
                {/* Sugar */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.sm,
                    borderWidth: 1,
                    borderLeftWidth: 3,
                    borderColor: colors.cardBorder,
                    borderLeftColor: MACRO_COLORS.sugar,
                    borderRadius: radius.md,
                    backgroundColor: colors.background,
                    paddingHorizontal: spacing.sm,
                    minHeight: 48,
                  }}
                >
                  <Candy size={16} color={MACRO_COLORS.sugar} />
                  <TextInput
                    value={manualSugar}
                    onChangeText={setManualSugar}
                    placeholder="Sugar (g)"
                    placeholderTextColor={colors.muted}
                    keyboardType="decimal-pad"
                    editable={!isEditingManualItem}
                    style={[typography.body, { flex: 1, color: colors.foreground }]}
                  />
                </View>
                {/* Notes */}
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    borderRadius: radius.md,
                    backgroundColor: colors.background,
                    paddingHorizontal: spacing.sm,
                    minHeight: 88,
                    justifyContent: "flex-start",
                    paddingTop: spacing.sm,
                  }}
                >
                  <TextInput
                    value={manualNotes}
                    onChangeText={setManualNotes}
                    placeholder="Notes (optional)"
                    placeholderTextColor={colors.muted}
                    multiline
                    style={[
                      typography.body,
                      {
                        color: colors.foreground,
                        minHeight: 68,
                        textAlignVertical: "top",
                      },
                    ]}
                  />
                </View>
              </View>
            ) : null}
          </View>

          {/* Save buttons */}
          <View style={{ gap: spacing.xs }}>
            <Pressable
              onPress={() => saveManual(true)}
              disabled={savingId === "manual-item"}
              style={{
                minHeight: 48,
                borderRadius: radius.md,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.primary,
                opacity: savingId === "manual-item" ? 0.6 : 1,
              }}
              accessibilityRole="button"
            >
              {savingId === "manual-item" ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text
                  style={[
                    typography.bodyMedium,
                    { color: colors.primaryForeground },
                  ]}
                >
                  Save and use in daily log
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => saveManual(false)}
              disabled={savingId === "manual-item"}
              style={{
                minHeight: 48,
                borderRadius: radius.md,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: colors.cardBorder,
                backgroundColor: colors.card,
                opacity: savingId === "manual-item" ? 0.6 : 1,
              }}
              accessibilityRole="button"
            >
              <Text
                style={[typography.smallMedium, { color: colors.foreground }]}
              >
                Save only to library
              </Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* AI photo tips modal */}
        <Modal
          visible={aiTipsVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setAiTipsVisible(false)}
        >
          <View style={{ flex: 1, justifyContent: "flex-end" }}>
            <Pressable
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.4)",
              }}
              onPress={() => setAiTipsVisible(false)}
            />
            <View
              style={{
                backgroundColor: colors.background,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: spacing.xl,
                paddingBottom: insets.bottom + spacing.xl,
                gap: spacing.lg,
              }}
            >
              <View style={{ alignItems: "center", marginTop: -spacing.md }}>
                <View
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: colors.muted,
                  }}
                />
              </View>
              <Text style={[typography.h3, { color: colors.foreground }]}>
                Photo tips for best results
              </Text>
              {[
                { icon: <Camera size={20} color={colors.primary} />, tip: "Lay food flat or at eye level" },
                { icon: <Sun size={20} color={colors.primary} />, tip: "Good lighting, no blur" },
                { icon: <UtensilsCrossed size={20} color={colors.primary} />, tip: "One plate at a time" },
              ].map((row, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.md,
                  }}
                >
                  {row.icon}
                  <Text
                    style={[
                      typography.body,
                      { color: colors.foreground, flex: 1 },
                    ]}
                  >
                    {row.tip}
                  </Text>
                </View>
              ))}
              <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
                <Pressable
                  onPress={() => runAIFill("camera")}
                  style={{
                    minHeight: 48,
                    borderRadius: radius.md,
                    backgroundColor: colors.primary,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      typography.bodyMedium,
                      { color: colors.primaryForeground },
                    ]}
                  >
                    Take photo
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => runAIFill("library")}
                  style={{
                    minHeight: 48,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    backgroundColor: colors.card,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  accessibilityRole="button"
                >
                  <Text
                    style={[typography.bodyMedium, { color: colors.foreground }]}
                  >
                    Choose from gallery
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setAiTipsVisible(false)}
                  style={{
                    alignItems: "center",
                    paddingVertical: spacing.sm,
                  }}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      typography.body,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Cancel
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ─── Library / pick mode UI ───────────────────────────────────────────────
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
          style={{
            width: 36,
            height: 36,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ChevronLeft size={24} color={colors.foreground} strokeWidth={2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[typography.h3, { color: colors.foreground }]}>
            Search food
          </Text>
          <Text
            style={[typography.caption, { color: colors.mutedForeground }]}
          >
            Library first — external search when needed
          </Text>
        </View>
      </View>

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
          <View
            style={{
              paddingHorizontal: spacing.md,
              paddingTop: spacing.md,
              gap: spacing.sm,
              paddingBottom: spacing.sm,
            }}
          >
            {/* Search input */}
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
              <Search
                size={18}
                color={colors.mutedForeground}
                strokeWidth={2}
              />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search food"
                placeholderTextColor={colors.muted}
                style={[
                  typography.body,
                  { flex: 1, color: colors.foreground },
                ]}
              />
            </View>

            {/* Usage info */}
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
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.xs,
                }}
              >
                <Database size={14} color={colors.primary} strokeWidth={2} />
                <Text
                  style={[
                    typography.caption,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Local library results are always shown first.
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.xs,
                }}
              >
                <Cloud size={14} color={colors.primary} strokeWidth={2} />
                <Text
                  style={[
                    typography.caption,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Edamam calls are cached and tracked daily to save your free quota.
                </Text>
              </View>
              {usage ? (
                <Text
                  style={[typography.caption, { color: colors.mutedForeground }]}
                >
                  Edamam today: {usage.count} used
                  {usage.remaining !== null
                    ? ` · ${usage.remaining} remaining`
                    : ""}
                </Text>
              ) : null}
            </View>

            {/* Remote search button */}
            <Pressable
              onPress={runRemoteSearch}
              disabled={!canRemoteSearch || searchingRemote}
              style={{
                minHeight: 46,
                borderRadius: radius.md,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.primary,
                opacity:
                  !canRemoteSearch || searchingRemote ? 0.6 : 1,
              }}
              accessibilityRole="button"
            >
              {searchingRemote ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text
                  style={[typography.smallMedium, { color: "#fff" }]}
                >
                  Search in Edamam / USDA
                </Text>
              )}
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          <View
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xl,
              alignItems: "center",
              gap: spacing.xs,
            }}
          >
            {searchingLocal ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : null}
            <Text
              style={[
                typography.body,
                { color: colors.mutedForeground, textAlign: "center" },
              ]}
            >
              No food in your library for this term. Use external search to
              fetch and save once.
            </Text>
          </View>
        }
        contentContainerStyle={{
          gap: spacing.sm,
          paddingHorizontal: spacing.md,
          paddingBottom: insets.bottom + 80,
        }}
      />

      {/* Sticky "Add manually" button */}
      <View
        style={{
          position: "absolute",
          bottom: insets.bottom + 16,
          left: spacing.md,
          right: spacing.md,
        }}
      >
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/nutrition/add-food",
              params: { mode: "manual" },
            })
          }
          style={{
            minHeight: 48,
            borderRadius: radius.md,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: spacing.xs,
            backgroundColor: colors.primary,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 4,
          }}
          accessibilityRole="button"
          accessibilityLabel="Add food manually"
        >
          <Plus size={18} color={colors.primaryForeground} />
          <Text
            style={[
              typography.bodyMedium,
              { color: colors.primaryForeground },
            ]}
          >
            Add manually
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// TEST:
// 1. mode=manual: form sections render (Identification, Serving, Macronutrients, Extra)
// 2. Extra section: collapsed by default; ChevronDown toggle reveals Fiber/Sugar/Notes
// 3. Photo field: tapping opens library picker; thumbnail shown with X to clear
// 4. Fill with AI → tips modal → camera or gallery → detected items fill fields
// 5. AI single result → auto-fills + dismissible "Filled by AI" banner
// 6. AI multiple results → Alert for user to pick one
// 7. Serving unit pill selector: g / ml / unit (active state)
// 8. isEditingManualItem: macros auto-update on serving size change; inputs are read-only
// 9. "Save and use in daily log" → saves to library + selects + navigates back
// 10. mode=library / pick: FoodSearchCard list with mini-bars, source badge
// 11. Sticky "Add manually" button at bottom; navigates to mode=manual
// 12. Remote search button (Edamam/USDA) populates list; usage counter updates
// 13. No emoji anywhere in UI; all icons from lucide-react-native
