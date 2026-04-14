import { Text, View } from "react-native";

import { MacroRing } from "@/components/nutrition/MacroRing";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { useThemeStore } from "@/stores/theme.store";
import type { DailyNutritionGoal } from "@/types";

interface MacroWidgetProps {
  totals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  goal: DailyNutritionGoal;
}

export function MacroWidget({ totals, goal }: MacroWidgetProps) {
  const colors = useThemeStore((s) => s.colors);

  const metrics = [
    {
      key: "calories",
      label: "Calories",
      current: Math.round(totals.calories),
      target: Math.round(goal.calories),
      unit: "kcal",
      color: colors.primary,
    },
    {
      key: "protein",
      label: "Protein",
      current: Math.round(totals.protein_g),
      target: Math.round(goal.protein_g),
      unit: "g",
      color: "#22C4D5",
    },
    {
      key: "carbs",
      label: "Carbs",
      current: Math.round(totals.carbs_g),
      target: Math.round(goal.carbs_g),
      unit: "g",
      color: "#F59E0B",
    },
    {
      key: "fat",
      label: "Fat",
      current: Math.round(totals.fat_g),
      target: Math.round(goal.fat_g),
      unit: "g",
      color: "#F472B6",
    },
  ] as const;

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderColor: colors.cardBorder,
        borderWidth: 1,
        borderRadius: 16,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xs,
        gap: spacing.xs,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing.sm,
        }}
      >
        <Text style={[typography.smallMedium, { color: colors.foreground }]}>
          Daily macros
        </Text>
        <Text style={[typography.caption, { color: colors.mutedForeground }]}>
          {metrics[0].current}/{metrics[0].target} {metrics[0].unit}
        </Text>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {metrics.map((metric) => (
          <View key={metric.key} style={{ flex: 1, alignItems: "center" }}>
            <MacroRing
              current={metric.current}
              target={metric.target}
              label={metric.label}
              unit={metric.unit}
              color={metric.color}
              size={62}
              strokeWidth={5}
            />
          </View>
        ))}
      </View>
    </View>
  );
}
