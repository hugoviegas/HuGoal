/**
 * MealSection -- Expandable meal group with items list
 * @example
 * <MealSection mealType="breakfast" items={items} onAddItem={() => {}} />
 */
import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { ChevronDown, ChevronUp, Plus } from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";
import { FoodRow } from "@/components/nutrition/FoodRow";
import { typography } from "@/constants/typography";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";
import type { NutritionItem, MealType } from "@/types";

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  pre_workout: "Pre-Workout",
  post_workout: "Post-Workout",
};

const MEAL_TIME_HINTS: Record<MealType, string> = {
  breakfast: "07:00",
  lunch: "12:00",
  dinner: "19:00",
  snack: "15:00",
  pre_workout: "06:00",
  post_workout: "18:00",
};

interface MealSectionProps {
  mealType: MealType;
  items: NutritionItem[];
  onAddItem?: () => void;
  onDeleteItem?: (index: number) => void;
  onEditItem?: (index: number) => void;
  defaultExpanded?: boolean;
}

export function MealSection({
  mealType,
  items,
  onAddItem,
  onDeleteItem,
  onEditItem,
  defaultExpanded = false,
}: MealSectionProps) {
  const colors = useThemeStore((s) => s.colors);
  const [expanded, setExpanded] = useState(
    defaultExpanded || items.length > 0
  );

  const totalCals = items.reduce((sum, i) => sum + (i.calories ?? 0), 0);
  const label = MEAL_LABELS[mealType] ?? mealType;
  const timeHint = MEAL_TIME_HINTS[mealType];

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          gap: spacing.xs,
          minHeight: 48,
        }}
        accessibilityRole="button"
        accessibilityLabel={`${label} meal section, ${items.length} items`}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[typography.bodyMedium, { color: colors.foreground }]}>
            {label}
          </Text>
          {timeHint ? (
            <Text
              style={[typography.caption, { color: colors.mutedForeground }]}
            >
              {timeHint}
            </Text>
          ) : null}
        </View>

        {items.length > 0 ? (
          <Text style={[typography.smallMedium, { color: colors.primary }]}>
            {totalCals} kcal
          </Text>
        ) : null}

        <Text style={[typography.caption, { color: colors.muted }]}>
          {items.length} {items.length === 1 ? "item" : "items"}
        </Text>

        {expanded ? (
          <ChevronUp size={18} color={colors.muted} strokeWidth={2} />
        ) : (
          <ChevronDown size={18} color={colors.muted} strokeWidth={2} />
        )}
      </Pressable>

      {/* Content */}
      {expanded ? (
        <View
          style={{
            paddingHorizontal: spacing.sm,
            paddingBottom: spacing.sm,
            gap: spacing.xs,
          }}
        >
          {items.map((item, index) => (
            <FoodRow
              key={`${item.food_name}-${index}`}
              item={item}
              onDelete={
                onDeleteItem ? () => onDeleteItem(index) : undefined
              }
              onPress={onEditItem ? () => onEditItem(index) : undefined}
            />
          ))}

          {/* Add item button */}
          {onAddItem ? (
            <Pressable
              onPress={onAddItem}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: spacing.sm,
                borderRadius: radius.sm,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                borderStyle: "dashed",
                minHeight: 44,
              }}
              accessibilityRole="button"
              accessibilityLabel={`Add food to ${label}`}
            >
              <Plus size={16} color={colors.primary} strokeWidth={2} />
              <Text
                style={[typography.smallMedium, { color: colors.primary }]}
              >
                Add food
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
