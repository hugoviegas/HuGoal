import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, SafeAreaView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Clock3,
  Dumbbell,
  Plus,
  SlidersHorizontal,
  X,
} from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
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
  savePausedWorkoutSession,
  type CompletedExerciseSetRecord,
} from "@/lib/firestore/workouts";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useToastStore } from "@/stores/toast.store";
import { cn } from "@/lib/utils";

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

const MOCK_WORKOUT = {
  id: "1",
  name: "Full Body Strength",
  exercises: [
    {
      id: "ex1",
      name: "Push-ups",
      setsPlan: [
        { id: "s1", setNumber: 1, reps: "10-12" },
        { id: "s2", setNumber: 2, reps: "8-10" },
        { id: "s3", setNumber: 3, reps: "6-8" },
      ],
      muscleGroups: ["Chest", "Shoulders", "Triceps"],
      instructions:
        "Keep your body straight, lower until chest near ground, push back up.",
    },
    {
      id: "ex2",
      name: "Goblet Squats",
      setsPlan: [
        { id: "s4", setNumber: 1, reps: "15", weightKg: 12 },
        { id: "s5", setNumber: 2, reps: "12", weightKg: 12 },
        { id: "s6", setNumber: 3, reps: "10", weightKg: 14 },
      ],
      muscleGroups: ["Quads", "Glutes", "Hamstrings"],
      instructions:
        "Feet shoulder-width, lower hips back and down, keep chest up.",
    },
    {
      id: "ex3",
      name: "Plank Hold",
      setsPlan: [
        { id: "s7", setNumber: 1, reps: "Timed", durationSeconds: 45 },
        { id: "s8", setNumber: 2, reps: "Timed", durationSeconds: 45 },
      ],
      muscleGroups: ["Core", "Shoulders"],
      instructions: "Maintain a strong straight line and keep your core tight.",
    },
  ],
};

function parseReps(targetReps: string): number {
  const match = targetReps.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function buildSteps(exercises: RunningExercise[]): SessionStep[] {
  const output: SessionStep[] = [];

  exercises.forEach((exercise, exerciseIndex) => {
    exercise.setsPlan.forEach((setPlan, setIndex) => {
      const stepId = `${exercise.id}-set-${setPlan.setNumber}`;

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
          restSeconds: 40,
        });
      }
    });
  });

  return output;
}

