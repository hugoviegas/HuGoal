// CLEANUP: Replaces components/nutrition/FoodRow.tsx (via FoodItemCard)
//          Inlines NutritionDisclaimer (previously components/nutrition/NutritionDisclaimer.tsx)

import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  Animated,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronLeft,
  Plus,
  Search,
  Sparkles,
  Flame,
  Zap,
  Wheat,
  Droplets,
  Camera,
  Sun,
  UtensilsCrossed,
} from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";

import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import { useNutritionStore } from "@/stores/nutrition.store";

import { FoodItemCard } from "@/components/nutrition/FoodItemCard";
import { NutritionTableModal } from "@/components/nutrition/NutritionTableModal";
import { Button } from "@/components/ui/Button";

import {
  createNutritionLog,
  upsertFoodLibraryItemFromNutritionItem,
} from "@/lib/firestore/nutrition";
import { analyzeMealPhoto } from "@/lib/nutrition-ai";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { radius } from "@/constants/radius";
import type { MealType, NutritionItem } from "@/types";

// ─── Design tokens ──────────────────────────────────────────────────────────
const MACRO_COLORS = {
  calories: "#f97316",
  protein: "#3b82f6",
  carbs: "#eab308",
  fat: "#ef4444",
  fiber: "#22c55e",
  sugar: "#a855f7",
} as const;

const MEAL_OPTIONS: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
  { value: "pre_workout", label: "Pre-Workout" },
  { value: "post_workout", label: "Post-Workout" },
];

