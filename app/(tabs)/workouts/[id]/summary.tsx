import React from "react";
import { View, Text, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Check,
  Clock3,
  Dumbbell,
  Lightbulb,
  Save,
  Trophy,
} from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { useHideMainTabBar } from "@/hooks/useHideMainTabBar";

interface WorkoutSummary {
  totalDuration: number; // in seconds
  totalSets: number;
  totalReps: number;
  totalVolume: number; // in kg
  exercises: {
    name: string;
    plannedSets: number;
    completedSets: number;
    reps: string;
    personalRecord?: boolean;
  }[];
  startedAt: Date;
  completedAt: Date;
  intensity: "light" | "moderate" | "high";
}

// Mock data
const MOCK_SUMMARY: WorkoutSummary = {
  totalDuration: 2847, // 47 minutes 27 seconds
  totalSets: 8,
  totalReps: 88,
  totalVolume: 145.5,
  exercises: [
    {
      name: "Push-ups",
      plannedSets: 3,
      completedSets: 3,
      reps: "30 total",
      personalRecord: true,
    },
    {
      name: "Squats",
      plannedSets: 3,
      completedSets: 3,
      reps: "48 total",
    },
    {
      name: "Rows",
      plannedSets: 2,
      completedSets: 2,
      reps: "23 total",
    },
  ],
  startedAt: new Date(Date.now() - 2847000),
  completedAt: new Date(),
  intensity: "high",
};

const INTENSITY_CONFIG = {
  light: { label: "Light", color: "success" },
  moderate: { label: "Moderate", color: "secondary" },
  high: { label: "High", color: "destructive" },
} as const;

