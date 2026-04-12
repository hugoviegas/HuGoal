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
  Image,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Clock3,
  Dumbbell,
  Plus,
  SlidersHorizontal,
  X,
} from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { Stepper } from "@/components/ui/stepper";
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@/components/ui/ResponsiveModal";
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
}

interface RestStep {
  id: string;
  type: "rest";
  afterExerciseStepId: string;
  restSeconds: number;
}

type SessionStep = ExerciseStep | RestStep;

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
        });
      }
    });
  });

  return output;
}

// ─── Screen ───────────────────────────────────────────────────────────────

export default function RunWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: viewportHeight, width: viewportWidth } =
    useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const { show: showToast } = useToastStore();
  const { isDark, colors } = useThemeStore();
  useHideMainTabBar();
  const templateId = String(id);

  const [template, setTemplate] = useState<WorkoutTemplateRecord | null>(null);
  const [catalogById, setCatalogById] = useState<Record<string, any>>({});
  const [exercises, setExercises] = useState<RunningExercise[]>([]);
  const [loadingTemplate, setLoadingTemplate] = useState(true);

  const steps = useMemo(() => buildSteps(exercises), [exercises]);

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

  const collapsedSheetHeight = 118;
  const expandedSheetHeight = Math.min(viewportHeight * 0.52, 430);
  const sheetHeightAnim = useRef(
    new Animated.Value(collapsedSheetHeight),
  ).current;
  const [sheetExpanded, setSheetExpanded] = useState(false);

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

        const runningExercises = templateToRunningExercises(
          workoutRecord,
          byId,
        );
        setTemplate(workoutRecord);
        setCatalogById(byId);
        setExercises(runningExercises);
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
      Animated.timing(sheetHeightAnim, {
        toValue: expanded ? expandedSheetHeight : collapsedSheetHeight,
        duration: 220,
        useNativeDriver: false,
      }).start();
    },
    [collapsedSheetHeight, expandedSheetHeight, sheetHeightAnim],
  );

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

  const currentRoundIndex =
    currentStep?.type === "exercise"
      ? currentStep.exerciseIndex
      : (findNextExerciseStep(currentStepIndex)?.exerciseIndex ?? 0);

  const goToPreviousExerciseFromStepper = useCallback(
    (targetExerciseIndex: number) => {
      const allowedPreviousExerciseIndex = currentRoundIndex - 1;

      if (
        allowedPreviousExerciseIndex < 0 ||
        targetExerciseIndex !== allowedPreviousExerciseIndex
      ) {
        setDragHint("Only previous exercise can be reopened");
        return;
      }

      for (let i = currentStepIndex - 1; i >= 0; i -= 1) {
        const step = steps[i];
        if (
          step.type === "exercise" &&
          step.exerciseIndex === targetExerciseIndex
        ) {
          setCurrentStepIndex(i);
          setDragHint("Returned to previous exercise");
          return;
        }
      }

      setDragHint("Previous exercise is locked");
    },
    [currentRoundIndex, currentStepIndex, steps],
  );

  const stepperRounds = exercises.map((exercise, index) => ({
    id: `${exercise.id}-${index}`,
    label: exercise.name,
  }));

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

  const upcomingSteps = useMemo(
    () =>
      steps.slice(
        currentStepIndex,
        Math.min(currentStepIndex + 12, steps.length),
      ),
    [currentStepIndex, steps],
  );

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

  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          Math.abs(gestureState.dy) > 12 && Math.abs(gestureState.dx) < 45,
        onPanResponderMove: (_event, gestureState) => {
          const baseHeight = sheetExpanded
            ? expandedSheetHeight
            : collapsedSheetHeight;
          const nextHeight = Math.max(
            collapsedSheetHeight,
            Math.min(expandedSheetHeight, baseHeight - gestureState.dy),
          );
          sheetHeightAnim.setValue(nextHeight);
        },
        onPanResponderRelease: (_event, gestureState) => {
          sheetHeightAnim.stopAnimation((value) => {
            const shouldExpand =
              gestureState.dy < -32 ||
              (!sheetExpanded && value > collapsedSheetHeight + 44);
            animateSheet(shouldExpand);
          });
        },
      }),
    [
      animateSheet,
      collapsedSheetHeight,
      expandedSheetHeight,
      sheetExpanded,
      sheetHeightAnim,
    ],
  );

  useEffect(() => {
    if (currentStep?.type !== "exercise") {
      setHeroImageIndex(0);
      return;
    }

    setHeroImageIndex(0);
  }, [currentStep?.id, currentStep?.type]);

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

                  setHeroImageIndex(
                    (prev) =>
                      (prev + 1) % Math.min(2, currentExerciseImages.length),
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
                <Text className="mt-1 text-3xl font-semibold text-gray-900 dark:text-gray-100">
                  {currentStep.exercise.name}
                  {currentStep.executionMode !== "time" && weightDone
                    ? ` • ${weightDone} kg`
                    : ""}
                </Text>
                <Text className="mt-2 text-base text-gray-600 dark:text-gray-400">
                  Set {currentStep.setNumber}/{currentStep.totalSets} •{" "}
                  {currentStep.exerciseIndex + 1}/{exercises.length}
                </Text>
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
          height: sheetHeightAnim,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.cardBorder,
          paddingBottom: insets.bottom,
        }}
      >
        <View style={{ paddingTop: 6, paddingBottom: 2 }}>
          <View
            {...sheetPanResponder.panHandlers}
            style={{
              alignItems: "center",
              justifyContent: "center",
              minHeight: 44,
              paddingHorizontal: 16,
              paddingVertical: 8,
            }}
          >
            <View
              style={{
                width: 48,
                height: 4,
                borderRadius: 999,
                backgroundColor: isDark ? "#4b5563" : "#cbd5e1",
              }}
            />
          </View>

          <Pressable
            onPress={() => animateSheet(!sheetExpanded)}
            style={{
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 2,
              paddingBottom: 6,
            }}
          >
            <Text className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              {sheetExpanded ? "Tap to close steps" : "Tap to open steps"}
            </Text>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 0, paddingBottom: 8 }}>
          <Stepper
            steps={stepperRounds}
            currentStep={currentRoundIndex}
            onStepPress={goToPreviousExerciseFromStepper}
            isStepPressable={(index) => index === currentRoundIndex - 1}
          />
        </View>

        {sheetExpanded ? (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 14 }}
            showsVerticalScrollIndicator={false}
          >
            {upcomingSteps.map((step, relativeIndex) => {
              const absoluteIndex = currentStepIndex + relativeIndex;
              const isCurrent = absoluteIndex === currentStepIndex;
              const isLockedCompleted =
                absoluteIndex < Math.max(furthestStepReachedRef.current - 1, 0);
              const previewExercise =
                step.type === "exercise"
                  ? step.exercise
                  : findNextExerciseStep(absoluteIndex)?.exercise;
              const previewImage = previewExercise
                ? resolveExerciseImages(
                    previewExercise.id,
                    previewExercise.name,
                  )[0]
                : null;

              return (
                <View
                  key={step.id}
                  className={cn(
                    "mb-2 flex-row items-center gap-3 rounded-xl px-3 py-2",
                    isCurrent
                      ? "bg-cyan-500/15"
                      : isLockedCompleted
                        ? "bg-emerald-500/12"
                        : isDark
                          ? "bg-dark-surface"
                          : "bg-light-surface",
                  )}
                >
                  {previewImage ? (
                    <Image
                      source={{ uri: previewImage }}
                      style={{ width: 46, height: 46 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="h-[46px] w-[46px] items-center justify-center">
                      <Dumbbell size={18} color={colors.muted} />
                    </View>
                  )}

                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {step.type === "exercise" ? step.exercise.name : "Rest"}
                    </Text>
                    <Text className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                      {step.type === "exercise"
                        ? `Set ${step.setNumber}/${step.totalSets}`
                        : `${step.restSeconds}s recovery`}
                    </Text>
                  </View>

                  <Text className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                    {isCurrent
                      ? "Now"
                      : isLockedCompleted
                        ? "Done"
                        : `+${relativeIndex}`}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        ) : null}
      </Animated.View>

      {/* Edit modal */}
      <ResponsiveModal
        open={editOpen}
        onOpenChange={setEditOpen}
        position="center"
        maxWidth={Math.min(Math.max(viewportWidth - 40, 320), 920)}
      >
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Adjust Set Values</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            {modalTargetStep
              ? `Editing ${modalTargetStep.exercise.name} set ${modalTargetStep.setNumber}`
              : "Update reps or weight for the upcoming set"}
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <ResponsiveModalBody>
          <View className="gap-3">
            {!modalTargetStep?.durationSeconds ? (
              <View>
                <Text className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Reps
                </Text>
                <TextInput
                  value={editReps}
                  onChangeText={setEditReps}
                  keyboardType="number-pad"
                  className={cn(
                    "rounded-lg px-3 py-2 text-base border",
                    isDark
                      ? "bg-dark-surface border-dark-border text-gray-100"
                      : "bg-white border-light-border text-gray-900",
                  )}
                />
              </View>
            ) : null}

            <View>
              <Text className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                Weight (kg)
              </Text>
              <TextInput
                value={editWeight}
                onChangeText={setEditWeight}
                keyboardType="decimal-pad"
                placeholder="Optional"
                placeholderTextColor={isDark ? "#7a808a" : "#9ca3af"}
                className={cn(
                  "rounded-lg px-3 py-2 text-base border",
                  isDark
                    ? "bg-dark-surface border-dark-border text-gray-100"
                    : "bg-white border-light-border text-gray-900",
                )}
              />
            </View>
          </View>
        </ResponsiveModalBody>

        <ResponsiveModalFooter>
          <Button
            variant="secondary"
            onPress={() => setEditOpen(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onPress={() => {
              setRepsDone(editReps || repsDone);
              setWeightDone(editWeight);
              setEditOpen(false);
            }}
            className="flex-1"
          >
            Save
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModal>

      {/* Close confirm modal */}
      <ResponsiveModal
        open={closeConfirmOpen}
        onOpenChange={setCloseConfirmOpen}
      >
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Leave workout session?</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            You can pause now and continue within 24h, or end the session.
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <ResponsiveModalFooter>
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
        </ResponsiveModalFooter>
      </ResponsiveModal>
    </View>
  );
}
