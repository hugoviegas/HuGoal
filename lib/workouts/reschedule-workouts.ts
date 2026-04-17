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
import {
  OFFICIAL_EXERCISES,
  type OfficialExerciseRecord,
} from "@/lib/workouts/generated/official-exercises";
import type {
  EquipmentItemId,
  EquipmentType,
  WorkoutLocationProfile,
} from "@/types";
import type { WorkoutTemplateRecord } from "@/lib/firestore/workouts";

interface RescheduleWorkoutOptions {
  locationType?: WorkoutLocationProfile;
  equipmentIds?: EquipmentItemId[];
}

const OFFICIAL_CATALOG_BY_ID: Record<string, OfficialExerciseRecord> =
  OFFICIAL_EXERCISES.reduce<Record<string, OfficialExerciseRecord>>(
    (acc, exercise) => {
      acc[exercise.id] = exercise;
      return acc;
    },
    {},
  );

const EQUIPMENT_ITEM_TO_LEGACY: Partial<
  Record<EquipmentItemId, EquipmentType>
> = {
  none: "none",
  barbell: "barbell",
  dumbbell: "dumbbell",
  dumbbell_adjustable: "dumbbell",
  kettlebell: "kettlebell",
  plates: "barbell",
  weighted_vest: "bodyweight",
  dip_belt: "bodyweight",
  ez_bar: "barbell",
  machine_cable: "cable",
  machine_chest_press: "machine",
  machine_lat_pulldown: "machine",
  machine_leg_extension: "machine",
  machine_leg_lift: "machine",
  machine_butterfly: "machine",
  machine_pulley: "cable",
  rack: "barbell",
  smith_machine: "machine",
  bodyweight: "bodyweight",
  pullup_bar: "bodyweight",
  dip_bars: "bodyweight",
  pushup_bars: "bodyweight",
  low_bar: "bodyweight",
  ab_wheel: "bodyweight",
  leg_lift_station: "bodyweight",
  treadmill: "none",
  exercise_bike: "none",
  outdoor_bike: "none",
  rower: "none",
  jump_rope: "none",
  bench: "bodyweight",
  box: "bodyweight",
  resistance_band: "band",
  glute_band: "band",
  foam_roller: "bodyweight",
  gym_ball: "bodyweight",
  suspension_trainer: "band",
  gliding_discs: "bodyweight",
  stick_towel_cord: "band",
  pole: "bodyweight",
  wall: "bodyweight",
};

function normalize(value: string): string {
  return String(value).trim().toLowerCase().replace(/\s+/g, "_");
}

function filterTemplatesForLocation(
  templates: WorkoutTemplateRecord[],
  location: WorkoutLocationProfile,
  locationEquipment: EquipmentType[],
  catalogById: Record<string, OfficialExerciseRecord>,
): WorkoutTemplateRecord[] {
  const allowedEquipment = new Set(locationEquipment);

  return templates.filter((template) => {
    if (template.is_active === false) return false;

    const templateLocation = normalize(template.location ?? "");
    const chosenLocation = normalize(location);
    const locationMatch =
      templateLocation.length === 0 || templateLocation === chosenLocation;
    if (!locationMatch) return false;

    if (allowedEquipment.size === 0) return true;

    for (const exercise of template.exercises) {
      const official = catalogById[exercise.id];
      if (!official) continue;
      const exerciseEquipment = official.equipment ?? ["none"];
      const hasCompatible = exerciseEquipment.some((item) =>
        allowedEquipment.has(item as EquipmentType),
      );
      if (!hasCompatible) return false;
    }

    return true;
  });
}

function mapEquipmentItemsToLegacyTypes(
  ids: EquipmentItemId[] = [],
): EquipmentType[] {
  return Array.from(
    new Set(
      ids
        .map((itemId) => EQUIPMENT_ITEM_TO_LEGACY[itemId])
        .filter((item): item is EquipmentType => !!item),
    ),
  );
}

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
  options: RescheduleWorkoutOptions = {},
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
    getCompletedSessionDates(uid, todayKey, formatLocalDateKey(endOfNextWeek)),
  ]);

  const filteredTemplates = options.locationType
    ? filterTemplatesForLocation(
        templates,
        options.locationType,
        mapEquipmentItemsToLegacyTypes(options.equipmentIds),
        OFFICIAL_CATALOG_BY_ID,
      )
    : templates;

  // If profile filters become too restrictive, preserve current behavior.
  const templatesForReschedule =
    filteredTemplates.length > 0 ? filteredTemplates : templates;

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
    templates: templatesForReschedule,
    rotationOffset: 0,
  });

  const newNextPlan = buildWorkoutWeekPlan({
    uid,
    weekStartDate: nextWeekStart,
    trainingDays,
    templates: templatesForReschedule,
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