// ─── Component ──────────────────────────────────────────────────────────────
export default function LogFoodScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mealType: mealTypeParam } = useLocalSearchParams<{
    mealType?: MealType;
  }>();

  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const showToast = useToastStore((s) => s.show);
  const colors = useThemeStore((s) => s.colors);
  const addLog = useNutritionStore((s) => s.addLog);
  const consumeSelectedFoodSelection = useNutritionStore(
    (s) => s.consumeSelectedFoodSelection,
  );
  const setSelectedFoodSelection = useNutritionStore(
    (s) => s.setSelectedFoodSelection,
  );

  const [selectedMealType, setSelectedMealType] = useState<MealType>(
    mealTypeParam ?? "breakfast",
  );
  const [items, setItems] = useState<NutritionItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [analyzingAI, setAnalyzingAI] = useState(false);

  // AI photo tips guide modal
  const [aiTipsVisible, setAiTipsVisible] = useState(false);

  // Nutrition table modal state
  const [tableModal, setTableModal] = useState<{
    visible: boolean;
    item: NutritionItem | null;
    itemIndex: number | null;
  }>({ visible: false, item: null, itemIndex: null });

  // Animated macro summary strip
  const summaryOpacity = useRef(new Animated.Value(0)).current;
  const summaryTranslateY = useRef(new Animated.Value(-16)).current;

  // Skeleton overlay opacity loop
  const skeletonOpacity = useRef(new Animated.Value(0.3)).current;
  const skeletonAnim = useRef<Animated.CompositeAnimation | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  // Animate macro strip in when first item is added, out when last is removed
  useEffect(() => {
    if (items.length === 1) {
      Animated.parallel([
        Animated.spring(summaryOpacity, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 8,
        }),
        Animated.spring(summaryTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 8,
        }),
      ]).start();
    } else if (items.length === 0) {
      summaryOpacity.setValue(0);
      summaryTranslateY.setValue(-16);
    }
  }, [items.length, summaryOpacity, summaryTranslateY]);

  // Skeleton pulse while analyzing
  useEffect(() => {
    if (analyzingAI) {
      skeletonOpacity.setValue(0.3);
      skeletonAnim.current = Animated.loop(
        Animated.sequence([
          Animated.timing(skeletonOpacity, {
            toValue: 0.85,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(skeletonOpacity, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      );
      skeletonAnim.current.start();
    } else {
      skeletonAnim.current?.stop();
      skeletonOpacity.setValue(0);
    }
    return () => skeletonAnim.current?.stop();
  }, [analyzingAI, skeletonOpacity]);

  // Consume food selection from add-food screen on focus
  useFocusEffect(
    useCallback(() => {
      const selection = consumeSelectedFoodSelection();
      if (!selection) return;

      if (selection.editIndex === null) {
        setItems((prev) => [...prev, selection.item]);
        // Scroll to bottom after state updates
        setTimeout(
          () => scrollViewRef.current?.scrollToEnd({ animated: true }),
          100,
        );
      } else {
        setItems((prev) =>
          prev.map((item, index) =>
            index === selection.editIndex ? selection.item : item,
          ),
        );
      }
    }, [consumeSelectedFoodSelection]),
  );

  const totalCals = items.reduce((s, i) => s + i.calories, 0);
  const totalProtein = items.reduce((s, i) => s + i.protein_g, 0);
  const totalCarbs = items.reduce((s, i) => s + i.carbs_g, 0);
  const totalFat = items.reduce((s, i) => s + i.fat_g, 0);

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditItem = (item: NutritionItem, index: number) => {
    setSelectedFoodSelection(item, index);
    router.push({ pathname: "/nutrition/add-food", params: { mode: "manual" } });
  };

  const handleViewTable = (item: NutritionItem) => {
    const index = items.indexOf(item);
    setTableModal({ visible: true, item, itemIndex: index });
  };

  const handleTableSave = (updatedItem: NutritionItem, index: number) => {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? updatedItem : it)),
    );
  };

  const handleSave = async () => {
    if (!user?.uid || items.length === 0) return;
    try {
      setSaving(true);
      const log = await createNutritionLog(user.uid, {
        meal_type: selectedMealType,
        items,
      });
      await Promise.allSettled(
        items.map((item) =>
          upsertFoodLibraryItemFromNutritionItem(user.uid!, item),
        ),
      );
      addLog(log);
      showToast("Meal logged successfully", "success");
      router.back();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save meal";
      console.error("[nutrition/log] save failed", error);
      showToast(message || "Failed to save meal", "error");
    } finally {
      setSaving(false);
    }
  };

  const runAIAnalysis = async (source: "camera" | "library") => {
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

      setAnalyzingAI(true);
      const provider = profile?.preferred_ai_provider ?? "gemini";
      const detected = await analyzeMealPhoto(provider, base64);

      if (!detected.length) {
        showToast("No foods detected in image", "info");
        return;
      }

      setItems((prev) => [...prev, ...detected]);
      showToast(
        `${detected.length} AI item(s) added. Review before saving.`,
        "success",
      );
      setTimeout(
        () => scrollViewRef.current?.scrollToEnd({ animated: true }),
        150,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to analyze meal image";

      if (message.toLowerCase().includes("no api key configured")) {
        showToast("Add your AI key in Settings > AI Provider Keys", "info");
        router.push("/settings/ai-keys");
        return;
      }

      showToast(message, "error");
    } finally {
      setAnalyzingAI(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Header ── */}
      <View
        style={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.sm,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.xs,
          borderBottomWidth: 1,
          borderBottomColor: colors.cardBorder,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <ChevronLeft size={24} color={colors.foreground} strokeWidth={2} />
        </Pressable>
        <Text style={[typography.h3, { color: colors.foreground, flex: 1 }]}>
          Log Food
        </Text>
        <Button
          size="sm"
          onPress={handleSave}
          disabled={items.length === 0 || saving}
          isLoading={saving}
        >
          Save
        </Button>
      </View>

      {/* ── Animated macro summary strip ── */}
      {items.length > 0 ? (
        <Animated.View
          style={{
            opacity: summaryOpacity,
            transform: [{ translateY: summaryTranslateY }],
            flexDirection: "row",
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
            gap: spacing.xs,
            borderBottomWidth: 1,
            borderBottomColor: colors.cardBorder,
            flexWrap: "wrap",
          }}
        >
          {[
            { icon: <Flame size={14} color={MACRO_COLORS.calories} />, value: `${totalCals}`, color: MACRO_COLORS.calories },
            { icon: <Zap size={14} color={MACRO_COLORS.protein} />, value: `${totalProtein}g`, color: MACRO_COLORS.protein },
            { icon: <Wheat size={14} color={MACRO_COLORS.carbs} />, value: `${totalCarbs}g`, color: MACRO_COLORS.carbs },
            { icon: <Droplets size={14} color={MACRO_COLORS.fat} />, value: `${totalFat}g`, color: MACRO_COLORS.fat },
          ].map((pill, i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: spacing.sm,
                paddingVertical: 5,
                borderRadius: radius.full,
                backgroundColor: `${pill.color}26`,
              }}
            >
              {pill.icon}
              <Text
                style={[
                  typography.smallMedium,
                  { color: pill.color },
                ]}
              >
                {pill.value}
              </Text>
            </View>
          ))}
        </Animated.View>
      ) : null}

      {/* ── Scrollable content ── */}
      <View style={{ flex: 1 }}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{
            paddingHorizontal: spacing.md,
            paddingBottom: insets.bottom + 40,
            gap: spacing.md,
            paddingTop: spacing.md,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Meal type selector */}
          <View style={{ gap: spacing.xs }}>
            <Text
              style={[typography.smallMedium, { color: colors.mutedForeground }]}
            >
              Meal type
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.xs }}
            >
              {MEAL_OPTIONS.map((opt) => {
                const active = opt.value === selectedMealType;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setSelectedMealType(opt.value)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: radius.full,
                      borderWidth: 1,
                      backgroundColor: active ? colors.primary : colors.card,
                      borderColor: active ? colors.primary : colors.cardBorder,
                      minHeight: 44,
                      justifyContent: "center",
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[
                        typography.smallMedium,
                        { color: active ? "#fff" : colors.foreground },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Items list */}
          {items.length > 0 ? (
            <View style={{ gap: spacing.xs }}>
              <Text
                style={[typography.smallMedium, { color: colors.mutedForeground }]}
              >
                Items ({items.length})
              </Text>
              {items.map((item, index) => (
                <FoodItemCard
                  key={`${item.food_name}-${index}`}
                  item={item}
                  index={index}
                  onEdit={handleEditItem}
                  onDelete={handleRemoveItem}
                  onViewTable={handleViewTable}
                />
              ))}
            </View>
          ) : null}

          {/* Add item section */}
          <View style={{ gap: spacing.sm }}>
            {/* Manual add */}
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/nutrition/add-food",
                  params: { mode: "manual" },
                })
              }
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: spacing.xs,
                paddingVertical: spacing.md,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                borderStyle: "dashed",
                minHeight: 52,
                backgroundColor: colors.card,
              }}
              accessibilityRole="button"
              accessibilityLabel="Add food manually"
            >
              <Plus size={18} color={colors.primary} strokeWidth={2} />
              <Text style={[typography.bodyMedium, { color: colors.primary }]}>
                Add food manually
              </Text>
            </Pressable>

            {/* Search library */}
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/nutrition/add-food",
                  params: { mode: "library" },
                })
              }
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: spacing.xs,
                paddingVertical: spacing.md,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                minHeight: 52,
                backgroundColor: colors.card,
              }}
              accessibilityRole="button"
              accessibilityLabel="Search food library"
            >
              <Search size={18} color={colors.foreground} strokeWidth={2} />
              <Text style={[typography.bodyMedium, { color: colors.foreground }]}>
                Search library
              </Text>
            </Pressable>

            {/* Add with AI */}
            <Pressable
              onPress={() => setAiTipsVisible(true)}
              disabled={analyzingAI}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: spacing.xs,
                paddingVertical: spacing.md,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.primary,
                minHeight: 52,
                backgroundColor: `${colors.primary}1A`,
                opacity: analyzingAI ? 0.7 : 1,
              }}
              accessibilityRole="button"
              accessibilityLabel="Add with AI photo"
            >
              <Sparkles size={18} color={colors.primary} strokeWidth={2} />
              <Text style={[typography.bodyMedium, { color: colors.primary }]}>
                {analyzingAI ? "Analyzing..." : "Add with AI photo"}
              </Text>
            </Pressable>
          </View>

          {/* Totals card */}
          {items.length > 0 ? (
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
              <Text
                style={[typography.smallMedium, { color: colors.mutedForeground }]}
              >
                Meal totals
              </Text>
              {/* 2x2 grid */}
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                {[
                  { label: "Calories", value: `${totalCals} kcal`, icon: <Flame size={18} color={MACRO_COLORS.calories} />, color: MACRO_COLORS.calories },
                  { label: "Protein", value: `${totalProtein}g`, icon: <Zap size={18} color={MACRO_COLORS.protein} />, color: MACRO_COLORS.protein },
                ].map((card) => (
                  <View
                    key={card.label}
                    style={{
                      flex: 1,
                      backgroundColor: colors.surface,
                      borderRadius: radius.md,
                      borderLeftWidth: 3,
                      borderLeftColor: card.color,
                      padding: spacing.sm,
                      gap: 4,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      {card.icon}
                      <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                        {card.label}
                      </Text>
                    </View>
                    <Text style={[typography.bodyMedium, { color: colors.foreground }]}>
                      {card.value}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                {[
                  { label: "Carbs", value: `${totalCarbs}g`, icon: <Wheat size={18} color={MACRO_COLORS.carbs} />, color: MACRO_COLORS.carbs },
                  { label: "Fat", value: `${totalFat}g`, icon: <Droplets size={18} color={MACRO_COLORS.fat} />, color: MACRO_COLORS.fat },
                ].map((card) => (
                  <View
                    key={card.label}
                    style={{
                      flex: 1,
                      backgroundColor: colors.surface,
                      borderRadius: radius.md,
                      borderLeftWidth: 3,
                      borderLeftColor: card.color,
                      padding: spacing.sm,
                      gap: 4,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      {card.icon}
                      <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                        {card.label}
                      </Text>
                    </View>
                    <Text style={[typography.bodyMedium, { color: colors.foreground }]}>
                      {card.value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Empty state */}
          {items.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: spacing.xl }}>
              <Text
                style={[
                  typography.body,
                  { color: colors.mutedForeground, textAlign: "center" },
                ]}
              >
                Add foods to log your meal.
              </Text>
            </View>
          ) : null}

          {/* Inline disclaimer */}
          <Text
            style={[
              typography.caption,
              {
                color: colors.mutedForeground,
                textAlign: "center",
                paddingBottom: spacing.xs,
              },
            ]}
          >
            Nutritional values are estimates. Consult a professional for dietary
            advice.
          </Text>
        </ScrollView>

        {/* AI skeleton overlay */}
        {analyzingAI ? (
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: `${colors.background}E8`,
              opacity: skeletonOpacity,
              alignItems: "center",
              justifyContent: "center",
            }}
            pointerEvents="none"
          >
            <Text
              style={[typography.bodyMedium, { color: colors.foreground }]}
            >
              AI is analyzing your meal...
            </Text>
          </Animated.View>
        ) : null}
      </View>

      {/* ── AI photo tips guide modal ── */}
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
            {/* Handle */}
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
                  style={[typography.body, { color: colors.foreground, flex: 1 }]}
                >
                  {row.tip}
                </Text>
              </View>
            ))}

            <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
              <Pressable
                onPress={() => runAIAnalysis("camera")}
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
                  style={[typography.bodyMedium, { color: colors.primaryForeground }]}
                >
                  Take photo
                </Text>
              </Pressable>

              <Pressable
                onPress={() => runAIAnalysis("library")}
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
                style={{ alignItems: "center", paddingVertical: spacing.sm }}
                accessibilityRole="button"
              >
                <Text
                  style={[typography.body, { color: colors.mutedForeground }]}
                >
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Nutrition table modal ── */}
      <NutritionTableModal
        visible={tableModal.visible}
        item={tableModal.item}
        itemIndex={tableModal.itemIndex}
        onClose={() => setTableModal({ visible: false, item: null, itemIndex: null })}
        onSave={handleTableSave}
      />
    </View>
  );
}

// TEST:
// 1. Open screen → header shows "Log Food" with back + disabled Save
// 2. Add a food via "Add food manually" → FoodItemCard appears, Save enables
// 3. Macro summary strip animates in with spring on first item; hides when all removed
// 4. Totals card (2x2 grid) shows correct aggregated macros
// 5. Tap "Add with AI photo" → tips guide modal opens (no emoji in UI)
// 6. Pick gallery image → analyzing overlay pulses; items added on completion
// 7. Take photo (camera) → same AI flow as gallery
// 8. "Search library" button → navigates to add-food?mode=library
// 9. FoodItemCard: swipe delete, three-dot menu, view nutrition table (opens NutritionTableModal)
// 10. Edit item via three-dot → navigates to add-food, returns with updated item
// 11. NutritionTableModal: read/edit; Save changes updates item in list
// 12. Save meal → createNutritionLog + upsertFoodLibraryItem; toast + navigate back
// 13. AI API key missing → toast + redirect to /settings/ai-keys
// 14. Disclaimer text at bottom of scroll
