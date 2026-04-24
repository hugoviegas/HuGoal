import { create } from "zustand";
import type { NutritionLog, DailyNutritionGoal } from "@/types";
import {
  computeTotalsFromLogs,
  type NutritionTotals,
} from "@/lib/shared/nutrition-utils";

interface NutritionState {
  // Today's state
  todayLogs: NutritionLog[];
  dailyGoal: DailyNutritionGoal;
  waterMl: number;
  isLoading: boolean;

  // Computed totals
  todayTotals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };

  // Actions
  setTodayLogs: (logs: NutritionLog[]) => void;
  addLog: (log: NutritionLog) => void;
  removeLog: (logId: string) => void;
  setDailyGoal: (goal: DailyNutritionGoal) => void;
  setWater: (ml: number) => void;
  addWater: (ml: number) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

function computeTotals(logs: NutritionLog[]): NutritionTotals {
  return computeTotalsFromLogs(logs);
}

const DEFAULT_GOAL: DailyNutritionGoal = {
  calories: 2000,
  protein_g: 150,
  carbs_g: 250,
  fat_g: 65,
};

export const useNutritionStore = create<NutritionState>((set, get) => ({
  todayLogs: [],
  dailyGoal: DEFAULT_GOAL,
  waterMl: 0,
  isLoading: false,
  todayTotals: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },

  setTodayLogs: (logs) =>
    set({ todayLogs: logs, todayTotals: computeTotals(logs) }),

  addLog: (log) => {
    const updated = [log, ...get().todayLogs];
    set({ todayLogs: updated, todayTotals: computeTotals(updated) });
  },

  removeLog: (logId) => {
    const updated = get().todayLogs.filter((l) => l.id !== logId);
    set({ todayLogs: updated, todayTotals: computeTotals(updated) });
  },

  setDailyGoal: (goal) => set({ dailyGoal: goal }),

  setWater: (ml) => set({ waterMl: ml }),
  addWater: (ml) => set({ waterMl: get().waterMl + ml }),

  setLoading: (loading) => set({ isLoading: loading }),

  reset: () =>
    set({
      todayLogs: [],
      dailyGoal: DEFAULT_GOAL,
      waterMl: 0,
      isLoading: false,
      todayTotals: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    }),
}));
