import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { WorkoutExercise, CompletedSet } from "@/types";
import type { WorkoutTemplateRecord } from "@/lib/firestore/workouts";
import { createMMKVStateStorage } from "@/lib/mmkv-storage";

export type WorkoutChatMessageType =
  | "user_text"
  | "ai_response"
  | "ai_workout_patch"
  | "ai_new_workout"
  | "user_file";

export interface WorkoutChatMessage {
  id: string;
  type: WorkoutChatMessageType;
  createdAt: string;
  text?: string;
  payload?: {
    patch?: Partial<WorkoutTemplateRecord>;
    newTemplate?: Partial<WorkoutTemplateRecord>;
    file?: { localUri: string; name: string; mimeType: string };
  };
}

interface WorkoutState {
  isActive: boolean;
  currentExerciseIndex: number;
  currentSet: number;
  exercises: WorkoutExercise[];
  completedSets: CompletedSet[];
  elapsedSeconds: number;
  restSeconds: number;
  isResting: boolean;
  templateId: string | null;
  templateName: string | null;
  todayWorkout: WorkoutTemplateRecord | null;

  chatMessages: WorkoutChatMessage[];
  setChatMessages: (messages: WorkoutChatMessage[]) => void;
  addChatMessage: (message: WorkoutChatMessage) => void;
  setTodayWorkout: (template: WorkoutTemplateRecord | null) => void;

  start: (
    templateId: string,
    templateName: string,
    exercises: WorkoutExercise[],
  ) => void;
  nextExercise: () => void;
  prevExercise: () => void;
  completeSet: (set: CompletedSet) => void;
  setElapsed: (seconds: number) => void;
  setResting: (isResting: boolean, seconds: number) => void;
  tickRest: () => void;
  reorderExercises: (exercises: WorkoutExercise[]) => void;
  reset: () => void;
}

interface PersistedWorkoutSlice {
  isActive: boolean;
  currentExerciseIndex: number;
  currentSet: number;
  exercises: WorkoutExercise[];
  completedSets: CompletedSet[];
  elapsedSeconds: number;
  restSeconds: number;
  isResting: boolean;
  templateId: string | null;
  templateName: string | null;
}

const initialState = {
  isActive: false,
  currentExerciseIndex: 0,
  currentSet: 1,
  exercises: [] as WorkoutExercise[],
  completedSets: [] as CompletedSet[],
  elapsedSeconds: 0,
  restSeconds: 0,
  isResting: false,
  templateId: null as string | null,
  templateName: null as string | null,
  todayWorkout: null as WorkoutTemplateRecord | null,
  chatMessages: [] as WorkoutChatMessage[],
};

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set) => ({
      ...initialState,

      setChatMessages: (messages) => set({ chatMessages: messages }),

      setTodayWorkout: (template) => set({ todayWorkout: template }),

      addChatMessage: (message) =>
        set((state) => ({ chatMessages: [...state.chatMessages, message] })),

      start: (templateId, templateName, exercises) =>
        set({
          isActive: true,
          templateId,
          templateName,
          exercises,
          currentExerciseIndex: 0,
          currentSet: 1,
          completedSets: [],
          elapsedSeconds: 0,
          restSeconds: 0,
          isResting: false,
        }),

      nextExercise: () =>
        set((state) => {
          const next = state.currentExerciseIndex + 1;
          if (next >= state.exercises.length) return state;
          return { currentExerciseIndex: next, currentSet: 1 };
        }),

      prevExercise: () =>
        set((state) => {
          const prev = state.currentExerciseIndex - 1;
          if (prev < 0) return state;
          return { currentExerciseIndex: prev, currentSet: 1 };
        }),

      completeSet: (completedSet) =>
        set((state) => ({
          completedSets: [...state.completedSets, completedSet],
          currentSet: state.currentSet + 1,
        })),

      setElapsed: (seconds) => set({ elapsedSeconds: seconds }),

      setResting: (isResting, seconds) =>
        set({ isResting, restSeconds: seconds }),

      tickRest: () =>
        set((state) => {
          if (state.restSeconds <= 1)
            return { isResting: false, restSeconds: 0 };
          return { restSeconds: state.restSeconds - 1 };
        }),

      reorderExercises: (exercises) => set({ exercises }),

      reset: () => set(initialState),
    }),
    {
      name: "hugoal-workout-store-v1",
      storage: createJSONStorage(() =>
        createMMKVStateStorage("hugoal-workout-store"),
      ),
      partialize: (state): PersistedWorkoutSlice => ({
        isActive: state.isActive,
        currentExerciseIndex: state.currentExerciseIndex,
        currentSet: state.currentSet,
        exercises: state.exercises,
        completedSets: state.completedSets,
        elapsedSeconds: state.elapsedSeconds,
        restSeconds: state.restSeconds,
        isResting: state.isResting,
        templateId: state.templateId,
        templateName: state.templateName,
      }),
    },
  ),
);
