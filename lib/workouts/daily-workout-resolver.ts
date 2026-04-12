import {
  getWorkoutDailyOverride,
  getWorkoutWeekPlan,
  upsertWorkoutDailyOverride,
  upsertWorkoutWeekPlan,
  type WorkoutDailyOverrideRecord,
  type WorkoutTemplateRecord,
} from "@/lib/firestore/workouts";
import {
  buildWorkoutWeekPlan,
  formatLocalDateKey,
  startOfWeekMonday,
  type WorkoutWeekPlanRecord,
} from "@/lib/workouts/weekly-schedule";

export interface DailyWorkoutResolution {
  todayDate: string;
  currentWeekPlan: WorkoutWeekPlanRecord;
  nextWeekPlan: WorkoutWeekPlanRecord;
  override: WorkoutDailyOverrideRecord | null;
  resolvedTemplateId: string | null;
}

export async function ensureDailyWorkoutResolution(input: {
  uid: string;
  templates: WorkoutTemplateRecord[];
  trainingDays: number[];
}): Promise<DailyWorkoutResolution> {
  const { uid, templates, trainingDays } = input;

  const currentMonday = startOfWeekMonday(new Date());
  const nextMonday = new Date(currentMonday);
  nextMonday.setDate(currentMonday.getDate() + 7);

  const currentWeekStart = formatLocalDateKey(currentMonday);
  const nextWeekStart = formatLocalDateKey(nextMonday);
  const todayDate = formatLocalDateKey(new Date());

  let currentWeekPlan: WorkoutWeekPlanRecord | null = null;
  try {
    currentWeekPlan = await getWorkoutWeekPlan(uid, currentWeekStart);
  } catch (error) {
    console.error(
      "[ensureDailyWorkoutResolution] getWorkoutWeekPlan(current)",
      {
        uid,
        currentWeekStart,
        error,
      },
    );
    throw error;
  }
  if (!currentWeekPlan) {
    currentWeekPlan = buildWorkoutWeekPlan({
      uid,
      weekStartDate: currentWeekStart,
      trainingDays,
      templates,
      rotationOffset: 0,
    });
    try {
      await upsertWorkoutWeekPlan(currentWeekPlan);
    } catch (error) {
      console.error(
        "[ensureDailyWorkoutResolution] upsertWorkoutWeekPlan(current)",
        {
          uid,
          currentWeekStart,
          planId: currentWeekPlan.id,
          error,
        },
      );
      throw error;
    }
  }

  let nextWeekPlan: WorkoutWeekPlanRecord | null = null;
  try {
    nextWeekPlan = await getWorkoutWeekPlan(uid, nextWeekStart);
  } catch (error) {
    console.error("[ensureDailyWorkoutResolution] getWorkoutWeekPlan(next)", {
      uid,
      nextWeekStart,
      error,
    });
    throw error;
  }
  if (!nextWeekPlan) {
    nextWeekPlan = buildWorkoutWeekPlan({
      uid,
      weekStartDate: nextWeekStart,
      trainingDays,
      templates,
      rotationOffset: currentWeekPlan.next_rotation_offset,
    });
    try {
      await upsertWorkoutWeekPlan(nextWeekPlan);
    } catch (error) {
      console.error(
        "[ensureDailyWorkoutResolution] upsertWorkoutWeekPlan(next)",
        {
          uid,
          nextWeekStart,
          planId: nextWeekPlan.id,
          error,
        },
      );
      throw error;
    }
  }

  const todayAssignment = currentWeekPlan.days.find(
    (day) => day.date === todayDate,
  );
  let override: WorkoutDailyOverrideRecord | null = null;
  try {
    override = await getWorkoutDailyOverride(uid, todayDate);
  } catch (error) {
    console.error("[ensureDailyWorkoutResolution] getWorkoutDailyOverride", {
      uid,
      todayDate,
      error,
    });
    throw error;
  }

  const activeTemplates = templates.filter((item) => item.is_active !== false);
  if (
    !override &&
    !todayAssignment?.template_id &&
    activeTemplates.length > 0
  ) {
    try {
      override = await upsertWorkoutDailyOverride(uid, todayDate, {
        template_id: activeTemplates[0].id,
        source_template_id: undefined,
        source_type: "auto_no_active_day",
      });
    } catch (error) {
      console.error(
        "[ensureDailyWorkoutResolution] upsertWorkoutDailyOverride(auto)",
        {
          uid,
          todayDate,
          templateId: activeTemplates[0].id,
          error,
        },
      );
      throw error;
    }
  }

  return {
    todayDate,
    currentWeekPlan,
    nextWeekPlan,
    override: override ?? null,
    resolvedTemplateId:
      override?.template_id ?? todayAssignment?.template_id ?? null,
  };
}
