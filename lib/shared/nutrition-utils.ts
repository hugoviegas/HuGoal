import type { NutritionItem, NutritionLog, DailyNutritionGoal } from "@/types";

export type NutritionTotals = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export function computeTotalsFromItems(items: NutritionItem[]): NutritionTotals {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + (item.calories ?? 0),
      protein_g: acc.protein_g + (item.protein_g ?? 0),
      carbs_g: acc.carbs_g + (item.carbs_g ?? 0),
      fat_g: acc.fat_g + (item.fat_g ?? 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}

export function computeTotalsFromLogs(logs: NutritionLog[]): NutritionTotals {
  return logs.reduce(
    (acc, log) => ({
      calories: acc.calories + log.total.calories,
      protein_g: acc.protein_g + log.total.protein_g,
      carbs_g: acc.carbs_g + log.total.carbs_g,
      fat_g: acc.fat_g + log.total.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}

export function calculateProgress(
  current: NutritionTotals,
  goal: DailyNutritionGoal,
): NutritionTotals {
  return {
    calories: Math.round((current.calories / goal.calories) * 100),
    protein_g: Math.round((current.protein_g / goal.protein_g) * 100),
    carbs_g: Math.round((current.carbs_g / goal.carbs_g) * 100),
    fat_g: Math.round((current.fat_g / goal.fat_g) * 100),
  };
}

export function isGoalReached(
  current: NutritionTotals,
  goal: DailyNutritionGoal,
  tolerance = 0.05,
): boolean {
  const proteinRatio = current.protein_g / goal.protein_g;
  const caloriesRatio = current.calories / goal.calories;
  return proteinRatio >= (1 - tolerance) && proteinRatio <= (1 + tolerance)
    && caloriesRatio >= (1 - tolerance) && caloriesRatio <= (1 + tolerance);
}

export function getRemainingMacros(
  current: NutritionTotals,
  goal: DailyNutritionGoal,
): NutritionTotals {
  return {
    calories: Math.max(0, goal.calories - current.calories),
    protein_g: Math.max(0, goal.protein_g - current.protein_g),
    carbs_g: Math.max(0, goal.carbs_g - current.carbs_g),
    fat_g: Math.max(0, goal.fat_g - current.fat_g),
  };
}