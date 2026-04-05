import type { UserProfile, DailyNutritionGoal } from "@/types";

/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor equation
 */
export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: "male" | "female" | "other",
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (sex === "female") return base - 161;
  return base + 5; // male or other
}

/**
 * Activity multiplier based on fitness level and training days
 */
function activityMultiplier(level: string, daysPerWeek?: number): number {
  const days = daysPerWeek ?? 3;
  if (days <= 1) return 1.2;
  if (days <= 3) return level === "beginner" ? 1.375 : 1.55;
  if (days <= 5) return level === "advanced" ? 1.725 : 1.55;
  return 1.725;
}

/**
 * Calculate Total Daily Energy Expenditure
 */
export function calculateTDEE(profile: Partial<UserProfile>): number {
  const bmr = calculateBMR(
    profile.weight_kg ?? 70,
    profile.height_cm ?? 170,
    profile.age ?? 25,
    profile.sex ?? "other",
  );
  const multiplier = activityMultiplier(
    profile.level ?? "beginner",
    profile.available_days_per_week,
  );
  return Math.round(bmr * multiplier);
}

/**
 * Calculate calorie target based on goal
 */
export function calculateCalorieTarget(
  tdee: number,
  goal: string,
): number {
  switch (goal) {
    case "lose_fat":
      return Math.round(tdee * 0.8); // 20% deficit
    case "gain_muscle":
      return Math.round(tdee * 1.15); // 15% surplus
    case "recomp":
      return tdee; // maintenance
    case "maintain":
    default:
      return tdee;
  }
}

/**
 * Calculate macro split based on goal
 * Returns grams of protein, carbs, fat
 */
export function calculateMacros(
  calories: number,
  weightKg: number,
  goal: string,
): DailyNutritionGoal {
  let proteinPerKg: number;
  let fatPercent: number;

  switch (goal) {
    case "lose_fat":
      proteinPerKg = 2.2;
      fatPercent = 0.25;
      break;
    case "gain_muscle":
      proteinPerKg = 2.0;
      fatPercent = 0.25;
      break;
    case "recomp":
      proteinPerKg = 2.2;
      fatPercent = 0.25;
      break;
    default:
      proteinPerKg = 1.6;
      fatPercent = 0.30;
  }

  const protein_g = Math.round(weightKg * proteinPerKg);
  const fat_g = Math.round((calories * fatPercent) / 9);
  const proteinCals = protein_g * 4;
  const fatCals = fat_g * 9;
  const carbs_g = Math.round((calories - proteinCals - fatCals) / 4);

  return { calories, protein_g, carbs_g, fat_g };
}

/**
 * Full goal calculation from a user profile
 */
export function calculateDailyGoal(profile: Partial<UserProfile>): DailyNutritionGoal {
  const tdee = calculateTDEE(profile);
  const calories = calculateCalorieTarget(tdee, profile.goal ?? "maintain");
  return calculateMacros(calories, profile.weight_kg ?? 70, profile.goal ?? "maintain");
}
