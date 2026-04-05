/**
 * MacroSummary -- Overview card with calorie ring + macro bars
 */
import { View } from "react-native";
import { MacroRing } from "@/components/nutrition/MacroRing";
import { MacroBar } from "@/components/nutrition/MacroBar";
import { useThemeStore } from "@/stores/theme.store";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";
import { elevation } from "@/constants/elevation";
import type { DailyNutritionGoal } from "@/types";

interface MacroSummaryProps {
  totals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  goal: DailyNutritionGoal;
}

export function MacroSummary({ totals, goal }: MacroSummaryProps) {
  const colors = useThemeStore((s) => s.colors);

  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          padding: spacing.md,
          gap: spacing.md,
        },
        elevation.sm,
      ]}
    >
      {/* Rings row */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-around",
          alignItems: "center",
        }}
      >
        <MacroRing
          current={totals.calories}
          target={goal.calories}
          label="Calories"
          unit="kcal"
          color={colors.primary}
          size={90}
          strokeWidth={7}
        />
        <View style={{ gap: 8 }}>
          <MacroRing
            current={totals.protein_g}
            target={goal.protein_g}
            label="Protein"
            color="#22C4D5"
            size={56}
            strokeWidth={5}
          />
          <MacroRing
            current={totals.carbs_g}
            target={goal.carbs_g}
            label="Carbs"
            color="#F59E0B"
            size={56}
            strokeWidth={5}
          />
          <MacroRing
            current={totals.fat_g}
            target={goal.fat_g}
            label="Fat"
            color="#F472B6"
            size={56}
            strokeWidth={5}
          />
        </View>
      </View>

      {/* Progress bars */}
      <View style={{ gap: spacing.xs }}>
        <MacroBar
          label="Protein"
          current={totals.protein_g}
          target={goal.protein_g}
          color="#22C4D5"
        />
        <MacroBar
          label="Carbs"
          current={totals.carbs_g}
          target={goal.carbs_g}
          color="#F59E0B"
        />
        <MacroBar
          label="Fat"
          current={totals.fat_g}
          target={goal.fat_g}
          color="#F472B6"
        />
      </View>
    </View>
  );
}
