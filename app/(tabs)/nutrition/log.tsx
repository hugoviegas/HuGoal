import { useState } from "react";
import { View, Text, ScrollView, Pressable, FlatList } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Plus } from "lucide-react-native";

import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import { useNutritionStore } from "@/stores/nutrition.store";

import { AddFoodModal } from "@/components/nutrition/AddFoodModal";
import { FoodRow } from "@/components/nutrition/FoodRow";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

import { createNutritionLog } from "@/lib/firestore/nutrition";
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

  const [selectedMealType, setSelectedMealType] = useState<MealType>(
    mealTypeParam ?? "breakfast",
  );
  const [items, setItems] = useState<NutritionItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalCals = items.reduce((s, i) => s + i.calories, 0);
  const totalProtein = items.reduce((s, i) => s + i.protein_g, 0);
  const totalCarbs = items.reduce((s, i) => s + i.carbs_g, 0);
  const totalFat = items.reduce((s, i) => s + i.fat_g, 0);

  const handleAddItem = (item: NutritionItem) => {
    setItems((prev) => [...prev, item]);
  };

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
      addLog(log);
      showToast("Meal logged successfully", "success");
      router.back();
    } catch {
      showToast("Failed to save meal", "error");
    } finally {
      setSaving(false);
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
          <Text style={[typography.smallMedium, { color: colors.mutedForeground }]}>
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
                    backgroundColor: active
                      ? colors.primary
                      : colors.card,
                    borderColor: active
                      ? colors.primary
                      : colors.cardBorder,
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
              <FoodRow
                key={`${item.food_name}-${index}`}
                item={item}
                onDelete={() => handleRemoveItem(index)}
              />
            ))}
          </View>
        ) : null}

        {/* Add item button */}
        <Pressable
          onPress={() => setModalVisible(true)}
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
              style={[typography.smallMedium, { color: colors.mutedForeground }]}
            >
              Meal totals
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={[typography.bodyMedium, { color: colors.foreground }]}>
                {totalCals} kcal
              </Text>
              <Text style={[typography.caption, { color: colors.mutedForeground }]}>
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

      <AddFoodModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleAddItem}
      />
    </View>
  );
}
