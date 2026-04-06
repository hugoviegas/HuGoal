import { useState, useCallback, useEffect } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { format, parseISO, subDays } from "date-fns";
import { ArrowLeft, TrendingUp } from "lucide-react-native";

import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import { useNutritionStore } from "@/stores/nutrition.store";

import { Spinner } from "@/components/ui/Spinner";

import { listNutritionLogs } from "@/lib/firestore/nutrition";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { radius } from "@/constants/radius";
import type { NutritionLog } from "@/types";

interface DaySummary {
  date: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  mealsCount: number;
}

function groupByDate(logs: NutritionLog[]): DaySummary[] {
  const map: Record<string, DaySummary> = {};

  for (const log of logs) {
    const date = log.logged_at.slice(0, 10); // YYYY-MM-DD
    if (!map[date]) {
      map[date] = {
        date,
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        mealsCount: 0,
      };
    }
    map[date].calories += log.total.calories;
    map[date].protein_g += log.total.protein_g;
    map[date].carbs_g += log.total.carbs_g;
    map[date].fat_g += log.total.fat_g;
    map[date].mealsCount += 1;
  }

  return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
}

function DaySummaryCard({
  summary,
  calorieGoal,
}: {
  summary: DaySummary;
  calorieGoal: number;
}) {
  const colors = useThemeStore((s) => s.colors);
  const progress = Math.min(summary.calories / Math.max(calorieGoal, 1), 1);
  const isToday = summary.date === format(new Date(), "yyyy-MM-dd");
  const isOver = summary.calories > calorieGoal;

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        padding: spacing.md,
        gap: spacing.sm,
      }}
    >
      {/* Date row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ gap: 2 }}>
          <Text
            style={[typography.bodyMedium, { color: colors.foreground }]}
          >
            {isToday
              ? "Today"
              : format(parseISO(summary.date), "EEEE, MMM d")}
          </Text>
          <Text
            style={[typography.caption, { color: colors.mutedForeground }]}
          >
            {summary.mealsCount} {summary.mealsCount === 1 ? "meal" : "meals"} logged
          </Text>
        </View>

        <View style={{ alignItems: "flex-end", gap: 2 }}>
          <Text
            style={[
              typography.bodyMedium,
              { color: isOver ? colors.destructive : colors.foreground },
            ]}
          >
            {summary.calories} kcal
          </Text>
          <Text
            style={[typography.caption, { color: colors.mutedForeground }]}
          >
            / {calorieGoal} goal
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View
        style={{
          height: 6,
          borderRadius: radius.full,
          backgroundColor: colors.cardBorder,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: 6,
            borderRadius: radius.full,
            backgroundColor: isOver ? colors.destructive : colors.primary,
            width: `${Math.min(progress * 100, 100)}%`,
          }}
        />
      </View>

      {/* Macros row */}
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        {[
          { label: "Protein", value: summary.protein_g, color: "#22C4D5" },
          { label: "Carbs", value: summary.carbs_g, color: "#F59E0B" },
          { label: "Fat", value: summary.fat_g, color: "#F472B6" },
        ].map((macro) => (
          <View key={macro.label} style={{ gap: 2 }}>
            <Text
              style={[typography.caption, { color: colors.mutedForeground }]}
            >
              {macro.label}
            </Text>
            <Text
              style={[typography.smallMedium, { color: macro.color }]}
            >
              {macro.value}g
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.show);
  const colors = useThemeStore((s) => s.colors);
  const dailyGoal = useNutritionStore((s) => s.dailyGoal);

  const [summaries, setSummaries] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!user?.uid) return;
    try {
      setLoading(true);
      // Load all logs (no date filter) to get full history
      const logs = await listNutritionLogs(user.uid);
      setSummaries(groupByDate(logs));
    } catch {
      showToast("Failed to load history", "error");
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Weekly average
  const last7 = summaries.slice(0, 7);
  const avgCalories =
    last7.length > 0
      ? Math.round(last7.reduce((s, d) => s + d.calories, 0) / last7.length)
      : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.sm,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.cardBorder,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={{
            width: 36,
            height: 36,
            alignItems: "center",
            justifyContent: "center",
          }}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <ArrowLeft size={22} color={colors.foreground} strokeWidth={2} />
        </Pressable>
        <Text style={[typography.h3, { color: colors.foreground, flex: 1 }]}>
          History
        </Text>
      </View>

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Spinner size="lg" />
        </View>
      ) : (
        <FlatList
          data={summaries}
          keyExtractor={(item) => item.date}
          renderItem={({ item }) => (
            <DaySummaryCard summary={item} calorieGoal={dailyGoal.calories} />
          )}
          contentContainerStyle={{
            paddingHorizontal: spacing.md,
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + 40,
            gap: spacing.sm,
          }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            avgCalories > 0 ? (
              <View
                style={{
                  backgroundColor: colors.card,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  padding: spacing.md,
                  marginBottom: spacing.sm,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.sm,
                }}
              >
                <TrendingUp size={20} color={colors.primary} strokeWidth={2} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[typography.smallMedium, { color: colors.mutedForeground }]}
                  >
                    7-day average
                  </Text>
                  <Text
                    style={[typography.bodyMedium, { color: colors.foreground }]}
                  >
                    {avgCalories} kcal / day
                  </Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View
              style={{ alignItems: "center", paddingVertical: spacing.xl * 2 }}
            >
              <Text
                style={[
                  typography.body,
                  { color: colors.mutedForeground, textAlign: "center" },
                ]}
              >
                No nutrition history yet.{"\n"}Start logging meals to see your
                progress here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
