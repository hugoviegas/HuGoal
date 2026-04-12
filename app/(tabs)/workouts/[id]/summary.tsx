import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Check,
  Clock3,
  Dumbbell,
  Flame,
  PartyPopper,
  Trophy,
  Weight,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
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

function CelebrationConfetti({ active }: { active: boolean }) {
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;

    animation.setValue(0);
    Animated.timing(animation, {
      toValue: 1,
      duration: 1900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [active, animation]);

  const pieces = Array.from({ length: 20 }, (_, index) => {
    const startX = (index % 10) * 32 + 6;
    const driftX = (index % 2 === 0 ? 1 : -1) * (14 + (index % 4) * 7);
    const endY = 280 + (index % 5) * 18;
    const rotate = index % 2 === 0 ? "220deg" : "-220deg";
    const color = ["#22c55e", "#06b6d4", "#f59e0b", "#ef4444"][index % 4];

    const translateY = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [-24 - index * 3, endY],
    });

    const translateX = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [startX, startX + driftX],
    });

    const rotateZ = animation.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", rotate],
    });

    const opacity = animation.interpolate({
      inputRange: [0, 0.75, 1],
      outputRange: [0.95, 0.95, 0],
    });

    return (
      <Animated.View
        key={`confetti-piece-${index}`}
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 8,
          height: 12,
          borderRadius: 2,
          backgroundColor: color,
          opacity,
          transform: [{ translateX }, { translateY }, { rotateZ }],
        }}
      />
    );
  });

  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", left: 0, right: 0, top: 0, height: 360 }}
    >
      {pieces}
    </View>
  );
}

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
  const { id, sessionId } = useLocalSearchParams<{
    id: string;
    sessionId?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useThemeStore();
  const { show: showToast } = useToastStore();
  const user = useAuthStore((s) => s.user);
  useHideMainTabBar();

  const [session, setSession] = useState<CompletedWorkoutSessionRecord | null>(
    null,
  );
  const [loading, setLoading] = useState(!!sessionId);
  const [celebrationActive, setCelebrationActive] = useState(false);

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

  useEffect(() => {
    if (!session) return;

    setCelebrationActive(true);
    const timeout = setTimeout(() => setCelebrationActive(false), 2200);

    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => {
      return;
    });

    return () => {
      clearTimeout(timeout);
    };
  }, [session]);

  const tabBarClearance = insets.bottom + 76;

  const metricsByExerciseId = useMemo(() => {
    const map = new Map<
      string,
      NonNullable<CompletedWorkoutSessionRecord["exercise_metrics"]>[number]
    >();
    for (const metric of session?.exercise_metrics ?? []) {
      map.set(metric.exercise_id, metric);
    }
    return map;
  }, [session?.exercise_metrics]);

  if (loading) {
    return (
      <View
        className={cn(
          "flex-1 items-center justify-center",
          isDark ? "bg-dark-bg" : "bg-light-bg",
        )}
      >
        <ActivityIndicator color={colors.primary} size="large" />
        <Text className="text-sm text-gray-500 dark:text-gray-400 mt-3">
          Loading summary…
        </Text>
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
            <PartyPopper size={36} color={colors.primary} />
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
            isDark
              ? "bg-dark-surface border-dark-border"
              : "bg-light-surface border-light-border",
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
      <CelebrationConfetti active={celebrationActive} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 16,
          paddingBottom: tabBarClearance + 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Celebration header ── */}
        <View className="items-center py-6">
          <View
            className="h-16 w-16 rounded-2xl items-center justify-center mb-3"
            style={{ backgroundColor: isDark ? "#155e7538" : "#cffafe" }}
          >
            <PartyPopper size={34} color={colors.primary} />
          </View>
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
            isDark
              ? "bg-dark-card border-dark-border"
              : "bg-light-card border-light-border",
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
              isDark
                ? "bg-dark-surface border-dark-border"
                : "bg-light-surface border-light-border",
            )}
            style={{ flex: 1, minWidth: "45%" }}
          >
            <Clock3 size={18} color={colors.muted} />
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-1">
              Total Duration
            </Text>
            <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {formatDuration(session.duration_seconds)}
            </Text>
          </View>

          <View
            className={cn(
              "p-4 rounded-2xl border",
              isDark
                ? "bg-dark-surface border-dark-border"
                : "bg-light-surface border-light-border",
            )}
            style={{ flex: 1, minWidth: "45%" }}
          >
            <Clock3 size={18} color={colors.muted} />
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-1">
              Active Time
            </Text>
            <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {formatDuration(
                session.session_metrics?.active_time_seconds ?? 0,
              )}
            </Text>
          </View>

          <View
            className={cn(
              "p-4 rounded-2xl border",
              isDark
                ? "bg-dark-surface border-dark-border"
                : "bg-light-surface border-light-border",
            )}
            style={{ flex: 1, minWidth: "45%" }}
          >
            <Clock3 size={18} color={colors.muted} />
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-1">
              Rest Time
            </Text>
            <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {formatDuration(session.session_metrics?.rest_time_seconds ?? 0)}
            </Text>
          </View>

          <View
            className={cn(
              "p-4 rounded-2xl border",
              isDark
                ? "bg-dark-surface border-dark-border"
                : "bg-light-surface border-light-border",
            )}
            style={{ flex: 1, minWidth: "45%" }}
          >
            <Weight size={18} color={colors.muted} />
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-1">
              Total Volume
            </Text>
            <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {session.total_volume_kg > 0
                ? `${session.total_volume_kg} kg`
                : "—"}
            </Text>
          </View>

          <View
            className={cn(
              "p-4 rounded-2xl border",
              isDark
                ? "bg-dark-surface border-dark-border"
                : "bg-light-surface border-light-border",
            )}
            style={{ flex: 1, minWidth: "45%" }}
          >
            <Check size={18} color="#22c55e" />
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-1">
              Sets
            </Text>
            <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {session.total_sets}
            </Text>
          </View>

          <View
            className={cn(
              "p-4 rounded-2xl border",
              isDark
                ? "bg-dark-surface border-dark-border"
                : "bg-light-surface border-light-border",
            )}
            style={{ flex: 1, minWidth: "45%" }}
          >
            <Dumbbell size={18} color={colors.muted} />
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-1">
              Total Reps
            </Text>
            <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {session.total_reps > 0 ? session.total_reps : "—"}
            </Text>
          </View>
        </View>

        {session.session_metrics ? (
          <View
            className={cn(
              "rounded-2xl border p-4 mb-5",
              isDark
                ? "bg-dark-surface border-dark-border"
                : "bg-light-surface border-light-border",
            )}
          >
            <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              XP Breakdown
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {`Effort ${session.session_metrics.effort_score} · Difficulty x${session.session_metrics.difficulty_multiplier.toFixed(2)} · Time x${session.session_metrics.xp_time_multiplier.toFixed(2)}`}
            </Text>
          </View>
        ) : null}

        {/* ── Completion rate ── */}
        <View
          className={cn(
            "rounded-2xl border p-4 mb-5",
            isDark
              ? "bg-dark-surface border-dark-border"
              : "bg-light-surface border-light-border",
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
          <View
            className="h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: isDark ? "#374151" : "#e5e7eb" }}
          >
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

            {session.exercises_summary.map((ex, idx) =>
              (() => {
                const metric = metricsByExerciseId.get(ex.exercise_id);

                return (
                  <View
                    key={`${ex.exercise_id}-${idx}`}
                    className={cn(
                      "rounded-2xl border p-3 mb-2 flex-row items-center gap-3",
                      isDark
                        ? "bg-dark-surface border-dark-border"
                        : "bg-light-surface border-light-border",
                    )}
                  >
                    <View
                      className="h-10 w-10 rounded-xl items-center justify-center"
                      style={{
                        backgroundColor: isDark ? "#1e40af22" : "#dbeafe",
                      }}
                    >
                      <Trophy size={18} color={colors.primary} />
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-sm font-semibold text-gray-900 dark:text-gray-100"
                        numberOfLines={1}
                      >
                        {ex.name !== ex.exercise_id ? ex.name : ex.exercise_id}
                      </Text>
                      <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {ex.sets_done} set{ex.sets_done !== 1 ? "s" : ""}
                        {ex.total_reps > 0 ? ` · ${ex.total_reps} reps` : ""}
                        {ex.total_volume_kg > 0
                          ? ` · ${ex.total_volume_kg.toFixed(1)} kg`
                          : ""}
                      </Text>
                      <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {`Time ${formatDuration(metric?.time_to_complete_seconds ?? 0)}`}
                        {metric && metric.avg_weight_kg > 0
                          ? ` · Avg ${metric.avg_weight_kg.toFixed(1)} kg`
                          : ""}
                        {metric && metric.max_weight_kg > 0
                          ? ` · Max ${metric.max_weight_kg.toFixed(1)} kg`
                          : ""}
                      </Text>
                    </View>
                    <Check size={16} color="#22c55e" />
                  </View>
                );
              })(),
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Actions ── */}
      <View
        className={cn(
          "px-4 pt-3 border-t gap-2",
          isDark
            ? "bg-dark-surface border-dark-border"
            : "bg-light-surface border-light-border",
        )}
        style={{ paddingBottom: 0 }}
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
