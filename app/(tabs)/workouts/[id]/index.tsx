import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Pressable, ScrollView, Text, View } from "react-native";
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

function normalizeExerciseKey(value: string): string {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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

  const [workout, setWorkout] = useState<WorkoutTemplateRecord | null>(null);
  const [catalogLookup, setCatalogLookup] = useState<
    Record<string, OfficialExerciseRecord>
  >({});
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(
    exerciseId ?? "",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pausedSession, setPausedSession] =
    useState<PausedWorkoutSessionRecord | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [nextImageIndex, setNextImageIndex] = useState<number | null>(null);
  const [pauseImageLoop, setPauseImageLoop] = useState(false);
  const imageFade = useRef(new Animated.Value(0)).current;

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
          byId[normalizeExerciseKey(item.id)] = item;
          byId[normalizeExerciseKey(item.name)] = item;
          if (item.name_en) {
            byId[normalizeExerciseKey(item.name_en)] = item;
          }
          if ((item as any).source_id) {
            byId[normalizeExerciseKey((item as any).source_id)] = item;
          }
          for (const alias of item.aliases ?? []) {
            byId[normalizeExerciseKey(alias)] = item;
          }
        }

        setCatalogLookup(byId);
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
    ? catalogLookup[selectedExercise.id] ??
      catalogLookup[normalizeExerciseKey(selectedExercise.id)] ??
      catalogLookup[normalizeExerciseKey(selectedExercise.name)]
    : null;
  const exerciseImages = useMemo(() => {
    const urls = (selectedOfficial?.remote_image_urls ?? []).filter(Boolean);
    return urls;
  }, [selectedOfficial?.remote_image_urls]);
  const currentImageUri =
    exerciseImages.length > 0 ? exerciseImages[currentImageIndex] : null;
  const nextImageUri =
    nextImageIndex !== null ? exerciseImages[nextImageIndex] : null;
  const musclePrimary = selectedOfficial?.primary_muscles?.length
    ? selectedOfficial.primary_muscles
    : (selectedExercise?.muscleGroups ?? []);
  const muscleSecondary = selectedOfficial?.secondary_muscles ?? [];
  const howToSteps = selectedOfficial?.instructions?.length
    ? selectedOfficial.instructions
    : (selectedOfficial?.instructions_en ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

  useEffect(() => {
    setCurrentImageIndex(0);
    setNextImageIndex(null);
    setPauseImageLoop(false);
    imageFade.setValue(0);
  }, [imageFade, selectedExercise?.id]);

  useEffect(() => {
    if (exerciseImages.length < 2 || pauseImageLoop || nextImageIndex !== null) {
      return;
    }

    const timerId = setTimeout(() => {
      const nextIndex = (currentImageIndex + 1) % exerciseImages.length;
      setNextImageIndex(nextIndex);
      Animated.timing(imageFade, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }).start(() => {
        setCurrentImageIndex(nextIndex);
        setNextImageIndex(null);
        imageFade.setValue(0);
      });
    }, 2000);

    return () => {
      clearTimeout(timerId);
      imageFade.stopAnimation();
    };
  }, [currentImageIndex, exerciseImages.length, imageFade, nextImageIndex, pauseImageLoop]);

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
  const tabBarClearance = insets.bottom + 160;
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
          <Pressable
            className="rounded-3xl overflow-hidden bg-black/15 mb-4"
            style={{ aspectRatio: 16 / 9 }}
            onPress={() => {
              if (exerciseImages.length > 1) {
                setPauseImageLoop((prev) => !prev);
              }
            }}
          >
            {currentImageUri ? (
              <>
                <Image
                  source={{ uri: currentImageUri }}
                  className="h-full w-full"
                  resizeMode="cover"
                />
                {nextImageUri ? (
                  <Animated.Image
                    source={{ uri: nextImageUri }}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      opacity: imageFade,
                    }}
                    resizeMode="cover"
                  />
                ) : null}
              </>
            ) : (
              <View className="h-full w-full items-center justify-center">
                <Dumbbell size={32} color={colors.muted} />
              </View>
            )}

            {exerciseImages.length > 1 ? (
              <View
                style={{
                  position: "absolute",
                  right: 10,
                  bottom: 10,
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  backgroundColor: "rgba(15,23,42,0.58)",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>
                  {pauseImageLoop ? "Paused" : "Tap to pause"}
                </Text>
              </View>
            ) : null}
          </Pressable>

          <Text className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            {selectedExercise.name}
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {workout.name}
          </Text>

          <View className="flex-row flex-wrap gap-2 mb-4">
            <View
              className={cn(
                "px-3 py-1.5 rounded-full",
                isDark ? "bg-dark-surface" : "bg-light-surface",
              )}
            >
              <Text className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                {workout.difficulty}
              </Text>
            </View>
            {selectedOfficial?.category ? (
              <View
                className={cn(
                  "px-3 py-1.5 rounded-full",
                  isDark ? "bg-dark-surface" : "bg-light-surface",
                )}
              >
                <Text className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                  {selectedOfficial.category}
                </Text>
              </View>
            ) : null}
          </View>

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
            bodySize={300}
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
              const currentByLookup =
                catalogLookup[exercise.id] ??
                catalogLookup[normalizeExerciseKey(exercise.id)] ??
                catalogLookup[normalizeExerciseKey(exercise.name)];
              const thumb = currentByLookup?.remote_image_urls?.[0] ?? null;
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

          <View className="mt-6">
            <Text className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              How to perform
            </Text>
            {howToSteps.length > 0 ? (
              <View
                className={cn(
                  "rounded-2xl border p-4 gap-3",
                  isDark
                    ? "bg-dark-card border-dark-border"
                    : "bg-light-card border-light-border",
                )}
              >
                {howToSteps.map((step, index) => (
                  <View key={`${selectedExercise.id}-step-${index}`} className="flex-row items-start gap-2">
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
                How-to instructions are not available for this exercise yet.
              </Text>
            )}
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
        style={{ bottom: 0, paddingBottom: insets.bottom + 80 }}
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
