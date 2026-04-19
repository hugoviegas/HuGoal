import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { NutritionSettings } from "@/types";

function nutritionSettingsRef(uid: string) {
  return doc(db, "nutrition_settings", uid);
}

function sanitizeSettings(payload: NutritionSettings): NutritionSettings {
  const sanitizeOptionalNumber = (
    value: number | undefined,
    min = 0,
  ): number | undefined => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return undefined;
    }

    return Math.max(min, Math.round(value));
  };

  const manualTargets = payload.manual_nutrient_targets
    ? {
        calories: sanitizeOptionalNumber(
          payload.manual_nutrient_targets.calories,
        ),
        protein_g: sanitizeOptionalNumber(
          payload.manual_nutrient_targets.protein_g,
        ),
        carbs_g: sanitizeOptionalNumber(
          payload.manual_nutrient_targets.carbs_g,
        ),
        fat_g: sanitizeOptionalNumber(payload.manual_nutrient_targets.fat_g),
        fiber_g: sanitizeOptionalNumber(
          payload.manual_nutrient_targets.fiber_g,
        ),
        sugar_g: sanitizeOptionalNumber(
          payload.manual_nutrient_targets.sugar_g,
        ),
        sodium_mg: sanitizeOptionalNumber(
          payload.manual_nutrient_targets.sodium_mg,
        ),
      }
    : undefined;

  return {
    ...payload,
    age: Math.max(1, Math.round(payload.age)),
    height_cm: Math.max(1, Math.round(payload.height_cm * 10) / 10),
    current_weight_kg: Math.max(
      1,
      Math.round(payload.current_weight_kg * 10) / 10,
    ),
    goal_weight_kg: Math.max(1, Math.round(payload.goal_weight_kg * 10) / 10),
    rdi_kcal: Math.max(0, Math.round(payload.rdi_kcal)),
    macro_split: {
      protein_pct: Math.max(0, Math.round(payload.macro_split.protein_pct)),
      carbs_pct: Math.max(0, Math.round(payload.macro_split.carbs_pct)),
      fat_pct: Math.max(0, Math.round(payload.macro_split.fat_pct)),
    },
    ...(typeof payload.water_goal_ml === "number"
      ? { water_goal_ml: Math.max(250, Math.round(payload.water_goal_ml)) }
      : {}),
    ...(typeof payload.cup_size_ml === "number"
      ? { cup_size_ml: Math.max(50, Math.round(payload.cup_size_ml)) }
      : {}),
    ...(payload.goal_strategy ? { goal_strategy: payload.goal_strategy } : {}),
    ...(manualTargets ? { manual_nutrient_targets: manualTargets } : {}),
    updated_at: payload.updated_at,
  };
}

export async function getNutritionSettings(
  uid: string,
): Promise<NutritionSettings | null> {
  const snapshot = await getDoc(nutritionSettingsRef(uid));
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data() as NutritionSettings;
  return {
    ...data,
    updated_at:
      typeof data.updated_at === "string"
        ? data.updated_at
        : new Date().toISOString(),
  };
}

export async function setNutritionSettings(
  uid: string,
  settings: NutritionSettings,
): Promise<void> {
  const payload = sanitizeSettings(settings);

  await runTransaction(db, async (tx) => {
    tx.set(
      nutritionSettingsRef(uid),
      {
        ...payload,
        updated_at: serverTimestamp(),
      },
      { merge: true },
    );
  });
}

export async function updateNutritionSettings(
  uid: string,
  partial: Partial<NutritionSettings>,
): Promise<void> {
  await runTransaction(db, async (tx) => {
    tx.set(
      nutritionSettingsRef(uid),
      {
        ...partial,
        updated_at: serverTimestamp(),
      },
      { merge: true },
    );
  });
}
