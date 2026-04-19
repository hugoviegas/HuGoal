import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { NutritionLog, DailyNutritionGoal, NutritionItem } from "@/types";
import { createMMKVStateStorage } from "@/lib/mmkv-storage";

export type ChatMessageType =
  | "user_text"
  | "user_audio_transcript"
  | "user_image"
  | "ai_response"
  | "ai_food_items";

export interface ChatMessage {
  id: string;
  type: ChatMessageType;
  createdAt: string;
  text?: string;
  payload?: Record<string, unknown>;
}

function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface NutritionState {
  // Today's state
  todayLogs: NutritionLog[];
  dailyGoal: DailyNutritionGoal;
  waterMl: number;
  selectedDate: string;
  streakDays: string[];
  chatMessages: ChatMessage[];
  isLoading: boolean;
  lastFetchedAt: number | null;
  selectedFoodSelection: {
    item: NutritionItem;
    editIndex: number | null;
  } | null;

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
  setSelectedDate: (date: string) => void;
  setStreakDays: (days: string[]) => void;
  setChatMessages: (messages: ChatMessage[]) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChatMessages: () => void;
  setLoading: (loading: boolean) => void;
  setLastFetchedAt: (ts: number) => void;
  setSelectedFoodSelection: (
    item: NutritionItem | null,
    editIndex?: number | null,
  ) => void;
  consumeSelectedFoodSelection: () => {
    item: NutritionItem;
    editIndex: number | null;
  } | null;
  reset: () => void;
}

interface PersistedNutritionSlice {
  selectedDate: string;
  dailyGoal: DailyNutritionGoal;
  waterMl: number;
  todayTotals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  lastFetchedAt: number | null;
}

function computeTotals(logs: NutritionLog[]) {
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

const DEFAULT_GOAL: DailyNutritionGoal = {
  calories: 2000,
  protein_g: 150,
  carbs_g: 250,
  fat_g: 65,
};

export const useNutritionStore = create<NutritionState>()(
  persist(
    (set, get) => ({
      todayLogs: [],
      dailyGoal: DEFAULT_GOAL,
      waterMl: 0,
      selectedDate: getTodayDateKey(),
      streakDays: [],
      chatMessages: [],
      isLoading: false,
      lastFetchedAt: null,
      selectedFoodSelection: null,
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
      setSelectedDate: (date) => set({ selectedDate: date }),
      setStreakDays: (days) => set({ streakDays: days }),
      setChatMessages: (messages) => set({ chatMessages: messages }),
      addChatMessage: (message) =>
        set({ chatMessages: [...get().chatMessages, message] }),
      clearChatMessages: () => set({ chatMessages: [] }),

      setLoading: (loading) => set({ isLoading: loading }),
      setLastFetchedAt: (ts) => set({ lastFetchedAt: ts }),

      setSelectedFoodSelection: (item, editIndex = null) => {
        if (!item) {
          set({ selectedFoodSelection: null });
          return;
        }

        set({
          selectedFoodSelection: {
            item,
            editIndex,
          },
        });
      },
      consumeSelectedFoodSelection: () => {
        const selection = get().selectedFoodSelection;
        set({ selectedFoodSelection: null });
        return selection;
      },

      reset: () =>
        set({
          todayLogs: [],
          dailyGoal: DEFAULT_GOAL,
          waterMl: 0,
          selectedDate: getTodayDateKey(),
          streakDays: [],
          chatMessages: [],
          isLoading: false,
          lastFetchedAt: null,
          selectedFoodSelection: null,
          todayTotals: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
        }),
    }),
    {
      name: "hugoal-nutrition-store-v1",
      storage: createJSONStorage(() =>
        createMMKVStateStorage("hugoal-nutrition-store"),
      ),
      partialize: (state): PersistedNutritionSlice => ({
        selectedDate: state.selectedDate,
        dailyGoal: state.dailyGoal,
        waterMl: state.waterMl,
        todayTotals: state.todayTotals,
        lastFetchedAt: state.lastFetchedAt,
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as PersistedNutritionSlice | undefined;
        if (!persistedState) {
          return current;
        }

        const today = getTodayDateKey();
        if (persistedState.selectedDate !== today) {
          return {
            ...current,
            dailyGoal: persistedState.dailyGoal,
            selectedDate: today,
            waterMl: 0,
            todayTotals: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
            lastFetchedAt: null,
          };
        }

        return {
          ...current,
          ...persistedState,
        };
      },
    },
  ),
);
