import { useState, useCallback, useEffect } from "react";
import { View, Text, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { format } from "date-fns";
import {
  BookOpen,
  Bug,
  History,
  PencilLine,
  Sparkles,
} from "lucide-react-native";

import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import { useNutritionStore } from "@/stores/nutrition.store";

import { MacroSummary } from "@/components/nutrition/MacroSummary";
import { WaterTracker } from "@/components/nutrition/WaterTracker";
import { MealSection } from "@/components/nutrition/MealSection";
import { NutritionDisclaimer } from "@/components/nutrition/NutritionDisclaimer";
import { FloatingActionMenu } from "@/components/ui/FloatingActionMenu";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";

import {
  listNutritionLogs,
  deleteNutritionLog,
  updateNutritionLog,
  listWaterLogs,
  addWaterLog,
} from "@/lib/firestore/nutrition";
import { calculateDailyGoal } from "@/lib/macro-calculator";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import type { MealType, NutritionItem, NutritionLog } from "@/types";

const MEAL_TYPES: MealType[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "pre_workout",
  "post_workout",
];

export default function NutritionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const showToast = useToastStore((s) => s.show);
  const colors = useThemeStore((s) => s.colors);

  const todayLogs = useNutritionStore((s) => s.todayLogs);
  const dailyGoal = useNutritionStore((s) => s.dailyGoal);
  const todayTotals = useNutritionStore((s) => s.todayTotals);
  const waterMl = useNutritionStore((s) => s.waterMl);
  const isLoading = useNutritionStore((s) => s.isLoading);
  const setTodayLogs = useNutritionStore((s) => s.setTodayLogs);
  const setDailyGoal = useNutritionStore((s) => s.setDailyGoal);
  const setWater = useNutritionStore((s) => s.setWater);
  const addWater = useNutritionStore((s) => s.addWater);
  const setLoading = useNutritionStore((s) => s.setLoading);

  const [error, setError] = useState<string | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");

  const loadData = useCallback(async () => {
    if (!user?.uid) return;
    try {
      setLoading(true);
      setError(null);

      const [logs, waterLogs] = await Promise.all([
        listNutritionLogs(user.uid, today),
        listWaterLogs(user.uid, today),
      ]);

      setTodayLogs(logs);
      setWater(waterLogs.reduce((sum, w) => sum + w.amount_ml, 0));

      if (profile) {
        setDailyGoal(calculateDailyGoal(profile));
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load nutrition data";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [
    user,
    profile,
    today,
    setTodayLogs,
    setWater,
    setDailyGoal,
    setLoading,
    showToast,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteItem = async (mealType: MealType, globalIndex: number) => {
    const logsForMeal = todayLogs.filter((l) => l.meal_type === mealType);
    let count = 0;

    for (const log of logsForMeal) {
      if (globalIndex < count + log.items.length) {
        const localIndex = globalIndex - count;
        try {
          if (log.items.length === 1) {
            await deleteNutritionLog(log.id);
            setTodayLogs(todayLogs.filter((l) => l.id !== log.id));
          } else {
            const newItems = log.items.filter((_, i) => i !== localIndex);
            await updateNutritionLog(log.id, { items: newItems });
            const updated: NutritionLog = {
              ...log,
              items: newItems,
              total: newItems.reduce(
                (acc, it) => ({
                  calories: acc.calories + it.calories,
                  protein_g: acc.protein_g + it.protein_g,
                  carbs_g: acc.carbs_g + it.carbs_g,
                  fat_g: acc.fat_g + it.fat_g,
                }),
                { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
              ),
            };
            setTodayLogs(todayLogs.map((l) => (l.id === log.id ? updated : l)));
          }
        } catch {
          showToast("Failed to delete item", "error");
        }
        return;
      }
      count += log.items.length;
    }
  };

  const handleAddWater = async (ml: number) => {
    if (!user?.uid) return;
    try {
      await addWaterLog(user.uid, today, ml);
      addWater(ml);
    } catch {
      showToast("Failed to log water", "error");
    }
  };

  const getItemsForMeal = (mealType: MealType): NutritionItem[] =>
    todayLogs.filter((l) => l.meal_type === mealType).flatMap((l) => l.items);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <Spinner size="lg" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.md,
          paddingBottom: insets.bottom + 160,
          gap: spacing.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ gap: 2 }}>
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>
            {format(new Date(), "EEEE, MMMM d")}
          </Text>
          <Text style={[typography.h2, { color: colors.foreground }]}>
            Nutrition
          </Text>
        </View>

        {/* Macro Summary */}
        <MacroSummary totals={todayTotals} goal={dailyGoal} />

        {/* Water */}
        <WaterTracker current={waterMl} onAdd={handleAddWater} />

        {/* Error */}
        {error ? (
          <View
            style={{
              backgroundColor: colors.destructive + "14",
              borderRadius: 12,
              padding: spacing.md,
              gap: spacing.xs,
              borderWidth: 1,
              borderColor: colors.destructive + "30",
            }}
          >
            <Text
              style={[typography.bodyMedium, { color: colors.destructive }]}
            >
              {error}
            </Text>
            <Button variant="outline" size="sm" onPress={loadData}>
              Retry
            </Button>
          </View>
        ) : null}

        {/* AI disclaimer */}
        <NutritionDisclaimer />

        {/* Meal sections */}
        {MEAL_TYPES.map((mealType) => {
          const items = getItemsForMeal(mealType);
          return (
            <MealSection
              key={mealType}
              mealType={mealType}
              items={items}
              defaultExpanded={mealType === "breakfast" || items.length > 0}
              onAddItem={() =>
                router.push({
                  pathname: "/nutrition/log",
                  params: { mealType },
                })
              }
              onDeleteItem={(index) => handleDeleteItem(mealType, index)}
            />
          );
        })}
      </ScrollView>

      {/* Floating action menu */}
      <FloatingActionMenu
        options={[
          {
            label: "Log Food",
            onPress: () => router.push("/nutrition/log"),
            icon: <PencilLine size={18} color="#fff" />,
          },
          {
            label: "Diet Plan",
            onPress: () => router.push("/nutrition/plan"),
            icon: <Sparkles size={18} color="#fff" />,
          },
          {
            label: "AI Debug",
            onPress: () => router.push("/nutrition/ai-debug"),
            icon: <Bug size={18} color="#fff" />,
          },
          {
            label: "History",
            onPress: () => router.push("/nutrition/history"),
            icon: <History size={18} color="#fff" />,
          },
          {
            label: "My Foods",
            onPress: () => router.push("/nutrition/library"),
            icon: <BookOpen size={18} color="#fff" />,
          },
        ]}
      />
    </View>
  );
}
