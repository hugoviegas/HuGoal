import type { CachedLibraryExercise } from "@/lib/workouts/exercise-cache";

export type ExerciseFilterKey =
  | "all"
  | "warmup"
  | "cooldown"
  | "mobility"
  | "hiit"
  | "calisthenics"
  | "strength"
  | "cardio"
  | "powerlifting"
  | "olympic_weightlifting"
  | "strongman"
  | "bodyweight"
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "band"
  | "kettlebell"
  | "accessory"
  | "beginner"
  | "intermediate"
  | "advanced"
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "biceps"
  | "triceps"
  | "legs"
  | "quadriceps"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core"
  | "abdominals"
  | "upper_body"
  | "lower_body"
  | "full_body";

export interface ExerciseFilterOption {
  key: ExerciseFilterKey;
  label: string;
  category: "intent" | "gear" | "level" | "muscle";
  count: number;
}

export interface ExerciseFilterGroup {
  title: string;
  description: string;
  options: ExerciseFilterOption[];
}

const INTENT_ORDER: RenderedExerciseFilterKey[] = [
  "warmup",
  "cooldown",
  "mobility",
  "hiit",
  "calisthenics",
  "strength",
  "cardio",
  "powerlifting",
  "olympic_weightlifting",
  "strongman",
];

const GEAR_ORDER: RenderedExerciseFilterKey[] = [
  "bodyweight",
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "band",
  "kettlebell",
  "accessory",
];

const LEVEL_ORDER: RenderedExerciseFilterKey[] = [
  "beginner",
  "intermediate",
  "advanced",
];

const MUSCLE_ORDER: RenderedExerciseFilterKey[] = [
  "chest",
  "back",
  "shoulders",
  "arms",
  "biceps",
  "triceps",
  "legs",
  "quadriceps",
  "hamstrings",
  "glutes",
  "calves",
  "core",
  "abdominals",
  "upper_body",
  "lower_body",
  "full_body",
];

type RenderedExerciseFilterKey = Exclude<ExerciseFilterKey, "all">;

const FILTER_LABELS: Record<RenderedExerciseFilterKey, string> = {
  warmup: "Warmup",
  cooldown: "Cooldown",
  mobility: "Mobility",
  hiit: "HIIT",
  calisthenics: "Calisthenics",
  strength: "Strength",
  cardio: "Cardio",
  powerlifting: "Powerlifting",
  olympic_weightlifting: "Olympic",
  strongman: "Strongman",
  bodyweight: "Bodyweight",
  barbell: "Barbell",
  dumbbell: "Dumbbell",
  machine: "Machine",
  cable: "Cable",
  band: "Bands",
  kettlebell: "Kettlebell",
  accessory: "Accessory",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  arms: "Arms",
  biceps: "Biceps",
  triceps: "Triceps",
  legs: "Legs",
  quadriceps: "Quadriceps",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  core: "Core",
  abdominals: "Abs",
  upper_body: "Upper Body",
  lower_body: "Lower Body",
  full_body: "Full Body",
};

