import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronRight, Clock3, Dumbbell } from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface WorkoutSession {
  id: string;
  workoutName: string;
  date: Date;
  duration: number; // seconds
  exercises: number;
  volume: number;
  intensity: "light" | "moderate" | "high";
}

// Mock data
const MOCK_SESSIONS: WorkoutSession[] = [
  {
    id: "1",
    workoutName: "Full Body Strength",
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    duration: 2847,
    exercises: 3,
    volume: 145.5,
    intensity: "high",
  },
  {
    id: "2",
    workoutName: "Upper Body Focus",
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    duration: 1950,
    exercises: 5,
    volume: 128.0,
    intensity: "moderate",
  },
  {
    id: "3",
    workoutName: "Cardio & Core",
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    duration: 1800,
    exercises: 4,
    volume: 0,
    intensity: "light",
  },
  {
    id: "4",
    workoutName: "Full Body Strength",
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    duration: 2700,
    exercises: 3,
    volume: 142.5,
    intensity: "high",
  },
  {
    id: "5",
    workoutName: "Leg Day",
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    duration: 2400,
    exercises: 4,
    volume: 235.0,
    intensity: "high",
  },
];

type HistoryTab = "sessions" | "stats";

const INTENSITY_COLORS = {
  light: "success",
  moderate: "secondary",
  high: "destructive",
} as const;

