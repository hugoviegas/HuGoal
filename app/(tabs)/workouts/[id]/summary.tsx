import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Check,
  Clock3,
  Dumbbell,
  Flame,
  Trophy,
  Weight,
} from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useToastStore } from "@/stores/toast.store";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useHideMainTabBar } from "@/hooks/useHideMainTabBar";
import {
  getCompletedWorkoutSession,
  type CompletedWorkoutSessionRecord,
} from "@/lib/firestore/workouts";

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function WorkoutSummaryScreen() {
  const { id, sessionId } = useLocalSearchParams<{ id: string; sessionId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useThemeStore();
  const { show: showToast } = useToastStore();
  const user = useAuthStore((s) => s.user);
  useHideMainTabBar();

  const [session, setSession] = useState<CompletedWorkoutSessionRecord | null>(null);
  const [loading, setLoading] = useState(!!sessionId);

  useEffect(() => {
    if (!sessionId) return;
    let mounted = true;

    (async () => {
      setLoading(true);
      try {
        const record = await getCompletedWorkoutSession(sessionId);
        if (mounted) setSession(record);
      } catch (err) {
        console.error("[summary] failed to load session", err);
        if (mounted) showToast("Could not load session data.", "error");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [sessionId, showToast]);

  const tabBarClearance = insets.bottom + 76;

  if (loading) {
    return (
      <View
        className={cn("flex-1 items-center justify-center", isDark ? "bg-dark-bg" : "bg-light-bg")}
      >
        <ActivityIndicator color={colors.primary} size="large" />
        <Text className="text-sm text-gray-500 dark:text-gray-400 mt-3">Loading summary…</Text>
      </View>
    );
  }

  // If no session data was loaded (sessionId missing or fetch failed), show a minimal fallback
  if (!session) {
    return (
      <View className={cn("flex-1", isDark ? "bg-dark-bg" : "bg-light-bg")}>
        <ScrollView
          className="flex-1 p-4"
          contentContainerStyle={{ paddingBottom: tabBarClearance + 20 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center py-10">
            <Text className="text-4xl mb-3">🎉</Text>
            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center">
              Workout Complete!
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
              Session data unavailable — great job finishing!
            </Text>
          </View>
        </ScrollView>

        <View
          className={cn(
            "px-4 pt-3 border-t gap-2",
            isDark ? "bg-dark-surface border-dark-border" : "bg-light-surface border-light-border",
          )}
          style={{ paddingBottom: tabBarClearance }}
        >
          <Button
            size="lg"
            className="w-full"
            onPress={() => router.replace("/workouts")}
          >
            Done
          </Button>
        </View>
      </View>
    );
  }

  const completionRate =
    session.exercises_summary.length > 0
      ? Math.round(
          (session.exercises_summary.filter((e) => e.sets_done > 0).length /
            session.exercises_summary.length) *
            100,
        )
      : 100;

  return (
    <View className={cn("flex-1", isDark ? "bg-dark-bg" : "bg-light-bg")}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: tabBarClearance + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Celebration header ── */}
        <View className="items-center py-6">
          <Text className="text-4xl mb-2">🎉</Text>
          <Text className="text-3xl font-bold text-gray-900 dark:text-gray-100 text-center">
            Workout Complete!
          </Text>
          <Text className="text-base font-semibold text-primary-500 mt-1">
            {session.workout_name}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {formatDate(session.ended_at)}
          </Text>
        </View>

        {/* ── XP Earned ── */}
        <View
          className={cn(
            "rounded-2xl border p-4 mb-5 flex-row items-center gap-3",
            isDark ? "bg-dark-card border-dark-border" : "bg-light-card border-light-border",
          )}
          style={{ borderLeftWidth: 4, borderLeftColor: colors.primary }}
        >
          <Flame size={24} color={colors.primary} />
          <View>
            <Text className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              XP Earned
            </Text>
            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              +{session.xp_earned} XP
            </Text>
          </View>
        </View>

        {/* ── Key metrics ── */}
        <View className="flex-row flex-wrap gap-3 mb-5">
          <View
            className={cn(
              "p-4 rounded-2xl border",
              isDark ? "bg-dark-surface border-dark-border" : "bg-light-surface border-light-border",
            )}
            style={{ flex: 1, minWidth: "45%" }}
          >
            <Clock3 size={18} color={colors.muted} />
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-1">Duration</Text>
            <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {formatDuration(session.duration_seconds)}
            </Text>
          </View>

          <View
            className={cn(
              "p-4 rounded-2xl border",
              isDark ? "bg-dark-surface border-dark-border" : "bg-light-surface border-light-border",
            )}
            style={{ flex: 1, minWidth: "45%" }}
          >
            <Weight size={18} color={colors.muted} />
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-1">Total Volume</Text>
            <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {session.total_volume_kg > 0 ? `${session.total_volume_kg} kg` : "—"}
            </Text>
          </View>

          <View
            className={cn(
              "p-4 rounded-2xl border",
              isDark ? "bg-dark-surface border-dark-border" : "bg-light-surface border-light-border",
            )}
            style={{ flex: 1, minWidth: "45%" }}
          >
            <Check size={18} color="#22c55e" />
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-1">Sets</Text>
            <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {session.total_sets}
            </Text>
          </View>

          <View
            className={cn(
              "p-4 rounded-2xl border",
              isDark ? "bg-dark-surface border-dark-border" : "bg-light-surface border-light-border",
            )}
            style={{ flex: 1, minWidth: "45%" }}
          >
            <Dumbbell size={18} color={colors.muted} />
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-1">Total Reps</Text>
            <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {session.total_reps > 0 ? session.total_reps : "—"}
            </Text>
          </View>
        </View>

        {/* ── Completion rate ── */}
        <View
          className={cn(
            "rounded-2xl border p-4 mb-5",
            isDark ? "bg-dark-surface border-dark-border" : "bg-light-surface border-light-border",
          )}
        >
          <View className="flex-row items-center justify-between mb-3">
            <Text className="font-semibold text-gray-900 dark:text-gray-100">
              Completion Rate
            </Text>
            <Text className="text-2xl font-bold text-green-600 dark:text-green-400">
              {completionRate}%
            </Text>
          </View>
          <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? "#374151" : "#e5e7eb" }}>
            <View
              style={{
                width: `${completionRate}%`,
                height: "100%",
                backgroundColor: "#22c55e",
                borderRadius: 999,
              }}
            />
          </View>
        </View>

        {/* ── Exercise breakdown ── */}
        {session.exercises_summary.length > 0 && (
          <View className="mb-5">
            <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
              Exercise Breakdown
            </Text>

            {session.exercises_summary.map((ex, idx) => (
              <View
                key={`${ex.exercise_id}-${idx}`}
                className={cn(
                  "rounded-2xl border p-3 mb-2 flex-row items-center gap-3",
                  isDark ? "bg-dark-surface border-dark-border" : "bg-light-surface border-light-border",
                )}
              >
                <View
                  className="h-10 w-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: isDark ? "#1e40af22" : "#dbeafe" }}
                >
                  <Trophy size={18} color={colors.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100" numberOfLines={1}>
                    {ex.name !== ex.exercise_id ? ex.name : ex.exercise_id}
                  </Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {ex.sets_done} set{ex.sets_done !== 1 ? "s" : ""}
                    {ex.total_reps > 0 ? ` · ${ex.total_reps} reps` : ""}
                    {ex.total_volume_kg > 0 ? ` · ${ex.total_volume_kg.toFixed(1)} kg` : ""}
                  </Text>
                </View>
                <Check size={16} color="#22c55e" />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Actions ── */}
      <View
        className={cn(
          "px-4 pt-3 border-t gap-2",
          isDark ? "bg-dark-surface border-dark-border" : "bg-light-surface border-light-border",
        )}
        style={{ paddingBottom: tabBarClearance }}
      >
        <Button
          size="lg"
          className="w-full"
          onPress={() => router.replace("/workouts")}
        >
          Done
        </Button>
        <View className="flex-row gap-2">
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            onPress={() => router.push("/workouts/history")}
          >
            View History
          </Button>
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            onPress={() => router.push(`/workouts/${id}`)}
          >
            Workout Details
          </Button>
        </View>
      </View>
    </View>
  );
}
