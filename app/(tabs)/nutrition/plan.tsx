import { useState, useCallback, useEffect } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Trash2,
} from "lucide-react-native";

import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";

import { NutritionDisclaimer } from "@/components/nutrition/NutritionDisclaimer";
import { FoodRow } from "@/components/nutrition/FoodRow";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";

import {
  listDietPlans,
  createDietPlan,
  deleteDietPlan,
} from "@/lib/firestore/nutrition";
import { generateDietPlan } from "@/lib/nutrition-ai";
import {
  calculateDailyGoal,
  calculateTDEE,
  calculateCalorieTarget,
} from "@/lib/macro-calculator";
import { getApiKey } from "@/lib/api-key-store";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { radius } from "@/constants/radius";
import type { DietPlan, Goal, MealType } from "@/types";

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  pre_workout: "Pre-Workout",
  post_workout: "Post-Workout",
};

const GOAL_OPTIONS: { value: Goal; label: string }[] = [
  { value: "lose_fat", label: "Lose Fat" },
  { value: "gain_muscle", label: "Gain Muscle" },
  { value: "maintain", label: "Maintain" },
  { value: "recomp", label: "Recomp" },
];

function PlanCard({
  plan,
  onDelete,
}: {
  plan: DietPlan;
  onDelete: () => void;
}) {
  const colors = useThemeStore((s) => s.colors);
  const [expanded, setExpanded] = useState(false);

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        overflow: "hidden",
      }}
    >
      {/* Plan header */}
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: spacing.md,
          gap: spacing.sm,
          minHeight: 56,
        }}
        accessibilityRole="button"
        accessibilityLabel={`${plan.name} diet plan`}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={[typography.bodyMedium, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {plan.name}
          </Text>
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>
            {plan.target_calories} kcal · P {plan.daily_protein_g}g · C{" "}
            {plan.daily_carbs_g}g · F {plan.daily_fat_g}g
          </Text>
        </View>

        {plan.is_ai_generated ? (
          <Sparkles size={14} color={colors.primary} strokeWidth={2} />
        ) : null}

        <Pressable
          onPress={onDelete}
          hitSlop={8}
          style={{
            padding: 4,
            minWidth: 44,
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
          }}
          accessibilityRole="button"
          accessibilityLabel="Delete plan"
        >
          <Trash2 size={16} color={colors.destructive} strokeWidth={2} />
        </Pressable>

        {expanded ? (
          <ChevronUp size={18} color={colors.muted} strokeWidth={2} />
        ) : (
          <ChevronDown size={18} color={colors.muted} strokeWidth={2} />
        )}
      </Pressable>

      {/* Meals breakdown */}
      {expanded ? (
        <View
          style={{
            paddingHorizontal: spacing.sm,
            paddingBottom: spacing.sm,
            gap: spacing.sm,
          }}
        >
          {plan.meals.map((meal, mIndex) => (
            <View key={mIndex} style={{ gap: spacing.xs }}>
              <Text
                style={[
                  typography.smallMedium,
                  { color: colors.mutedForeground },
                ]}
              >
                {MEAL_LABELS[meal.meal_type] ?? meal.meal_type}
              </Text>
              {meal.items.map((item, iIndex) => (
                <FoodRow key={`${meal.meal_type}-${iIndex}`} item={item} />
              ))}
              {meal.notes ? (
                <Text
                  style={[
                    typography.caption,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {meal.notes}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function PlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const showToast = useToastStore((s) => s.show);
  const colors = useThemeStore((s) => s.colors);

  const [plans, setPlans] = useState<DietPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal>(
    (profile?.goal as Goal) ?? "maintain",
  );
  const [mealsPerDay, setMealsPerDay] = useState<number>(4);
  const [calorieOverride, setCalorieOverride] = useState<string>("");

  const loadPlans = useCallback(async () => {
    if (!user?.uid) return;
    try {
      setLoading(true);
      setPlans(await listDietPlans(user.uid));
    } catch {
      showToast("Failed to load plans", "error");
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const handleGenerate = async () => {
    if (!user?.uid) return;

    const provider = profile?.preferred_ai_provider ?? "gemini";
    const apiKey = await getApiKey(provider);

    if (!apiKey) {
      showToast(
        "No AI API key configured. Go to Profile > AI Keys to add one.",
        "error",
      );
      return;
    }

    try {
      setGenerating(true);

      const profileWithGoal = { ...profile, goal: selectedGoal as Goal };
      const tdee = calculateTDEE(profileWithGoal);
      const targetCalories = calculateCalorieTarget(tdee, selectedGoal);
      const selectedCalories = Number(calorieOverride);
      const finalCalories =
        Number.isFinite(selectedCalories) && selectedCalories > 0
          ? selectedCalories
          : targetCalories;

      const meals = await generateDietPlan(
        provider,
        profileWithGoal,
        finalCalories,
        mealsPerDay,
      );

      // Calculate macro targets
      const goalCalc = calculateDailyGoal(profileWithGoal);

      const saved = await createDietPlan(user.uid, {
        name: `AI Plan – ${GOAL_OPTIONS.find((g) => g.value === selectedGoal)?.label ?? selectedGoal}`,
        is_ai_generated: true,
        target_calories: goalCalc.calories,
        daily_protein_g: goalCalc.protein_g,
        daily_carbs_g: goalCalc.carbs_g,
        daily_fat_g: goalCalc.fat_g,
        meals,
        dietary_tags: profile?.dietary_restrictions ?? [],
      });

      setPlans((prev) => [saved, ...prev]);
      showToast("Diet plan generated and saved", "success");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to generate plan";
      showToast(msg, "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (planId: string) => {
    try {
      await deleteDietPlan(planId);
      setPlans((prev) => prev.filter((p) => p.id !== planId));
      showToast("Plan deleted", "success");
    } catch {
      showToast("Failed to delete plan", "error");
    }
  };

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
          Diet Plan
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + 40,
          gap: spacing.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* AI Generator card */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: spacing.md,
            gap: spacing.md,
          }}
        >
          <View style={{ gap: 4 }}>
            <Text style={[typography.bodyMedium, { color: colors.foreground }]}>
              Generate AI Meal Plan
            </Text>
            <Text
              style={[typography.caption, { color: colors.mutedForeground }]}
            >
              Choose your goal, calories and meal frequency to generate a
              practical plan.
            </Text>
          </View>

          {/* Goal selector */}
          <View style={{ gap: spacing.xs }}>
            <Text
              style={[
                typography.smallMedium,
                { color: colors.mutedForeground },
              ]}
            >
              Goal
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.xs }}
            >
              {GOAL_OPTIONS.map((opt) => {
                const active = opt.value === selectedGoal;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setSelectedGoal(opt.value)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: radius.full,
                      borderWidth: 1,
                      backgroundColor: active ? colors.primary : colors.card,
                      borderColor: active ? colors.primary : colors.cardBorder,
                      minHeight: 44,
                      justifyContent: "center",
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[
                        typography.smallMedium,
                        { color: active ? "#fff" : colors.foreground },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={{ gap: spacing.xs }}>
            <Text
              style={[
                typography.smallMedium,
                { color: colors.mutedForeground },
              ]}
            >
              Target calories (optional override)
            </Text>
            <Input
              keyboardType="numeric"
              placeholder="Auto from profile goal"
              value={calorieOverride}
              onChangeText={setCalorieOverride}
            />
          </View>

          <View style={{ gap: spacing.xs }}>
            <Text
              style={[
                typography.smallMedium,
                { color: colors.mutedForeground },
              ]}
            >
              Meals per day
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.xs }}
            >
              {[3, 4, 5, 6].map((count) => {
                const active = mealsPerDay === count;
                return (
                  <Pressable
                    key={count}
                    onPress={() => setMealsPerDay(count)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: radius.full,
                      borderWidth: 1,
                      backgroundColor: active ? colors.primary : colors.card,
                      borderColor: active ? colors.primary : colors.cardBorder,
                      minHeight: 44,
                      justifyContent: "center",
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[
                        typography.smallMedium,
                        { color: active ? "#fff" : colors.foreground },
                      ]}
                    >
                      {count} meals
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <Button
            onPress={handleGenerate}
            isLoading={generating}
            disabled={generating}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Sparkles size={16} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "600" }}>
                {generating ? "Generating…" : "Generate Plan"}
              </Text>
            </View>
          </Button>

          <NutritionDisclaimer dismissible={false} />
        </View>

        {/* Plans list */}
        {loading ? (
          <View style={{ alignItems: "center", paddingVertical: spacing.xl }}>
            <Spinner size="md" />
          </View>
        ) : plans.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: spacing.xl }}>
            <Text
              style={[
                typography.body,
                { color: colors.mutedForeground, textAlign: "center" },
              ]}
            >
              No plans saved yet. Generate your first AI plan above.
            </Text>
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            <Text
              style={[
                typography.smallMedium,
                { color: colors.mutedForeground },
              ]}
            >
              Saved Plans ({plans.length})
            </Text>
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onDelete={() => handleDelete(plan.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