export default function WorkoutHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useThemeStore();
  const [activeTab, setActiveTab] = useState<HistoryTab>("sessions");
  const tabBarClearance = insets.bottom + 76;

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const groupedSessions = MOCK_SESSIONS.reduce(
    (acc, session) => {
      const date = session.date.toLocaleDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(session);
      return acc;
    },
    {} as Record<string, WorkoutSession[]>,
  );

  // Calculate stats
  const totalSessions = MOCK_SESSIONS.length;
  const totalDuration = MOCK_SESSIONS.reduce((sum, s) => sum + s.duration, 0);
  const totalVolume = MOCK_SESSIONS.reduce((sum, s) => sum + s.volume, 0);
  const avgDuration = Math.round(totalDuration / totalSessions);
  const thisWeekSessions = MOCK_SESSIONS.filter(
    (s) =>
      (new Date().getTime() - s.date.getTime()) / (1000 * 60 * 60 * 24) <= 7,
  ).length;

  const workoutFrequency = {
    "Full Body Strength": 2,
    "Upper Body Focus": 1,
    "Cardio & Core": 1,
    "Leg Day": 1,
  };

  // Sessions Tab
  if (activeTab === "sessions") {
    return (
      <View className={cn("flex-1", isDark ? "bg-dark-bg" : "bg-light-bg")}>
        <ScrollView className="flex-1 p-4">
          <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Workout History
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {totalSessions} sessions • {formatDuration(totalDuration)} total
          </Text>

          {Object.entries(groupedSessions).map(([dateStr, sessions]) => (
            <View key={dateStr} className="mb-6">
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {formatDate(sessions[0].date)}
              </Text>

              {sessions.map((session, idx) => (
                <Pressable
                  key={session.id}
                  onPress={() => router.push(`/workouts/${session.id}/summary`)}
                  className={cn(
                    "p-3 rounded-lg mb-2 border",
                    isDark
                      ? "bg-dark-surface border-dark-border"
                      : "bg-light-surface border-light-border",
                  )}
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <Text className="font-semibold text-gray-900 dark:text-gray-100 flex-1">
                      {session.workoutName}
                    </Text>
                    <Badge
                      variant={INTENSITY_COLORS[session.intensity]}
                      size="sm"
                    >
                      {session.intensity.charAt(0).toUpperCase() +
                        session.intensity.slice(1)}
                    </Badge>
                  </View>

                  <View className="flex-row justify-between items-center">
                    <View className="flex-row gap-4">
                      <View>
                        <Text className="text-xs text-gray-600 dark:text-gray-400">
                          Duration
                        </Text>
                        <View className="flex-row items-center gap-1">
                          <Clock3 size={12} color={colors.muted} />
                          <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {formatDuration(session.duration)}
                          </Text>
                        </View>
                      </View>

                      <View>
                        <Text className="text-xs text-gray-600 dark:text-gray-400">
                          Exercises
                        </Text>
                        <View className="flex-row items-center gap-1">
                          <Dumbbell size={12} color={colors.muted} />
                          <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {session.exercises}
                          </Text>
                        </View>
                      </View>

                      {session.volume > 0 && (
                        <View>
                          <Text className="text-xs text-gray-600 dark:text-gray-400">
                            Volume
                          </Text>
                          <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {session.volume.toFixed(1)}kg
                          </Text>
                        </View>
                      )}
                    </View>
                    <ChevronRight size={16} color={colors.muted} />
                  </View>
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>

        <View
          className="p-4 border-t border-light-border dark:border-dark-border"
          style={{ paddingBottom: tabBarClearance }}
        >
          <Button
            onPress={() => router.back()}
            variant="secondary"
            size="lg"
            className="w-full"
          >
            Close
          </Button>
        </View>
      </View>
    );
  }

  // Stats Tab
  return (
    <View className={cn("flex-1", isDark ? "bg-dark-bg" : "bg-light-bg")}>
      <ScrollView className="flex-1 p-4">
        <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Stats & Insights
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Your progress overview
        </Text>

        {/* Key Metrics */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Overview
          </Text>

          <View className="flex-row gap-2 mb-3">
            <View
              className={cn(
                "flex-1 p-3 rounded-lg border",
                isDark
                  ? "bg-dark-surface border-dark-border"
                  : "bg-light-surface border-light-border",
              )}
            >
              <Text className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Total Sessions
              </Text>
              <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {totalSessions}
              </Text>
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
                This Week
              </Text>
              <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {thisWeekSessions}
              </Text>
            </View>
          </View>

          <View className="flex-row gap-2">
            <View
              className={cn(
                "flex-1 p-3 rounded-lg border",
                isDark
                  ? "bg-dark-surface border-dark-border"
                  : "bg-light-surface border-light-border",
              )}
            >
              <Text className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Avg Duration
              </Text>
              <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {Math.floor(avgDuration / 60)}m
              </Text>
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
                Total Volume
              </Text>
              <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {totalVolume.toFixed(0)}kg
              </Text>
            </View>
          </View>
        </View>

        {/* Workout Frequency */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Most Done Workouts
          </Text>

          {Object.entries(workoutFrequency)
            .sort(([, a], [, b]) => b - a)
            .map(([name, count]) => (
              <View
                key={name}
                className={cn(
                  "p-3 rounded-lg mb-2 border",
                  isDark
                    ? "bg-dark-surface border-dark-border"
                    : "bg-light-surface border-light-border",
                )}
              >
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="font-semibold text-gray-900 dark:text-gray-100">
                    {name}
                  </Text>
                  <Badge variant="secondary">{count}x</Badge>
                </View>

                <View className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <View
                    style={{ width: `${(count / 2) * 100}%` }}
                    className="h-full bg-cyan-600 dark:bg-cyan-500"
                  />
                </View>
              </View>
            ))}
        </View>

        {/* Intensity Distribution */}
        <View>
          <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Intensity Distribution
          </Text>

          {(["light", "moderate", "high"] as const).map((intensity) => {
            const count = MOCK_SESSIONS.filter(
              (s) => s.intensity === intensity,
            ).length;
            const percentage = (count / totalSessions) * 100;

            return (
              <View
                key={intensity}
                className={cn(
                  "p-3 rounded-lg mb-2 border",
                  isDark
                    ? "bg-dark-surface border-dark-border"
                    : "bg-light-surface border-light-border",
                )}
              >
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="font-semibold text-gray-900 dark:text-gray-100 capitalize">
                    {intensity}
                  </Text>
                  <Text className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    {count} ({percentage.toFixed(0)}%)
                  </Text>
                </View>

                <View className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <View
                    style={{ width: `${percentage}%` }}
                    className={cn(
                      "h-full",
                      intensity === "light"
                        ? "bg-green-600 dark:bg-green-500"
                        : intensity === "moderate"
                          ? "bg-yellow-600 dark:bg-yellow-500"
                          : "bg-red-600 dark:bg-red-500",
                    )}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View className="p-4 border-t border-light-border dark:border-dark-border">
        <Button
          onPress={() => setActiveTab("sessions")}
          variant="secondary"
          size="md"
          className="w-full mb-2"
        >
          View Sessions
        </Button>
        <Button
          onPress={() => router.back()}
          variant="secondary"
          size="lg"
          className="w-full"
        >
          Close
        </Button>
      </View>
    </View>
  );
}
