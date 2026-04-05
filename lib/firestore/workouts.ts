import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export type WorkoutDifficulty = "beginner" | "intermediate" | "advanced";

export interface WorkoutTemplateExerciseRecord {
  id: string;
  name: string;
  sets: number;
  reps: string;
  muscleGroups: string[];
}

export interface WorkoutTemplateRecord {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  difficulty: WorkoutDifficulty;
  is_ai_generated: boolean;
  source_prompt?: string;
  exercises: WorkoutTemplateExerciseRecord[];
  estimated_duration_minutes: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface WorkoutTemplateInput {
  name: string;
  description?: string;
  difficulty: WorkoutDifficulty;
  is_ai_generated: boolean;
  source_prompt?: string;
  exercises: WorkoutTemplateExerciseRecord[];
  estimated_duration_minutes: number;
  tags?: string[];
}

function workoutsCollection() {
  return collection(db, "workout_templates");
}

export async function listWorkoutTemplates(
  uid: string,
): Promise<WorkoutTemplateRecord[]> {
  const snapshot = await getDocs(
    query(workoutsCollection(), where("user_id", "==", uid)),
  );

  return snapshot.docs
    .map((document) => document.data() as WorkoutTemplateRecord)
    .sort((left, right) => right.updated_at.localeCompare(left.updated_at));
}

export async function getWorkoutTemplate(
  templateId: string,
): Promise<WorkoutTemplateRecord | null> {
  const snapshot = await getDoc(doc(db, "workout_templates", templateId));
  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as WorkoutTemplateRecord;
}

export async function createWorkoutTemplate(
  uid: string,
  input: WorkoutTemplateInput,
): Promise<WorkoutTemplateRecord> {
  const now = new Date().toISOString();
  const reference = doc(workoutsCollection());
  const payload: WorkoutTemplateRecord = {
    id: reference.id,
    user_id: uid,
    name: input.name,
    description: input.description,
    difficulty: input.difficulty,
    is_ai_generated: input.is_ai_generated,
    source_prompt: input.source_prompt,
    exercises: input.exercises,
    estimated_duration_minutes: input.estimated_duration_minutes,
    tags: input.tags ?? [],
    created_at: now,
    updated_at: now,
  };

  const writePayload = stripUndefined({
    ...payload,
    created_at: now,
    updated_at: now,
  });

  await runTransaction(db, async (transaction) => {
    transaction.set(reference, writePayload);
  });

  return payload;
}

export async function updateWorkoutTemplate(
  templateId: string,
  patch: Partial<WorkoutTemplateInput>,
): Promise<void> {
  const reference = doc(db, "workout_templates", templateId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) {
      throw new Error("Workout not found");
    }

    const writePatch = stripUndefined({
      ...patch,
      updated_at: new Date().toISOString(),
    });

    transaction.set(reference, writePatch, { merge: true });
  });
}
