import { create } from 'zustand';
import type { WorkoutExercise, CompletedSet } from '@/types';

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

  start: (templateId: string, templateName: string, exercises: WorkoutExercise[]) => void;
  nextExercise: () => void;
  prevExercise: () => void;
  completeSet: (set: CompletedSet) => void;
  setElapsed: (seconds: number) => void;
  setResting: (isResting: boolean, seconds: number) => void;
  tickRest: () => void;
  reorderExercises: (exercises: WorkoutExercise[]) => void;
  reset: () => void;
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
};

export const useWorkoutStore = create<WorkoutState>((set) => ({
  ...initialState,

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

  setResting: (isResting, seconds) => set({ isResting, restSeconds: seconds }),

  tickRest: () =>
    set((state) => {
      if (state.restSeconds <= 1) return { isResting: false, restSeconds: 0 };
      return { restSeconds: state.restSeconds - 1 };
    }),

  reorderExercises: (exercises) => set({ exercises }),

  reset: () => set(initialState),
}));
