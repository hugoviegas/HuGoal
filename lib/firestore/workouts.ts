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
  orderBy,
  limit as firestoreLimit,
  updateDoc,
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

function sanitizeRecord<T extends Record<string, unknown>>(value: T): T {
  return sanitizeFirestoreValue(value) as T;
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

  const writePayload = sanitizeRecord({
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

    const writePatch = sanitizeRecord({
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

// ─── Completed Workout Sessions ────────────────────────────────────────────

export interface CompletedExerciseSummary {
  exercise_id: string;
  name: string;
  sets_done: number;
  total_reps: number;
  total_volume_kg: number;
}

export interface CompletedWorkoutSessionRecord {
  id: string;
  user_id: string;
  template_id: string;
  workout_name: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  date: string; // YYYY-MM-DD
  sets_completed: CompletedExerciseSetRecord[];
  exercises_summary: CompletedExerciseSummary[];
  total_volume_kg: number;
  total_reps: number;
  total_sets: number;
  xp_earned: number;
}

export interface SaveCompletedWorkoutSessionInput {
  templateId: string;
  workoutName: string;
  startedAt: string;
  completedSets: CompletedExerciseSetRecord[];
}

function completedSessionsCollection() {
  return collection(db, "workout_sessions_completed");
}

function toDateString(isoString: string): string {
  return isoString.slice(0, 10); // "YYYY-MM-DD"
}

export async function saveCompletedWorkoutSession(
  uid: string,
  input: SaveCompletedWorkoutSessionInput,
): Promise<CompletedWorkoutSessionRecord> {
  const now = new Date().toISOString();
  const startedAt = input.startedAt || now;
  const durationSeconds = Math.max(
    0,
    Math.round((new Date(now).getTime() - new Date(startedAt).getTime()) / 1000),
  );

  // Aggregate per-exercise summaries
  const exerciseMap = new Map<string, CompletedExerciseSummary>();
  for (const set of input.completedSets) {
    const key = set.exerciseId;
    const existing = exerciseMap.get(key);
    const reps = set.repsCompleted ?? 0;
    const volume = reps * (set.weightKg ?? 0);
    if (existing) {
      existing.sets_done += 1;
      existing.total_reps += reps;
      existing.total_volume_kg += volume;
    } else {
      exerciseMap.set(key, {
        exercise_id: key,
        name: key, // will be overwritten below if available
        sets_done: 1,
        total_reps: reps,
        total_volume_kg: volume,
      });
    }
  }

  const totalVolume = [...exerciseMap.values()].reduce(
    (sum, e) => sum + e.total_volume_kg,
    0,
  );
  const totalReps = [...exerciseMap.values()].reduce(
    (sum, e) => sum + e.total_reps,
    0,
  );
  const totalSets = input.completedSets.length;
  const xpEarned = 50 + totalSets * 5;

  const reference = doc(completedSessionsCollection());
  const payload: CompletedWorkoutSessionRecord = {
    id: reference.id,
    user_id: uid,
    template_id: input.templateId,
    workout_name: input.workoutName,
    started_at: startedAt,
    ended_at: now,
    duration_seconds: durationSeconds,
    date: toDateString(now),
    sets_completed: input.completedSets,
    exercises_summary: [...exerciseMap.values()],
    total_volume_kg: Math.round(totalVolume * 100) / 100,
    total_reps: totalReps,
    total_sets: totalSets,
    xp_earned: xpEarned,
  };

  await setDoc(reference, sanitizeFirestoreValue(payload));

  // Update user streak
  try {
    await updateUserStreak(uid, toDateString(now));
  } catch (e) {
    console.warn("[saveCompletedWorkoutSession] streak update failed", e);
  }

  return payload;
}

export async function getCompletedWorkoutSession(
  sessionId: string,
): Promise<CompletedWorkoutSessionRecord | null> {
  const snapshot = await getDoc(doc(db, "workout_sessions_completed", sessionId));
  if (!snapshot.exists()) return null;
  return snapshot.data() as CompletedWorkoutSessionRecord;
}

export async function listCompletedWorkoutSessions(
  uid: string,
  maxResults = 50,
): Promise<CompletedWorkoutSessionRecord[]> {
  const snapshot = await getDocs(
    query(
      completedSessionsCollection(),
      where("user_id", "==", uid),
      orderBy("ended_at", "desc"),
      firestoreLimit(maxResults),
    ),
  );
  return snapshot.docs.map((d) => d.data() as CompletedWorkoutSessionRecord);
}

export async function getCompletedSessionDates(
  uid: string,
  startDate: string,
  endDate: string,
): Promise<string[]> {
  const snapshot = await getDocs(
    query(
      completedSessionsCollection(),
      where("user_id", "==", uid),
      where("date", ">=", startDate),
      where("date", "<=", endDate),
    ),
  );
  const dates = new Set<string>();
  for (const d of snapshot.docs) {
    const record = d.data() as CompletedWorkoutSessionRecord;
    dates.add(record.date);
  }
  return [...dates];
}

// ─── Streak Management ────────────────────────────────────────────────────

interface StreakResult {
  streak_current: number;
  streak_longest: number;
  last_activity_date: string;
}

export async function updateUserStreak(
  uid: string,
  todayDate: string,
): Promise<StreakResult> {
  const profileRef = doc(db, "profiles", uid);
  const snapshot = await getDoc(profileRef);

  if (!snapshot.exists()) {
    return { streak_current: 1, streak_longest: 1, last_activity_date: todayDate };
  }

  const profile = snapshot.data() as {
    streak_current?: number;
    streak_longest?: number;
    last_activity_date?: string;
  };

  const lastDate = profile.last_activity_date ?? "";
  const currentStreak = profile.streak_current ?? 0;
  const longestStreak = profile.streak_longest ?? 0;

  // Already counted today
  if (lastDate === todayDate) {
    return {
      streak_current: currentStreak,
      streak_longest: longestStreak,
      last_activity_date: lastDate,
    };
  }

  const yesterday = new Date(todayDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const newStreak = lastDate === yesterdayStr ? currentStreak + 1 : 1;
  const newLongest = Math.max(longestStreak, newStreak);

  await updateDoc(profileRef, {
    streak_current: newStreak,
    streak_longest: newLongest,
    last_activity_date: todayDate,
  });

  return {
    streak_current: newStreak,
    streak_longest: newLongest,
    last_activity_date: todayDate,
  };
}
