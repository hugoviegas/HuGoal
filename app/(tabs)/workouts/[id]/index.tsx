import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Clock3,
  Dumbbell,
  Play,
  Timer,
  Weight,
} from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { MuscleMap } from "@/components/workouts/MuscleMap";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import {
  clearPausedWorkoutSession,
  getPausedWorkoutSession,
  getWorkoutTemplate,
  type PausedWorkoutSessionRecord,
  type WorkoutTemplateRecord,
} from "@/lib/firestore/workouts";
import { getExerciseCatalog } from "@/lib/workouts/exercise-catalog";
import type { OfficialExerciseRecord } from "@/lib/workouts/generated/official-exercises";
import { cn } from "@/lib/utils";

function formatEquipment(equipment: string[] | undefined): string {
  if (!equipment || equipment.length === 0) {
    return "No equipment";
  }

  return equipment
    .map((item) => item.replace(/_/g, " "))
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(", ");
}

function estimateExerciseSeconds(
  exercise: WorkoutTemplateRecord["exercises"][number],
  workoutDuration: number,
  totalExercises: number,
): number {
  const perExerciseMinutes =
    totalExercises > 0 ? workoutDuration / totalExercises : 1;
  const base = Math.max(35, Math.round(perExerciseMinutes * 60));
  return Math.max(base, exercise.sets * 35);
}

function extractWeightHint(reps: string): string {
  const match = reps.match(/\d+(?:[\.,]\d+)?\s?kg/i);
  if (match?.[0]) {
    return match[0].replace(/\s+/g, " ");
  }
  return "Adaptive load";
}

