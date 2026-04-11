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

export type ExerciseImportRecord = OfficialExerciseRecord;

export async function listOfficialExercisesFromFirestore(): Promise<
  OfficialExerciseRecord[]
> {
  const snapshot = await getDocs(collection(db, EXERCISES_COLLECTION));

  if (snapshot.empty) {
    return [];
  }

  return snapshot.docs
    .map((item) => item.data() as ExerciseFirestoreRecord)
    .filter((item) => !item.is_deleted)
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((item) => ({
      ...item,
      id: item.id,
      name: item.name,
      name_en: item.name_en,
      primary_muscles: item.primary_muscles ?? item.primaryMuscles ?? [],
      secondary_muscles: item.secondary_muscles ?? item.secondaryMuscles ?? [],
      primaryMuscles: item.primaryMuscles ?? item.primary_muscles ?? [],
      secondaryMuscles: item.secondaryMuscles ?? item.secondary_muscles ?? [],
      equipment: item.equipment ?? ["none"],
      difficulty: item.difficulty,
      video_youtube_ids: item.video_youtube_ids ?? [],
      video_storage_url: item.video_storage_url,
      instructions_pt: item.instructions_pt,
      instructions_en: item.instructions_en,
      instructions: item.instructions ?? [],
      aliases: item.aliases ?? [],
      images: item.images ?? [],
      category: item.category,
      muscle_primary: item.muscle_primary,
      muscle_secondary: item.muscle_secondary ?? [],
      training_style: item.training_style ?? [],
      type: item.type,
      force: item.force ?? null,
      mechanic: item.mechanic ?? null,
      source_id: item.source_id,
      source_level: item.source_level,
      source_equipment: item.source_equipment,
      source_category: item.source_category,
      source_images: item.source_images ?? [],
      remote_image_urls: item.remote_image_urls ?? [],
    }));
}

export interface ImportOfficialExercisesOptions {
  source?: string;
  sourceVersion?: string;
}

export async function importExercisesToFirestore<
  TExercise extends ExerciseImportRecord,
>(
  exercises: TExercise[],
  options: ImportOfficialExercisesOptions = {},
): Promise<{ imported: number }> {
  const source = options.source ?? "external_import";
  const sourceVersion = options.sourceVersion ?? "v1";
  const now = new Date().toISOString();

  for (let index = 0; index < exercises.length; index += IMPORT_BATCH_SIZE) {
    const chunk = exercises.slice(index, index + IMPORT_BATCH_SIZE);
    const batch = writeBatch(db);

    for (const exercise of chunk) {
      const reference = doc(db, EXERCISES_COLLECTION, exercise.id);
      batch.set(reference, {
        ...exercise,
        is_deleted: false,
        source,
        source_version: sourceVersion,
        imported_at: now,
        updated_at: serverTimestamp(),
      });
    }

    await batch.commit();
  }

  return { imported: exercises.length };
}

async function deleteExercisesByIds(ids: string[]): Promise<number> {
  let deleted = 0;

  for (let index = 0; index < ids.length; index += IMPORT_BATCH_SIZE) {
    const chunk = ids.slice(index, index + IMPORT_BATCH_SIZE);
    if (chunk.length === 0) {
      continue;
    }

    const batch = writeBatch(db);
    for (const id of chunk) {
      batch.delete(doc(db, EXERCISES_COLLECTION, id));
    }
    await batch.commit();
    deleted += chunk.length;
  }

  return deleted;
}

export async function purgeExercisesCollection(): Promise<{ deleted: number }> {
  const snapshot = await getDocs(collection(db, EXERCISES_COLLECTION));
  const ids = snapshot.docs.map((item) => item.id);
  const deleted = await deleteExercisesByIds(ids);
  return { deleted };
}

export async function replaceExercisesInFirestore<
  TExercise extends ExerciseImportRecord,
>(
  exercises: TExercise[],
  options: ImportOfficialExercisesOptions = {},
): Promise<{ deleted: number; imported: number }> {
  const snapshot = await getDocs(collection(db, EXERCISES_COLLECTION));
  const deleted = await deleteExercisesByIds(
    snapshot.docs.map((item) => item.id),
  );
  const imported = await importExercisesToFirestore(exercises, options);

  return { deleted, imported: imported.imported };
}

export async function importOfficialExercisesToFirestore(
  options: ImportOfficialExercisesOptions = {},
): Promise<{ imported: number }> {
  return importExercisesToFirestore(OFFICIAL_EXERCISES, {
    source: options.source ?? "prototype_html",
    sourceVersion: options.sourceVersion ?? "v2",
  });
}

export async function upsertOfficialExercise(
  exercise: OfficialExerciseRecord,
): Promise<void> {
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
