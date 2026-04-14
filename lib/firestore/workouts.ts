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
import type { WorkoutWeekPlanRecord } from "@/lib/workouts/weekly-schedule";

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
  execution_mode?: "reps" | "time";
  exercise_seconds?: number;
  prep_seconds?: number;
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
  is_public?: boolean;
  is_draft?: boolean;
  location?: string;
  like_count?: number;
  saved_by_count?: number;
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
  is_public?: boolean;
  is_draft?: boolean;
  location?: string;
  schedule_day_of_week?: number;
  estimated_duration_minutes: number;
  tags?: string[];
}

export interface WorkoutDailyOverrideRecord {
  id: string;
  user_id: string;
  date: string;
  template_id: string;
  source_template_id?: string;
  source_type?:
    | "auto_no_active_day"
    | "change_workout_type"
    | "adjust_time"
    | "change_difficulty"
    | "use_another_location";
  workout_type?: string;
  target_minutes?: number;
  difficulty_mode?: "easier" | "harder";
  location?: string;
  /** True when the user explicitly chose this workout — protects the day from reschedule. */
  manually_set?: boolean;
  created_at: string;
  updated_at: string;
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
  executionType?: "reps" | "time";
  durationSecondsCompleted?: number;
  prepSecondsCompleted?: number;
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
  prep_remaining_seconds?: number;
  timed_remaining_seconds: number;
  completed_sets: CompletedExerciseSetRecord[];
  paused_elapsed_seconds: number;
  current_rest_elapsed_seconds: number;
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
  prepRemainingSeconds?: number;
  timedRemainingSeconds: number;
  completedSets: CompletedExerciseSetRecord[];
  pausedElapsedSeconds: number;
  currentRestElapsedSeconds: number;
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

export async function deleteWorkoutTemplate(templateId: string): Promise<void> {
  await deleteDoc(doc(db, "workout_templates", templateId));
}

export async function duplicateWorkoutTemplate(
  uid: string,
  templateId: string,
): Promise<WorkoutTemplateRecord> {
  const source = await getWorkoutTemplate(templateId);
  if (!source) throw new Error("Workout template not found");

  return createWorkoutTemplate(uid, {
    name: `${source.name} (Copy)`,
    description: source.description,
    cover_image_url: source.cover_image_url,
    difficulty: source.difficulty,
    is_ai_generated: source.is_ai_generated,
    source_prompt: source.source_prompt,
    exercises: source.exercises,
    sections: source.sections,
    target_muscles: source.target_muscles,
    is_active: false,
    is_public: false,
    is_draft: false,
    location: source.location,
    estimated_duration_minutes: source.estimated_duration_minutes,
    tags: source.tags,
  });
}

export async function listPublicWorkoutTemplates(
  maxResults = 30,
): Promise<WorkoutTemplateRecord[]> {
  const snapshot = await getDocs(
    query(
      workoutsCollection(),
      where("is_public", "==", true),
      orderBy("updated_at", "desc"),
      firestoreLimit(maxResults),
    ),
  );
  return snapshot.docs.map((d) => d.data() as WorkoutTemplateRecord);
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
    prep_remaining_seconds: input.prepRemainingSeconds ?? -1,
    timed_remaining_seconds: input.timedRemainingSeconds,
    completed_sets: input.completedSets,
    paused_elapsed_seconds: input.pausedElapsedSeconds,
    current_rest_elapsed_seconds: input.currentRestElapsedSeconds,
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

export interface CompletedExerciseMetricRecord {
  exercise_id: string;
  name: string;
  sets_done: number;
  total_reps: number;
  total_volume_kg: number;
  avg_weight_kg: number;
  max_weight_kg: number;
  first_set_at?: string;
  last_set_at?: string;
  time_to_complete_seconds: number;
}

export interface CompletedRestSegmentRecord {
  step_id: string;
  exercise_id: string;
  planned_seconds: number;
  actual_seconds: number;
  started_at: string;
  ended_at: string;
}

export interface CompletedWorkoutSessionMetrics {
  duration_seconds: number;
  rest_time_seconds: number;
  paused_time_seconds: number;
  completed_exercises: number;
  avg_reps_per_set: number;
  avg_weight_per_set: number;
  active_time_seconds: number;
  difficulty_multiplier: number;
  effort_score: number;
  xp_base: number;
  xp_time_multiplier: number;
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
  exercise_metrics?: CompletedExerciseMetricRecord[];
  rest_segments?: CompletedRestSegmentRecord[];
  session_metrics?: CompletedWorkoutSessionMetrics;
  total_volume_kg: number;
  total_reps: number;
  total_sets: number;
  xp_earned: number;
}

export interface SaveCompletedWorkoutSessionInput {
  templateId: string;
  workoutName: string;
  templateDifficulty: WorkoutDifficulty;
  startedAt: string;
  completedSets: CompletedExerciseSetRecord[];
  restSegments: CompletedRestSegmentRecord[];
  pausedElapsedSeconds: number;
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
    Math.round(
      (new Date(now).getTime() - new Date(startedAt).getTime()) / 1000,
    ),
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

  const restTimeSeconds = input.restSegments.reduce(
    (sum, segment) => sum + Math.max(0, segment.actual_seconds),
    0,
  );
  const pausedTimeSeconds = Math.max(0, input.pausedElapsedSeconds);
  const activeTimeSeconds = Math.max(
    0,
    durationSeconds - restTimeSeconds - pausedTimeSeconds,
  );

  const difficultyMultiplierMap: Record<WorkoutDifficulty, number> = {
    beginner: 1,
    intermediate: 1.12,
    advanced: 1.25,
  };

  const difficultyMultiplier =
    difficultyMultiplierMap[input.templateDifficulty] ?? 1;

  const effortScore = Math.round(
    totalSets * 6 + totalReps * 0.5 + totalVolume * 0.05,
  );

  const xpBase = Math.max(24, Math.round(28 + effortScore));
  const xpTimeMultiplier = 1 + Math.min(activeTimeSeconds / 1800, 1.5) * 0.18;
  const xpEarned = Math.max(
    12,
    Math.round(xpBase * difficultyMultiplier * xpTimeMultiplier),
  );

  const exerciseMetrics: CompletedExerciseMetricRecord[] = [
    ...exerciseMap.values(),
  ].map((summary) => {
    const sourceSets = input.completedSets
      .filter((set) => set.exerciseId === summary.exercise_id)
      .sort((left, right) => left.completedAt.localeCompare(right.completedAt));

    const weightedSets = sourceSets.filter(
      (set) => Number.isFinite(set.weightKg) && (set.weightKg ?? 0) > 0,
    );

    const totalWeightAcrossSets = weightedSets.reduce(
      (sum, set) => sum + (set.weightKg ?? 0),
      0,
    );

    const maxWeight = weightedSets.reduce(
      (max, set) => Math.max(max, set.weightKg ?? 0),
      0,
    );

    const firstSetAt = sourceSets[0]?.completedAt;
    const lastSetAt = sourceSets[sourceSets.length - 1]?.completedAt;

    const timeToCompleteSeconds =
      firstSetAt && lastSetAt
        ? Math.max(
            0,
            Math.round(
              (new Date(lastSetAt).getTime() - new Date(firstSetAt).getTime()) /
                1000,
            ),
          )
        : 0;

    return {
      exercise_id: summary.exercise_id,
      name: summary.name,
      sets_done: summary.sets_done,
      total_reps: summary.total_reps,
      total_volume_kg: Math.round(summary.total_volume_kg * 100) / 100,
      avg_weight_kg:
        weightedSets.length > 0
          ? Math.round((totalWeightAcrossSets / weightedSets.length) * 100) /
            100
          : 0,
      max_weight_kg: Math.round(maxWeight * 100) / 100,
      first_set_at: firstSetAt,
      last_set_at: lastSetAt,
      time_to_complete_seconds: timeToCompleteSeconds,
    };
  });

  const weightedSetCount = input.completedSets.filter(
    (set) => Number.isFinite(set.weightKg) && (set.weightKg ?? 0) > 0,
  ).length;

  const totalWeightAcrossAllSets = input.completedSets.reduce(
    (sum, set) =>
      sum + (Number.isFinite(set.weightKg) ? (set.weightKg ?? 0) : 0),
    0,
  );

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
    exercise_metrics: exerciseMetrics,
    rest_segments: input.restSegments,
    session_metrics: {
      duration_seconds: durationSeconds,
      rest_time_seconds: restTimeSeconds,
      paused_time_seconds: pausedTimeSeconds,
      completed_exercises: exerciseMetrics.filter((m) => m.sets_done > 0)
        .length,
      avg_reps_per_set:
        totalSets > 0 ? Math.round((totalReps / totalSets) * 100) / 100 : 0,
      avg_weight_per_set:
        weightedSetCount > 0
          ? Math.round((totalWeightAcrossAllSets / weightedSetCount) * 100) /
            100
          : 0,
      active_time_seconds: activeTimeSeconds,
      difficulty_multiplier: Math.round(difficultyMultiplier * 100) / 100,
      effort_score: effortScore,
      xp_base: xpBase,
      xp_time_multiplier: Math.round(xpTimeMultiplier * 100) / 100,
    },
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
  const snapshot = await getDoc(
    doc(db, "workout_sessions_completed", sessionId),
  );
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
    return {
      streak_current: 1,
      streak_longest: 1,
      last_activity_date: todayDate,
    };
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

// ─── Weekly Workout Plan ────────────────────────────────────────────────

function workoutWeekPlansCollection() {
  return collection(db, "workout_week_plans");
}

export async function getWorkoutWeekPlan(
  uid: string,
  weekStartDate: string,
): Promise<WorkoutWeekPlanRecord | null> {
  const id = `${uid}_${weekStartDate}`;
  const snapshot = await getDoc(doc(db, "workout_week_plans", id));
  if (!snapshot.exists()) {
    return null;
  }
  return snapshot.data() as WorkoutWeekPlanRecord;
}

export async function upsertWorkoutWeekPlan(
  plan: WorkoutWeekPlanRecord,
): Promise<void> {
  const reference = doc(db, "workout_week_plans", plan.id);
  await setDoc(
    reference,
    sanitizeFirestoreValue(plan) as WorkoutWeekPlanRecord,
    { merge: true },
  );
}

export async function listWorkoutWeekPlans(
  uid: string,
): Promise<WorkoutWeekPlanRecord[]> {
  const snapshot = await getDocs(
    query(
      workoutWeekPlansCollection(),
      where("user_id", "==", uid),
      orderBy("week_start_date", "desc"),
      firestoreLimit(8),
    ),
  );

  return snapshot.docs.map((item) => item.data() as WorkoutWeekPlanRecord);
}

// ─── Daily Overrides ──────────────────────────────────────────────────────

function workoutDailyOverridesCollection() {
  return collection(db, "workout_daily_overrides");
}

function dailyOverrideDocId(uid: string, date: string): string {
  return `${uid}_${date}`;
}

export async function getWorkoutDailyOverride(
  uid: string,
  date: string,
): Promise<WorkoutDailyOverrideRecord | null> {
  const id = dailyOverrideDocId(uid, date);
  const snapshot = await getDoc(doc(db, "workout_daily_overrides", id));
  if (!snapshot.exists()) {
    return null;
  }
  return snapshot.data() as WorkoutDailyOverrideRecord;
}

export async function upsertWorkoutDailyOverride(
  uid: string,
  date: string,
  patch: Omit<
    WorkoutDailyOverrideRecord,
    "id" | "user_id" | "date" | "created_at" | "updated_at"
  >,
): Promise<WorkoutDailyOverrideRecord> {
  const id = dailyOverrideDocId(uid, date);
  const reference = doc(db, "workout_daily_overrides", id);
  const now = new Date().toISOString();

  const payload: WorkoutDailyOverrideRecord = {
    id,
    user_id: uid,
    date,
    template_id: patch.template_id,
    source_template_id: patch.source_template_id,
    source_type: patch.source_type,
    workout_type: patch.workout_type,
    target_minutes: patch.target_minutes,
    difficulty_mode: patch.difficulty_mode,
    location: patch.location,
    manually_set: patch.manually_set,
    created_at: now,
    updated_at: now,
  };

  const existing = await getDoc(reference);
  if (existing.exists()) {
    payload.created_at = (
      existing.data() as WorkoutDailyOverrideRecord
    ).created_at;
  }

  await setDoc(
    reference,
    sanitizeFirestoreValue(payload) as WorkoutDailyOverrideRecord,
    { merge: true },
  );
  return payload;
}

export async function clearWorkoutDailyOverride(
  uid: string,
  date: string,
): Promise<void> {
  const id = dailyOverrideDocId(uid, date);
  await deleteDoc(doc(db, "workout_daily_overrides", id));
}
