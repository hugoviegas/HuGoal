import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  ActivityIndicator,
  Easing,
  FlatList,
  Image,
  PanResponder,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Dumbbell,
  GripVertical,
  PauseCircle,
  Minus,
  Plus,
  SlidersHorizontal,
  X,
} from "lucide-react-native";
import DraggableFlatList from "react-native-draggable-flatlist";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { Button } from "@/components/ui/Button";
import { useHideMainTabBar } from "@/hooks/useHideMainTabBar";
import {
  clearPausedWorkoutSession,
  getPausedWorkoutSession,
  getWorkoutTemplate,
  savePausedWorkoutSession,
  saveCompletedWorkoutSession,
  type CompletedExerciseSetRecord,
  type WorkoutTemplateRecord,
} from "@/lib/firestore/workouts";
import { getExerciseCatalog } from "@/lib/workouts/exercise-catalog";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useToastStore } from "@/stores/toast.store";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────

interface ExerciseSetPlan {
  id: string;
  setNumber: number;
  reps: string;
  executionMode: "reps" | "time";
  weightKg?: number;
  durationSeconds?: number;
  prepSeconds?: number;
}

interface RunningExercise {
  id: string;
  name: string;
  setsPlan: ExerciseSetPlan[];
  muscleGroups: string[];
  instructions?: string;
}

interface ExerciseStep {
  id: string;
  type: "exercise";
  exerciseIndex: number;
  setNumber: number;
  totalSets: number;
  exercise: RunningExercise;
  targetReps: string;
  executionMode: "reps" | "time";
  targetWeightKg?: number;
  durationSeconds?: number;
  prepSeconds?: number;
  sectionId?: string;
  sectionType?: "warmup" | "round" | "cooldown";
  sectionName?: string;
}

interface RestStep {
  id: string;
  type: "rest";
  afterExerciseStepId: string;
  restSeconds: number;
  sectionId?: string;
  sectionType?: "warmup" | "round" | "cooldown";
  sectionName?: string;
}

type SessionStep = ExerciseStep | RestStep;

interface RoundItem {
  step: SessionStep;
  absoluteIndex: number;
}

