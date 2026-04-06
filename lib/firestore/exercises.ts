import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  OFFICIAL_EXERCISES,
  type OfficialExerciseRecord,
} from "@/lib/workouts/generated/official-exercises";

const EXERCISES_COLLECTION = "exercises";
const IMPORT_BATCH_SIZE = 400;

interface ExerciseFirestoreRecord extends OfficialExerciseRecord {
  is_deleted?: boolean;
  source?: string;
  source_version?: string;
  imported_at?: string;
  updated_at?: string;
}

export async function listOfficialExercisesFromFirestore(): Promise<OfficialExerciseRecord[]> {
  const snapshot = await getDocs(collection(db, EXERCISES_COLLECTION));

  if (snapshot.empty) {
    return [];
  }

  return snapshot.docs
    .map((item) => item.data() as ExerciseFirestoreRecord)
    .filter((item) => !item.is_deleted)
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((item) => ({
      id: item.id,
      name: item.name,
      name_en: item.name_en,
      primary_muscles: item.primary_muscles ?? [],
      secondary_muscles: item.secondary_muscles ?? [],
      equipment: item.equipment ?? ["none"],
      difficulty: item.difficulty,
      video_youtube_ids: item.video_youtube_ids ?? [],
      video_storage_url: item.video_storage_url,
      instructions_pt: item.instructions_pt,
      instructions_en: item.instructions_en,
      aliases: item.aliases ?? [],
      category: item.category,
      muscle_primary: item.muscle_primary,
      muscle_secondary: item.muscle_secondary ?? [],
      training_style: item.training_style ?? [],
      type: item.type,
    }));
}

export interface ImportOfficialExercisesOptions {
  source?: string;
  sourceVersion?: string;
}

export async function importOfficialExercisesToFirestore(
  options: ImportOfficialExercisesOptions = {},
): Promise<{ imported: number }> {
  const source = options.source ?? "prototype_html";
  const sourceVersion = options.sourceVersion ?? "v2";
  const now = new Date().toISOString();

  for (let index = 0; index < OFFICIAL_EXERCISES.length; index += IMPORT_BATCH_SIZE) {
    const chunk = OFFICIAL_EXERCISES.slice(index, index + IMPORT_BATCH_SIZE);
    const batch = writeBatch(db);

    for (const exercise of chunk) {
      const reference = doc(db, EXERCISES_COLLECTION, exercise.id);
      batch.set(
        reference,
        {
          ...exercise,
          is_deleted: false,
          source,
          source_version: sourceVersion,
          imported_at: now,
          updated_at: serverTimestamp(),
        },
        { merge: true },
      );
    }

    await batch.commit();
  }

  return { imported: OFFICIAL_EXERCISES.length };
}

export async function upsertOfficialExercise(exercise: OfficialExerciseRecord): Promise<void> {
  const reference = doc(db, EXERCISES_COLLECTION, exercise.id);

  await setDoc(
    reference,
    {
      ...exercise,
      is_deleted: false,
      source: "manual_upsert",
      updated_at: serverTimestamp(),
    },
    { merge: true },
  );
}