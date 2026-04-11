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

export type WorkoutTemplateSectionType = "warmup" | "round" | "cooldown";
export type WorkoutTemplateBlockType = "exercise" | "rest";

export interface WorkoutTemplateBlockRecord {
  id: string;
  type: WorkoutTemplateBlockType;
  order: number;
  exercise_id?: string;
  name?: string;
  reps?: string;
  weight_kg?: number;
  rest_seconds?: number;
  notes?: string;
  duration_seconds?: number;
  primary_muscles?: string[];
  secondary_muscles?: string[];
}

export interface WorkoutTemplateSectionRecord {
  id: string;
  type: WorkoutTemplateSectionType;
  name: string;
  order: number;
  blocks: WorkoutTemplateBlockRecord[];
}

export interface WorkoutTemplateRecord {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  cover_image_url?: string;
  difficulty: WorkoutDifficulty;
  is_ai_generated: boolean;
  source_prompt?: string;
  exercises: WorkoutTemplateExerciseRecord[];
  sections?: WorkoutTemplateSectionRecord[];
  target_muscles?: string[];
  is_active?: boolean;
  schedule_day_of_week?: number;
  estimated_duration_minutes: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface WorkoutTemplateInput {
  name: string;
  description?: string;
  cover_image_url?: string;
  difficulty: WorkoutDifficulty;
  is_ai_generated: boolean;
  source_prompt?: string;
  exercises: WorkoutTemplateExerciseRecord[];
  sections?: WorkoutTemplateSectionRecord[];
  target_muscles?: string[];
  is_active?: boolean;
  schedule_day_of_week?: number;
  estimated_duration_minutes: number;
  tags?: string[];
}

export function aggregateWorkoutMuscles(
  exercises:
    | WorkoutTemplateExerciseRecord[]
    | WorkoutTemplateSectionRecord[] = [],
): string[] {
  const muscleGroups = new Set<string>();

  for (const item of exercises) {
    if ("blocks" in item) {
      for (const block of item.blocks) {
        for (const muscle of block.primary_muscles ?? []) {
          muscleGroups.add(muscle);
        }
      }
      continue;
    }

    for (const muscle of item.muscleGroups ?? []) {
      muscleGroups.add(muscle);
    }
  }

  return [...muscleGroups];
}

export function flattenWorkoutSections(
  sections: WorkoutTemplateSectionRecord[] = [],
): WorkoutTemplateExerciseRecord[] {
  const flattened: WorkoutTemplateExerciseRecord[] = [];

  for (const section of sections) {
    for (const block of section.blocks) {
      if (block.type !== "exercise" || !block.exercise_id) {
        continue;
      }

      flattened.push({
        id: block.exercise_id,
        name: block.name ?? block.exercise_id,
        sets: 1,
        reps: block.reps ?? "",
        muscleGroups: block.primary_muscles ?? [],
      });
    }
  }

  return flattened;
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
  const flattenedExercises =
    input.exercises.length > 0
      ? input.exercises
      : flattenWorkoutSections(input.sections ?? []);
  const targetMuscles =
    input.target_muscles ?? aggregateWorkoutMuscles(flattenedExercises);
  const payload: WorkoutTemplateRecord = {
    id: reference.id,
    user_id: uid,
    name: input.name,
    description: input.description,
    cover_image_url: input.cover_image_url,
    difficulty: input.difficulty,
    is_ai_generated: input.is_ai_generated,
    source_prompt: input.source_prompt,
    exercises: flattenedExercises,
    sections: input.sections,
    target_muscles: targetMuscles,
    is_active: input.is_active ?? false,
    schedule_day_of_week: input.schedule_day_of_week,
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
