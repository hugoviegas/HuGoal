import type { Exercise, EquipmentType } from "@/types";
import {
  getExerciseCatalog,
  muscleKeyToLabel,
} from "@/lib/workouts/exercise-catalog";
import type { OfficialExerciseRecord } from "@/lib/workouts/generated/official-exercises";

export interface CachedLibraryExercise extends Exercise {
  has_weight: boolean;
  equipment_label: EquipmentType;
  short_description: string;
}

// Global cache - loaded once per app session
let EXERCISE_CACHE: CachedLibraryExercise[] | null = null;
let LOADING_PROMISE: Promise<CachedLibraryExercise[]> | null = null;
let EQUIPMENT_FILTERS_CACHE: string[] | null = null;

function mapSourceEquipmentToType(
  equipment: string | null | undefined,
): EquipmentType {
  const normalized = String(equipment ?? "").trim().toLowerCase();

  switch (normalized) {
    case "barbell":
    case "dumbbell":
    case "machine":
    case "cable":
      return normalized;
    case "body only":
    case "bodyweight":
    case "pull-up bar":
      return "bodyweight";
    case "bands":
    case "band":
      return "band";
    case "kettlebells":
    case "kettlebell":
      return "kettlebell";
    case "e-z curl bar":
    case "e z curl bar":
      return "barbell";
    default:
      return "none";
  }
}

export function toLibraryExercise(
  exercise: OfficialExerciseRecord,
): CachedLibraryExercise {
  const explicitEquipment = exercise.equipment.filter(
    (item): item is Exclude<EquipmentType, "none"> => item !== "none",
  );
  const fallbackEquipment = mapSourceEquipmentToType(exercise.source_equipment);
  const equipment: EquipmentType[] =
    explicitEquipment.length > 0
      ? explicitEquipment
      : fallbackEquipment === "none"
        ? ["none"]
        : [fallbackEquipment];

  const hasWeight = !equipment.every(
    (item) => item === "none" || item === "bodyweight",
  );

  const firstMuscle = exercise.primary_muscles[0]
    ? muscleKeyToLabel(exercise.primary_muscles[0])
    : "Mixed";

  return {
    ...exercise,
    equipment,
    equipment_label: equipment[0] ?? "none",
    has_weight: hasWeight,
    short_description: `${exercise.category} • ${firstMuscle}`,
  };
}

/**
 * Load and cache exercise catalog globally.
 * Returns cached copy if already loaded, otherwise fetches and caches.
 */
export async function loadExerciseCache(): Promise<CachedLibraryExercise[]> {
  // Return cache if already loaded
  if (EXERCISE_CACHE) {
    return EXERCISE_CACHE;
  }

  // Return existing loading promise if currently loading
  if (LOADING_PROMISE) {
    return LOADING_PROMISE;
  }

  // Start loading
  LOADING_PROMISE = (async () => {
    try {
      const catalog = await getExerciseCatalog();
      EXERCISE_CACHE = catalog.exercises.map(toLibraryExercise);
      return EXERCISE_CACHE;
    } catch (error) {
      console.error("[loadExerciseCache] Failed to load exercise catalog", error);
      EXERCISE_CACHE = [];
      return [];
    } finally {
      LOADING_PROMISE = null;
    }
  })();

  return LOADING_PROMISE;
}

/**
 * Get cached exercises or wait for them to load.
 * Safe to call multiple times - returns cached copy immediately after first load.
 */
export function getExerciseCache(): CachedLibraryExercise[] {
  if (EXERCISE_CACHE) {
    return EXERCISE_CACHE;
  }
  return [];
}

/**
 * Get available equipment filters from cached exercises.
 * Returns ["all", ...equipment types] sorted.
 */
export function getEquipmentFilters(): string[] {
  if (EQUIPMENT_FILTERS_CACHE) {
    return EQUIPMENT_FILTERS_CACHE;
  }

  if (!EXERCISE_CACHE || EXERCISE_CACHE.length === 0) {
    return ["all"];
  }

  const catalogEquipment = new Set<string>();
  for (const exercise of EXERCISE_CACHE) {
    for (const eq of exercise.equipment) {
      catalogEquipment.add(eq);
    }
  }

  EQUIPMENT_FILTERS_CACHE = ["all", ...Array.from(catalogEquipment).sort()];
  return EQUIPMENT_FILTERS_CACHE;
}

/**
 * Pre-warm cache in background (call on app start).
 * Returns immediately, loads in background.
 */
export function prewarmExerciseCache(): void {
  // Fire and forget - just start loading
  loadExerciseCache().catch((error) => {
    console.error("[prewarmExerciseCache] Background load failed", error);
  });
}

/**
 * Clear cache (for debugging or forced refresh).
 */
export function clearExerciseCache(): void {
  EXERCISE_CACHE = null;
  EQUIPMENT_FILTERS_CACHE = null;
  LOADING_PROMISE = null;
}
