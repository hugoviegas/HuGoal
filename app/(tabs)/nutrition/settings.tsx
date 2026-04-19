import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Bell,
  Droplets,
  Flame,
  Scale,
  Target,
} from "lucide-react-native";

import { typography } from "@/constants/typography";
import { useNutritionGoal } from "@/hooks/useNutritionGoal";
import { setNutritionSettings } from "@/lib/firestore/nutrition-settings";
import {
  calculateMacroTargetsFromRdi,
  calculateRDI,
} from "@/lib/nutrition/rdi";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import type {
  NutritionGoalStrategy,
  NutritionActivityLevel,
  NutritionRdiGoal,
  NutritionSettings,
} from "@/types";

function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const colors = useThemeStore((s) => s.colors);

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        padding: 16,
        gap: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.surface,
          }}
        >
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.smallMedium, { color: colors.foreground }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[typography.caption, { color: colors.mutedForeground }]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {children}
    </View>
  );
}

function SegmentedOption<T extends string>({
  value,
  selected,
  onPress,
}: {
  value: T;
  selected: boolean;
  onPress: (value: T) => void;
}) {
  const colors = useThemeStore((s) => s.colors);

  return (
    <Pressable
      onPress={() => onPress(value)}
      style={{
        minHeight: 36,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.cardBorder,
        backgroundColor: selected ? `${colors.primary}22` : colors.card,
        paddingHorizontal: 12,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={[typography.small, { color: colors.foreground }]}>
        {value}
      </Text>
    </Pressable>
  );
}

export default function NutritionSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.show);
  const { goal, isLoading, error, refresh } = useNutritionGoal();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<NutritionSettings | null>(null);

  useEffect(() => {
    setDraft(goal);
  }, [goal]);

  const macroTargets = useMemo(() => {
    if (!draft) {
      return null;
    }

    return calculateMacroTargetsFromRdi(draft.rdi_kcal, draft.macro_split);
  }, [draft]);

  const updateDraft = <K extends keyof NutritionSettings>(
    key: K,
    value: NutritionSettings[K],
  ) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const next = { ...current, [key]: value };
      const recalculated = calculateRDI(next);

      return {
        ...next,
        rdi_kcal: recalculated.rdi_kcal,
        macro_split: recalculated.macro_split,
      };
    });
  };

  const updateDraftRaw = <K extends keyof NutritionSettings>(
    key: K,
    value: NutritionSettings[K],
  ) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      return { ...current, [key]: value };
    });
  };

  const updateManualTarget = (
    key: "calories" | "protein_g" | "carbs_g" | "fat_g",
    delta: number,
  ) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const currentValue = current.manual_nutrient_targets?.[key] ?? 0;
      const nextValue = Math.max(0, currentValue + delta);

      return {
        ...current,
        manual_nutrient_targets: {
          ...current.manual_nutrient_targets,
          [key]: nextValue,
        },
      };
    });
  };

  const handleSave = async () => {
    if (!user?.uid || !draft) {
      return;
    }

    try {
      setSaving(true);
      await setNutritionSettings(user.uid, {
        ...draft,
        updated_at: new Date().toISOString(),
      });
      setEditing(false);
      await refresh();
      showToast("Nutrition settings updated", "success");
    } catch {
      showToast("Failed to update nutrition settings", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 32,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/(tabs)/nutrition");
              }
            }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.secondary,
            }}
          >
            <ArrowLeft size={18} color={colors.foreground} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.foreground,
                fontSize: 22,
                fontWeight: "800",
              }}
            >
              Nutrition Settings
            </Text>
            <Text
              style={[typography.caption, { color: colors.mutedForeground }]}
            >
              Manage your calorie goal, macros, and preferences
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              backgroundColor: colors.card,
              padding: 14,
            }}
          >
            <Text style={[typography.body, { color: colors.mutedForeground }]}>
              Loading nutrition settings...
            </Text>
          </View>
        ) : null}

        {error ? (
          <View
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.destructive,
              backgroundColor: `${colors.destructive}11`,
              padding: 14,
            }}
          >
            <Text style={[typography.body, { color: colors.destructive }]}>
              {error}
            </Text>
          </View>
        ) : null}

        {!isLoading && !goal ? (
          <SectionCard
            icon={<Target size={16} color={colors.primary} />}
            title="Nutrition RDI"
            subtitle="Set your daily calorie target"
          >
            <Text style={[typography.small, { color: colors.mutedForeground }]}>
              You have not configured your nutrition goal yet.
            </Text>
            <Pressable
              onPress={() => router.push("/nutrition/onboarding")}
              style={{
                marginTop: 8,
                minHeight: 44,
                borderRadius: 10,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={[
                  typography.smallMedium,
                  { color: colors.primaryForeground },
                ]}
              >
                Start RDI onboarding
              </Text>
            </Pressable>
          </SectionCard>
        ) : null}

        <SectionCard
          icon={<Target size={16} color={colors.primary} />}
          title="Daily calorie goal"
          subtitle="Set your target calories per day"
        >
          {draft ? (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 14,
                gap: 8,
              }}
            >
              <Text style={[typography.h2, { color: colors.foreground }]}>
                {draft.rdi_kcal} kcal/day
              </Text>
              {macroTargets ? (
                <Text
                  style={[typography.small, { color: colors.mutedForeground }]}
                >
                  Approx: {macroTargets.protein_g}g protein ·{" "}
                  {macroTargets.carbs_g}g carbs · {macroTargets.fat_g}g fat
                </Text>
              ) : null}

              <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                <Pressable
                  onPress={() => router.push("/nutrition/onboarding")}
                  style={{
                    flex: 1,
                    minHeight: 40,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: colors.card,
                  }}
                >
                  <Text
                    style={[
                      typography.smallMedium,
                      { color: colors.foreground },
                    ]}
                  >
                    Recalculate my RDI
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setEditing((value) => !value)}
                  style={{
                    flex: 1,
                    minHeight: 40,
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: colors.primary,
                  }}
                >
                  <Text
                    style={[
                      typography.smallMedium,
                      { color: colors.primaryForeground },
                    ]}
                  >
                    {editing ? "Close edit" : "Edit inline"}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 14,
                alignItems: "center",
              }}
            >
              <Text
                style={[typography.caption, { color: colors.mutedForeground }]}
              >
                Configure your RDI to unlock this section
              </Text>
            </View>
          )}
        </SectionCard>

        {draft && editing ? (
          <SectionCard
            icon={<Target size={16} color={colors.primary} />}
            title="Quick edits"
            subtitle="Adjust goal, activity, and target weight"
          >
            <View style={{ gap: 10 }}>
              <Text
                style={[typography.smallMedium, { color: colors.foreground }]}
              >
                Goal
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {(["lose", "maintain", "gain"] as NutritionRdiGoal[]).map(
                  (item) => (
                    <SegmentedOption
                      key={item}
                      value={item}
                      selected={draft.goal === item}
                      onPress={(value) => updateDraft("goal", value)}
                    />
                  ),
                )}
              </View>

              <Text
                style={[typography.smallMedium, { color: colors.foreground }]}
              >
                Activity
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {(
                  [
                    "low",
                    "moderate",
                    "high",
                    "very_high",
                  ] as NutritionActivityLevel[]
                ).map((item) => (
                  <SegmentedOption
                    key={item}
                    value={item}
                    selected={draft.activity_level === item}
                    onPress={(value) => updateDraft("activity_level", value)}
                  />
                ))}
              </View>

              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Text
                  style={[typography.smallMedium, { color: colors.foreground }]}
                >
                  Goal weight:
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    onPress={() =>
                      updateDraft(
                        "goal_weight_kg",
                        Math.max(30, draft.goal_weight_kg - 0.5),
                      )
                    }
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      borderWidth: 1,
                      borderColor: colors.cardBorder,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: colors.card,
                    }}
                  >
                    <Text
                      style={[
                        typography.bodyMedium,
                        { color: colors.foreground },
                      ]}
                    >
                      -
                    </Text>
                  </Pressable>

                  <Text
                    style={[
                      typography.bodyMedium,
                      {
                        color: colors.foreground,
                        minWidth: 68,
                        textAlign: "center",
                      },
                    ]}
                  >
                    {draft.goal_weight_kg.toFixed(1)} kg
                  </Text>

                  <Pressable
                    onPress={() =>
                      updateDraft(
                        "goal_weight_kg",
                        Math.min(300, draft.goal_weight_kg + 0.5),
                      )
                    }
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      borderWidth: 1,
                      borderColor: colors.cardBorder,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: colors.card,
                    }}
                  >
                    <Text
                      style={[
                        typography.bodyMedium,
                        { color: colors.foreground },
                      ]}
                    >
                      +
                    </Text>
                  </Pressable>
                </View>
              </View>

              <Text
                style={[typography.smallMedium, { color: colors.foreground }]}
              >
                Goal strategy
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {(
                  [
                    "formula_only",
                    "formula_plus_override",
                    "manual_only",
                  ] as NutritionGoalStrategy[]
                ).map((item) => (
                  <SegmentedOption
                    key={item}
                    value={item}
                    selected={
                      (draft.goal_strategy ?? "formula_plus_override") === item
                    }
                    onPress={(value) => updateDraftRaw("goal_strategy", value)}
                  />
                ))}
              </View>

              <View style={{ gap: 6 }}>
                <Text
                  style={[typography.smallMedium, { color: colors.foreground }]}
                >
                  Water target and cup size
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    onPress={() =>
                      updateDraftRaw(
                        "water_goal_ml",
                        Math.max(500, (draft.water_goal_ml ?? 2000) - 100),
                      )
                    }
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      borderWidth: 1,
                      borderColor: colors.cardBorder,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: colors.card,
                    }}
                  >
                    <Text
                      style={[
                        typography.bodyMedium,
                        { color: colors.foreground },
                      ]}
                    >
                      -
                    </Text>
                  </Pressable>
                  <Text
                    style={[
                      typography.bodyMedium,
                      {
                        color: colors.foreground,
                        minWidth: 78,
                        textAlign: "center",
                      },
                    ]}
                  >
                    {draft.water_goal_ml ?? 2000} ml
                  </Text>
                  <Pressable
                    onPress={() =>
                      updateDraftRaw(
                        "water_goal_ml",
                        Math.min(6000, (draft.water_goal_ml ?? 2000) + 100),
                      )
                    }
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      borderWidth: 1,
                      borderColor: colors.cardBorder,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: colors.card,
                    }}
                  >
                    <Text
                      style={[
                        typography.bodyMedium,
                        { color: colors.foreground },
                      ]}
                    >
                      +
                    </Text>
                  </Pressable>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {[200, 250, 300, 500].map((cup) => (
                    <SegmentedOption
                      key={cup}
                      value={`${cup}ml`}
                      selected={(draft.cup_size_ml ?? 250) === cup}
                      onPress={(_value) => updateDraftRaw("cup_size_ml", cup)}
                    />
                  ))}
                </View>
              </View>

              <View style={{ gap: 6 }}>
                <Text
                  style={[typography.smallMedium, { color: colors.foreground }]}
                >
                  Manual macro targets
                </Text>
                {(
                  [
                    ["calories", "Calories", 50, "kcal"],
                    ["protein_g", "Protein", 5, "g"],
                    ["carbs_g", "Carbs", 5, "g"],
                    ["fat_g", "Fat", 5, "g"],
                  ] as const
                ).map(([key, label, step, unit]) => (
                  <View
                    key={key}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text
                      style={[
                        typography.small,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {label}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Pressable
                        onPress={() => updateManualTarget(key, -step)}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 15,
                          borderWidth: 1,
                          borderColor: colors.cardBorder,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: colors.card,
                        }}
                      >
                        <Text
                          style={[
                            typography.smallMedium,
                            { color: colors.foreground },
                          ]}
                        >
                          -
                        </Text>
                      </Pressable>
                      <Text
                        style={[
                          typography.smallMedium,
                          {
                            color: colors.foreground,
                            minWidth: 76,
                            textAlign: "center",
                          },
                        ]}
                      >
                        {(draft.manual_nutrient_targets?.[key] ?? 0).toString()}{" "}
                        {unit}
                      </Text>
                      <Pressable
                        onPress={() => updateManualTarget(key, step)}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 15,
                          borderWidth: 1,
                          borderColor: colors.cardBorder,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: colors.card,
                        }}
                      >
                        <Text
                          style={[
                            typography.smallMedium,
                            { color: colors.foreground },
                          ]}
                        >
                          +
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>

              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={{
                  marginTop: 6,
                  minHeight: 42,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.primary,
                  opacity: saving ? 0.6 : 1,
                }}
              >
                <Text
                  style={[
                    typography.smallMedium,
                    { color: colors.primaryForeground },
                  ]}
                >
                  {saving ? "Saving..." : "Save updates"}
                </Text>
              </Pressable>
            </View>
          </SectionCard>
        ) : null}

        <SectionCard
          icon={<Flame size={16} color={colors.primary} />}
          title="Macro split"
          subtitle="Protein, carbs, and fat percentages"
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 14,
              alignItems: "center",
            }}
          >
            <Text
              style={[typography.caption, { color: colors.mutedForeground }]}
            >
              Default split: 30% protein · 40% carbs · 30% fat
            </Text>
          </View>
        </SectionCard>

        <SectionCard
          icon={<Scale size={16} color={colors.primary} />}
          title="Units"
          subtitle="Choose how food quantities are displayed"
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 14,
              alignItems: "center",
            }}
          >
            <Text
              style={[typography.caption, { color: colors.mutedForeground }]}
            >
              Keep using grams (g) in this release
            </Text>
          </View>
        </SectionCard>

        <SectionCard
          icon={<Droplets size={16} color={colors.primary} />}
          title="Hydration"
          subtitle="Daily water goal and cup quick-add defaults"
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 14,
              alignItems: "center",
            }}
          >
            <Text
              style={[typography.caption, { color: colors.mutedForeground }]}
            >
              Current target: {draft?.water_goal_ml ?? 2000} ml · Cup:{" "}
              {draft?.cup_size_ml ?? 250} ml
            </Text>
          </View>
        </SectionCard>

        <SectionCard
          icon={<Bell size={16} color={colors.primary} />}
          title="Meal reminders"
          subtitle="Notifications to log your meals on time"
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 14,
              alignItems: "center",
            }}
          >
            <Text
              style={[typography.caption, { color: colors.mutedForeground }]}
            >
              Reminder scheduling wiring will be added in the next step
            </Text>
          </View>
        </SectionCard>
      </ScrollView>
    </View>
  );
}
