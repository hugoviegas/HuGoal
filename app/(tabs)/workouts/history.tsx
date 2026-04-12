import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  BarChart2,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flame,
  Weight,
} from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  listCompletedWorkoutSessions,
  type CompletedWorkoutSessionRecord,
} from "@/lib/firestore/workouts";

// ─── Helpers ─────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function relativeDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function groupByDate(
  sessions: CompletedWorkoutSessionRecord[],
): [string, CompletedWorkoutSessionRecord[]][] {
  const map = new Map<string, CompletedWorkoutSessionRecord[]>();
  for (const session of sessions) {
    const key = session.date; // YYYY-MM-DD
    const existing = map.get(key);
    if (existing) {
      existing.push(session);
    } else {
      map.set(key, [session]);
    }
  }
  // Return sorted newest first
  return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
}

type HistoryTab = "sessions" | "stats";

// ─── Screen ───────────────────────────────────────────────────────────────

export default function WorkoutHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useThemeStore();
  const user = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab] = useState<HistoryTab>("sessions");
  const [sessions, setSessions] = useState<CompletedWorkoutSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tabBarClearance = insets.bottom + 76;

  const loadSessions = useCallback(async () => {
    if (!user?.uid) {
      setSessions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const records = await listCompletedWorkoutSessions(user.uid, 100);
      setSessions(records);
    } catch (err) {
      console.error("[history] load failed", err);
      setError("Could not load workout history.");
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  // ── Stats ──
  const totalSessions = sessions.length;
  const totalDurationSeconds = sessions.reduce((s, r) => s + r.duration_seconds, 0);
  const totalVolume = sessions.reduce((s, r) => s + r.total_volume_kg, 0);
  const totalSets = sessions.reduce((s, r) => s + r.total_sets, 0);
  const avgDuration = totalSessions > 0 ? Math.round(totalDurationSeconds / totalSessions) : 0;
  const thisWeekSessions = sessions.filter((s) => {
    const diffDays =
      (Date.now() - new Date(s.ended_at).getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  }).length;

  const frequencyMap = sessions.reduce<Record<string, number>>((acc, s) => {
    acc[s.workout_name] = (acc[s.workout_name] ?? 0) + 1;
    return acc;
  }, {});
  const topWorkouts = Object.entries(frequencyMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  const maxFreq = topWorkouts[0]?.[1] ?? 1;

  const grouped = groupByDate(sessions);

  // ── Render ──

  if (loading) {
    return (
      <View className={cn("flex-1 items-center justify-center", isDark ? "bg-dark-bg" : "bg-light-bg")}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text className="text-sm text-gray-500 dark:text-gray-400 mt-3">Loading history…</Text>
      </View>
    );
  }

  return (
    <View className={cn("flex-1", isDark ? "bg-dark-bg" : "bg-light-bg")}>
      {/* ── Header ── */}
      <View
        className={cn(
          "px-4 border-b",
          isDark ? "bg-dark-surface border-dark-border" : "bg-light-surface border-light-border",
        )}
        style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
      >
        <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          Workout History
        </Text>

        {/* Tabs */}
        <View
          className={cn(
            "flex-row rounded-xl p-1",
            isDark ? "bg-dark-card" : "bg-light-card",
          )}
        >
          {(["sessions", "stats"] as HistoryTab[]).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-2 rounded-lg items-center",
                activeTab === tab
                  ? isDark
                    ? "bg-dark-surface"
                    : "bg-white"
                  : "bg-transparent",
              )}
            >
              <Text
                className={cn(
                  "text-sm font-semibold capitalize",
                  activeTab === tab
                    ? "text-gray-900 dark:text-gray-100"
                    : "text-gray-500 dark:text-gray-400",
                )}
              >
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ── Error ── */}
      {error ? (
        <View className="px-4 pt-4">
          <View className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
            <Text className="text-red-400 font-semibold">{error}</Text>
            <Button className="mt-3" variant="outline" onPress={() => void loadSessions()}>
              Try again
            </Button>
          </View>
        </View>
      ) : null}

      {/* ── Sessions tab ── */}
      {activeTab === "sessions" && !error && (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: tabBarClearance + 20 }}
          showsVerticalScrollIndicator={false}
        >
          {sessions.length === 0 ? (
            <View className="items-center py-20">
              <Dumbbell size={40} color={colors.muted} />
              <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-4">
                No sessions yet
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-center">
                Complete a workout and it will appear here.
              </Text>
              <Button className="mt-5" onPress={() => router.replace("/workouts")}>
                Go to Workouts
              </Button>
            </View>
          ) : (
            <>
              {/* Quick stats row */}
              <View className="flex-row gap-3 mb-5">
                <View
                  className={cn(
                    "flex-1 rounded-2xl border p-3",
                    isDark ? "bg-dark-surface border-dark-border" : "bg-light-surface border-light-border",
                  )}
                >
                  <Text className="text-xs text-gray-500 dark:text-gray-400">Total</Text>
                  <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {totalSessions}
                  </Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400">sessions</Text>
                </View>
                <View
                  className={cn(
                    "flex-1 rounded-2xl border p-3",
                    isDark ? "bg-dark-surface border-dark-border" : "bg-light-surface border-light-border",
                  )}
                >
                  <Text className="text-xs text-gray-500 dark:text-gray-400">This week</Text>
                  <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {thisWeekSessions}
                  </Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400">sessions</Text>
                </View>
                <View
                  className={cn(
                    "flex-1 rounded-2xl border p-3",
                    isDark ? "bg-dark-surface border-dark-border" : "bg-light-surface border-light-border",
                  )}
                >
                  <Text className="text-xs text-gray-500 dark:text-gray-400">Avg</Text>
                  <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {Math.floor(avgDuration / 60)}m
                  </Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400">per session</Text>
                </View>
              </View>

              {/* Grouped sessions */}
              {grouped.map(([dateKey, daySessions]) => (
                <View key={dateKey} className="mb-5">
                  <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {relativeDate(daySessions[0].ended_at)}
                  </Text>

                  {daySessions.map((session) => (
                    <Pressable
                      key={session.id}
                      className={cn(
                        "rounded-2xl border p-4 mb-2",
                        isDark
                          ? "bg-dark-surface border-dark-border"
                          : "bg-light-surface border-light-border",
                      )}
                      onPress={() =>
                        router.push(
                          `/workouts/${session.template_id}/summary?sessionId=${session.id}`,
                        )
                      }
                    >
                      {/* Title row */}
                      <View className="flex-row items-start justify-between mb-3">
                        <Text
                          className="font-semibold text-base text-gray-900 dark:text-gray-100 flex-1 pr-2"
                          numberOfLines={1}
                        >
                          {session.workout_name}
                        </Text>
                        <ChevronRight size={16} color={colors.muted} />
                      </View>

                      {/* Metrics */}
                      <View className="flex-row gap-4">
                        <View className="flex-row items-center gap-1">
                          <Clock3 size={13} color={colors.muted} />
                          <Text className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDuration(session.duration_seconds)}
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-1">
                          <Dumbbell size={13} color={colors.muted} />
                          <Text className="text-sm text-gray-600 dark:text-gray-400">
                            {session.total_sets} sets
                          </Text>
                        </View>
                        {session.total_volume_kg > 0 && (
                          <View className="flex-row items-center gap-1">
                            <Weight size={13} color={colors.muted} />
                            <Text className="text-sm text-gray-600 dark:text-gray-400">
                              {session.total_volume_kg.toFixed(0)} kg
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* XP */}
                      <View className="flex-row items-center gap-1 mt-2">
                        <Flame size={12} color={colors.primary} />
                        <Text className="text-xs font-semibold text-primary-500">
                          +{session.xp_earned} XP
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* ── Stats tab ── */}
      {activeTab === "stats" && !error && (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: tabBarClearance + 20 }}
          showsVerticalScrollIndicator={false}
        >
          {sessions.length === 0 ? (
            <View className="items-center py-20">
              <BarChart2 size={40} color={colors.muted} />
              <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-4">
                No data yet
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-center">
                Finish your first workout to see stats.
              </Text>
            </View>
          ) : (
            <>
              {/* Overview grid */}
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Overview
              </Text>
              <View className="flex-row gap-3 mb-3">
                <View
                  className={cn(
                    "flex-1 rounded-2xl border p-4",
                    isDark ? "bg-dark-surface border-dark-border" : "bg-light-surface border-light-border",
                  )}
                >
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Sessions</Text>
                  <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {totalSessions}
                  </Text>
                </View>
                <View
                  className={cn(
                    "flex-1 rounded-2xl border p-4",
                    isDark ? "bg-dark-surface border-dark-border" : "bg-light-surface border-light-border",
                  )}
                >
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">This Week</Text>
                  <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {thisWeekSessions}
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-3 mb-5">
                <View
                  className={cn(
                    "flex-1 rounded-2xl border p-4",
                    isDark ? "bg-dark-surface border-dark-border" : "bg-light-surface border-light-border",
                  )}
                >
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Duration</Text>
                  <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {Math.floor(avgDuration / 60)}m
                  </Text>
                </View>
                <View
                  className={cn(
                    "flex-1 rounded-2xl border p-4",
                    isDark ? "bg-dark-surface border-dark-border" : "bg-light-surface border-light-border",
                  )}
                >
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Volume</Text>
                  <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {totalVolume > 0 ? `${totalVolume.toFixed(0)} kg` : "—"}
                  </Text>
                </View>
                <View
                  className={cn(
                    "flex-1 rounded-2xl border p-4",
                    isDark ? "bg-dark-surface border-dark-border" : "bg-light-surface border-light-border",
                  )}
                >
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Sets</Text>
                  <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {totalSets}
                  </Text>
                </View>
              </View>

              {/* Most done workouts */}
              {topWorkouts.length > 0 && (
                <>
                  <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Most Done Workouts
                  </Text>

                  {topWorkouts.map(([name, count]) => (
                    <View
                      key={name}
                      className={cn(
                        "rounded-2xl border p-4 mb-2",
                        isDark
                          ? "bg-dark-surface border-dark-border"
                          : "bg-light-surface border-light-border",
                      )}
                    >
                      <View className="flex-row items-center justify-between mb-2">
                        <Text
                          className="font-semibold text-gray-900 dark:text-gray-100 flex-1 pr-2"
                          numberOfLines={1}
                        >
                          {name}
                        </Text>
                        <Text className="text-sm font-bold text-primary-500">
                          {count}×
                        </Text>
                      </View>
                      <View
                        className="h-1.5 rounded-full overflow-hidden"
                        style={{ backgroundColor: isDark ? "#374151" : "#e5e7eb" }}
                      >
                        <View
                          style={{
                            width: `${(count / maxFreq) * 100}%`,
                            height: "100%",
                            backgroundColor: colors.primary,
                            borderRadius: 999,
                          }}
                        />
                      </View>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* ── Bottom close ── */}
      <View
        className={cn(
          "px-4 pt-3 border-t",
          isDark ? "bg-dark-surface border-dark-border" : "bg-light-surface border-light-border",
        )}
        style={{ paddingBottom: tabBarClearance }}
      >
        <Button onPress={() => router.back()} variant="secondary" size="lg" className="w-full">
          Close
        </Button>
      </View>
    </View>
  );
}
