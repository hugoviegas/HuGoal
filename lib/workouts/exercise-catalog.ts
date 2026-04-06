import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Exercise } from "@/types";
import { listOfficialExercisesFromFirestore } from "@/lib/firestore/exercises";
import {
  OFFICIAL_EXERCISES,
  type OfficialExerciseRecord,
} from "@/lib/workouts/generated/official-exercises";

const CATALOG_CACHE_KEY = "workouts:exercise_catalog:v1";
const CATALOG_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

interface CachedCatalogPayload {
  savedAt: number;
  exercises: OfficialExerciseRecord[];
}

export interface ExerciseCatalogResult {
  exercises: OfficialExerciseRecord[];
  source: "firestore" | "cache" | "bundled";
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

function isCacheFresh(savedAt: number): boolean {
  return Date.now() - savedAt <= CATALOG_CACHE_TTL_MS;
}

async function readCatalogCache(): Promise<OfficialExerciseRecord[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CATALOG_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CachedCatalogPayload;
    if (!parsed?.savedAt || !Array.isArray(parsed.exercises)) {
      return null;
    }

    if (!isCacheFresh(parsed.savedAt) || parsed.exercises.length === 0) {
      return null;
    }

    return uniqueById(parsed.exercises);
  } catch {
    return null;
  }
}

async function saveCatalogCache(exercises: OfficialExerciseRecord[]): Promise<void> {
  try {
    const payload: CachedCatalogPayload = {
      savedAt: Date.now(),
      exercises: uniqueById(exercises),
    };
    await AsyncStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Best-effort cache write.
  }
}

export async function getExerciseCatalog(
  forceRefresh = false,
): Promise<ExerciseCatalogResult> {
  if (!forceRefresh) {
    const cache = await readCatalogCache();
    if (cache && cache.length > 0) {
      return { exercises: cache, source: "cache" };
    }
  }

  try {
    const firestoreExercises = await listOfficialExercisesFromFirestore();
    if (firestoreExercises.length > 0) {
      const normalized = uniqueById(firestoreExercises);
      await saveCatalogCache(normalized);
      return { exercises: normalized, source: "firestore" };
    }
  } catch {
    // Firestore unavailable, continue with fallback.
  }

  const bundled = uniqueById(OFFICIAL_EXERCISES);
  await saveCatalogCache(bundled);
  return { exercises: bundled, source: "bundled" };
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

export function buildMuscleTabs(exercises: Exercise[]): Array<{ id: string; label: string }> {
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