import type {
  WorkoutTemplateExerciseRecord,
  WorkoutTemplateRecord,
} from "@/lib/firestore/workouts";
import type { EquipmentType, WorkoutLocationProfile } from "@/types";
import type { OfficialExerciseRecord } from "@/lib/workouts/generated/official-exercises";

export type WorkoutTypeOption =
  | "upper_body"
  | "lower_body"
  | "core"
  | "full_body"
  | "cardio";

export type DifficultyAdjustMode = "easier" | "harder";

const WORKOUT_TYPE_TARGETS: Record<WorkoutTypeOption, string[]> = {
  upper_body: [
    "chest",
    "back",
    "lats",
    "shoulders",
    "biceps",
    "triceps",
    "forearms",
  ],
  lower_body: ["quadriceps", "hamstrings", "glutes", "calves", "adductors"],
  core: ["abdominals", "abs", "core", "obliques", "lower_back"],
  full_body: [],
  cardio: ["cardio"],
};

function normalize(value: string): string {
  return String(value).trim().toLowerCase().replace(/\s+/g, "_");
}

function getTemplateMuscleSet(template: WorkoutTemplateRecord): Set<string> {
  const set = new Set<string>();
  for (const target of template.target_muscles ?? []) {
    set.add(normalize(target));
  }
  for (const ex of template.exercises) {
    for (const muscle of ex.muscleGroups ?? []) {
      set.add(normalize(muscle));
    }
  }
  return set;
}

function scoreTemplateForWorkoutType(
  template: WorkoutTemplateRecord,
  workoutType: WorkoutTypeOption,
): number {
  if (workoutType === "full_body") {
    return (
      (template.target_muscles?.length ?? 0) + template.exercises.length * 0.3
    );
  }

  const targets = WORKOUT_TYPE_TARGETS[workoutType];
  const muscleSet = getTemplateMuscleSet(template);
  let score = 0;

  for (const target of targets) {
    if (muscleSet.has(normalize(target))) {
      score += 2;
    }
  }

  if (workoutType === "cardio") {
    const tags = (template.tags ?? []).map(normalize);
    if (tags.some((tag) => tag.includes("cardio") || tag.includes("hiit"))) {
      score += 3;
    }
  }

  score += Math.min(template.exercises.length, 12) * 0.1;
  return score;
}

export function selectBestTemplateForWorkoutType(
  templates: WorkoutTemplateRecord[],
  workoutType: WorkoutTypeOption,
  currentTemplateId?: string,
): WorkoutTemplateRecord | null {
  const candidates = templates.filter(
    (template) =>
      template.is_active !== false && template.id !== currentTemplateId,
  );

  if (candidates.length === 0) {
    return null;
  }

  const ranked = candidates
    .map((template) => ({
      template,
      score: scoreTemplateForWorkoutType(template, workoutType),
    }))
    .sort((left, right) => right.score - left.score);

  return ranked[0]?.template ?? null;
}

function adjustRepsString(reps: string, delta: number): string {
  const match = reps.match(/\d+/);
  if (!match) {
    return reps;
  }
  const original = Number(match[0]);
  const next = Math.max(1, original + delta);
  return reps.replace(match[0], String(next));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function buildTimeAdjustedExercises(
  exercises: WorkoutTemplateExerciseRecord[],
  currentMinutes: number,
  targetMinutes: number,
): WorkoutTemplateExerciseRecord[] {
  if (exercises.length === 0) {
    return [];
  }

  const ratio = targetMinutes / Math.max(1, currentMinutes);

  if (ratio >= 1) {
    const stretched = exercises.map((exercise) => ({
      ...exercise,
      sets: clamp(Math.round(exercise.sets * Math.min(ratio, 1.8)), 1, 8),
    }));

    if (ratio > 1.3) {
      const extraCount = clamp(
        Math.round((ratio - 1) * Math.max(1, exercises.length / 2)),
        0,
        exercises.length,
      );
      const extras = exercises.slice(0, extraCount).map((exercise, idx) => ({
        ...exercise,
        id: `${exercise.id}_extra_${idx}`,
      }));
      return [...stretched, ...extras];
    }

    return stretched;
  }

  const compressedSets = exercises.map((exercise) => ({
    ...exercise,
    sets: clamp(Math.round(exercise.sets * Math.max(ratio, 0.5)), 1, 8),
  }));

  if (ratio < 0.85) {
    const keepCount = clamp(
      Math.round(exercises.length * Math.max(ratio, 0.55)),
      1,
      exercises.length,
    );
    return compressedSets.slice(0, keepCount);
  }

  return compressedSets;
}

export function buildDifficultyAdjustedExercises(
  exercises: WorkoutTemplateExerciseRecord[],
  mode: DifficultyAdjustMode,
): WorkoutTemplateExerciseRecord[] {
  if (exercises.length === 0) {
    return [];
  }

  const delta = mode === "harder" ? 2 : -2;
  const setDelta = mode === "harder" ? 1 : -1;

  return exercises.map((exercise) => ({
    ...exercise,
    sets: clamp(exercise.sets + setDelta, 1, 8),
    reps: adjustRepsString(exercise.reps, delta),
  }));
}

export function filterTemplatesForLocation(
  templates: WorkoutTemplateRecord[],
  location: WorkoutLocationProfile,
  locationEquipment: EquipmentType[],
  catalogById: Record<string, OfficialExerciseRecord>,
): WorkoutTemplateRecord[] {
  const allowedEquipment = new Set(locationEquipment);

  return templates.filter((template) => {
    if (template.is_active === false) {
      return false;
    }

    const templateLocation = normalize(template.location ?? "");
    const chosenLocation = normalize(location);

    const locationMatch =
      templateLocation.length === 0 || templateLocation === chosenLocation;
    if (!locationMatch) {
      return false;
    }

    if (allowedEquipment.size === 0) {
      return true;
    }

    for (const exercise of template.exercises) {
      const official = catalogById[exercise.id];
      if (!official) {
        continue;
      }
      const exerciseEquipment = official.equipment ?? ["none"];
      const hasCompatible = exerciseEquipment.some((item) =>
        allowedEquipment.has(item as EquipmentType),
      );
      if (!hasCompatible) {
        return false;
      }
    }

    return true;
  });
}
