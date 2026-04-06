import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Share, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ChevronDown,
  ChevronRight,
  Clock3,
  Dumbbell,
  Play,
  Sparkles,
} from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import { useAuthStore } from "@/stores/auth.store";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { cn } from "@/lib/utils";
import {
  clearPausedWorkoutSession,
  getPausedWorkoutSession,
  getWorkoutTemplate,
  type PausedWorkoutSessionRecord,
} from "@/lib/firestore/workouts";

type WorkoutDetailRawModel = {
  id: string;
  name: string;
  description?: string;
  difficulty: string;
  is_ai_generated: boolean;
  estimated_duration_minutes: number;
  exercises: {
    id: string;
    name: string;
    sets: number;
    reps: string;
    muscleGroups: string[];
  }[];
  created_at: Date | string;
  tags: string[];
};

type WorkoutDetailModel = Omit<WorkoutDetailRawModel, "created_at"> & {
  created_at: Date;
};

const DIFFICULTY_CONFIG = {
  beginner: { label: "Beginner", color: "success" },
  intermediate: { label: "Intermediate", color: "secondary" },
  advanced: { label: "Advanced", color: "destructive" },
} as const;

function normalizeWorkoutDetail(
  record: WorkoutDetailRawModel,
): WorkoutDetailModel {
  return {
    ...record,
    created_at:
      record.created_at instanceof Date
        ? record.created_at
        : new Date(record.created_at),
  };
}

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useThemeStore();
  const { show: showToast } = useToastStore();
  const tabBarClearance = insets.bottom + 76;

  const [isExpanded, setIsExpanded] = useState(false);
  const [workout, setWorkout] = useState<WorkoutDetailModel | null>(null);
  const [loadingWorkout, setLoadingWorkout] = useState(true);
  const [workoutLoadError, setWorkoutLoadError] = useState<string | null>(null);
  const [pausedSession, setPausedSession] =
    useState<PausedWorkoutSessionRecord | null>(null);
  const [loadingPausedSession, setLoadingPausedSession] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoadingWorkout(true);
      setWorkoutLoadError(null);

      try {
        const workoutRecord = await getWorkoutTemplate(String(id));
        if (!mounted) return;

        if (workoutRecord) {
          setWorkout(
            normalizeWorkoutDetail(
              workoutRecord as unknown as WorkoutDetailRawModel,
            ),
          );
          return;
        }

        setWorkout(null);
        setWorkoutLoadError("Workout not found.");
      } catch (error) {
        console.error("[workoutDetail] failed to load workout", {
          workoutId: String(id),
          error,
        });
        if (!mounted) return;
        setWorkout(null);
        setWorkoutLoadError("Could not load workout.");
      } finally {
        if (!mounted) return;
        setLoadingWorkout(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!user?.uid || !id) {
        if (mounted) {
          setPausedSession(null);
          setLoadingPausedSession(false);
        }
        return;
      }

      try {
        const session = await getPausedWorkoutSession(user.uid, String(id));
        if (!mounted) return;
        setPausedSession(session);
      } catch (error) {
        console.error("[workoutDetail] failed to load paused session", {
          workoutId: String(id),
          uid: user?.uid,
          error,
        });
        if (!mounted) return;
        setPausedSession(null);
      } finally {
        if (!mounted) return;
        setLoadingPausedSession(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id, user?.uid]);

  const handleStartWorkout = async () => {
    if (user?.uid && id) {
      try {
        await clearPausedWorkoutSession(user.uid, String(id));
        setPausedSession(null);
      } catch (error) {
        console.error("[workoutDetail] failed to clear paused session", {
          workoutId: String(id),
          uid: user?.uid,
          error,
        });
      }
    }

    try {
      router.push(`/workouts/${id}/run`);
    } catch (error: any) {
      console.error("[workoutDetail] failed to start workout", {
        workoutId: String(id),
        uid: user?.uid,
        error,
      });
      const reason = error?.code ? ` (${error.code})` : "";
      showToast(`Could not start workout right now${reason}.`, "error");
    }
  };

  const handleContinueLastSession = () => {
    router.push(`/workouts/${id}/run`);
  };

  const handleDuplicate = async () => {
    try {
      showToast("Workout duplicated! Edit before starting.", "success");
      // Navigate to create screen with pre-filled data
      router.push("/workouts/create");
    } catch {
      showToast("Failed to duplicate workout", "error");
    }
  };

  const handleShare = async () => {
    if (!workout) return;

    try {
      await Share.share({
        message: `Check out my workout: ${workout.name}\n${workout.description}`,
        title: workout.name,
      });
    } catch {
      showToast("Failed to share", "error");
    }
  };

  const handleEdit = () => {
    router.push(`/workouts/${id}/edit`);
  };

  const handleDelete = () => {
    Alert.alert("Delete Workout?", "This action cannot be undone.", [
      {
        text: "Delete",
        onPress: async () => {
          try {
            showToast("Workout deleted", "success");
            router.back();
          } catch {
            showToast("Failed to delete", "error");
          }
        },
        style: "destructive",
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  if (loadingWorkout) {
    return (
      <View className={cn("flex-1", isDark ? "bg-dark-bg" : "bg-light-bg")}>
        <View className="flex-1 p-4">
          <View className="h-10 w-3/4 rounded-xl bg-gray-200 dark:bg-gray-800 mb-3" />
          <View className="h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-800 mb-6" />

          <View className="flex-row gap-3 mb-6">
            <View className="flex-1 h-20 rounded-lg bg-gray-200 dark:bg-gray-800" />
            <View className="flex-1 h-20 rounded-lg bg-gray-200 dark:bg-gray-800" />
            <View className="flex-1 h-20 rounded-lg bg-gray-200 dark:bg-gray-800" />
          </View>

          <View className="h-5 w-1/3 rounded bg-gray-200 dark:bg-gray-800 mb-3" />
          <View className="h-16 rounded-lg bg-gray-200 dark:bg-gray-800 mb-3" />
          <View className="h-16 rounded-lg bg-gray-200 dark:bg-gray-800 mb-3" />
          <View className="h-16 rounded-lg bg-gray-200 dark:bg-gray-800" />
        </View>
      </View>
    );
  }

  if (!workout) {
    return (
      <View
        className={cn(
          "flex-1 items-center justify-center px-6",
          isDark ? "bg-dark-bg" : "bg-light-bg",
        )}
      >
        <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {workoutLoadError ?? "Workout unavailable."}
        </Text>
        <Button onPress={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </View>
    );
  }

  const diffConfig =
    DIFFICULTY_CONFIG[workout.difficulty as keyof typeof DIFFICULTY_CONFIG];

  const formattedDate = workout.created_at.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const hasPausedSession = !!pausedSession;
  const pausedAtText = pausedSession?.paused_at
    ? new Date(pausedSession.paused_at).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <View className={cn("flex-1", isDark ? "bg-dark-bg" : "bg-light-bg")}>
      {/* Scrollable Content */}
      <ScrollView
        className="flex-1 p-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 0 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="flex-row justify-between items-start mb-4">
          <View className="flex-1">
            <Text className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {workout.name}
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Created {formattedDate}
            </Text>
          </View>
          <DropdownMenu
            items={[
              { id: "edit", label: "Edit" },
              { id: "duplicate", label: "Duplicate" },
              { id: "share", label: "Share" },
              {
                id: "delete",
                label: "Delete",
                destructive: true,
              },
            ]}
            onSelect={(id) => {
              if (id === "edit") {
                handleEdit();
                return;
              }
              if (id === "duplicate") {
                handleDuplicate();
                return;
              }
              if (id === "share") {
                handleShare();
                return;
              }
              if (id === "delete") {
                handleDelete();
              }
            }}
            align="right"
            triggerClassName="p-2"
          />
        </View>

        {/* Stats Cards */}
        <View className="flex-row gap-3 mb-6">
          <View
            className={cn(
              "flex-1 p-3 rounded-lg border",
              isDark
                ? "bg-dark-surface border-dark-border"
                : "bg-light-surface border-light-border",
            )}
          >
            <Text className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Duration
            </Text>
            <View className="flex-row items-center gap-1.5">
              <Clock3 size={16} color={colors.muted} />
              <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {workout.estimated_duration_minutes}m
              </Text>
            </View>
          </View>

          <View
            className={cn(
              "flex-1 p-3 rounded-lg border",
              isDark
                ? "bg-dark-surface border-dark-border"
                : "bg-light-surface border-light-border",
            )}
          >
            <Text className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Exercises
            </Text>
            <View className="flex-row items-center gap-1.5">
              <Dumbbell size={16} color={colors.muted} />
              <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {workout.exercises.length}
              </Text>
            </View>
          </View>

          <View
            className={cn(
              "flex-1 p-3 rounded-lg border",
              isDark
                ? "bg-dark-surface border-dark-border"
                : "bg-light-surface border-light-border",
            )}
          >
            <Text className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Sets
            </Text>
            <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {totalSets}
            </Text>
          </View>
        </View>

        {/* Difficulty & AI Badge */}
        <View className="flex-row gap-2 mb-6">
          <Badge variant={diffConfig.color as any}>{diffConfig.label}</Badge>
          {workout.is_ai_generated && (
            <Badge variant="accent">
              <View className="flex-row items-center gap-1">
                <Sparkles size={12} color={isDark ? "#c4b5fd" : "#7c3aed"} />
                <Text className="text-white text-xs font-semibold">
                  AI Generated
                </Text>
              </View>
            </Badge>
          )}
        </View>

        {/* Description */}
        {workout.description && (
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Description
            </Text>
            <Text
              className={cn(
                "text-sm",
                isDark ? "text-gray-300" : "text-gray-700",
              )}
            >
              {workout.description}
            </Text>
          </View>
        )}

        {/* Tags */}
        {workout.tags && workout.tags.length > 0 && (
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Tags
            </Text>
            <View className="flex-row gap-2 flex-wrap">
              {workout.tags.map((tag) => (
                <Badge key={tag} variant="secondary" size="sm">
                  {tag}
                </Badge>
              ))}
            </View>
          </View>
        )}

        {/* Exercises List */}
        <View className="mb-6">
          <Pressable onPress={() => setIsExpanded(!isExpanded)}>
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Exercises
              </Text>
              {isExpanded ? (
                <ChevronDown size={18} color={colors.muted} />
              ) : (
                <ChevronRight size={18} color={colors.muted} />
              )}
            </View>
          </Pressable>

          {isExpanded && (
            <View>
              {workout.exercises.map((exercise, idx) => (
                <View
                  key={exercise.id}
                  className={cn(
                    "p-3 rounded-lg mb-2 border",
                    isDark
                      ? "bg-dark-surface border-dark-border"
                      : "bg-light-surface border-light-border",
                  )}
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <Text className="font-semibold text-gray-900 dark:text-gray-100 flex-1">
                      {idx + 1}. {exercise.name}
                    </Text>
                  </View>

                  <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {exercise.sets} sets × {exercise.reps} reps
                  </Text>

                  <View className="flex-row gap-1 flex-wrap">
                    {exercise.muscleGroups.map((muscle) => (
                      <Badge key={muscle} variant="secondary" size="sm">
                        {muscle}
                      </Badge>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Collapsed Exercises Preview */}
        {!isExpanded && (
          <View
            className={cn(
              "p-3 rounded-lg mb-6 border",
              isDark
                ? "bg-dark-surface border-dark-border"
                : "bg-light-surface border-light-border",
            )}
          >
            {workout.exercises.slice(0, 3).map((exercise) => (
              <Text
                key={exercise.id}
                className="text-sm text-gray-600 dark:text-gray-400 mb-1"
              >
                • {exercise.name}
              </Text>
            ))}
            {workout.exercises.length > 3 && (
              <Text className="text-sm text-cyan-600 dark:text-cyan-400 mt-2">
                + {workout.exercises.length - 3} more
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Fixed Action Buttons - NOT scrollable */}
      <View
        className={cn(
          "p-4 border-t gap-3",
          isDark
            ? "bg-dark-surface border-dark-border"
            : "bg-light-surface border-light-border",
        )}
        // raise buttons a bit above the tab bar
        style={{ paddingBottom: tabBarClearance + 24 }}
      >
        {loadingPausedSession ? null : hasPausedSession ? (
          <View
            className={cn(
              "rounded-xl border p-3",
              isDark
                ? "bg-dark-bg border-dark-border"
                : "bg-light-bg border-light-border",
            )}
          >
            <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Last session paused
            </Text>
            {pausedAtText ? (
              <Text className="text-xs mt-1 text-gray-600 dark:text-gray-400">
                Paused at {pausedAtText}. Available for 24h.
              </Text>
            ) : null}
          </View>
        ) : null}

        {hasPausedSession ? (
          <>
            <Button
              onPress={handleContinueLastSession}
              size="lg"
              className="w-full"
            >
              <View className="flex-row items-center justify-center gap-2">
                <Play size={16} color="#ffffff" />
                <Text className="text-white font-semibold">
                  Continue Last Session
                </Text>
              </View>
            </Button>

            <Button
              onPress={() => {
                void handleStartWorkout();
              }}
              variant="secondary"
              size="lg"
              className="w-full"
            >
              Start New Workout
            </Button>
          </>
        ) : (
          <Button
            onPress={() => {
              void handleStartWorkout();
            }}
            size="lg"
            className="w-full"
          >
            <View className="flex-row items-center justify-center gap-2">
              <Play size={16} color="#ffffff" />
              <Text className="text-white font-semibold">Start Workout</Text>
            </View>
          </Button>
        )}
      </View>
    </View>
  );
}