export default function RunWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { show: showToast } = useToastStore();
  const { isDark, colors } = useThemeStore();
  useHideMainTabBar();
  const templateId = String(id);

  const [exercises] = useState<RunningExercise[]>(MOCK_WORKOUT.exercises);
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
  const restCountdownStartedRef = useRef(false);
  const timedCountdownStartedRef = useRef(false);

  const currentStep = steps[currentStepIndex];
  const currentExerciseStep =
    currentStep?.type === "exercise" ? currentStep : null;
  const isLastStep = currentStepIndex === steps.length - 1;

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!user?.uid || !templateId) {
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

      setHydratingSession(false);
      setSessionHydrated(true);
    })();

    return () => {
      mounted = false;
    };
  }, [templateId, user?.uid, steps.length, showToast]);

  useEffect(() => {
    if (hydratingSession) return;
    if (!currentStep) return;

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

  const findNextExerciseStep = (fromIndex: number): ExerciseStep | null => {
    for (let i = fromIndex + 1; i < steps.length; i += 1) {
      const step = steps[i];
      if (step.type === "exercise") return step;
    }
    return null;
  };

  const handleAdvance = useCallback(() => {
    if (isLastStep) {
      if (user?.uid && templateId) {
        void clearPausedWorkoutSession(user.uid, templateId);
      }
      router.replace(`/workouts/${id}/summary`);
      return;
    }

    setCurrentStepIndex((prev) => prev + 1);
  }, [id, isLastStep, router, templateId, user?.uid]);

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

    handleAdvance();
  }, [currentExerciseStep, handleAdvance, repsDone, weightDone]);

  useEffect(() => {
    if (sessionPaused) return;
    if (currentStep?.type !== "rest") return;
    if (restRemainingSeconds < 0) return;

    if (restRemainingSeconds === 0) {
      if (restCountdownStartedRef.current) {
        restCountdownStartedRef.current = false;
        handleAdvance();
      }
      return;
    }

    const intervalId = setInterval(() => {
      setRestRemainingSeconds((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [currentStep, handleAdvance, restRemainingSeconds, sessionPaused]);

  useEffect(() => {
    if (sessionPaused) return;
    if (currentStep?.type !== "exercise") return;
    if (!currentStep.durationSeconds) return;
    if (timedRemainingSeconds < 0) return;

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

  const handleCloseRequest = () => {
    setCloseConfirmOpen(true);
  };

  const handlePauseAndExit = async () => {
    setSessionPaused(true);
    try {
      await persistPausedSession();
    } catch (error: any) {
      console.error("[runWorkout] failed to pause session", {
        templateId,
        uid: user?.uid,
        currentStepIndex,
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

  const stepperRounds = exercises.map((exercise) => ({
    id: exercise.id,
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

  if (!sessionHydrated) {
    return (
      <SafeAreaView
        className={cn("flex-1 items-center justify-center")}
        style={{ backgroundColor: colors.background }}
      >
        <Text style={{ color: colors.foreground }}>Loading session...</Text>
      </SafeAreaView>
    );
  }

  if (!currentStep) {
    return (
      <SafeAreaView
        className={cn("flex-1 items-center justify-center")}
        style={{ backgroundColor: colors.background }}
      >
        <Text style={{ color: colors.foreground }}>
          No workout steps available.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
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
          paddingTop: 8,
          paddingBottom: 8,
        }}
      >
        <Pressable
          onPress={handleCloseRequest}
          hitSlop={12}
          style={{
            width: 40,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 20,
            backgroundColor: isDark ? colors.secondary : colors.surface,
          }}
        >
          <X size={18} color={colors.foreground} />
        </Pressable>

        <View style={{ alignItems: "center" }}>
          <Text
            style={{
              fontSize: 12,
              color: colors.muted,
              fontWeight: "600",
              letterSpacing: 0.5,
            }}
          >
            Live Session
          </Text>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: colors.foreground,
              marginTop: 4,
            }}
          >
            {MOCK_WORKOUT.name}
          </Text>
        </View>

        <Pressable
          onPress={() => setEditOpen(true)}
          hitSlop={12}
          style={{
            width: 40,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 20,
            backgroundColor: isDark ? colors.secondary : colors.surface,
          }}
        >
          <SlidersHorizontal size={18} color={colors.foreground} />
        </Pressable>
      </View>

      <View
        style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingBottom: 100,
        }}
      >
        {currentStep.type === "exercise" ? (
          <View className="flex-1 justify-between">
            <View className="items-center pt-2">
              <Text className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">
                Set {currentStep.setNumber}/{currentStep.totalSets}
              </Text>
              <Text className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                {currentStep.exerciseIndex + 1}/{exercises.length} rounds
              </Text>
            </View>

            <View className="items-center justify-center flex-1">
              <View
                className={cn(
                  "h-56 w-full max-w-[320px] rounded-2xl items-center justify-center border",
                  isDark
                    ? "bg-black/25 border-dark-border"
                    : "bg-white border-light-border",
                )}
              >
                <Dumbbell size={58} color={colors.muted} />
                <Text className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                  Static exercise image placeholder
                </Text>
              </View>
            </View>

            <View className="pb-2">
              <Text className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                {currentStep.durationSeconds
                  ? `${formatSeconds(displayTimedSeconds)}`
                  : `${repsDone || parseReps(currentStep.targetReps)}x`}
              </Text>
              <Text className="text-3xl font-semibold mt-1 text-gray-900 dark:text-gray-100">
                {currentStep.exercise.name}
                {!currentStep.durationSeconds && weightDone
                  ? ` • ${weightDone} kg`
                  : ""}
              </Text>
              <Text className="text-lg mt-2 text-gray-600 dark:text-gray-400">
                Next:{" "}
                {currentStep.durationSeconds ? "Auto transition" : "45s Rest"}
              </Text>

              <View className="flex-row flex-wrap gap-2 mt-4">
                {currentStep.exercise.muscleGroups.map((muscle) => (
                  <Badge key={muscle} variant="secondary" size="sm">
                    {muscle}
                  </Badge>
                ))}
              </View>

              {currentStep.exercise.instructions ? (
                <Text className="mt-4 text-sm text-gray-700 dark:text-gray-300">
                  {currentStep.exercise.instructions}
                </Text>
              ) : null}

              {!currentStep.durationSeconds ? (
                <Button
                  onPress={() => handleCompleteExerciseStep()}
                  className="w-full mt-5"
                >
                  Next Set
                </Button>
              ) : null}
            </View>
          </View>
        ) : (
          <View className="flex-1 justify-between pb-2">
            <View className="items-center pt-2">
              <Text className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">
                Rest
              </Text>
            </View>

            <View className="items-center">
              <Text className="text-6xl font-bold text-cyan-600 dark:text-cyan-400">
                {formatSeconds(displayRestSeconds)}
              </Text>
              <Text className="text-base mt-3 text-gray-700 dark:text-gray-300">
                Recover before the next set
              </Text>
            </View>

            <View>
              {(() => {
                const nextExerciseStep = findNextExerciseStep(currentStepIndex);
                if (!nextExerciseStep) return null;

                return (
                  <View
                    className={cn(
                      "rounded-xl p-3 border",
                      isDark
                        ? "bg-dark-surface border-dark-border"
                        : "bg-light-surface border-light-border",
                    )}
                  >
                    <Text className="text-xs text-gray-600 dark:text-gray-400">
                      Up next
                    </Text>
                    <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-1">
                      {nextExerciseStep.exercise.name}
                    </Text>
                    <Text className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                      Set {nextExerciseStep.setNumber}/
                      {nextExerciseStep.totalSets}
                    </Text>
                  </View>
                );
              })()}

              <View className="flex-row gap-3 mt-4">
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
                    handleAdvance();
                  }}
                  className="flex-1"
                >
                  Skip Rest
                </Button>
              </View>

              <View className="flex-row items-center justify-center mt-4 gap-2">
                <Clock3 size={14} color={colors.muted} />
                <Text className="text-xs text-gray-600 dark:text-gray-400">
                  Auto-advance when countdown reaches zero.
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.cardBorder,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 8,
        }}
      >
        <Stepper steps={stepperRounds} currentStep={currentRoundIndex} />
        <View className="mt-3 mb-2 flex-row items-center justify-between">
          <Text className="text-xs text-gray-600 dark:text-gray-400">
            Step {currentStepIndex + 1} of {steps.length}
          </Text>
          <Text className="text-xs text-gray-600 dark:text-gray-400">
            Sets completed: {completedSets.length}
          </Text>
        </View>
      </View>

      <ResponsiveModal open={editOpen} onOpenChange={setEditOpen}>
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
            onPress={() => {
              void handlePauseAndExit();
            }}
          >
            Pause Session
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onPress={() => {
              void handleEndSession();
            }}
          >
            End Session
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModal>
    </SafeAreaView>
  );
}