export default function WorkoutDetailScreen() {
  const { id, exerciseId } = useLocalSearchParams<{
    id: string;
    exerciseId?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const { isDark, colors } = useThemeStore();
  const showToast = useToastStore((state) => state.show);

  const [workout, setWorkout] = useState<WorkoutTemplateRecord | null>(null);
  const [catalogById, setCatalogById] = useState<
    Record<string, OfficialExerciseRecord>
  >({});
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(
    exerciseId ?? "",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pausedSession, setPausedSession] =
    useState<PausedWorkoutSessionRecord | null>(null);

  useEffect(() => {
    if (exerciseId) {
      setSelectedExerciseId(exerciseId);
    }
  }, [exerciseId]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const [workoutRecord, catalog] = await Promise.all([
          getWorkoutTemplate(String(id)),
          getExerciseCatalog(),
        ]);

        if (!mounted) {
          return;
        }

        if (!workoutRecord) {
          setWorkout(null);
          setError("Workout not found.");
          return;
        }

        const byId: Record<string, OfficialExerciseRecord> = {};
        for (const item of catalog.exercises) {
          byId[item.id] = item;
        }

        setCatalogById(byId);
        setWorkout(workoutRecord);

        const fallbackExerciseId =
          exerciseId ?? workoutRecord.exercises[0]?.id ?? "";
        setSelectedExerciseId(fallbackExerciseId);
      } catch (loadError) {
        console.error("[workoutDetail] load failed", loadError);
        if (!mounted) {
          return;
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load workout.",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [exerciseId, id]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!user?.uid || !id) {
        if (mounted) {
          setPausedSession(null);
        }
        return;
      }

      try {
        const paused = await getPausedWorkoutSession(user.uid, String(id));
        if (mounted) {
          setPausedSession(paused);
        }
      } catch (pausedError) {
        console.error(
          "[workoutDetail] paused session load failed",
          pausedError,
        );
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id, user?.uid]);

  const selectedExercise = useMemo(() => {
    if (!workout || workout.exercises.length === 0) {
      return null;
    }

    return (
      workout.exercises.find(
        (exercise) => exercise.id === selectedExerciseId,
      ) ?? workout.exercises[0]
    );
  }, [selectedExerciseId, workout]);

  const selectedOfficial = selectedExercise
    ? catalogById[selectedExercise.id]
    : null;
  const imageUrl = selectedOfficial?.remote_image_urls?.[0] ?? null;
  const musclePrimary = selectedOfficial?.primary_muscles?.length
    ? selectedOfficial.primary_muscles
    : (selectedExercise?.muscleGroups ?? []);
  const muscleSecondary = selectedOfficial?.secondary_muscles ?? [];

  const handleStartWorkout = async () => {
    if (!id) {
      return;
    }

    if (user?.uid) {
      try {
        await clearPausedWorkoutSession(user.uid, String(id));
        setPausedSession(null);
      } catch (clearError) {
        console.error(
          "[workoutDetail] failed to clear paused workout",
          clearError,
        );
      }
    }

    router.push(`/workouts/${id}/run`);
  };

  if (loading) {
    return (
      <View className={cn("flex-1", isDark ? "bg-dark-bg" : "bg-light-bg")}>
        <View className="h-56 bg-gray-300/20" />
        <View className="px-4 pt-4">
          <View className="h-8 w-44 rounded-lg bg-gray-300/25 mb-3" />
          <View className="h-4 w-56 rounded bg-gray-300/25" />
        </View>
      </View>
    );
  }

  if (!workout || !selectedExercise) {
    return (
      <View
        className={cn(
          "flex-1 items-center justify-center px-6",
          isDark ? "bg-dark-bg" : "bg-light-bg",
        )}
      >
        <Text className="text-base text-center text-gray-900 dark:text-gray-100 font-semibold">
          {error ?? "Workout unavailable."}
        </Text>
        <Button className="mt-4" onPress={() => router.back()}>
          Go back
        </Button>
      </View>
    );
  }

  const estimatedSeconds = estimateExerciseSeconds(
    selectedExercise,
    workout.estimated_duration_minutes,
    workout.exercises.length,
  );
  const tabBarClearance = insets.bottom + 76;
  const hasPausedSession = !!pausedSession;

  return (
    <View className={cn("flex-1", isDark ? "bg-dark-bg" : "bg-light-bg")}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: tabBarClearance + 120,
        }}
      >
        <View style={{ paddingTop: insets.top + 6 }} className="px-4 mb-3">
          <Pressable
            onPress={() => router.back()}
            className={cn(
              "h-11 w-11 rounded-2xl border items-center justify-center",
              isDark
                ? "bg-dark-surface border-dark-border"
                : "bg-light-surface border-light-border",
            )}
          >
            <ArrowLeft size={20} color={isDark ? "#f3f4f6" : "#0f172a"} />
          </Pressable>
        </View>

        <View className="px-4">
          <View
            className="rounded-3xl overflow-hidden bg-black/15 mb-4"
            style={{ aspectRatio: 16 / 9 }}
          >
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                className="h-full w-full"
                resizeMode="cover"
              />
            ) : (
              <View className="h-full w-full items-center justify-center">
                <Dumbbell size={32} color={colors.muted} />
              </View>
            )}
          </View>

          <Text className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            {selectedExercise.name}
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {workout.name}
          </Text>

          <View
            className={cn(
              "rounded-2xl border p-4 mb-4",
              isDark
                ? "bg-dark-card border-dark-border"
                : "bg-light-card border-light-border",
            )}
          >
            <View className="flex-row items-center gap-2 mb-3">
              <Dumbbell size={16} color={colors.muted} />
              <Text className="text-sm text-gray-800 dark:text-gray-200 flex-1">
                {formatEquipment(selectedOfficial?.equipment)}
              </Text>
            </View>

            <View className="flex-row items-center gap-2 mb-3">
              <Weight size={16} color={colors.muted} />
              <Text className="text-sm text-gray-800 dark:text-gray-200">
                {extractWeightHint(selectedExercise.reps)}
              </Text>
            </View>

            <View className="flex-row items-center gap-2">
              <Timer size={16} color={colors.muted} />
              <Text className="text-sm text-gray-800 dark:text-gray-200">
                {Math.round(estimatedSeconds / 60)} min execution
              </Text>
            </View>
          </View>

          <MuscleMap
            primaryMuscles={musclePrimary}
            secondaryMuscles={muscleSecondary}
            title="Targeted muscle areas"
            subtitle="Front and back activation"
            scale={1.5}
          />

          <View className="mt-5 mb-2">
            <Text className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Exercise flow
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              Tap an item to inspect another movement in this session.
            </Text>
          </View>

          <View className="gap-2">
            {workout.exercises.map((exercise, index) => {
              const current = catalogById[exercise.id];
              const thumb = current?.remote_image_urls?.[0] ?? null;
              const selected = selectedExercise.id === exercise.id;

              return (
                <Pressable
                  key={`${exercise.id}-${index}`}
                  onPress={() => setSelectedExerciseId(exercise.id)}
                  className={cn(
                    "rounded-2xl border p-3 flex-row items-center gap-3",
                    selected
                      ? "border-primary-500 bg-primary-500/10"
                      : isDark
                        ? "bg-dark-surface border-dark-border"
                        : "bg-light-surface border-light-border",
                  )}
                >
                  <View className="h-14 w-14 rounded-xl overflow-hidden bg-black/10">
                    {thumb ? (
                      <Image
                        source={{ uri: thumb }}
                        className="h-full w-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="h-full w-full items-center justify-center">
                        <Dumbbell size={18} color={colors.muted} />
                      </View>
                    )}
                  </View>

                  <View className="flex-1">
                    <Text
                      className="text-base font-semibold text-gray-900 dark:text-gray-100"
                      numberOfLines={1}
                    >
                      {exercise.name}
                    </Text>
                    <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {exercise.sets} sets x {exercise.reps} reps
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-1">
                    <Clock3 size={14} color={colors.muted} />
                    <Text className="text-xs text-gray-500 dark:text-gray-400">
                      {Math.round(
                        estimateExerciseSeconds(
                          exercise,
                          workout.estimated_duration_minutes,
                          workout.exercises.length,
                        ) / 60,
                      )}
                      m
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View
        className={cn(
          "absolute left-0 right-0 border-t px-4 pt-3",
          isDark
            ? "bg-dark-surface border-dark-border"
            : "bg-light-surface border-light-border",
        )}
        style={{ bottom: 0, paddingBottom: insets.bottom + 14 }}
      >
        {hasPausedSession ? (
          <View className="flex-row gap-2">
            <Button
              className="flex-1"
              variant="secondary"
              size="lg"
              onPress={() => router.push(`/workouts/${id}/run`)}
            >
              Continue
            </Button>
            <Button
              className="flex-1"
              size="lg"
              onPress={() => void handleStartWorkout()}
            >
              <View className="flex-row items-center justify-center gap-2">
                <Play size={16} color="#ffffff" />
                <Text className="text-white font-semibold">Start new</Text>
              </View>
            </Button>
          </View>
        ) : (
          <Button
            className="w-full"
            size="lg"
            onPress={() => void handleStartWorkout()}
          >
            <View className="flex-row items-center justify-center gap-2">
              <Play size={16} color="#ffffff" />
              <Text className="text-white font-semibold">Start</Text>
            </View>
          </Button>
        )}
      </View>
    </View>
  );
}
