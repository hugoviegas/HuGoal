import { useCallback, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Plus, Sparkles } from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";

import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import { useNutritionStore } from "@/stores/nutrition.store";

import { FoodRow } from "@/components/nutrition/FoodRow";
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

const MEAL_OPTIONS: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
  { value: "pre_workout", label: "Pre-Workout" },
  { value: "post_workout", label: "Post-Workout" },
];

export default function LogFoodScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mealType: mealTypeParam } = useLocalSearchParams<{
    mealType?: MealType;
  }>();

  const user = useAuthStore((s) => s.user);
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

  useFocusEffect(
    useCallback(() => {
      const selection = consumeSelectedFoodSelection();
      if (!selection) return;

      if (selection.editIndex === null) {
        setItems((prev) => [...prev, selection.item]);
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
          upsertFoodLibraryItemFromNutritionItem(user.uid, item),
        ),
      );
      addLog(log);
      showToast("Meal logged successfully", "success");
      router.back();
    } catch {
      showToast("Failed to save meal", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddWithAI = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
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

    const image = result.assets[0];
    if (!image.base64) {
      showToast("Could not read selected image", "error");
      return;
    }

    try {
      setAnalyzingAI(true);
      const detected = await analyzeMealPhoto("gemini", image.base64);

      if (!detected.length) {
        showToast("No foods detected in image", "info");
        return;
      }

      setItems((prev) => [...prev, ...detected]);
      showToast(
        `${detected.length} AI item(s) added. Review before saving.`,
        "success",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to analyze meal image";
      showToast(message, "error");
    } finally {
      setAnalyzingAI(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.sm,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.cardBorder,
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
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <ArrowLeft size={22} color={colors.foreground} strokeWidth={2} />
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

      <ScrollView
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
              style={[
                typography.smallMedium,
                { color: colors.mutedForeground },
              ]}
            >
              Items ({items.length})
            </Text>
            {items.map((item, index) => (
              <FoodRow
                key={`${item.food_name}-${index}`}
                item={item}
                onPress={() => {
                  setSelectedFoodSelection(item, index);
                  router.push({
                    pathname: "/nutrition/add-food",
                    params: { mode: "manual" },
                  });
                }}
                onDelete={() => handleRemoveItem(index)}
              />
            ))}
          </View>
        ) : null}

        {/* Add item actions */}
        <View style={{ gap: spacing.sm }}>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/nutrition/add-food",
                params: { mode: "pick" },
              })
            }
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: spacing.md,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              borderStyle: "dashed",
              minHeight: 56,
              backgroundColor: colors.card,
            }}
            accessibilityRole="button"
            accessibilityLabel="Add food item"
          >
            <Plus size={18} color={colors.primary} strokeWidth={2} />
            <Text style={[typography.bodyMedium, { color: colors.primary }]}>
              Add food
            </Text>
          </Pressable>

          <Pressable
            onPress={handleAddWithAI}
            disabled={analyzingAI}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: spacing.md,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.primary,
              minHeight: 56,
              backgroundColor: `${colors.primary}1A`,
              opacity: analyzingAI ? 0.7 : 1,
            }}
            accessibilityRole="button"
            accessibilityLabel="Add with AI"
          >
            <Sparkles size={18} color={colors.primary} strokeWidth={2} />
            <Text style={[typography.bodyMedium, { color: colors.primary }]}>
              {analyzingAI ? "Analyzing image..." : "Add with AI"}
            </Text>
          </Pressable>
        </View>

        {/* Totals summary */}
        {items.length > 0 ? (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              padding: spacing.md,
              gap: spacing.xs,
            }}
          >
            <Text
              style={[
                typography.smallMedium,
                { color: colors.mutedForeground },
              ]}
            >
              Meal totals
            </Text>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text
                style={[typography.bodyMedium, { color: colors.foreground }]}
              >
                {totalCals} kcal
              </Text>
              <Text
                style={[typography.caption, { color: colors.mutedForeground }]}
              >
                P {totalProtein}g · C {totalCarbs}g · F {totalFat}g
              </Text>
            </View>
          </View>
        ) : null}

        {/* Empty state hint */}
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
      </ScrollView>
    </View>
  );
}