function normalize(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function addTag(tags: ExerciseFilterKey[], tag: ExerciseFilterKey): void {
  if (!tags.includes(tag)) {
    tags.push(tag);
  }
}

function mapMuscleKey(muscle: string): RenderedExerciseFilterKey | null {
  const normalized = normalize(muscle)
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  switch (normalized) {
    case "chest":
    case "back":
    case "shoulders":
    case "arms":
    case "biceps":
    case "triceps":
    case "legs":
    case "quadriceps":
    case "hamstrings":
    case "glutes":
    case "calves":
    case "core":
    case "abdominals":
    case "upper_body":
    case "lower_body":
    case "full_body":
      return normalized;
    default:
      return null;
  }
}

function addMuscleTags(tags: ExerciseFilterKey[], muscles: string[]): void {
  const mappedMuscles = muscles
    .map((muscle) => mapMuscleKey(muscle))
    .filter((muscle): muscle is RenderedExerciseFilterKey => Boolean(muscle));

  for (const muscle of mappedMuscles) {
    addTag(tags, muscle);
  }
}

export function getExerciseFilterTags(
  exercise: CachedLibraryExercise,
): ExerciseFilterKey[] {
  const tags: ExerciseFilterKey[] = [];
  const sourceCategory = normalize(
    exercise.source_category ?? exercise.category,
  );
  const sourceEquipment = normalize(exercise.source_equipment);
  const exerciseType = normalize(exercise.type);
  const level = normalize(exercise.difficulty);

  if (
    level === "beginner" ||
    level === "intermediate" ||
    level === "advanced"
  ) {
    addTag(tags, level);
  }

  if (sourceCategory === "stretching") {
    addTag(tags, "mobility");
    if (exerciseType === "static") {
      addTag(tags, "cooldown");
    } else {
      addTag(tags, "warmup");
    }
  }

  if (sourceCategory === "cardio") {
    addTag(tags, "cardio");
    addTag(tags, "hiit");
  }

  if (sourceCategory === "plyometrics" || exerciseType === "plyometrics") {
    addTag(tags, "hiit");
  }

  if (sourceCategory === "strength") {
    addTag(tags, "strength");
  }

  if (sourceCategory === "powerlifting") {
    addTag(tags, "strength");
    addTag(tags, "powerlifting");
  }

  if (sourceCategory === "olympic weightlifting") {
    addTag(tags, "strength");
    addTag(tags, "olympic_weightlifting");
  }

  if (sourceCategory === "strongman") {
    addTag(tags, "strength");
    addTag(tags, "strongman");
  }

  if (exercise.equipment_label === "bodyweight") {
    addTag(tags, "calisthenics");
    addTag(tags, "bodyweight");
  }

  if (exercise.equipment_label === "barbell") addTag(tags, "barbell");
  if (exercise.equipment_label === "dumbbell") addTag(tags, "dumbbell");
  if (exercise.equipment_label === "machine") addTag(tags, "machine");
  if (exercise.equipment_label === "cable") addTag(tags, "cable");
  if (exercise.equipment_label === "band") addTag(tags, "band");
  if (exercise.equipment_label === "kettlebell") addTag(tags, "kettlebell");

  if (
    [
      "other",
      "medicine ball",
      "exercise ball",
      "foam roll",
      "e-z curl bar",
    ].includes(sourceEquipment)
  ) {
    addTag(tags, "accessory");
  }

  addMuscleTags(tags, exercise.primary_muscles ?? []);
  addMuscleTags(tags, exercise.secondary_muscles ?? []);

  return tags;
}

export function exerciseMatchesFilter(
  exercise: CachedLibraryExercise,
  filterKey: ExerciseFilterKey,
): boolean {
  if (filterKey === "all") {
    return true;
  }

  return getExerciseFilterTags(exercise).includes(filterKey);
}

export function buildExerciseFilterGroups(
  exercises: CachedLibraryExercise[],
): ExerciseFilterGroup[] {
  const counts = new Map<ExerciseFilterKey, number>();

  for (const exercise of exercises) {
    for (const tag of getExerciseFilterTags(exercise)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  const buildOptions = (
    keys: RenderedExerciseFilterKey[],
    category: ExerciseFilterOption["category"],
  ): ExerciseFilterOption[] =>
    keys
      .map((key) => ({
        key,
        label: FILTER_LABELS[key],
        category,
        count: counts.get(key) ?? 0,
      }))
      .filter((option) => option.count > 0);

  return [
    {
      title: "Level",
      description: "Beginner, intermediate, and advanced exercises.",
      options: buildOptions(LEVEL_ORDER, "level"),
    },
    {
      title: "Training intent",
      description: "Warmups, conditioning, and core training styles.",
      options: buildOptions(INTENT_ORDER, "intent"),
    },
    {
      title: "Gear",
      description: "Filter by the equipment the exercise actually uses.",
      options: buildOptions(GEAR_ORDER, "gear"),
    },
    {
      title: "Muscle groups",
      description: "Find exercises by the main muscle group involved.",
      options: buildOptions(MUSCLE_ORDER, "muscle"),
    },
  ];
}

export function getAllExerciseFilterCount(
  exercises: CachedLibraryExercise[] | null | undefined,
): number {
  return exercises?.length ?? 0;
}