export default function WorkoutSummaryScreen() {
  useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useThemeStore();
  const { show: showToast } = useToastStore();
  useHideMainTabBar();
  const tabBarClearance = insets.bottom + 76;

  const summary = MOCK_SUMMARY;
  const intensityConfig = INTENSITY_CONFIG[summary.intensity];

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const completionRate = Math.round(
    (summary.exercises.filter((e) => e.completedSets === e.plannedSets).length /
      summary.exercises.length) *
      100,
  );

  const formattedDate = summary.completedAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleSaveSession = async () => {
    try {
      // TODO: Save session to Firestore
      showToast("Workout session saved!", "success");
      router.back();
    } catch {
      showToast("Failed to save session", "error");
    }
  };

  const handleViewStats = () => {
    // Navigate to workout history/stats
    router.push("/workouts/history");
  };

  return (
    <View className={cn("flex-1", isDark ? "bg-dark-bg" : "bg-light-bg")}>
      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {/* Celebration Header */}
        <View className="items-center py-6">
          <Text className="text-3xl font-bold text-gray-900 dark:text-gray-100 text-center">
            Workout Complete!
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {formattedDate}
          </Text>
        </View>

        {/* Key Metrics */}
        <View className="flex-row flex-wrap gap-3 mb-6">
          {/* Duration */}
          <View
            className={cn(
              "p-4 rounded-lg border w-[48%]",
              isDark
                ? "bg-dark-surface border-dark-border"
                : "bg-light-surface border-light-border",
            )}
          >
            <Text className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Duration
            </Text>
            <Clock3 size={18} color={colors.muted} />
            <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {formatDuration(summary.totalDuration)}
            </Text>
          </View>

          {/* Total Volume */}
          <View
            className={cn(
              "p-4 rounded-lg border w-[48%]",
              isDark
                ? "bg-dark-surface border-dark-border"
                : "bg-light-surface border-light-border",
            )}
          >
            <Text className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Total Volume
            </Text>
            <Dumbbell size={18} color={colors.muted} />
            <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {summary.totalVolume} kg
            </Text>
          </View>

          {/* Sets Completed */}
          <View
            className={cn(
              "p-4 rounded-lg border w-[48%]",
              isDark
                ? "bg-dark-surface border-dark-border"
                : "bg-light-surface border-light-border",
            )}
          >
            <Text className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Sets
            </Text>
            <Check size={18} color="#22c55e" />
            <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {summary.totalSets} completed
            </Text>
          </View>

          {/* Reps */}
          <View
            className={cn(
              "p-4 rounded-lg border w-[48%]",
              isDark
                ? "bg-dark-surface border-dark-border"
                : "bg-light-surface border-light-border",
            )}
          >
            <Text className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Reps
            </Text>
            <Dumbbell size={18} color={colors.muted} />
            <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {summary.totalReps} total
            </Text>
          </View>
        </View>

        {/* Intensity */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Intensity
          </Text>
          <Badge variant={intensityConfig.color as any} className="self-start">
            {intensityConfig.label}
          </Badge>
        </View>

        {/* Exercise Breakdown */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
            Exercise Breakdown
          </Text>

          {summary.exercises.map((exercise, idx) => {
            const isComplete = exercise.completedSets === exercise.plannedSets;

            return (
              <View
                key={idx}
                className={cn(
                  "p-3 rounded-lg mb-2 border",
                  isDark
                    ? "bg-dark-surface border-dark-border"
                    : "bg-light-surface border-light-border",
                  isComplete && (isDark ? "bg-green-900/20" : "bg-green-50"),
                )}
              >
                <View className="flex-row justify-between items-start mb-2">
                  <Text className="font-semibold text-gray-900 dark:text-gray-100 flex-1">
                    {exercise.name}
                  </Text>
                  {exercise.personalRecord && (
                    <Badge variant="accent" size="sm">
                      <View className="flex-row items-center gap-1">
                        <Trophy size={10} color="#ffffff" />
                        <Text className="text-white text-xs font-semibold">
                          PR
                        </Text>
                      </View>
                    </Badge>
                  )}
                </View>

                <View className="flex-row justify-between items-center">
                  <View className="flex-1">
                    <Text className="text-sm text-gray-600 dark:text-gray-400">
                      {exercise.completedSets}/{exercise.plannedSets} sets
                    </Text>
                    <Text
                      className={cn(
                        "text-xs mt-1",
                        isComplete
                          ? "text-green-600 dark:text-green-400"
                          : "text-gray-500 dark:text-gray-400",
                      )}
                    >
                      {exercise.reps}
                    </Text>
                  </View>
                  <View className="items-center">
                    {isComplete ? (
                      <Check size={16} color="#22c55e" />
                    ) : (
                      <Text className="text-lg opacity-50">-</Text>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Stats Summary */}
        <View
          className={cn(
            "p-4 rounded-lg border mb-6",
            isDark
              ? "bg-dark-surface border-dark-border"
              : "bg-light-surface border-light-border",
          )}
        >
          <View className="flex-row justify-between items-center mb-3">
            <Text className="font-semibold text-gray-900 dark:text-gray-100">
              Completion Rate
            </Text>
            <Text className="text-2xl font-bold text-green-600 dark:text-green-400">
              {completionRate}%
            </Text>
          </View>

          <View className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <View
              style={{ width: `${completionRate}%` }}
              className="h-full bg-green-600 dark:bg-green-500"
            />
          </View>
        </View>

        {/* Tips / Insights */}
        <View
          className={cn(
            "p-4 rounded-lg border-l-4 mb-6",
            isDark
              ? "bg-dark-bg border-cyan-600"
              : "bg-light-bg border-cyan-600",
          )}
        >
          <Text className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
            Insight
          </Text>
          <View className="mb-2">
            <Lightbulb size={14} color={colors.muted} />
          </View>
          <Text className="text-sm text-gray-900 dark:text-gray-100">
            Great job pushing yourself! Your{" "}
            {summary.totalDuration / 60 < 60 ? "intense" : "focused"} session
            shows consistency. Keep it up!
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View
        className={cn(
          "p-4 border-t gap-2",
          isDark
            ? "bg-dark-surface border-dark-border"
            : "bg-light-surface border-light-border",
        )}
        style={{ paddingBottom: tabBarClearance }}
      >
        <Button onPress={handleSaveSession} size="lg" className="w-full">
          <View className="flex-row items-center justify-center gap-2">
            <Save size={16} color="#ffffff" />
            <Text className="text-white font-semibold">Save Session</Text>
          </View>
        </Button>
        <View className="flex-row gap-2">
          <Button
            onPress={() => router.back()}
            variant="secondary"
            size="md"
            className="flex-1"
          >
            Home
          </Button>
          <Button
            onPress={handleViewStats}
            variant="secondary"
            size="md"
            className="flex-1"
          >
            View Stats
          </Button>
        </View>
      </View>
    </View>
  );
}
