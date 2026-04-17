import { loadExerciseCache } from "@/lib/workouts/exercise-cache";
import type { CachedLibraryExercise } from "@/lib/workouts/exercise-cache";

export interface AIExerciseEntry {
  id: string;
  name: string;
  equipment: string;
  muscles: string[];
  category: string;
  level: string;
  mode: "reps" | "time";
}

export type AIExerciseIndex = {
  byId: Record<string, AIExerciseEntry>;
  byMuscle: Record<string, string[]>;
  byEquipment: Record<string, string[]>;
};

function inferExecutionMode(ex: CachedLibraryExercise): "reps" | "time" {
  if (["stretching", "cardio", "plyometrics"].includes(ex.category ?? ""))
    return "time";
  if (ex.type === "static") return "time";
  return "reps";
}

export function buildAICatalogIndex(
  exercises: CachedLibraryExercise[],
): AIExerciseIndex {
  const byId: Record<string, AIExerciseEntry> = {};
  const byMuscle: Record<string, string[]> = {};
  const byEquipment: Record<string, string[]> = {};

  for (const ex of exercises) {
    const entry: AIExerciseEntry = {
      id: ex.id,
      name: ex.name,
      equipment: ex.equipment_label,
      muscles: ex.primary_muscles,
      category: ex.category ?? "strength",
      level: ex.difficulty,
      mode: inferExecutionMode(ex),
    };

    byId[ex.id] = entry;

    for (const muscle of ex.primary_muscles) {
      (byMuscle[muscle] ??= []).push(ex.id);
    }

    const eqKey = ex.equipment_label;
    (byEquipment[eqKey] ??= []).push(ex.id);
  }

  return { byId, byMuscle, byEquipment };
}

let _catalogPromise: Promise<AIExerciseIndex> | null = null;

export async function getAICatalogIndex(): Promise<AIExerciseIndex> {
  if (_catalogPromise) return _catalogPromise;
  _catalogPromise = loadExerciseCache().then(buildAICatalogIndex);
  return _catalogPromise;
}

export function buildAIExerciseSubset(
  index: AIExerciseIndex,
  equipment: string[],
  muscles: string[],
  maxPerMuscle = 8,
): AIExerciseEntry[] {
  const eqSet = new Set(equipment.map((e) => e.toLowerCase()));
  // If the user has no equipment configured, skip equipment filtering entirely
  // so the AI receives a full catalog for the target muscles.
  const filterByEquipment = eqSet.size > 0;
  const seen = new Set<string>();
  const result: AIExerciseEntry[] = [];

  const addEntry = (id: string) => {
    if (seen.has(id)) return;
    const entry = index.byId[id];
    if (!entry) return;
    if (filterByEquipment) {
      // Always allow bodyweight; otherwise require equipment match
      if (entry.equipment !== "bodyweight" && !eqSet.has(entry.equipment)) return;
    }
    seen.add(id);
    result.push(entry);
  };

  // Prioritize by requested muscles, across all muscles if none specified
  const targetMuscles = muscles.length > 0 ? muscles : Object.keys(index.byMuscle);
  for (const muscle of targetMuscles) {
    const ids = (index.byMuscle[muscle] ?? []).slice(0, maxPerMuscle);
    for (const id of ids) addEntry(id);
  }

  // Fill remaining slots with equipment-matching (or any) exercises
  if (result.length < 100) {
    if (filterByEquipment) {
      for (const eq of equipment) {
        const ids = index.byEquipment[eq.toLowerCase()] ?? [];
        for (const id of ids) {
          if (result.length >= 100) break;
          addEntry(id);
        }
      }
    } else {
      for (const ids of Object.values(index.byEquipment)) {
        for (const id of ids) {
          if (result.length >= 100) break;
          addEntry(id);
        }
        if (result.length >= 100) break;
      }
    }
  }

  return result.slice(0, 100);
}
