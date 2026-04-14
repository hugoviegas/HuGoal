import { startOfDay } from "date-fns";
import {
  getCompletedSessionDates,
  getWorkoutDailyOverride,
  listWorkoutTemplates,
  upsertWorkoutWeekPlan,
} from "@/lib/firestore/workouts";
import {
  addDays,
  buildWorkoutWeekPlan,
  formatLocalDateKey,
  startOfWeekMonday,
} from "@/lib/workouts/weekly-schedule";

/**
 * Rebuilds the current and next week workout plans for a user.
 *
 * Safety rules:
 * - Days before today are never touched (the week plan only covers Mon→Sun,
 *   and past-day assignments have no effect on already-completed sessions).
 * - Today is left intact if it has a completed session or a `manually_set` override.
 * - Days with `manually_set: true` overrides retain priority over the new plan
 *   because the resolver always prefers overrides over week-plan assignments.
 */
export async function rescheduleWorkouts(
  uid: string,
  trainingDays: number[],
): Promise<void> {
  const today = startOfDay(new Date());
  const todayKey = formatLocalDateKey(today);

  const currentMonday = startOfWeekMonday(today);
  const nextMonday = addDays(currentMonday, 7);
  const endOfNextWeek = addDays(nextMonday, 6);

  const currentWeekStart = formatLocalDateKey(currentMonday);
  const nextWeekStart = formatLocalDateKey(nextMonday);

  // Fetch templates and completed dates in parallel
  const [templates, completedDates] = await Promise.all([
    listWorkoutTemplates(uid),
    getCompletedSessionDates(
      uid,
      todayKey,
      formatLocalDateKey(endOfNextWeek),
    ),
  ]);
  const completedSet = new Set(completedDates);

  // Check if today is protected (completed or manually set by the user)
  const [todayOverride] = await Promise.all([
    getWorkoutDailyOverride(uid, todayKey),
  ]);
  const todayIsProtected =
    completedSet.has(todayKey) || todayOverride?.manually_set === true;

  // Build new week plans (full rebuild from Monday = safe for future days)
  const newCurrentPlan = buildWorkoutWeekPlan({
    uid,
    weekStartDate: currentWeekStart,
    trainingDays,
    templates,
    rotationOffset: 0,
  });

  const newNextPlan = buildWorkoutWeekPlan({
    uid,
    weekStartDate: nextWeekStart,
    trainingDays,
    templates,
    rotationOffset: newCurrentPlan.next_rotation_offset,
  });

  // If today is protected, preserve the existing template assignment in the new plan
  // so the plan stays consistent with what the user already has/completed.
  if (todayIsProtected) {
    const todayDayEntry = newCurrentPlan.days.find((d) => d.date === todayKey);
    if (todayDayEntry && todayOverride?.template_id) {
      todayDayEntry.template_id = todayOverride.template_id;
    }
  }

  await Promise.all([
    upsertWorkoutWeekPlan(newCurrentPlan),
    upsertWorkoutWeekPlan(newNextPlan),
  ]);
}
