/**
 * FoodRow -- Displays a single food item in a meal log
 * @example
 * <FoodRow item={item} onDelete={() => remove(item)} onPress={() => edit(item)} />
 */
import { View, Text, Pressable } from "react-native";
import { Trash2 } from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";
import { typography } from "@/constants/typography";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";
import type { NutritionItem } from "@/types";

interface FoodRowProps {
  item: NutritionItem;
  onPress?: () => void;
  onDelete?: () => void;
  showMacros?: boolean;
}

export function FoodRow({
  item,
  onPress,
  onDelete,
  showMacros = true,
}: FoodRowProps) {
  const colors = useThemeStore((s) => s.colors);

  const content = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.card,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        gap: spacing.sm,
      }}
    >
      {/* Info */}
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={[typography.bodyMedium, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {item.food_name}
        </Text>
        {item.brand ? (
          <Text
            style={[typography.caption, { color: colors.mutedForeground }]}
          >
            {item.brand}
          </Text>
        ) : null}
        {showMacros ? (
          <Text
            style={[typography.caption, { color: colors.mutedForeground }]}
          >
            {item.serving_size_g}g {"  "}
            {item.calories} kcal {"  "} P {item.protein_g}g {"  "} C{" "}
            {item.carbs_g}g {"  "} F {item.fat_g}g
          </Text>
        ) : null}
      </View>

      {/* Calorie badge */}
      <View
        style={{
          backgroundColor: colors.primary + "1A",
          borderRadius: radius.xs,
          paddingHorizontal: 8,
          paddingVertical: 2,
        }}
      >
        <Text style={[typography.smallMedium, { color: colors.primary }]}>
          {item.calories}
        </Text>
      </View>

      {/* Delete */}
      {onDelete ? (
        <Pressable
          onPress={onDelete}
          hitSlop={8}
          style={{ padding: 4, minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
          accessibilityLabel="Delete food item"
        >
          <Trash2 size={16} color={colors.destructive} strokeWidth={2} />
        </Pressable>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        accessibilityRole="button"
      >
        {content}
      </Pressable>
    );
  }

  return content;
}
