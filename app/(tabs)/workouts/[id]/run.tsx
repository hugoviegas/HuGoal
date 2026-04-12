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
  weightKg?: number;
  durationSeconds?: number;
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
  targetWeightKg?: number;
  durationSeconds?: number;
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
              weightKg: block.weight_kg,
              durationSeconds: block.duration_seconds,
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
        targetWeightKg: setPlan.weightKg,
        durationSeconds: setPlan.durationSeconds,
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
  const { height: viewportHeight } = useWindowDimensions();
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
  const restCountdownStartedRef = useRef(false);
  const timedCountdownStartedRef = useRef(false);
  const furthestStepReachedRef = useRef(0);

  const collapsedSheetHeight = 122;
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
          setTimedRemainingSeconds(pausedSession.timed_remaining_seconds ?? -1);
          setCompletedSets(pausedSession.completed_sets ?? []);
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
      restCountdownStartedRef.current = false;
      setRestRemainingSeconds(-1);

      const defaultReps = currentStep.durationSeconds
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

      if (currentStep.durationSeconds) {
        timedCountdownStartedRef.current = true;
        setTimedRemainingSeconds(currentStep.durationSeconds);
      } else {
        timedCountdownStartedRef.current = false;
        setTimedRemainingSeconds(-1);
      }
      return;
    }

    timedCountdownStartedRef.current = false;
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

  const resolveExerciseImage = useCallback(
    (exerciseId: string, exerciseName?: string): string | null => {
      const item =
        catalogById[exerciseId] ??
        catalogById[normalizeKey(exerciseId)] ??
        (exerciseName ? catalogById[normalizeKey(exerciseName)] : undefined) ??
        null;

      const firstUrl = item?.remote_image_urls?.[0];
      return typeof firstUrl === "string" && firstUrl.length > 0
        ? firstUrl
        : null;
    },
    [catalogById],
  );

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

  const handleAdvance = useCallback(async () => {
    if (isLastStep) {
      // Save completed session
      if (user?.uid && template) {
        try {
          await clearPausedWorkoutSession(user.uid, templateId);
          const session = await saveCompletedWorkoutSession(user.uid, {
            templateId: template.id,
            workoutName: template.name,
            startedAt: sessionStartedAt,
            completedSets,
          });
          router.replace(`/workouts/${id}/summary?sessionId=${session.id}`);
        } catch (saveError) {
          console.error("[runWorkout] save session failed", saveError);
          showToast("Could not save session.", "error");
          router.replace(`/workouts/${id}/summary`);
        }
      } else {
        router.replace(`/workouts/${id}/summary`);
      }
      return;
    }

    setCurrentStepIndex((prev) => prev + 1);
  }, [
    completedSets,
    id,
    isLastStep,
    router,
    sessionStartedAt,
    template,
    templateId,
    user?.uid,
    showToast,
  ]);

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

    setCompletedSets((prev) => [
      ...prev,
      {
        stepId: currentExerciseStep.id,
        exerciseId: currentExerciseStep.exercise.id,
        setNumber: currentExerciseStep.setNumber,
        repsCompleted: currentExerciseStep.durationSeconds ? 0 : parsedReps,
        weightKg,
        completedAt: new Date().toISOString(),
      },
    ]);

    void handleAdvance();
  }, [currentExerciseStep, handleAdvance, repsDone, weightDone]);

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
      !currentStep.durationSeconds ||
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
    timedRemainingSeconds,
    sessionPaused,
  ]);

  const persistPausedSession = useCallback(async () => {
    if (!user?.uid || !templateId) return;

    await savePausedWorkoutSession(user.uid, templateId, {
      currentStepIndex,
      repsDone,
      weightDone,
      restRemainingSeconds,
      timedRemainingSeconds,
      completedSets,
      startedAt: sessionStartedAt,
    });
  }, [
    completedSets,
    currentStepIndex,
    repsDone,
    restRemainingSeconds,
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

  const currentExerciseImageUrl =
    currentStep?.type === "exercise"
      ? resolveExerciseImage(currentStep.exercise.id, currentStep.exercise.name)
      : null;

  const onNextFromGesture = useCallback(() => {
    if (editOpen || closeConfirmOpen || sessionPaused) return;
    if (currentStep?.type === "exercise" && !currentStep.durationSeconds) {
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
          Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 40,
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

      <Pressable
        style={{
          flex: 1,
          paddingBottom: collapsedSheetHeight + insets.bottom + 6,
        }}
        onPress={onNextFromGesture}
      >
        <View className="flex-1" {...contentPanResponder.panHandlers}>
          {currentStep.type === "exercise" ? (
            <View className="flex-1">
              <View style={{ flex: 1 }}>
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
              </View>

              <View
                style={{
                  paddingHorizontal: 18,
                  paddingTop: 16,
                  paddingBottom: 8,
                }}
              >
                <Text className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                  {currentStep.durationSeconds
                    ? formatSeconds(displayTimedSeconds)
                    : `${repsDone || parseReps(currentStep.targetReps)}x`}
                </Text>
                <Text className="mt-1 text-3xl font-semibold text-gray-900 dark:text-gray-100">
                  {currentStep.exercise.name}
                  {!currentStep.durationSeconds && weightDone
                    ? ` • ${weightDone} kg`
                    : ""}
                </Text>
                <Text className="mt-2 text-base text-gray-600 dark:text-gray-400">
                  Set {currentStep.setNumber}/{currentStep.totalSets} •{" "}
                  {currentStep.exerciseIndex + 1}/{exercises.length}
                </Text>

                {!currentStep.durationSeconds ? (
                  <Button
                    onPress={() => void handleCompleteExerciseStep()}
                    className="mt-5 w-full"
                  >
                    {isLastStep ? "Finish Workout" : "Next Set"}
                  </Button>
                ) : null}
              </View>
            </View>
          ) : (
            <View className="flex-1 justify-between px-5 pb-3 pt-2">
              <View className="items-center">
                <Text className="text-6xl font-bold text-cyan-600 dark:text-cyan-400">
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
                  const nextImageUrl = resolveExerciseImage(
                    nextExerciseStep.exercise.id,
                    nextExerciseStep.exercise.name,
                  );
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
                bottom: collapsedSheetHeight + insets.bottom + 18,
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
      </Pressable>

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
        <View
          {...sheetPanResponder.panHandlers}
          style={{
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 8,
            paddingBottom: 10,
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
          <Text className="mt-2 text-xs font-semibold text-gray-600 dark:text-gray-400">
            {sheetExpanded ? "Swipe down to close" : "Swipe up for next steps"}
          </Text>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          <Stepper steps={stepperRounds} currentStep={currentRoundIndex} />
          <View className="mb-2 mt-3 flex-row items-center justify-between">
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              Step {currentStepIndex + 1} of {steps.length}
            </Text>
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              Sets done: {completedSets.length}
            </Text>
          </View>
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
                ? resolveExerciseImage(previewExercise.id, previewExercise.name)
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
        maxWidth={520}
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
