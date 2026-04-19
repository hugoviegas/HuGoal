import { useCallback, useEffect, useState } from "react";

import { useAuthStore } from "@/stores/auth.store";
import {
  getNutritionSettings,
  setNutritionSettings,
} from "@/lib/firestore/nutrition-settings";
import { calculateRDI } from "@/lib/nutrition/rdi";
import type { NutritionRDIInputs, NutritionSettings } from "@/types";

interface UseNutritionGoalResult {
  goal: NutritionSettings | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  save: (inputs: NutritionRDIInputs) => Promise<NutritionSettings>;
}

export function useNutritionGoal(): UseNutritionGoalResult {
  const user = useAuthStore((s) => s.user);

  const [goal, setGoal] = useState<NutritionSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.uid) {
      setGoal(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await getNutritionSettings(user.uid);
      if (!data) {
        setGoal(null);
        return;
      }

      setGoal({
        ...data,
        goal_strategy: data.goal_strategy ?? "formula_plus_override",
        water_goal_ml: data.water_goal_ml ?? 2000,
        cup_size_ml: data.cup_size_ml ?? 250,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load nutrition goal",
      );
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  const save = useCallback(
    async (inputs: NutritionRDIInputs) => {
      if (!user?.uid) {
        throw new Error("User not authenticated");
      }

      const result = calculateRDI(inputs);
      const payload: NutritionSettings = {
        ...inputs,
        rdi_kcal: result.rdi_kcal,
        macro_split: result.macro_split,
        goal_strategy: "formula_plus_override",
        water_goal_ml: 2000,
        cup_size_ml: 250,
        updated_at: new Date().toISOString(),
      };

      await setNutritionSettings(user.uid, payload);
      setGoal(payload);
      return payload;
    },
    [user?.uid],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    goal,
    isLoading,
    error,
    refresh,
    save,
  };
}
