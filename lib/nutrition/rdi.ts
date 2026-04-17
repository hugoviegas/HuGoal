import type {
  NutritionActivityLevel,
  NutritionMacroSplit,
  NutritionRDIInputs,
  NutritionRDIResult,
  NutritionRdiGoal,
  NutritionRdiSex,
} from "@/types";

const DEFAULT_MACRO_SPLIT: NutritionMacroSplit = {
  protein_pct: 30,
  carbs_pct: 40,
  fat_pct: 30,
};

const ACTIVITY_MULTIPLIERS: Record<NutritionActivityLevel, number> = {
  low: 1.2,
  moderate: 1.375,
  high: 1.55,
  very_high: 1.9,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toSafeNumber(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return value;
}

export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: NutritionRdiSex,
): number {
  const weight = clamp(toSafeNumber(weightKg, 70), 20, 500);
  const height = clamp(toSafeNumber(heightCm, 170), 100, 250);
  const ageYears = clamp(toSafeNumber(age, 25), 10, 120);

  const base = 10 * weight + 6.25 * height - 5 * ageYears;
  return sex === "female" ? base - 161 : base + 5;
}

export function getActivityMultiplier(level: NutritionActivityLevel): number {
  return ACTIVITY_MULTIPLIERS[level];
}

export function calculateRdiFromGoal(
  tdee: number,
  goal: NutritionRdiGoal,
): number {
  if (goal === "lose") {
    return Math.max(1200, Math.round(tdee - 500));
  }

  if (goal === "gain") {
    return Math.round(tdee + 300);
  }

  return Math.round(tdee);
}

export function calculateRDI(
  inputs: NutritionRDIInputs,
  macroSplit: NutritionMacroSplit = DEFAULT_MACRO_SPLIT,
): NutritionRDIResult {
  const bmr = calculateBMR(
    inputs.current_weight_kg,
    inputs.height_cm,
    inputs.age,
    inputs.sex,
  );
  const tdee = Math.round(bmr * getActivityMultiplier(inputs.activity_level));
  const rdi_kcal = calculateRdiFromGoal(tdee, inputs.goal);

  return {
    bmr: Math.round(bmr),
    tdee,
    rdi_kcal,
    macro_split: {
      protein_pct: macroSplit.protein_pct,
      carbs_pct: macroSplit.carbs_pct,
      fat_pct: macroSplit.fat_pct,
    },
  };
}

export function calculateMacroTargetsFromRdi(
  rdiKcal: number,
  macroSplit: NutritionMacroSplit,
): {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
} {
  const total = Math.max(0, toSafeNumber(rdiKcal, 0));
  const proteinCalories = total * (macroSplit.protein_pct / 100);
  const carbsCalories = total * (macroSplit.carbs_pct / 100);
  const fatCalories = total * (macroSplit.fat_pct / 100);

  return {
    protein_g: Math.round(proteinCalories / 4),
    carbs_g: Math.round(carbsCalories / 4),
    fat_g: Math.round(fatCalories / 9),
  };
}
