import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
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

function sanitizeFirestoreValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeFirestoreValue(item))
      .filter((item) => item !== undefined) as T;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, fieldValue]) => fieldValue !== undefined)
      .map(([key, fieldValue]) => [key, sanitizeFirestoreValue(fieldValue)]);
    return Object.fromEntries(entries) as T;
  }

  return value;
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

export interface CompletedExerciseSetRecord {
  stepId: string;
  exerciseId: string;
  setNumber: number;
  repsCompleted: number;
  weightKg?: number;
  completedAt: string;
}

export interface PausedWorkoutSessionRecord {
  id: string;
  user_id: string;
  template_id: string;
  status: "paused";
  current_step_index: number;
  reps_done: string;
  weight_done: string;
  rest_remaining_seconds: number;
  timed_remaining_seconds: number;
  completed_sets: CompletedExerciseSetRecord[];
  started_at: string;
  paused_at: string;
  expires_at: string;
  updated_at: string;
}

export interface SavePausedWorkoutSessionInput {
  currentStepIndex: number;
  repsDone: string;
  weightDone: string;
  restRemainingSeconds: number;
  timedRemainingSeconds: number;
  completedSets: CompletedExerciseSetRecord[];
  startedAt?: string;
}

function workoutsCollection() {
  return collection(db, "workout_templates");
}

function workoutSessionDocId(uid: string, templateId: string): string {
  return `${uid}_${templateId}_active`;
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

export async function getPausedWorkoutSession(
  uid: string,
  templateId: string,
): Promise<PausedWorkoutSessionRecord | null> {
  const reference = doc(
    db,
    "workout_sessions",
    workoutSessionDocId(uid, templateId),
  );
  const snapshot = await getDoc(reference);
  if (!snapshot.exists()) {
    return null;
  }

  const session = snapshot.data() as PausedWorkoutSessionRecord;

  const hasExpired =
    session.status !== "paused" ||
    !session.expires_at ||
    new Date(session.expires_at).getTime() <= Date.now();

  if (hasExpired) {
    try {
      await deleteDoc(reference);
    } catch (error) {
      console.error(
        "[getPausedWorkoutSession] failed to cleanup expired session",
        {
          uid,
          templateId,
          error,
        },
      );
    }
    return null;
  }

  return session;
}

export async function savePausedWorkoutSession(
  uid: string,
  templateId: string,
  input: SavePausedWorkoutSessionInput,
): Promise<PausedWorkoutSessionRecord> {
  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAtIso = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const sessionId = workoutSessionDocId(uid, templateId);
  const payload: PausedWorkoutSessionRecord = {
    id: sessionId,
    user_id: uid,
    template_id: templateId,
    status: "paused",
    current_step_index: input.currentStepIndex,
    reps_done: input.repsDone,
    weight_done: input.weightDone,
    rest_remaining_seconds: input.restRemainingSeconds,
    timed_remaining_seconds: input.timedRemainingSeconds,
    completed_sets: input.completedSets,
    started_at: input.startedAt ?? nowIso,
    paused_at: nowIso,
    expires_at: expiresAtIso,
    updated_at: nowIso,
  };

  const sanitizedPayload = sanitizeFirestoreValue(payload);
  await setDoc(doc(db, "workout_sessions", sessionId), sanitizedPayload, {
    merge: true,
  });
  return payload;
}

export async function clearPausedWorkoutSession(
  uid: string,
  templateId: string,
): Promise<void> {
  await deleteDoc(
    doc(db, "workout_sessions", workoutSessionDocId(uid, templateId)),
  );
}
