import type { PantryItem } from "@/lib/firestore/pantry";
import type { PantryItemInput } from "@/lib/firestore/pantry";
import type {
  AIContextPayload,
  DailyLogEntry,
  FoodSource,
  NutritionItem,
  NutritionSettings,
  UnifiedFoodItem,
} from "@/types";

function round2(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 100) / 100;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

export function nutritionItemToUnifiedFoodItem(params: {
  userId: string;
  id: string;
  item: NutritionItem;
  source?: FoodSource;
  category?: string;
  nowIso?: string;
}): UnifiedFoodItem {
  const now = params.nowIso ?? new Date().toISOString();
  return {
    id: params.id,
    user_id: params.userId,
    name: params.item.food_name,
    brand: params.item.brand,
    category: params.category,
    serving_type: "weight",
    base_serving_value: Math.max(1, round2(params.item.serving_size_g || 100)),
    base_serving_unit: "g",
    kcal_per_base: Math.max(0, round2(params.item.calories)),
    protein_g_per_base: Math.max(0, round2(params.item.protein_g)),
    carbs_g_per_base: Math.max(0, round2(params.item.carbs_g)),
    fat_g_per_base: Math.max(0, round2(params.item.fat_g)),
    fiber_g_per_base:
      typeof params.item.fiber_g === "number"
        ? Math.max(0, round2(params.item.fiber_g))
        : undefined,
    sugar_g_per_base:
      typeof params.item.sugar_g === "number"
        ? Math.max(0, round2(params.item.sugar_g))
        : undefined,
    notes: params.item.notes,
    photo_url: params.item.photo_url,
    source: params.source ?? params.item.source,
    created_at: now,
    updated_at: now,
  };
}

export function pantryItemToUnifiedFoodItem(item: PantryItem): UnifiedFoodItem {
  return {
    id: item.id,
    user_id: item.userId,
    name: item.name,
    brand: item.brand,
    serving_type: "weight",
    base_serving_value: Math.max(1, round2(item.serving_size_g || 100)),
    base_serving_unit: item.serving_unit === "ml" ? "ml" : "g",
    kcal_per_base: round2((item.calories_per_100g / 100) * item.serving_size_g),
    protein_g_per_base: round2(
      (item.protein_per_100g / 100) * item.serving_size_g,
    ),
    carbs_g_per_base: round2((item.carbs_per_100g / 100) * item.serving_size_g),
    fat_g_per_base: round2((item.fat_per_100g / 100) * item.serving_size_g),
    source: "manual",
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

export function nutritionItemToPantryInput(
  item: NutritionItem,
  servingUnit: string = "g",
): PantryItemInput {
  const serving = item.serving_size_g > 0 ? item.serving_size_g : 100;
  const toPer100 = (value: number) =>
    Math.max(0, round2((value / serving) * 100));

  return {
    name: item.food_name,
    brand: item.brand,
    calories_per_100g: toPer100(item.calories),
    protein_per_100g: toPer100(item.protein_g),
    carbs_per_100g: toPer100(item.carbs_g),
    fat_per_100g: toPer100(item.fat_g),
    serving_size_g: serving,
    serving_unit: servingUnit.trim() || "g",
  };
}

export function toNutritionItemFromUnified(params: {
  food: UnifiedFoodItem;
  quantity: number;
}): NutritionItem {
  const q = Math.max(0, round2(params.quantity));
  return {
    food_name: params.food.name,
    brand: params.food.brand,
    serving_size_g: round2(params.food.base_serving_value * q),
    calories: round2(params.food.kcal_per_base * q),
    protein_g: round2(params.food.protein_g_per_base * q),
    carbs_g: round2(params.food.carbs_g_per_base * q),
    fat_g: round2(params.food.fat_g_per_base * q),
    fiber_g:
      typeof params.food.fiber_g_per_base === "number"
        ? round2(params.food.fiber_g_per_base * q)
        : undefined,
    sugar_g:
      typeof params.food.sugar_g_per_base === "number"
        ? round2(params.food.sugar_g_per_base * q)
        : undefined,
    notes: params.food.notes,
    photo_url: params.food.photo_url,
    source: params.food.source,
  };
}

export function buildTokenEfficientAiContext(params: {
  dateKey: string;
  settings: NutritionSettings;
  consumedWaterMl: number;
  pantryItems: UnifiedFoodItem[];
  dayLogEntries: DailyLogEntry[];
  queryText?: string;
  maxPantryItems?: number;
}): AIContextPayload {
  const terms = normalizeText(params.queryText ?? "")
    .split(/\s+/)
    .filter((token) => token.length >= 2);

  const maxItems = Math.max(5, params.maxPantryItems ?? 30);

  const filteredPantry = params.pantryItems
    .filter((item) => {
      if (!terms.length) {
        return true;
      }
      const bag = `${normalizeText(item.name)} ${normalizeText(item.brand ?? "")}`;
      return terms.some((term) => bag.includes(term));
    })
    .slice(0, maxItems)
    .map((item) => ({
      id: item.id,
      name: item.name,
      kcal_per_base: item.kcal_per_base,
      protein_g_per_base: item.protein_g_per_base,
      carbs_g_per_base: item.carbs_g_per_base,
      fat_g_per_base: item.fat_g_per_base,
      base_serving_value: item.base_serving_value,
      base_serving_unit: item.base_serving_unit,
    }));

  return {
    date_key: params.dateKey,
    goals_summary: {
      calories:
        params.settings.manual_nutrient_targets?.calories ??
        params.settings.rdi_kcal,
      protein_g:
        params.settings.manual_nutrient_targets?.protein_g ??
        Math.round(
          (params.settings.rdi_kcal * params.settings.macro_split.protein_pct) /
            400,
        ),
      carbs_g:
        params.settings.manual_nutrient_targets?.carbs_g ??
        Math.round(
          (params.settings.rdi_kcal * params.settings.macro_split.carbs_pct) /
            400,
        ),
      fat_g:
        params.settings.manual_nutrient_targets?.fat_g ??
        Math.round(
          (params.settings.rdi_kcal * params.settings.macro_split.fat_pct) /
            900,
        ),
      fiber_g: params.settings.manual_nutrient_targets?.fiber_g,
      sugar_g: params.settings.manual_nutrient_targets?.sugar_g,
    },
    hydration_summary: {
      consumed_ml: Math.max(0, Math.round(params.consumedWaterMl)),
      target_ml: params.settings.water_goal_ml ?? 2000,
    },
    filtered_pantry_items: filteredPantry,
    day_log_summary: params.dayLogEntries.slice(0, 60).map((entry) => ({
      meal_slot: entry.meal_slot,
      food_name: entry.snapshot_food.name,
      quantity: entry.quantity,
      quantity_unit: entry.quantity_unit,
      kcal: entry.total_kcal,
    })),
  };
}
