import { create } from "zustand";

import { calculateRDI } from "@/lib/nutrition/rdi";
import type {
  NutritionActivityLevel,
  NutritionRDIInputs,
  NutritionRDIResult,
  NutritionRdiGoal,
  NutritionRdiSex,
} from "@/types";

interface NutritionOnboardingState {
  sex: NutritionRdiSex | null;
  age: number | null;
  height_cm: number | null;
  current_weight_kg: number | null;
  goal_weight_kg: number | null;
  activity_level: NutritionActivityLevel | null;
  goal: NutritionRdiGoal | null;
  result: NutritionRDIResult | null;
  setField: <K extends keyof NutritionRDIInputs>(
    field: K,
    value: NutritionRDIInputs[K],
  ) => void;
  setFromProfile: (partial: {
    sex?: NutritionRdiSex;
    age?: number;
    height_cm?: number;
    current_weight_kg?: number;
  }) => void;
  calculate: () => NutritionRDIResult | null;
  getPayload: () => NutritionRDIInputs | null;
  reset: () => void;
}

const INITIAL_STATE = {
  sex: null,
  age: null,
  height_cm: null,
  current_weight_kg: null,
  goal_weight_kg: null,
  activity_level: null,
  goal: null,
  result: null,
};

export const useNutritionOnboardingStore = create<NutritionOnboardingState>(
  (set, get) => ({
    ...INITIAL_STATE,

    setField: (field, value) => {
      set((state) => ({
        ...state,
        [field]: value,
      }));
    },

    setFromProfile: (partial) => {
      set((state) => ({
        ...state,
        sex: partial.sex ?? state.sex,
        age: typeof partial.age === "number" ? partial.age : state.age,
        height_cm:
          typeof partial.height_cm === "number"
            ? partial.height_cm
            : state.height_cm,
        current_weight_kg:
          typeof partial.current_weight_kg === "number"
            ? partial.current_weight_kg
            : state.current_weight_kg,
      }));
    },

    calculate: () => {
      const payload = get().getPayload();
      if (!payload) {
        return null;
      }

      const result = calculateRDI(payload);
      set({ result });
      return result;
    },

    getPayload: () => {
      const state = get();
      if (
        !state.sex ||
        typeof state.age !== "number" ||
        typeof state.height_cm !== "number" ||
        typeof state.current_weight_kg !== "number" ||
        typeof state.goal_weight_kg !== "number" ||
        !state.activity_level ||
        !state.goal
      ) {
        return null;
      }

      return {
        sex: state.sex,
        age: state.age,
        height_cm: state.height_cm,
        current_weight_kg: state.current_weight_kg,
        goal_weight_kg: state.goal_weight_kg,
        activity_level: state.activity_level,
        goal: state.goal,
      };
    },

    reset: () => {
      set(INITIAL_STATE);
    },
  }),
);