interface RoundGroup {
  id: string;
  label: string;
  sectionType?: "warmup" | "round" | "cooldown";
  items: RoundItem[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function parseReps(targetReps: string): number {
  const match = targetReps.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function normalizeKey(value: string): string {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function templateToRunningExercises(
  template: WorkoutTemplateRecord,
  catalogLookup: Record<
    string,
    {
      instructions?: string[];
      instructions_en?: string;
      primary_muscles?: string[];
    }
  >,
): RunningExercise[] {
  // Use sections if available
  if (template.sections && template.sections.length > 0) {
    const result: RunningExercise[] = [];
    for (const section of template.sections) {
      const exerciseBlocks = section.blocks
        .filter((b) => b.type === "exercise" && b.exercise_id)
        .sort((a, b) => a.order - b.order);

      for (const block of exerciseBlocks) {
        const exId = block.exercise_id!;
        const official =
          catalogLookup[exId] ??
          catalogLookup[normalizeKey(exId)] ??
          catalogLookup[normalizeKey(block.name ?? "")] ??
          null;

        const instructions =
          official?.instructions?.join("\n") ??
          official?.instructions_en ??
          undefined;

        result.push({
          id: exId,
          name: block.name ?? exId,
          muscleGroups:
            block.primary_muscles ?? official?.primary_muscles ?? [],
          instructions,
          setsPlan: [
            {
              id: `${exId}-set-1`,
              setNumber: 1,
              reps: block.reps ?? "",
              executionMode:
                block.execution_mode ??
                ((block.exercise_seconds ?? block.duration_seconds ?? 0) > 0
                  ? "time"
                  : "reps"),
              weightKg: block.weight_kg,
              durationSeconds: block.exercise_seconds ?? block.duration_seconds,
              prepSeconds: block.prep_seconds ?? 0,
            },
          ],
        });
      }
    }
    return result;
  }

  // Fallback to flat exercises list
  return template.exercises.map((ex) => {
    const official =
      catalogLookup[ex.id] ??
      catalogLookup[normalizeKey(ex.id)] ??
      catalogLookup[normalizeKey(ex.name)] ??
      null;

    const instructions =
      official?.instructions?.join("\n") ??
      official?.instructions_en ??
      undefined;

    const setsPlan: ExerciseSetPlan[] = Array.from(
      { length: Math.max(1, ex.sets) },
      (_, i) => ({
        id: `${ex.id}-set-${i + 1}`,
        setNumber: i + 1,
        reps: ex.reps,
        executionMode: "reps",
      }),
    );

    return {
      id: ex.id,
      name: ex.name,
      muscleGroups: ex.muscleGroups,
      instructions,
      setsPlan,
    };
  });
}

function buildSteps(exercises: RunningExercise[]): SessionStep[] {
  const output: SessionStep[] = [];

  exercises.forEach((exercise, exerciseIndex) => {
    exercise.setsPlan.forEach((setPlan, setIndex) => {
      const stepId = `${exercise.id}-ex-${exerciseIndex}-set-${setPlan.setNumber}-${setIndex}`;

      output.push({
        id: stepId,
        type: "exercise",
        exerciseIndex,
        setNumber: setPlan.setNumber,
        totalSets: exercise.setsPlan.length,
        exercise,
        targetReps: setPlan.reps,
        executionMode: setPlan.executionMode,
        targetWeightKg: setPlan.weightKg,
        durationSeconds: setPlan.durationSeconds,
        prepSeconds: setPlan.prepSeconds,
        sectionId: "legacy-round",
        sectionType: "round",
        sectionName: "Workout",
      });

      const hasNextStep =
        exerciseIndex < exercises.length - 1 ||
        setIndex < exercise.setsPlan.length - 1;

      if (hasNextStep) {
        output.push({
          id: `${stepId}-rest`,
          type: "rest",
          afterExerciseStepId: stepId,
          restSeconds: 45,
          sectionId: "legacy-round",
          sectionType: "round",
          sectionName: "Workout",
        });
      }
    });
  });

  return output;
}

function templateToSteps(
  template: WorkoutTemplateRecord,
  catalogLookup: Record<
    string,
    {
      instructions?: string[];
      instructions_en?: string;
      primary_muscles?: string[];
    }
  >,
): SessionStep[] {
  if (!template.sections || template.sections.length === 0) {
    return buildSteps(templateToRunningExercises(template, catalogLookup));
  }

  const output: SessionStep[] = [];
  let globalExerciseIndex = 0;

  const sortedSections = [...template.sections].sort(
    (a, b) => a.order - b.order,
  );

  for (const section of sortedSections) {
    const sortedBlocks = [...section.blocks].sort((a, b) => a.order - b.order);

    for (const block of sortedBlocks) {
      if (block.type === "rest") {
        const restSeconds = block.rest_seconds ?? block.duration_seconds ?? 45;
        let prevExerciseStepId = "unknown";
        for (let i = output.length - 1; i >= 0; i--) {
          if (output[i].type === "exercise") {
            prevExerciseStepId = output[i].id;
            break;
          }
        }
        output.push({
          id: `rest-${block.id}`,
          type: "rest",
          afterExerciseStepId: prevExerciseStepId,
          restSeconds,
          sectionId: section.id,
          sectionType: section.type,
          sectionName: section.name,
        });
        continue;
      }

      if (block.type !== "exercise" || !block.exercise_id) continue;

      const exId = block.exercise_id;
      const official =
        catalogLookup[exId] ??
        catalogLookup[normalizeKey(exId)] ??
        catalogLookup[normalizeKey(block.name ?? "")] ??
        null;

      const execMode: "reps" | "time" =
        block.execution_mode ??
        ((block.exercise_seconds ?? block.duration_seconds ?? 0) > 0
          ? "time"
          : "reps");

      const stepId = `${section.id}-${block.id}-ex`;

      output.push({
        id: stepId,
        type: "exercise",
        exerciseIndex: globalExerciseIndex,
        setNumber: 1,
        totalSets: 1,
        sectionId: section.id,
        sectionType: section.type,
        sectionName: section.name,
        exercise: {
          id: exId,
          name: block.name ?? exId,
          muscleGroups:
            block.primary_muscles ?? official?.primary_muscles ?? [],
          instructions:
            official?.instructions?.join("\n") ?? official?.instructions_en,
          setsPlan: [
            {
              id: `${stepId}-set-1`,
              setNumber: 1,
              reps: block.reps ?? "",
              executionMode: execMode,
              weightKg: block.weight_kg,
              durationSeconds: block.exercise_seconds ?? block.duration_seconds,
              prepSeconds: block.prep_seconds ?? 0,
            },
          ],
        },
        targetReps: block.reps ?? "",
        executionMode: execMode,
        targetWeightKg: block.weight_kg,
        durationSeconds: block.exercise_seconds ?? block.duration_seconds,
        prepSeconds: block.prep_seconds ?? 0,
      });

      globalExerciseIndex++;
    }
  }

  return output;
}

// ─── Screen ───────────────────────────────────────────────────────────────

export default function RunWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const { show: showToast } = useToastStore();
  const { isDark, colors } = useThemeStore();
  useHideMainTabBar();
  const templateId = String(id);

  const [template, setTemplate] = useState<WorkoutTemplateRecord | null>(null);
  const [catalogById, setCatalogById] = useState<Record<string, any>>({});
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [stepOverrides, setStepOverrides] = useState<
    Record<string, { targetReps?: string; targetWeightKg?: number }>
  >({});
  const [sessionStepIds, setSessionStepIds] = useState<string[]>([]);
  const [openRounds, setOpenRounds] = useState<Record<string, boolean>>({});

  const baseSteps = useMemo(() => {
    const base = template ? templateToSteps(template, catalogById) : [];
    if (!base || Object.keys(stepOverrides).length === 0) return base;
    return base.map((step) => {
      if (step.type !== "exercise") return step;
      const override = stepOverrides[step.id];
      if (!override) return step;
      return {
        ...step,
        targetReps: override.targetReps ?? step.targetReps,
        targetWeightKg:
          override.targetWeightKg !== undefined
            ? override.targetWeightKg
            : step.targetWeightKg,
      } as ExerciseStep;
    });
  }, [template, catalogById, stepOverrides]);

  const baseStepById = useMemo(() => {
    const output: Record<string, SessionStep> = {};
    for (const step of baseSteps) output[step.id] = step;
    return output;
  }, [baseSteps]);

  useEffect(() => {
    const baseIds = baseSteps.map((step) => step.id);
    setSessionStepIds((prev) => {
      if (baseIds.length === 0) return [];
      if (prev.length === 0) return baseIds;

      const valid = new Set(baseIds);
      const kept = prev.filter((id) => valid.has(id));
      const keptSet = new Set(kept);
      const missing = baseIds.filter((id) => !keptSet.has(id));
      const next = [...kept, ...missing];

      if (
        next.length === prev.length &&
        next.every((id, index) => id === prev[index])
      ) {
        return prev;
      }

      return next;
    });
  }, [baseSteps]);

  const steps = useMemo(() => {
    if (sessionStepIds.length === 0) return baseSteps;

    const arranged = sessionStepIds
      .map((id) => baseStepById[id])
      .filter(Boolean) as SessionStep[];

    if (arranged.length === baseSteps.length) {
      return arranged;
    }

    const existing = new Set(arranged.map((step) => step.id));
    const missing = baseSteps.filter((step) => !existing.has(step.id));
    return [...arranged, ...missing];
  }, [baseSteps, baseStepById, sessionStepIds]);

  const [sessionStartedAt, setSessionStartedAt] = useState(() =>
    new Date().toISOString(),
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [restRemainingSeconds, setRestRemainingSeconds] = useState(-1);
  const [prepRemainingSeconds, setPrepRemainingSeconds] = useState(-1);
  const [timedRemainingSeconds, setTimedRemainingSeconds] = useState(-1);
  const [repsDone, setRepsDone] = useState("");
  const [weightDone, setWeightDone] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [editReps, setEditReps] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [completedSets, setCompletedSets] = useState<
    CompletedExerciseSetRecord[]
  >([]);
  const [sessionHydrated, setSessionHydrated] = useState(false);
  const [hydratingSession, setHydratingSession] = useState(true);
  const [dragHint, setDragHint] = useState<string | null>(
    "Swipe left to continue",
  );
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const [imageAutoCyclePaused, setImageAutoCyclePaused] = useState(false);
  const restCountdownStartedRef = useRef(false);
  const timedCountdownStartedRef = useRef(false);
  const furthestStepReachedRef = useRef(0);
  const lastCompletedCountSavedRef = useRef(0);
  const totalPausedSecondsRef = useRef(0);
  const restStepStartedAtRef = useRef<number | null>(null);
  const restStepAccumulatedMsRef = useRef(0);
  const restSegmentsRef = useRef<
    {
      step_id: string;
      exercise_id: string;
      planned_seconds: number;
      actual_seconds: number;
      started_at: string;
      ended_at: string;
    }[]
  >([]);

  const collapsedSheetHeight = 72;
  const expandedSheetHeight = Math.min(viewportHeight * 0.5, 400);
  const sheetTravelDistance = expandedSheetHeight - collapsedSheetHeight;
  const sheetTranslateY = useRef(
    new Animated.Value(sheetTravelDistance),
  ).current;
  const sheetDragStartYRef = useRef(sheetTravelDistance);
  const sheetGestureMovedRef = useRef(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const sheetContentOpacity = sheetTranslateY.interpolate({
    inputRange: [0, sheetTravelDistance],
    outputRange: [1, 0.35],
    extrapolate: "clamp",
  });
  const progressListRef = useRef<any>(null);
  const topStripRef = useRef<any>(null);
  const { width: windowWidth } = useWindowDimensions();

  const currentStep = steps[currentStepIndex];
  const currentExerciseStep =
    currentStep?.type === "exercise" ? currentStep : null;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Load template + catalog
  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoadingTemplate(true);
      try {
        const [workoutRecord, catalog] = await Promise.all([
          getWorkoutTemplate(templateId),
          getExerciseCatalog(),
        ]);

        if (!mounted) return;
        if (!workoutRecord) {
          showToast("Workout not found.", "error");
          router.back();
          return;
        }

        const byId: Record<string, any> = {};
        for (const item of catalog.exercises) {
          byId[item.id] = item;
          byId[normalizeKey(item.id)] = item;
          byId[normalizeKey(item.name)] = item;
          if (item.name_en) byId[normalizeKey(item.name_en)] = item;
          for (const alias of item.aliases ?? []) {
            byId[normalizeKey(alias)] = item;
          }
        }

        setTemplate(workoutRecord);
        setCatalogById(byId);
      } catch (err) {
        console.error("[runWorkout] template load failed", err);
        if (!mounted) return;
        showToast("Failed to load workout.", "error");
        router.back();
      } finally {
        if (mounted) setLoadingTemplate(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [templateId, showToast, router]);

  // Restore paused session
  useEffect(() => {
    if (loadingTemplate || steps.length === 0) return;

    let mounted = true;

    (async () => {
      if (!user?.uid) {
        if (mounted) {
          setHydratingSession(false);
          setSessionHydrated(true);
        }
        return;
      }

      try {
        const pausedSession = await getPausedWorkoutSession(
          user.uid,
          templateId,
        );
        if (!mounted) return;

        if (pausedSession) {
          setSessionStartedAt(
            pausedSession.started_at || new Date().toISOString(),
          );
          setCurrentStepIndex(
            Math.min(
              Math.max(pausedSession.current_step_index ?? 0, 0),
              Math.max(steps.length - 1, 0),
            ),
          );
          setRepsDone(pausedSession.reps_done ?? "");
          setWeightDone(pausedSession.weight_done ?? "");
          setEditReps(pausedSession.reps_done ?? "");
          setEditWeight(pausedSession.weight_done ?? "");
          setStepOverrides(pausedSession.step_overrides ?? {});
          setRestRemainingSeconds(pausedSession.rest_remaining_seconds ?? -1);
          setPrepRemainingSeconds(pausedSession.prep_remaining_seconds ?? -1);
          setTimedRemainingSeconds(pausedSession.timed_remaining_seconds ?? -1);
          setCompletedSets(pausedSession.completed_sets ?? []);
          totalPausedSecondsRef.current =
            (pausedSession.paused_elapsed_seconds ?? 0) +
            Math.max(
              0,
              Math.round(
                (Date.now() - new Date(pausedSession.paused_at).getTime()) /
                  1000,
              ),
            );
          restStepAccumulatedMsRef.current =
            (pausedSession.current_rest_elapsed_seconds ?? 0) * 1000;
        }
      } catch (error) {
        console.error("[runWorkout] failed to restore paused session", {
          templateId,
          uid: user?.uid,
          error,
        });
        if (!mounted) return;
        showToast("Could not restore paused session.", "error");
      }

      if (mounted) {
        setHydratingSession(false);
        setSessionHydrated(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [loadingTemplate, steps.length, templateId, user?.uid, showToast]);

  useEffect(() => {
    if (hydratingSession || !currentStep) return;

    if (currentStep.type === "exercise") {
      restStepStartedAtRef.current = null;
      restStepAccumulatedMsRef.current = 0;
      restCountdownStartedRef.current = false;
      setRestRemainingSeconds(-1);

      const isTimedStep = currentStep.executionMode === "time";
      const prepSeconds = isTimedStep
        ? Math.max(0, currentStep.prepSeconds ?? 0)
        : 0;

      const defaultReps = isTimedStep
        ? "0"
        : String(parseReps(currentStep.targetReps));
      const defaultWeight =
        currentStep.targetWeightKg !== undefined
          ? String(currentStep.targetWeightKg)
          : "";

      setRepsDone(defaultReps);
      setWeightDone(defaultWeight);
      setEditReps(defaultReps);
      setEditWeight(defaultWeight);

      setPrepRemainingSeconds(-1);

      if (isTimedStep) {
        if (prepSeconds > 0) {
          timedCountdownStartedRef.current = false;
          setPrepRemainingSeconds(prepSeconds);
          setTimedRemainingSeconds(-1);
        } else {
          timedCountdownStartedRef.current = true;
          setPrepRemainingSeconds(-1);
          setTimedRemainingSeconds(currentStep.durationSeconds ?? 0);
        }
      } else {
        timedCountdownStartedRef.current = false;
        setTimedRemainingSeconds(-1);
      }
      return;
    }

    restStepStartedAtRef.current = Date.now();
    timedCountdownStartedRef.current = false;
    setPrepRemainingSeconds(-1);
    setTimedRemainingSeconds(-1);
    setRestRemainingSeconds(currentStep.restSeconds);
    restCountdownStartedRef.current = true;
  }, [currentStep, hydratingSession]);

  useEffect(() => {
    if (currentStepIndex > furthestStepReachedRef.current) {
      furthestStepReachedRef.current = currentStepIndex;
    }
  }, [currentStepIndex]);

  useEffect(() => {
    if (!dragHint) return;
    const timeoutId = setTimeout(() => setDragHint(null), 1800);
    return () => clearTimeout(timeoutId);
  }, [dragHint]);

  const findNextExerciseStep = (fromIndex: number): ExerciseStep | null => {
    for (let i = fromIndex + 1; i < steps.length; i += 1) {
      const step = steps[i];
      if (step.type === "exercise") return step;
    }
    return null;
  };

  const resolveExerciseImages = useCallback(
    (exerciseId: string, exerciseName?: string): string[] => {
      const item =
        catalogById[exerciseId] ??
        catalogById[normalizeKey(exerciseId)] ??
        (exerciseName ? catalogById[normalizeKey(exerciseName)] : undefined) ??
        null;

      const urls = Array.isArray(item?.remote_image_urls)
        ? item.remote_image_urls.filter(
            (url: unknown): url is string =>
              typeof url === "string" && url.length > 0,
          )
        : [];

      return urls.slice(0, 2);
    },
    [catalogById],
  );

  const getCurrentRestElapsedSeconds = useCallback(() => {
    if (currentStep?.type !== "rest") return 0;

    const runningMs = restStepStartedAtRef.current
      ? Date.now() - restStepStartedAtRef.current
      : 0;

    return Math.max(
      0,
      Math.round((restStepAccumulatedMsRef.current + runningMs) / 1000),
    );
  }, [currentStep?.type]);

  const finalizeCurrentRestSegment = useCallback(() => {
    if (currentStep?.type !== "rest") return;

    const actualSeconds = getCurrentRestElapsedSeconds();
    const exerciseStep = steps.find(
      (step): step is ExerciseStep =>
        step.type === "exercise" && step.id === currentStep.afterExerciseStepId,
    );

    if (!exerciseStep) {
      restStepStartedAtRef.current = null;
      restStepAccumulatedMsRef.current = 0;
      return;
    }

    const startedAt = restStepStartedAtRef.current
      ? new Date(
          restStepStartedAtRef.current - restStepAccumulatedMsRef.current,
        ).toISOString()
      : new Date().toISOString();

    restSegmentsRef.current = [
      ...restSegmentsRef.current,
      {
        step_id: currentStep.id,
        exercise_id: exerciseStep.exercise.id,
        planned_seconds: currentStep.restSeconds,
        actual_seconds: actualSeconds,
        started_at: startedAt,
        ended_at: new Date().toISOString(),
      },
    ];

    restStepStartedAtRef.current = null;
    restStepAccumulatedMsRef.current = 0;
  }, [currentStep, getCurrentRestElapsedSeconds, steps]);

  const animateSheet = useCallback(
    (expanded: boolean) => {
      setSheetExpanded(expanded);
      Animated.timing(sheetTranslateY, {
        toValue: expanded ? 0 : sheetTravelDistance,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [sheetTranslateY, sheetTravelDistance],
  );

  useEffect(() => {
    const nextValue = sheetExpanded ? 0 : sheetTravelDistance;
    sheetTranslateY.setValue(nextValue);
    sheetDragStartYRef.current = nextValue;
  }, [sheetExpanded, sheetTranslateY, sheetTravelDistance]);

  const handleStepBack = useCallback(() => {
    setCurrentStepIndex((prev) => {
      if (prev <= 0) return prev;
      const earliestAllowed = Math.max(furthestStepReachedRef.current - 1, 0);
      const target = prev - 1;
      if (target < earliestAllowed) {
        setDragHint("Previous step is locked");
        return prev;
      }
      setDragHint("Moved to previous step");
      return target;
    });
  }, []);

  const handleAdvance = useCallback(
    async (nextCompletedSets?: CompletedExerciseSetRecord[]) => {
      const completedSetsToPersist = nextCompletedSets ?? completedSets;

      if (isLastStep) {
        // Save completed session
        if (user?.uid && template) {
          try {
            if (currentStep?.type === "rest") {
              finalizeCurrentRestSegment();
            }

            const session = await saveCompletedWorkoutSession(user.uid, {
              templateId: template.id,
              workoutName: template.name,
              templateDifficulty: template.difficulty,
              startedAt: sessionStartedAt,
              completedSets: completedSetsToPersist,
              restSegments: restSegmentsRef.current,
              pausedElapsedSeconds: totalPausedSecondsRef.current,
            });

            await clearPausedWorkoutSession(user.uid, templateId);
            router.replace(`/workouts/${id}/summary?sessionId=${session.id}`);
          } catch (saveError) {
            console.error("[runWorkout] save session failed", saveError);

            try {
              await savePausedWorkoutSession(user.uid, templateId, {
                currentStepIndex,
                repsDone,
                weightDone,
                restRemainingSeconds,
                prepRemainingSeconds,
                timedRemainingSeconds,
                completedSets: completedSetsToPersist,
                pausedElapsedSeconds: totalPausedSecondsRef.current,
                currentRestElapsedSeconds: getCurrentRestElapsedSeconds(),
                startedAt: sessionStartedAt,
                stepOverrides,
              });
            } catch (pauseSaveError) {
              console.error(
                "[runWorkout] failed to preserve session after completion save error",
                pauseSaveError,
              );
            }

            showToast("Could not save session. Try finishing again.", "error");
          }
        } else {
          router.replace(`/workouts/${id}/summary`);
        }
        return;
      }

      setCurrentStepIndex((prev) => prev + 1);
    },
    [
      completedSets,
      currentStepIndex,
      currentStep,
      id,
      isLastStep,
      finalizeCurrentRestSegment,
      repsDone,
      restRemainingSeconds,
      prepRemainingSeconds,
      router,
      sessionStartedAt,
      template,
      getCurrentRestElapsedSeconds,
      templateId,
      timedRemainingSeconds,
      user?.uid,
      weightDone,
      showToast,
      stepOverrides,
    ],
  );

  const handleCompleteExerciseStep = useCallback(() => {
    if (!currentExerciseStep) return;

    const parsedReps = Number(repsDone);
    if (
      !currentExerciseStep.durationSeconds &&
      (!Number.isFinite(parsedReps) || parsedReps < 0)
    ) {
      return;
    }

    const parsedWeight = Number(weightDone);
    const weightKg =
      Number.isFinite(parsedWeight) && parsedWeight > 0
        ? parsedWeight
        : undefined;

    const nextCompletedSets = [
      ...completedSets,
      {
        stepId: currentExerciseStep.id,
        exerciseId: currentExerciseStep.exercise.id,
        setNumber: currentExerciseStep.setNumber,
        repsCompleted: currentExerciseStep.durationSeconds ? 0 : parsedReps,
        weightKg,
        executionType: currentExerciseStep.executionMode,
        durationSecondsCompleted:
          currentExerciseStep.executionMode === "time"
            ? Math.max(0, currentExerciseStep.durationSeconds ?? 0)
            : undefined,
        prepSecondsCompleted:
          currentExerciseStep.executionMode === "time"
            ? Math.max(0, currentExerciseStep.prepSeconds ?? 0)
            : undefined,
        completedAt: new Date().toISOString(),
      },
    ];

    setCompletedSets(nextCompletedSets);
    void handleAdvance(nextCompletedSets);
  }, [completedSets, currentExerciseStep, handleAdvance, repsDone, weightDone]);

  useEffect(() => {
    if (
      sessionPaused ||
      currentStep?.type !== "rest" ||
      restRemainingSeconds < 0
    )
      return;

    if (restRemainingSeconds === 0) {
      if (restCountdownStartedRef.current) {
        restCountdownStartedRef.current = false;
        void handleAdvance();
      }
      return;
    }

    const intervalId = setInterval(() => {
      setRestRemainingSeconds((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [currentStep, handleAdvance, restRemainingSeconds, sessionPaused]);

  useEffect(() => {
    if (
      sessionPaused ||
      currentStep?.type !== "exercise" ||
      currentStep.executionMode !== "time" ||
      prepRemainingSeconds < 0
    ) {
      return;
    }

    if (prepRemainingSeconds === 0) {
      setPrepRemainingSeconds(-1);
      timedCountdownStartedRef.current = true;
      setTimedRemainingSeconds(currentStep.durationSeconds ?? 0);
      return;
    }

    const intervalId = setInterval(() => {
      setPrepRemainingSeconds((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [currentStep, prepRemainingSeconds, sessionPaused]);

  useEffect(() => {
    if (
      sessionPaused ||
      currentStep?.type !== "exercise" ||
      currentStep.executionMode !== "time" ||
      !currentStep.durationSeconds ||
      prepRemainingSeconds >= 0 ||
      timedRemainingSeconds < 0
    )
      return;

    if (timedRemainingSeconds === 0) {
      if (timedCountdownStartedRef.current) {
        timedCountdownStartedRef.current = false;
        handleCompleteExerciseStep();
      }
      return;
    }

    const intervalId = setInterval(() => {
      setTimedRemainingSeconds((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [
    currentStep,
    handleCompleteExerciseStep,
    prepRemainingSeconds,
    timedRemainingSeconds,
    sessionPaused,
  ]);

  const persistPausedSession = useCallback(async () => {
    if (!user?.uid || !templateId) return;

    const currentRestElapsedSeconds = getCurrentRestElapsedSeconds();

    await savePausedWorkoutSession(user.uid, templateId, {
      currentStepIndex,
      repsDone,
      weightDone,
      restRemainingSeconds,
      prepRemainingSeconds,
      timedRemainingSeconds,
      completedSets,
      pausedElapsedSeconds: totalPausedSecondsRef.current,
      currentRestElapsedSeconds,
      startedAt: sessionStartedAt,
      stepOverrides,
    });
  }, [
    completedSets,
    getCurrentRestElapsedSeconds,
    currentStepIndex,
    repsDone,
    restRemainingSeconds,
    prepRemainingSeconds,
    sessionStartedAt,
    templateId,
    timedRemainingSeconds,
    user?.uid,
    weightDone,
    stepOverrides,
  ]);

  const handlePauseAndExit = async () => {
    setSessionPaused(true);
    try {
      await persistPausedSession();
    } catch (error: any) {
      console.error("[runWorkout] failed to pause session", {
        templateId,
        uid: user?.uid,
        error,
      });
      const reason = error?.code ? ` (${error.code})` : "";
      showToast(`Could not pause session${reason}.`, "error");
      setSessionPaused(false);
      return;
    }
    setCloseConfirmOpen(false);
    router.replace(`/workouts/${id}`);
  };

  const handleEndSession = async () => {
    if (user?.uid && templateId) {
      await clearPausedWorkoutSession(user.uid, templateId);
    }
    setCloseConfirmOpen(false);
    router.replace("/workouts");
  };

  const roundGroups = useMemo<RoundGroup[]>(() => {
    if (steps.length === 0) return [];

    const groups: RoundGroup[] = [];
    const groupIndexById = new Map<string, number>();

    steps.forEach((step, absoluteIndex) => {
      const sectionId = step.sectionId ?? "legacy-round";
      const sectionType = step.sectionType ?? "round";
      const sectionLabel =
        step.sectionName?.trim() ||
        (sectionType === "warmup"
          ? "Warmup"
          : sectionType === "cooldown"
            ? "Cooldown"
            : "Round");

      const groupIndex = groupIndexById.get(sectionId);
      if (groupIndex !== undefined) {
        groups[groupIndex].items.push({ step, absoluteIndex });
        return;
      }

      groupIndexById.set(sectionId, groups.length);
      groups.push({
        id: sectionId,
        label: sectionLabel,
        sectionType,
        items: [{ step, absoluteIndex }],
      });
    });

    return groups;
  }, [steps]);

  const currentRoundId = useMemo(() => {
    const found = roundGroups.find((group) =>
      group.items.some((item) => item.absoluteIndex === currentStepIndex),
    );
    return found?.id ?? null;
  }, [roundGroups, currentStepIndex]);

  const currentRoundGroupIndex = useMemo(() => {
    if (!currentRoundId) return 0;
    const idx = roundGroups.findIndex((group) => group.id === currentRoundId);
    return idx >= 0 ? idx : 0;
  }, [currentRoundId, roundGroups]);

  const toggleRound = useCallback((roundId: string) => {
    setOpenRounds((prev) => ({
      ...prev,
      [roundId]: !prev[roundId],
    }));
  }, []);

  const isRoundReorderable = useCallback(
    (group: RoundGroup) =>
      group.sectionType === "round" &&
      group.items.every((item) => item.absoluteIndex > currentStepIndex),
    [currentStepIndex],
  );

  const handleRoundsReorder = useCallback(
    (reorderedGroups: RoundGroup[]) => {
      const reorderableIds = roundGroups
        .filter((group) => isRoundReorderable(group))
        .map((group) => group.id);

      if (reorderableIds.length < 2) return;

      const reorderableSet = new Set(reorderableIds);
      const reorderedRoundIds = reorderedGroups
        .map((group) => group.id)
        .filter((id) => reorderableSet.has(id));

      if (reorderedRoundIds.length !== reorderableIds.length) return;

      const roundById = new Map(roundGroups.map((group) => [group.id, group]));
      const finalGroups = [...roundGroups];

      let cursor = 0;
      for (let i = 0; i < finalGroups.length; i += 1) {
        if (!isRoundReorderable(finalGroups[i])) continue;
        const nextId = reorderedRoundIds[cursor++];
        const nextGroup = nextId ? roundById.get(nextId) : null;
        if (nextGroup) {
          finalGroups[i] = nextGroup;
        }
      }

      const nextStepIds = finalGroups.flatMap((group) =>
        group.items.map((item) => item.step.id),
      );
      setSessionStepIds(nextStepIds);
    },
    [roundGroups, isRoundReorderable],
  );

  // Auto-scroll top strip to keep current round at left; also scroll expanded list when open
  useEffect(() => {
    if (roundGroups.length === 0) return;
    const idx = Math.max(0, currentRoundGroupIndex);
    try {
      // top horizontal strip -> place current at left
      topStripRef.current?.scrollToIndex({
        index: idx,
        animated: true,
        viewPosition: 0,
      });
    } catch {}

    if (sheetExpanded) {
      try {
        progressListRef.current?.scrollToIndex({ index: idx, animated: true });
      } catch {}
    }
  }, [currentRoundGroupIndex, sheetExpanded, roundGroups.length]);

  const displayRestSeconds =
    restRemainingSeconds >= 0
      ? restRemainingSeconds
      : currentStep?.type === "rest"
        ? currentStep.restSeconds
        : 0;

  const displayTimedSeconds =
    timedRemainingSeconds >= 0
      ? timedRemainingSeconds
      : currentStep?.type === "exercise"
        ? (currentStep.durationSeconds ?? 0)
        : 0;

  const isTimedPrepPhase =
    currentStep?.type === "exercise" &&
    currentStep.executionMode === "time" &&
    prepRemainingSeconds >= 0;

  const displayPrepSeconds =
    prepRemainingSeconds >= 0
      ? prepRemainingSeconds
      : currentStep?.type === "exercise" && currentStep.executionMode === "time"
        ? Math.max(0, currentStep.prepSeconds ?? 0)
        : 0;

  const modalTargetStep =
    currentStep?.type === "exercise"
      ? currentStep
      : findNextExerciseStep(currentStepIndex);

  const howToOfficial = modalTargetStep?.exercise
    ? (catalogById[modalTargetStep.exercise.id] ??
      catalogById[normalizeKey(modalTargetStep.exercise.id)] ??
      catalogById[normalizeKey(modalTargetStep.exercise.name)] ??
      null)
    : null;

  const howToSteps: string[] =
    (Array.isArray(howToOfficial?.instructions)
      ? howToOfficial.instructions
      : String(howToOfficial?.instructions_en ?? "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)) || [];

  const howToImageUrl =
    Array.isArray(howToOfficial?.remote_image_urls) &&
    howToOfficial.remote_image_urls.length > 0
      ? howToOfficial.remote_image_urls[0]
      : null;

  const adjustReps = useCallback((delta: number) => {
    setEditReps((prev) => {
      const next = Math.max(0, (Number(prev || "0") || 0) + delta);
      return String(next);
    });
  }, []);

  const adjustWeight = useCallback((delta: number) => {
    setEditWeight((prev) => {
      const current = Number(prev || "0") || 0;
      const next = Math.max(0, Math.round((current + delta) * 10) / 10);
      return String(next);
    });
  }, []);

  const currentExerciseImages =
    currentStep?.type === "exercise"
      ? resolveExerciseImages(
          currentStep.exercise.id,
          currentStep.exercise.name,
        )
      : [];

  const currentExerciseImageUrl =
    currentExerciseImages.length > 0
      ? currentExerciseImages[heroImageIndex % currentExerciseImages.length]
      : null;

  const countdownTotalSeconds =
    currentStep?.type === "rest"
      ? currentStep.restSeconds
      : currentStep?.type === "exercise" &&
          currentStep.executionMode === "time" &&
          currentStep.durationSeconds
        ? (currentStep.durationSeconds ?? 0) +
          Math.max(0, currentStep.prepSeconds ?? 0)
        : 0;

  const countdownRemainingSeconds =
    currentStep?.type === "rest"
      ? displayRestSeconds
      : currentStep?.type === "exercise" &&
          currentStep.executionMode === "time" &&
          currentStep.durationSeconds
        ? Math.max(0, displayPrepSeconds) + Math.max(0, displayTimedSeconds)
        : -1;

  const countdownProgress =
    countdownTotalSeconds > 0
      ? Math.max(
          0,
          Math.min(
            1,
            (countdownTotalSeconds - countdownRemainingSeconds) /
              countdownTotalSeconds,
          ),
        )
      : 0;

  const onNextFromGesture = useCallback(() => {
    if (editOpen || closeConfirmOpen || sessionPaused) return;
    if (
      currentStep?.type === "exercise" &&
      currentStep.executionMode !== "time"
    ) {
      void handleCompleteExerciseStep();
      return;
    }
    setDragHint("Moved to next step");
    void handleAdvance();
  }, [
    closeConfirmOpen,
    currentStep,
    editOpen,
    handleAdvance,
    handleCompleteExerciseStep,
    sessionPaused,
  ]);

  const contentPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          Math.abs(gestureState.dx) > 40 && Math.abs(gestureState.dy) < 25,
        onPanResponderRelease: (_event, gestureState) => {
          if (gestureState.dx < -72) {
            onNextFromGesture();
            return;
          }

          if (gestureState.dx > 72) {
            handleStepBack();
          }
        },
      }),
    [handleStepBack, onNextFromGesture],
  );

  const sheetHandlePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          sheetGestureMovedRef.current = false;
          sheetTranslateY.stopAnimation((value) => {
            sheetDragStartYRef.current = value;
          });
        },
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          Math.abs(gestureState.dy) > 12 && Math.abs(gestureState.dx) < 45,
        onPanResponderMove: (_event, gestureState) => {
          if (Math.abs(gestureState.dy) > 3) {
            sheetGestureMovedRef.current = true;
          }

          const nextTranslateY = Math.max(
            0,
            Math.min(
              sheetTravelDistance,
              sheetDragStartYRef.current + gestureState.dy,
            ),
          );
          sheetTranslateY.setValue(nextTranslateY);
        },
        onPanResponderRelease: (_event, gestureState) => {
          if (!sheetGestureMovedRef.current) {
            animateSheet(!sheetExpanded);
            return;
          }

          sheetTranslateY.stopAnimation((value) => {
            const shouldExpand =
              gestureState.vy < -0.28 ||
              (gestureState.dy < -24 && Math.abs(gestureState.dx) < 38) ||
              value < sheetTravelDistance / 2;
            animateSheet(shouldExpand);
          });
        },
        onPanResponderTerminate: (_event, gestureState) => {
          sheetTranslateY.stopAnimation((value) => {
            const shouldExpand =
              gestureState.vy < -0.28 ||
              (gestureState.dy < -24 && Math.abs(gestureState.dx) < 38) ||
              value < sheetTravelDistance / 2;
            animateSheet(shouldExpand);
          });
        },
      }),
    [animateSheet, sheetExpanded, sheetTranslateY, sheetTravelDistance],
  );

  useEffect(() => {
    if (currentStep?.type !== "exercise") {
      setHeroImageIndex(0);
      setImageAutoCyclePaused(false);
      return;
    }

    setHeroImageIndex(0);
    setImageAutoCyclePaused(false);
  }, [currentStep?.id, currentStep?.type]);

  useEffect(() => {
    if (currentStep?.type !== "exercise") return;
    if (sessionPaused || editOpen || howToOpen || closeConfirmOpen) return;
    if (imageAutoCyclePaused) return;
    if (currentExerciseImages.length <= 1) return;

    const intervalId = setInterval(() => {
      setHeroImageIndex((prev) => (prev + 1) % currentExerciseImages.length);
    }, 2000);

    return () => clearInterval(intervalId);
  }, [
    closeConfirmOpen,
    currentExerciseImages.length,
    currentStep?.id,
    currentStep?.type,
    editOpen,
    howToOpen,
    imageAutoCyclePaused,
    sessionPaused,
  ]);

  useEffect(() => {
    if (!sessionHydrated || hydratingSession || !user?.uid) return;

    if (completedSets.length <= lastCompletedCountSavedRef.current) return;

    const timeoutId = setTimeout(() => {
      void savePausedWorkoutSession(user.uid, templateId, {
        currentStepIndex,
        repsDone,
        weightDone,
        restRemainingSeconds,
        prepRemainingSeconds,
        timedRemainingSeconds,
        completedSets,
        pausedElapsedSeconds: totalPausedSecondsRef.current,
        currentRestElapsedSeconds: getCurrentRestElapsedSeconds(),
        startedAt: sessionStartedAt,
        stepOverrides,
      })
        .then(() => {
          lastCompletedCountSavedRef.current = completedSets.length;
        })
        .catch((error) => {
          console.error(
            "[runWorkout] autosave after exercise complete failed",
            error,
          );
        });
    }, 220);

    return () => clearTimeout(timeoutId);
  }, [
    completedSets,
    currentStepIndex,
    hydratingSession,
    repsDone,
    getCurrentRestElapsedSeconds,
    restRemainingSeconds,
    prepRemainingSeconds,
    sessionHydrated,
    sessionStartedAt,
    templateId,
    timedRemainingSeconds,
    user?.uid,
    weightDone,
    stepOverrides,
  ]);

  if (loadingTemplate) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.background }}
      >
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={{ color: colors.muted, marginTop: 12, fontSize: 14 }}>
          Loading workout...
        </Text>
      </SafeAreaView>
    );
  }

  if (!sessionHydrated) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.background }}
      >
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={{ color: colors.muted, marginTop: 12, fontSize: 14 }}>
          Restoring session...
        </Text>
      </SafeAreaView>
    );
  }

  if (!currentStep) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.background }}
      >
        <Text style={{ color: colors.foreground }}>
          No workout steps available.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        position: "relative",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: Math.max(insets.top, 10),
          paddingBottom: 8,
        }}
      >
        <Pressable
          onPress={() => setCloseConfirmOpen(true)}
          hitSlop={14}
          style={{
            width: 44,
            height: 44,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 22,
            backgroundColor: isDark ? colors.secondary : colors.surface,
          }}
        >
          <X size={20} color={colors.foreground} />
        </Pressable>

        <Pressable
          onPress={() => setEditOpen(true)}
          hitSlop={14}
          style={{
            width: 44,
            height: 44,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 22,
            backgroundColor: isDark ? colors.secondary : colors.surface,
          }}
        >
          <SlidersHorizontal size={20} color={colors.foreground} />
        </Pressable>
      </View>

      {currentStep.sectionName ? (
        <View style={{ alignItems: "center", paddingBottom: 6 }}>
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor:
                currentStep.sectionType === "warmup"
                  ? "#d97706"
                  : currentStep.sectionType === "cooldown"
                    ? "#2563eb"
                    : "#0891b2",
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 0.8,
              }}
            >
              {currentStep.sectionName.toUpperCase()}
            </Text>
          </View>
        </View>
      ) : null}

      <View
        style={{
          flex: 1,
          paddingBottom: collapsedSheetHeight + insets.bottom + 14,
        }}
      >
        <View style={{ flex: 1 }} {...contentPanResponder.panHandlers}>
          {currentStep.type === "exercise" ? (
            <View className="flex-1">
              <Pressable
                style={{ flex: 1 }}
                onPress={() => {
                  if (currentExerciseImages.length < 2) {
                    onNextFromGesture();
                    return;
                  }

                  setImageAutoCyclePaused(true);

                  setHeroImageIndex(
                    (prev) => (prev + 1) % currentExerciseImages.length,
                  );
                }}
              >
                {currentExerciseImageUrl ? (
                  <Image
                    source={{ uri: currentExerciseImageUrl }}
                    resizeMode="cover"
                    style={{ width: "100%", height: "100%" }}
                  />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Dumbbell size={64} color={colors.muted} />
                  </View>
                )}

                {currentExerciseImages.length > 1 ? (
                  <View
                    style={{
                      position: "absolute",
                      right: 12,
                      bottom: 12,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 999,
                      backgroundColor: "rgba(15,23,42,0.55)",
                    }}
                  >
                    <Text
                      style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}
                    >
                      Tap to switch image
                    </Text>
                  </View>
                ) : null}
              </Pressable>

              <Pressable
                onPress={() => onNextFromGesture()}
                style={{
                  paddingHorizontal: 18,
                  paddingTop: 16,
                  paddingBottom: countdownRemainingSeconds >= 0 ? 72 : 16,
                }}
              >
                {currentStep.executionMode !== "time" ? (
                  <Text className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                    {`${repsDone || parseReps(currentStep.targetReps)}x`}
                  </Text>
                ) : null}
                {currentStep.executionMode === "time" ? (
                  <Text className="text-4xl font-bold text-cyan-600 dark:text-cyan-400">
                    {isTimedPrepPhase
                      ? `Prepare ${formatSeconds(displayPrepSeconds)}`
                      : formatSeconds(displayTimedSeconds)}
                  </Text>
                ) : null}
                <Text className="mt-1 text-base font-medium text-gray-600 dark:text-gray-400">
                  Current weight {weightDone || "0"} kg
                </Text>
                <Text className="mt-1 text-3xl font-semibold text-gray-900 dark:text-gray-100">
                  {currentStep.exercise.name}
                </Text>
                <View className="mt-3 flex-row items-center justify-between">
                  <Text className="text-sm text-gray-600 dark:text-gray-400">
                    Focus on form and control
                  </Text>
                  <Pressable
                    onPress={() => setHowToOpen(true)}
                    className="rounded-full px-3 py-1.5 bg-cyan-100 dark:bg-cyan-900/30"
                  >
                    <Text className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                      How to
                    </Text>
                  </Pressable>
                </View>
                {currentStep.executionMode === "time" ? (
                  <Text className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {`Work ${currentStep.durationSeconds ?? 0}s`}
                    {currentStep.prepSeconds
                      ? ` • Prep ${currentStep.prepSeconds}s`
                      : ""}
                  </Text>
                ) : null}

                {currentStep.executionMode !== "time" ? (
                  <Button
                    onPress={() => void handleCompleteExerciseStep()}
                    className="mt-5 w-full"
                  >
                    {isLastStep ? "Finish Workout" : "Next Set"}
                  </Button>
                ) : null}
              </Pressable>
            </View>
          ) : (
            <View
              className="flex-1 justify-between px-5 pt-2"
              style={{
                paddingBottom: countdownRemainingSeconds >= 0 ? 92 : 18,
              }}
            >
              <View className="items-center">
                <PauseCircle
                  size={48}
                  color={colors.primary}
                  style={{ marginBottom: 8 }}
                />
                <Text
                  className="font-bold text-cyan-600 dark:text-cyan-400"
                  style={{ fontSize: 110, lineHeight: 116 }}
                >
                  {formatSeconds(displayRestSeconds)}
                </Text>
                <Text className="mt-3 text-base text-gray-700 dark:text-gray-300">
                  Recover before the next set
                </Text>
              </View>

              <View>
                {(() => {
                  const nextExerciseStep =
                    findNextExerciseStep(currentStepIndex);
                  if (!nextExerciseStep) return null;
                  const nextImageUrl = resolveExerciseImages(
                    nextExerciseStep.exercise.id,
                    nextExerciseStep.exercise.name,
                  )[0];
                  return (
                    <View
                      className={cn(
                        "rounded-xl p-3",
                        isDark ? "bg-dark-surface" : "bg-light-surface",
                      )}
                    >
                      <View className="flex-row items-center gap-3">
                        {nextImageUrl ? (
                          <Image
                            source={{ uri: nextImageUrl }}
                            style={{ width: 58, height: 58 }}
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="h-[58px] w-[58px] items-center justify-center">
                            <Dumbbell size={24} color={colors.muted} />
                          </View>
                        )}
                        <View className="flex-1">
                          <Text className="text-xs text-gray-600 dark:text-gray-400">
                            Up next
                          </Text>
                          <Text className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {nextExerciseStep.exercise.name}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })()}

                <View className="mt-4 flex-row gap-3">
                  <Button
                    variant="secondary"
                    onPress={() =>
                      setRestRemainingSeconds((prev) => Math.max(prev, 0) + 15)
                    }
                    className="flex-1"
                  >
                    <View className="flex-row items-center gap-2">
                      <Plus size={16} color={colors.foreground} />
                      <Text className="text-gray-900 dark:text-gray-100">
                        Add 15s
                      </Text>
                    </View>
                  </Button>

                  <Button
                    variant="primary"
                    onPress={() => {
                      restCountdownStartedRef.current = false;
                      setRestRemainingSeconds(0);
                      void handleAdvance();
                    }}
                    className="flex-1"
                  >
                    Skip Rest
                  </Button>
                </View>

                <View className="mt-4 flex-row items-center justify-center gap-2">
                  <Clock3 size={14} color={colors.muted} />
                  <Text className="text-xs text-gray-600 dark:text-gray-400">
                    Swipe left to continue. Swipe right to undo one step.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {dragHint ? (
            <View
              pointerEvents="none"
              style={{
                pointerEvents: "none",
                position: "absolute",
                left: 16,
                right: 16,
                bottom:
                  collapsedSheetHeight +
                  insets.bottom +
                  (countdownRemainingSeconds >= 0 ? 52 : 18),
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 14,
                backgroundColor: isDark
                  ? "rgba(17,24,39,0.86)"
                  : "rgba(255,255,255,0.92)",
              }}
            >
              <Text className="text-center text-sm font-medium text-gray-800 dark:text-gray-100">
                {dragHint}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {countdownRemainingSeconds >= 0 ? (
        <View
          pointerEvents="none"
          style={{
            pointerEvents: "none",
            position: "absolute",
            left: 16,
            right: 16,
            bottom: collapsedSheetHeight + insets.bottom + 26,
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: "100%",
              height: 6,
              borderRadius: 999,
              overflow: "hidden",
              backgroundColor: isDark ? "#243142" : "#cbd5e1",
            }}
          >
            <View
              style={{
                width: `${countdownProgress * 100}%`,
                height: "100%",
                backgroundColor: colors.primary,
              }}
            />
          </View>
        </View>
      ) : null}

      <Animated.View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: expandedSheetHeight,
          transform: [{ translateY: sheetTranslateY }],
          backgroundColor: colors.background,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTopWidth: 1,
          borderTopColor: colors.cardBorder,
          paddingBottom: insets.bottom,
          overflow: "hidden",
        }}
      >
        {/* Sliding handle area (gesture only) */}
        <View
          {...sheetHandlePanResponder.panHandlers}
          style={{
            paddingTop: 10,
            paddingBottom: 6,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: isDark ? "#4b5563" : "#cbd5e1",
              marginBottom: 6,
            }}
          />
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              color: isDark ? "#6b7280" : "#9ca3af",
            }}
          >
            {sheetExpanded
              ? "Arraste para baixo ou toque para fechar"
              : "Arraste para cima ou toque para abrir"}
          </Text>
        </View>

        {/* Round strip: grouped markers only (no titles) */}
        <View style={{ paddingHorizontal: 12, paddingBottom: 6 }}>
          <FlatList
            data={roundGroups}
            ref={topStripRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
            renderItem={({ item: group }) => {
              const roundCompleted = group.items.every(
                (entry) => entry.absoluteIndex < currentStepIndex,
              );
              const roundActive = group.items.some(
                (entry) => entry.absoluteIndex === currentStepIndex,
              );

              return (
                <View
                  style={{
                    minWidth: 58,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: roundActive
                      ? colors.primary
                      : isDark
                        ? "#2d3748"
                        : "#dbe3ef",
                    backgroundColor: roundCompleted
                      ? isDark
                        ? "#16311f"
                        : "#ecfdf3"
                      : roundActive
                        ? colors.primary + "12"
                        : isDark
                          ? "#151b25"
                          : "#f8fafc",
                    paddingHorizontal: 8,
                    paddingVertical: 8,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {group.items.map((entry) => {
                      const isCurrent =
                        entry.absoluteIndex === currentStepIndex;
                      const isDone = entry.absoluteIndex < currentStepIndex;

                      if (entry.step.type === "rest") {
                        return (
                          <View
                            key={entry.step.id}
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 999,
                              backgroundColor: isCurrent
                                ? colors.primary
                                : isDone
                                  ? isDark
                                    ? "#34d399"
                                    : "#16a34a"
                                  : isDark
                                    ? "#4b5563"
                                    : "#cbd5e1",
                            }}
                          />
                        );
                      }

                      return (
                        <View
                          key={entry.step.id}
                          style={{
                            width: 14,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: isCurrent
                              ? colors.primary
                              : isDone
                                ? isDark
                                  ? "#34d399"
                                  : "#16a34a"
                                : isDark
                                  ? "#4b5563"
                                  : "#cbd5e1",
                          }}
                        />
                      );
                    })}
                  </View>
                </View>
              );
            }}
          />
        </View>

        {/* Expanded: accordion by round + drag reorder of complete rounds */}
        <Animated.View
          pointerEvents={sheetExpanded ? "auto" : "none"}
          style={{ flex: 1, opacity: sheetContentOpacity }}
        >
          <DraggableFlatList
            ref={progressListRef}
            data={roundGroups}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 12,
              paddingBottom: 8,
              gap: 8,
            }}
            onScrollToIndexFailed={() => {}}
            activationDistance={8}
            onDragEnd={({ data }) => {
              handleRoundsReorder(data);
            }}
            renderItem={({ item: group, drag, isActive }) => {
              // create a pan responder per item to support "drag to open" without blocking list scroll
              const headerPan = PanResponder.create({
                onStartShouldSetPanResponder: () => false,
                onMoveShouldSetPanResponder: (evt, gestureState) => {
                  const startX = evt.nativeEvent?.locationX ?? 0;
                  const absDy = Math.abs(gestureState.dy ?? 0);
                  const absDx = Math.abs(gestureState.dx ?? 0);

                  // ignore gestures starting on the rightmost area (grip/chevron)
                  if (startX > windowWidth - 80) return false;

                  // only claim vertical drags beyond a small threshold
                  return absDy > 12 && absDy > absDx;
                },
                onPanResponderRelease: (_, gestureState) => {
                  if (Math.abs(gestureState.dy ?? 0) > 40) {
                    toggleRound(group.id);
                  }
                },
                onPanResponderTerminate: (_, gestureState) => {
                  if (Math.abs(gestureState.dy ?? 0) > 40) {
                    toggleRound(group.id);
                  }
                },
              });
              const isCurrentRound = group.id === currentRoundId;
              const isOpen =
                openRounds[group.id] !== undefined
                  ? openRounds[group.id]
                  : isCurrentRound;
              const canDragRound = isRoundReorderable(group);

              return (
                <View
                  style={{
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: isCurrentRound
                      ? colors.primary
                      : colors.cardBorder,
                    backgroundColor: isDark ? "#151b25" : "#f8fafc",
                    overflow: "hidden",
                    opacity: isActive ? 0.85 : 1,
                  }}
                >
                  <View
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View
                      {...headerPan.panHandlers}
                      style={{ flex: 1, gap: 2 }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color: isCurrentRound
                            ? colors.primary
                            : colors.foreground,
                        }}
                      >
                        {group.label}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          color: isDark ? "#94a3b8" : "#64748b",
                        }}
                      >
                        {group.items.length} items
                      </Text>
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <Pressable
                        onLongPress={() => {
                          if (canDragRound) {
                            drag();
                          }
                        }}
                        delayLongPress={180}
                        hitSlop={10}
                        style={{
                          height: 28,
                          width: 28,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <GripVertical
                          size={15}
                          color={
                            canDragRound ? colors.muted : colors.cardBorder
                          }
                        />
                      </Pressable>
                      <Pressable
                        onPress={() => toggleRound(group.id)}
                        hitSlop={8}
                        style={{
                          height: 28,
                          width: 28,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {isOpen ? (
                          <ChevronUp size={16} color={colors.muted} />
                        ) : (
                          <ChevronDown size={16} color={colors.muted} />
                        )}
                      </Pressable>
                    </View>
                  </View>

                  {isOpen ? (
                    <View style={{ paddingHorizontal: 8, paddingBottom: 8 }}>
                      <FlatList
                        data={group.items}
                        keyExtractor={(entry) => entry.step.id}
                        scrollEnabled={false}
                        renderItem={({ item: entry }) => {
                          const isDone = entry.absoluteIndex < currentStepIndex;
                          const isCurrent =
                            entry.absoluteIndex === currentStepIndex;

                          const previewExercise =
                            entry.step.type === "exercise"
                              ? entry.step.exercise
                              : steps.find(
                                  (step): step is ExerciseStep =>
                                    step.type === "exercise" &&
                                    step.id ===
                                      (entry.step.type === "rest"
                                        ? entry.step.afterExerciseStepId
                                        : ""),
                                )?.exercise;

                          const previewImage = previewExercise
                            ? resolveExerciseImages(
                                previewExercise.id,
                                previewExercise.name,
                              )[0]
                            : null;

                          return (
                            <Pressable
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 10,
                                paddingVertical: 8,
                                paddingHorizontal: 10,
                                borderRadius: 10,
                                backgroundColor: isCurrent
                                  ? colors.primary + "12"
                                  : isDone
                                    ? isDark
                                      ? "#16311f"
                                      : "#ecfdf3"
                                    : isDark
                                      ? "#1c2533"
                                      : "#ffffff",
                                marginBottom: 6,
                              }}
                            >
                              {previewImage ? (
                                <Image
                                  source={{ uri: previewImage }}
                                  style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 8,
                                  }}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View className="h-[38px] w-[38px] items-center justify-center">
                                  <Dumbbell size={16} color={colors.muted} />
                                </View>
                              )}

                              <View style={{ flex: 1 }}>
                                <Text
                                  style={{
                                    fontSize: 12,
                                    fontWeight: isCurrent ? "700" : "600",
                                    color: isDark ? "#f3f4f6" : "#0f172a",
                                  }}
                                  numberOfLines={1}
                                >
                                  {entry.step.type === "exercise"
                                    ? entry.step.exercise.name
                                    : `Rest ${entry.step.restSeconds}s`}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 11,
                                    color: isDark ? "#94a3b8" : "#64748b",
                                  }}
                                >
                                  {entry.step.type === "exercise"
                                    ? `${entry.step.targetReps || "--"}${entry.step.targetWeightKg ? ` • ${entry.step.targetWeightKg}kg` : ""}`
                                    : "Recovery"}
                                </Text>
                              </View>

                              {isDone ? (
                                <CheckCircle2
                                  size={15}
                                  color={isDark ? "#4ade80" : "#16a34a"}
                                />
                              ) : (
                                <Dumbbell size={15} color={colors.muted} />
                              )}
                            </Pressable>
                          );
                        }}
                      />
                    </View>
                  ) : null}
                </View>
              );
            }}
          />
        </Animated.View>
      </Animated.View>

      <BottomSheetModal
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        title="Adjust Set Values"
      >
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          {modalTargetStep
            ? `Editing ${modalTargetStep.exercise.name} set ${modalTargetStep.setNumber}`
            : "Update reps or weight for the upcoming set"}
        </Text>

        <View className="gap-3 mt-1">
          {!modalTargetStep?.durationSeconds ? (
            <View className="rounded-2xl border border-light-border dark:border-dark-border p-3 gap-2">
              <Text className="text-xs text-gray-600 dark:text-gray-400">
                Reps
              </Text>
              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => adjustReps(-1)}
                  className="h-10 w-10 rounded-xl items-center justify-center bg-light-surface dark:bg-dark-surface"
                >
                  <Minus size={16} color={colors.foreground} />
                </Pressable>
                <TextInput
                  value={editReps}
                  onChangeText={setEditReps}
                  keyboardType="number-pad"
                  className={cn(
                    "flex-1 rounded-lg px-3 py-2 text-base border text-center",
                    isDark
                      ? "bg-dark-surface border-dark-border text-gray-100"
                      : "bg-white border-light-border text-gray-900",
                  )}
                />
                <Pressable
                  onPress={() => adjustReps(1)}
                  className="h-10 w-10 rounded-xl items-center justify-center bg-light-surface dark:bg-dark-surface"
                >
                  <Plus size={16} color={colors.foreground} />
                </Pressable>
              </View>
            </View>
          ) : null}

          <View className="rounded-2xl border border-light-border dark:border-dark-border p-3 gap-2">
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              Weight (kg)
            </Text>
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => adjustWeight(-2.5)}
                className="h-10 w-10 rounded-xl items-center justify-center bg-light-surface dark:bg-dark-surface"
              >
                <Minus size={16} color={colors.foreground} />
              </Pressable>
              <TextInput
                value={editWeight}
                onChangeText={setEditWeight}
                keyboardType="decimal-pad"
                placeholder="Optional"
                placeholderTextColor={isDark ? "#7a808a" : "#9ca3af"}
                className={cn(
                  "flex-1 rounded-lg px-3 py-2 text-base border text-center",
                  isDark
                    ? "bg-dark-surface border-dark-border text-gray-100"
                    : "bg-white border-light-border text-gray-900",
                )}
              />
              <Pressable
                onPress={() => adjustWeight(2.5)}
                className="h-10 w-10 rounded-xl items-center justify-center bg-light-surface dark:bg-dark-surface"
              >
                <Plus size={16} color={colors.foreground} />
              </Pressable>
            </View>
          </View>

          <View className="flex-row gap-3 mt-1">
            <Button
              variant="secondary"
              onPress={() => setEditOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onPress={() => {
                const parsedWeight = editWeight
                  ? Number(editWeight)
                  : undefined;
                setRepsDone(editReps || repsDone);
                setWeightDone(editWeight);

                // Apply overrides to future occurrences of this exercise
                if (modalTargetStep) {
                  setStepOverrides((prev) => {
                    const next = { ...prev };
                    for (let i = currentStepIndex; i < steps.length; i += 1) {
                      const s = steps[i];
                      if (s.type !== "exercise") continue;
                      if (s.exercise.id !== modalTargetStep.exercise.id)
                        continue;
                      // Do not override sets already completed
                      if (completedSets.some((cs) => cs.stepId === s.id))
                        continue;
                      next[s.id] = {
                        targetReps: !modalTargetStep.durationSeconds
                          ? editReps || s.targetReps
                          : undefined,
                        targetWeightKg:
                          parsedWeight !== undefined
                            ? parsedWeight
                            : s.targetWeightKg,
                      };
                    }
                    return next;
                  });
                }

                setEditOpen(false);
              }}
              className="flex-1"
            >
              Save
            </Button>
          </View>
        </View>
      </BottomSheetModal>

      <BottomSheetModal
        visible={howToOpen}
        onClose={() => setHowToOpen(false)}
        title={
          modalTargetStep
            ? `How to: ${modalTargetStep.exercise.name}`
            : "How to"
        }
      >
        {howToImageUrl ? (
          <Image
            source={{ uri: howToImageUrl }}
            style={{ width: "100%", height: 180, borderRadius: 14 }}
            resizeMode="cover"
          />
        ) : (
          <View className="h-[120px] rounded-2xl items-center justify-center bg-light-surface dark:bg-dark-surface">
            <Dumbbell size={26} color={colors.muted} />
          </View>
        )}

        {howToSteps.length > 0 ? (
          <View className="gap-2 mt-1">
            {howToSteps.map((step, index) => (
              <View key={`how-to-${index}`} className="flex-row gap-2">
                <Text className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {index + 1}.
                </Text>
                <Text className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                  {step}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            Instructions are not available for this exercise yet.
          </Text>
        )}
      </BottomSheetModal>

      {/* Close confirm modal (same visual system as adjust modal) */}
      <BottomSheetModal
        visible={closeConfirmOpen}
        onClose={() => setCloseConfirmOpen(false)}
        title="Leave workout session?"
      >
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          You can pause now and continue within 24h, or end the session.
        </Text>

        <View className="mt-1 flex-row gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onPress={() => setCloseConfirmOpen(false)}
          >
            Keep Training
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            onPress={() => void handlePauseAndExit()}
          >
            Pause
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onPress={() => void handleEndSession()}
          >
            End
          </Button>
        </View>
      </BottomSheetModal>
    </View>
  );
}
