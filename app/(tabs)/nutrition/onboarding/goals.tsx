import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import { useNutritionOnboardingStore } from "@/stores/nutrition-onboarding.store";
import { typography } from "@/constants/typography";
import type { NutritionRdiGoal, NutritionRdiSex } from "@/types";

const GOAL_OPTIONS: Array<{
  value: NutritionRdiGoal;
  label: string;
  description: string;
}> = [
  {
    value: "lose",
    label: "Lose weight",
    description: "Create a safe calorie deficit",
  },
  { value: "maintain", label: "Maintain", description: "Keep current weight" },
  {
    value: "gain",
    label: "Gain weight",
    description: "Create a controlled surplus",
  },
];

const SEX_OPTIONS: Array<{ value: NutritionRdiSex; label: string }> = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

function toNumberInput(value: string): number | null {
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

export default function NutritionOnboardingGoalsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const colors = useThemeStore((s) => s.colors);
  const profile = useAuthStore((s) => s.profile);
  const showToast = useToastStore((s) => s.show);

  const setField = useNutritionOnboardingStore((s) => s.setField);
  const setFromProfile = useNutritionOnboardingStore((s) => s.setFromProfile);
  const goal = useNutritionOnboardingStore((s) => s.goal);
  const sex = useNutritionOnboardingStore((s) => s.sex);
  const age = useNutritionOnboardingStore((s) => s.age);

  const [ageInput, setAgeInput] = useState(age ? String(age) : "");

  useEffect(() => {
    setFromProfile({
      age: profile?.age,
      height_cm: profile?.height_cm,
      current_weight_kg: profile?.weight_kg,
      sex:
        profile?.sex === "female"
          ? "female"
          : profile?.sex === "male"
            ? "male"
            : undefined,
    });
  }, [
    profile?.age,
    profile?.height_cm,
    profile?.weight_kg,
    profile?.sex,
    setFromProfile,
  ]);

  useEffect(() => {
    if (typeof age === "number") {
      setAgeInput(String(age));
    }
  }, [age]);

  const handleNext = () => {
    const ageValue = toNumberInput(ageInput);
    if (
      !goal ||
      !sex ||
      typeof ageValue !== "number" ||
      ageValue < 10 ||
      ageValue > 120
    ) {
      showToast("Set your goal, sex, and a valid age", "error");
      return;
    }

    setField("age", Math.round(ageValue));
    router.push("/nutrition/onboarding/goal-weight");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 16,
          gap: 16,
        }}
      >
        <Text style={[typography.h2, { color: colors.foreground }]}>
          Goal Setup
        </Text>

        <View style={{ gap: 10 }}>
          <Text style={[typography.smallMedium, { color: colors.foreground }]}>
            Main goal
          </Text>
          {GOAL_OPTIONS.map((option) => {
            const selected = goal === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setField("goal", option.value)}
                style={{
                  borderWidth: 1,
                  borderColor: selected ? colors.primary : colors.cardBorder,
                  backgroundColor: selected
                    ? `${colors.primary}22`
                    : colors.card,
                  borderRadius: 12,
                  padding: 12,
                  gap: 2,
                }}
              >
                <Text
                  style={[typography.bodyMedium, { color: colors.foreground }]}
                >
                  {option.label}
                </Text>
                <Text
                  style={[
                    typography.caption,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {option.description}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ gap: 10 }}>
          <Text style={[typography.smallMedium, { color: colors.foreground }]}>
            Biological sex
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {SEX_OPTIONS.map((option) => {
              const selected = sex === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setField("sex", option.value)}
                  style={{
                    flex: 1,
                    minHeight: 48,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: selected ? colors.primary : colors.cardBorder,
                    backgroundColor: selected
                      ? `${colors.primary}22`
                      : colors.card,
                  }}
                >
                  <Text
                    style={[
                      typography.bodyMedium,
                      { color: colors.foreground },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={[typography.smallMedium, { color: colors.foreground }]}>
            Age
          </Text>
          <TextInput
            keyboardType="number-pad"
            value={ageInput}
            onChangeText={(value) => {
              setAgeInput(value);
              const parsed = toNumberInput(value);
              if (typeof parsed === "number") {
                setField("age", Math.round(parsed));
              }
            }}
            placeholder="Ex: 28"
            placeholderTextColor={colors.muted}
            style={{
              minHeight: 48,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              backgroundColor: colors.card,
              color: colors.foreground,
              paddingHorizontal: 12,
            }}
          />
        </View>
      </ScrollView>

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.cardBorder,
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: insets.bottom + 10,
          gap: 10,
        }}
      >
        <Pressable
          onPress={handleNext}
          style={{
            minHeight: 48,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.primary,
          }}
        >
          <Text
            style={[typography.bodyMedium, { color: colors.primaryForeground }]}
          >
            Continue
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.back()}
          style={{
            minHeight: 44,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: colors.cardBorder,
            backgroundColor: colors.card,
          }}
        >
          <Text style={[typography.smallMedium, { color: colors.foreground }]}>
            Back
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
