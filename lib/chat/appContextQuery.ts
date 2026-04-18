import { subDays } from "date-fns";

import { listNutritionLogs } from "@/lib/firestore/nutrition";
import { getNutritionSettings } from "@/lib/firestore/nutrition-settings";
import {
  getCompletedSessionDates,
  listWorkoutTemplates,
  type WorkoutTemplateRecord,
} from "@/lib/firestore/workouts";
import { useAuthStore } from "@/stores/auth.store";
import { useWorkoutStore } from "@/stores/workout.store";
import type { UserProfile } from "@/types";

export interface AppContextSnapshot {
  todayNutrition: {
    totalKcal: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    meals: Array<{
      id: string;
      meal_type: string;
      total: {
        calories: number;
        protein_g: number;
        carbs_g: number;
        fat_g: number;
      };
      logged_at: string;
    }>;
  };
  weeklyWorkouts: Array<{
    date: string;
    templateName: string;
    completed: boolean;
  }>;
  profile: {
    name: string;
    age: number | null;
    weight_kg: number | null;
    height_cm: number | null;
    goal: string | null;
    activity_level: string | null;
    preferred_ai_provider: string | null;
  };
  todayWorkout: {
    name: string;
    sections: number;
    exercises: number;
  } | null;
  streaks: {
    workoutStreak: number;
    logStreak: number;
  };
  recentBodyMetrics: Array<{
    date: string;
    weight_kg: number;
  }>;
}

function todayDateKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function summarizeWorkoutTemplate(template: WorkoutTemplateRecord | null) {
  if (!template) {
    return null;
  }

  return {
    name: template.name,
    sections: template.sections?.length ?? 0,
    exercises: template.exercises?.length ?? 0,
  };
}

function toGoalText(profile: UserProfile | null): string | null {
  return profile?.goal ?? null;
}

function computeNutritionStreak(logDates: string[]): number {
  if (logDates.length === 0) {
    return 0;
  }

  const today = new Date();
  let streak = 0;

  for (let offset = 0; offset < 60; offset += 1) {
    const dateKey = subDays(today, offset).toISOString().slice(0, 10);
    if (logDates.includes(dateKey)) {
      streak += 1;
      continue;
    }

    if (offset === 0) {
      continue;
    }

    break;
  }

  return streak;
}

function computeWorkoutStreak(completedDates: string[]): number {
  return computeNutritionStreak(completedDates);
}

function toRecentBodyMetrics(
  profile: UserProfile | null,
  currentWeight: number | null,
): Array<{ date: string; weight_kg: number }> {
  if (!profile) {
    return [];
  }

  const metrics: Array<{ date: string; weight_kg: number }> = [];
  if (typeof profile.weight_kg === "number") {
    metrics.push({ date: todayDateKey(), weight_kg: profile.weight_kg });
  }

  if (
    typeof currentWeight === "number" &&
    currentWeight !== profile.weight_kg
  ) {
    metrics.push({
      date: todayDateKey(),
      weight_kg: currentWeight,
    });
  }

  return metrics.slice(0, 7);
}

function buildWorkoutHistory(
  templateName: string,
  completedDates: string[],
): Array<{ date: string; templateName: string; completed: boolean }> {
  const recentDates = Array.from({ length: 7 }, (_, index) =>
    subDays(new Date(), index).toISOString().slice(0, 10),
  ).reverse();

  return recentDates.map((date) => ({
    date,
    templateName,
    completed: completedDates.includes(date),
  }));
}

