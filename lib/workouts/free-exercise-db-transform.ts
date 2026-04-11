import type { Difficulty, EquipmentType } from "@/types";
import type { OfficialExerciseRecord } from "@/lib/workouts/generated/official-exercises";

export const FREE_EXERCISE_DB_DIST_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
export const FREE_EXERCISE_DB_IMAGE_PREFIX =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

export interface FreeExerciseDbRecord {
  id: string;
  name: string;
  force: string | null;
  level: "beginner" | "intermediate" | "expert";
  mechanic: "isolation" | "compound" | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category:
    | "powerlifting"
    | "strength"
    | "stretching"
    | "cardio"
    | "olympic weightlifting"
    | "strongman"
    | "plyometrics";
  images: string[];
}

export interface FreeExerciseDbTransformedRecord extends OfficialExerciseRecord {
  force: string | null;
  mechanic: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  images: string[];
  source_id: string;
  source_level: string;
  source_equipment: string | null;
  source_category: string;
  source_images: string[];
  remote_image_urls: string[];
}

const EXTERNAL_LEVEL_TO_DIFFICULTY: Record<string, Difficulty> = {
  beginner: "beginner",
  intermediate: "intermediate",
  expert: "advanced",
};

const EXTERNAL_EQUIPMENT_TO_INTERNAL: Record<string, EquipmentType> = {
  barbell: "barbell",
  dumbbell: "dumbbell",
  machine: "machine",
  cable: "cable",
  "body only": "bodyweight",
  bands: "band",
  kettlebell: "kettlebell",
  kettlebells: "kettlebell",
  "e-z curl bar": "barbell",
  "medicine ball": "none",
  "exercise ball": "none",
  "foam roll": "none",
  "pull-up bar": "bodyweight",
  other: "none",
  null: "none",
};

function normalizeToken(value: string): string {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function toIdSlug(value: string): string {
  return normalizeToken(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toTitleCaseFromSnake(value: string): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function uniqueStringArray(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const normalized = String(value ?? "").trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    output.push(normalized);
  }

  return output;
}

function mapDifficulty(level: string): Difficulty {
  return EXTERNAL_LEVEL_TO_DIFFICULTY[normalizeToken(level)] ?? "intermediate";
}

function mapEquipment(equipment: string | null): EquipmentType[] {
  const key = normalizeToken(equipment ?? "null");
  const mapped = EXTERNAL_EQUIPMENT_TO_INTERNAL[key];
  return [mapped ?? "none"];
}

function mapMuscleList(muscles: string[] | undefined): string[] {
  return uniqueStringArray(
    (muscles ?? []).map((muscle) => {
      return toIdSlug(muscle).replace(/-/g, "_");
    }),
  );
}

function toTitleCaseWords(value: string): string {
  return String(value)
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildTrainingStyle(record: FreeExerciseDbRecord): string[] {
  return uniqueStringArray([
    record.force ? toTitleCaseWords(record.force) : null,
    record.mechanic ? toTitleCaseWords(record.mechanic) : null,
    record.category ? toTitleCaseWords(record.category) : null,
  ]);
}

function toInstructionText(lines: string[] | undefined): string | undefined {
  if (!Array.isArray(lines) || lines.length === 0) {
    return undefined;
  }
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function buildAliases(record: FreeExerciseDbRecord): string[] {
  return uniqueStringArray([record.name, record.id.replace(/_/g, " ")]);
}

export function buildFreeExerciseDbImageUrl(imagePath: string): string {
  return `${FREE_EXERCISE_DB_IMAGE_PREFIX}${imagePath}`;
}

export function transformFreeExerciseDbRecord(
  record: FreeExerciseDbRecord,
): FreeExerciseDbTransformedRecord {
  const primaryMuscles = mapMuscleList(record.primaryMuscles);
  const secondaryMuscles = mapMuscleList(record.secondaryMuscles);
  const primary = primaryMuscles[0] ?? "full_body";
  const id = toIdSlug(record.id || record.name);
  const sourceImages = uniqueStringArray(record.images ?? []);
  const trainingStyle = buildTrainingStyle(record);
  const type = record.mechanic
    ? toTitleCaseWords(record.mechanic)
    : (trainingStyle[0] ?? "General");

  return {
    id,
    name: record.name,
    name_en: record.name,
    force: record.force,
    mechanic: record.mechanic,
    category: record.category,
    primary_muscles: primaryMuscles.length ? primaryMuscles : ["full_body"],
    secondary_muscles: secondaryMuscles,
    primaryMuscles: uniqueStringArray(record.primaryMuscles),
    secondaryMuscles: uniqueStringArray(record.secondaryMuscles),
    equipment: mapEquipment(record.equipment),
    difficulty: mapDifficulty(record.level),
    video_youtube_ids: [],
    instructions_en: toInstructionText(record.instructions),
    instructions: uniqueStringArray(record.instructions),
    aliases: buildAliases(record),
    muscle_primary: toTitleCaseWords(primary),
    muscle_secondary: secondaryMuscles.map(toTitleCaseWords),
    training_style: trainingStyle,
    type,
    source_id: record.id,
    source_level: record.level,
    source_equipment: record.equipment,
    source_category: record.category,
    source_images: sourceImages,
    remote_image_urls: sourceImages.map(buildFreeExerciseDbImageUrl),
    images: sourceImages,
  };
}

export function transformFreeExerciseDbRecords(
  records: FreeExerciseDbRecord[],
  options: { limit?: number } = {},
): FreeExerciseDbTransformedRecord[] {
  const limit =
    typeof options.limit === "number" && options.limit > 0
      ? options.limit
      : records.length;

  return records.slice(0, limit).map(transformFreeExerciseDbRecord);
}
