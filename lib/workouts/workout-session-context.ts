import type { WorkoutDailyOverrideRecord, WorkoutTemplateRecord } from "@/lib/firestore/workouts";
import type { EquipmentItemId, UserProfile, WorkoutLocationProfile } from "@/types";
import type { EquipmentType } from "@/types";

export interface WorkoutSessionContextBlock {
  exercise_id?: string;
  name?: string;
  sets?: number;
  reps?: string;
  execution_mode?: string;
  primary_muscles?: string[];
  prescription?: string;
  type?: "exercise" | "rest";
  order?: number;
  rest_seconds?: number;
}

export interface WorkoutSessionContextSection {
  name: string;
  type: string;
  blocks: WorkoutSessionContextBlock[];
}

export interface WorkoutSessionContext {
  template_id: string;
  template_name: string;
  difficulty: string;
  estimated_duration_minutes: number;
  location: string | undefined;
  target_muscles: string[];
  sections: WorkoutSessionContextSection[];
  user_equipment: string[];
  user_locations: string[];
  user_training_days: number[];
  user_fitness_goal: string;
  today_override: { source_type: string; manually_set: boolean } | null;
}

function blockPrescription(block: {
  reps?: string;
  execution_mode?: string;
  exercise_seconds?: number;
  duration_seconds?: number;
  prep_seconds?: number;
}): string {
  const mode =
    block.execution_mode ??
    ((block.exercise_seconds ?? block.duration_seconds ?? 0) > 0 ? "time" : "reps");
  if (mode === "time") {
    const work = block.exercise_seconds ?? block.duration_seconds ?? 30;
    const prep = block.prep_seconds ?? 0;
    return prep > 0 ? `${work}s + prep ${prep}s` : `${work}s`;
  }
  return block.reps || "-";
}

// Maps the expanded EquipmentItemId values to the normalized EquipmentType
// used by the exercise catalog index.
function equipmentItemToType(id: EquipmentItemId): EquipmentType | null {
  switch (id) {
    case "barbell":
    case "ez_bar":
    case "plates":
      return "barbell";
    case "dumbbell":
    case "dumbbell_adjustable":
      return "dumbbell";
    case "kettlebell":
      return "kettlebell";
    case "resistance_band":
    case "glute_band":
      return "band";
    case "machine_cable":
      return "cable";
    case "machine_chest_press":
    case "machine_lat_pulldown":
    case "machine_leg_extension":
    case "machine_leg_lift":
    case "machine_butterfly":
    case "machine_pulley":
    case "smith_machine":
    case "rack":
      return "machine";
    case "bodyweight":
    case "pullup_bar":
    case "dip_bars":
    case "pushup_bars":
    case "low_bar":
    case "ab_wheel":
    case "leg_lift_station":
      return "bodyweight";
    default:
      return null;
  }
}

function resolveActiveLocation(
  profile: UserProfile,
): WorkoutLocationProfile | undefined {
  const settings = profile.workout_settings;
  if (!settings) return undefined;

  if (settings.active_location_profile_id && settings.location_profiles) {
    const matched = settings.location_profiles.find(
      (lp) => lp.id === settings.active_location_profile_id,
    );
    if (matched) return matched.type;
  }

  return settings.locations?.[0];
}

function resolveEquipment(profile: UserProfile): string[] {
  const settings = profile.workout_settings;
  if (!settings) return [];

  // Prefer new location_profiles format (equipment_ids → EquipmentType)
  if (settings.active_location_profile_id && settings.location_profiles) {
    const profile = settings.location_profiles.find(
      (lp) => lp.id === settings.active_location_profile_id,
    );
    if (profile?.equipment_ids && profile.equipment_ids.length > 0) {
      const types = new Set<string>();
      for (const id of profile.equipment_ids) {
        const mapped = equipmentItemToType(id);
        if (mapped && mapped !== "none") types.add(mapped);
      }
      // bodyweight is always available
      types.add("bodyweight");
      return Array.from(types);
    }
  }

  // Fall back to legacy equipment_by_location field
  const activeLocation = resolveActiveLocation({ workout_settings: settings } as UserProfile);
  if (activeLocation && settings.equipment_by_location?.[activeLocation]) {
    const eq = settings.equipment_by_location[activeLocation] as string[];
    return eq.length > 0 ? [...new Set([...eq, "bodyweight"])] : [];
  }

  return [];
}

export function buildWorkoutSessionContext(
  template: WorkoutTemplateRecord,
  profile: UserProfile,
  todayOverride: WorkoutDailyOverrideRecord | null,
): WorkoutSessionContext {
  const settings = profile.workout_settings;
  const activeLocation = resolveActiveLocation(profile);
  const equipment = resolveEquipment(profile);

  let sections: WorkoutSessionContextSection[];

  if (template.sections && template.sections.length > 0) {
    sections = template.sections
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        name: section.name,
        type: section.type,
        blocks: section.blocks
          .sort((a, b) => a.order - b.order)
          .map((b): WorkoutSessionContextBlock => {
            if (b.type === "rest") {
              return {
                type: "rest",
                order: b.order,
                rest_seconds: b.rest_seconds ?? b.duration_seconds ?? 60,
              };
            }
            if (!b.exercise_id) return { type: "rest", order: b.order, rest_seconds: 0 };
            return {
              type: "exercise",
              exercise_id: b.exercise_id,
              name: b.name ?? b.exercise_id,
              sets: 1,
              reps: b.reps ?? "",
              execution_mode: b.execution_mode ?? "reps",
              primary_muscles: b.primary_muscles ?? [],
              prescription: blockPrescription(b),
              order: b.order,
            };
          }),
      }));
  } else {
    sections = [
      {
        name: "Workout",
        type: "round",
        blocks: template.exercises.map((ex) => ({
          exercise_id: ex.id,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          execution_mode: "reps",
          primary_muscles: ex.muscleGroups ?? [],
          prescription: ex.reps || "-",
        })),
      },
    ];
  }

  const override =
    todayOverride
      ? {
          source_type: todayOverride.source_type ?? "unknown",
          manually_set: todayOverride.manually_set ?? false,
        }
      : null;

  return {
    template_id: template.id,
    template_name: template.name,
    difficulty: template.difficulty,
    estimated_duration_minutes: template.estimated_duration_minutes,
    location: template.location,
    target_muscles: template.target_muscles ?? [],
    sections,
    user_equipment: equipment,
    user_locations: (settings?.locations ?? []) as string[],
    user_training_days: settings?.training_days ?? [],
    user_fitness_goal: profile.goal ?? "maintain",
    today_override: override,
  };
}