export function formatAppContextSnapshot(snapshot: AppContextSnapshot): string {
  const nutrition = snapshot.todayNutrition;
  const profile = snapshot.profile;
  const workout = snapshot.todayWorkout;

  return [
    `Today's nutrition: ${nutrition.totalKcal}kcal / ${nutrition.totalProtein}g protein / ${nutrition.totalCarbs}g carbs / ${nutrition.totalFat}g fat`,
    workout
      ? `Today's workout: ${workout.name} (${workout.sections} sections, ${workout.exercises} exercises)`
      : "Today's workout: none",
    `Workout streak: ${snapshot.streaks.workoutStreak} days`,
    `Log streak: ${snapshot.streaks.logStreak} days`,
    `Profile: ${profile.name} | age=${profile.age ?? "n/a"} | weight=${profile.weight_kg ?? "n/a"}kg | height=${profile.height_cm ?? "n/a"}cm | goal=${profile.goal ?? "n/a"} | activity=${profile.activity_level ?? "n/a"} | ai=${profile.preferred_ai_provider ?? "n/a"}`,
    snapshot.weeklyWorkouts.length > 0
      ? `Weekly workouts: ${snapshot.weeklyWorkouts
          .map(
            (entry) =>
              `${entry.date}:${entry.templateName}:${entry.completed ? "done" : "pending"}`,
          )
          .join(" | ")}`
      : "Weekly workouts: none",
  ].join("\n");
}

export async function buildAppContextSnapshot(
  userId: string,
): Promise<AppContextSnapshot> {
  const auth = useAuthStore.getState();
  const workoutStore = useWorkoutStore.getState();
  const profile = auth.profile;

  const today = todayDateKey();
  const sevenDaysAgo = subDays(new Date(), 6).toISOString().slice(0, 10);
  const [nutritionLogs, settings, templates, completedDates] =
    await Promise.all([
      listNutritionLogs(userId, today).catch(() => []),
      getNutritionSettings(userId).catch(() => null),
      listWorkoutTemplates(userId).catch(() => []),
      getCompletedSessionDates(userId, sevenDaysAgo, today).catch(() => []),
    ]);

  const todayWorkoutTemplate =
    templates.find((template) => template.id === workoutStore.templateId) ??
    templates[0] ??
    null;

  const nutritionTotals = nutritionLogs.reduce(
    (acc, log) => ({
      calories: acc.calories + (log.total?.calories ?? 0),
      protein: acc.protein + (log.total?.protein_g ?? 0),
      carbs: acc.carbs + (log.total?.carbs_g ?? 0),
      fat: acc.fat + (log.total?.fat_g ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const recentWeight =
    settings?.current_weight_kg ?? profile?.weight_kg ?? null;

  return {
    todayNutrition: {
      totalKcal: nutritionTotals.calories,
      totalProtein: nutritionTotals.protein,
      totalCarbs: nutritionTotals.carbs,
      totalFat: nutritionTotals.fat,
      meals: nutritionLogs.map((log) => ({
        id: log.id,
        meal_type: log.meal_type,
        total: log.total,
        logged_at: log.logged_at,
      })),
    },
    weeklyWorkouts: buildWorkoutHistory(
      todayWorkoutTemplate?.name ?? workoutStore.templateName ?? "Workout",
      completedDates,
    ),
    profile: {
      name: profile?.name ?? "User",
      age: profile?.age ?? null,
      weight_kg: profile?.weight_kg ?? null,
      height_cm: profile?.height_cm ?? null,
      goal: toGoalText(profile),
      activity_level: profile?.level ?? null,
      preferred_ai_provider: profile?.preferred_ai_provider ?? null,
    },
    todayWorkout: summarizeWorkoutTemplate(todayWorkoutTemplate),
    streaks: {
      workoutStreak: computeWorkoutStreak(completedDates),
      logStreak: computeNutritionStreak(
        nutritionLogs.map((log) => log.logged_at.slice(0, 10)),
      ),
    },
    recentBodyMetrics: toRecentBodyMetrics(profile, recentWeight),
  };
}

export async function getAppContextSnapshotWithTimeout(
  userId: string,
  timeoutMs = 3000,
): Promise<AppContextSnapshot | null> {
  const timeout = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), timeoutMs);
  });

  return Promise.race([buildAppContextSnapshot(userId), timeout]);
}
