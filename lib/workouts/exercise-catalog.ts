import type { Exercise } from "@/types";
import {
  OFFICIAL_EXERCISES,
  type OfficialExerciseRecord,
} from "@/lib/workouts/generated/official-exercises";

export interface ExerciseCatalogResult {
  exercises: OfficialExerciseRecord[];
  source: "bundled";
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    result.push(item);
  }

  return result;
}

const BUNDLED_CATALOG: OfficialExerciseRecord[] =
  uniqueById(OFFICIAL_EXERCISES);

export async function getExerciseCatalog(
  _forceRefresh = false,
): Promise<ExerciseCatalogResult> {
  // Runtime always uses local bundled catalog for zero-network startup.
  return { exercises: BUNDLED_CATALOG, source: "bundled" };
}

export function toMuscleKey(value: string): string {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function muscleKeyToLabel(key: string): string {
  const text = key.replace(/_/g, " ").trim();
  if (!text) {
    return key;
  }

  return text
    .split(" ")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

export function buildMuscleTabs(
  exercises: Exercise[],
): Array<{ id: string; label: string }> {
  const byCount = new Map<string, number>();

  for (const exercise of exercises) {
    for (const muscle of exercise.primary_muscles ?? []) {
      byCount.set(muscle, (byCount.get(muscle) ?? 0) + 1);
    }
  }

  const sorted = [...byCount.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 12)
    .map(([id]) => ({ id, label: muscleKeyToLabel(id) }));

  return [{ id: "all", label: "All" }, ...sorted];
}
