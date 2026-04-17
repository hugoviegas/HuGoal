import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { typography } from "@/constants/typography";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import { useNutritionOnboardingStore } from "@/stores/nutrition-onboarding.store";

function parseDecimal(input: string): number | null {
  const parsed = Number(input.replace(",", "."));
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

export default function NutritionOnboardingGoalWeightScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const profile = useAuthStore((s) => s.profile);
  const showToast = useToastStore((s) => s.show);

  const setField = useNutritionOnboardingStore((s) => s.setField);
  const setFromProfile = useNutritionOnboardingStore((s) => s.setFromProfile);
  const currentWeight = useNutritionOnboardingStore((s) => s.current_weight_kg);
  const goalWeight = useNutritionOnboardingStore((s) => s.goal_weight_kg);
  const heightCm = useNutritionOnboardingStore((s) => s.height_cm);

  const [goalWeightInput, setGoalWeightInput] = useState(
    goalWeight ? String(goalWeight) : "",
  );

  useEffect(() => {
    setFromProfile({
      height_cm: profile?.height_cm,
      current_weight_kg: profile?.weight_kg,
    });
  }, [profile?.height_cm, profile?.weight_kg, setFromProfile]);

  useEffect(() => {
    if (typeof goalWeight === "number") {
      setGoalWeightInput(String(goalWeight));
    }
  }, [goalWeight]);

  const bmiNow = useMemo(() => {
    if (!heightCm || !currentWeight) {
      return null;
    }

    const meters = heightCm / 100;
    if (meters <= 0) {
      return null;
    }

    return currentWeight / (meters * meters);
  }, [heightCm, currentWeight]);

  const handleNext = () => {
    const value = parseDecimal(goalWeightInput);
    if (typeof value !== "number" || value < 30 || value > 300) {
      showToast("Set a valid goal weight", "error");
      return;
    }

    setField("goal_weight_kg", Math.round(value * 10) / 10);
    router.push("/nutrition/onboarding/activity");
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
          Goal Weight
        </Text>

        <View
          style={{
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: 12,
            backgroundColor: colors.card,
            padding: 12,
            gap: 6,
          }}
        >
          <Text style={[typography.smallMedium, { color: colors.foreground }]}>
            Current profile
          </Text>
          <Text style={[typography.small, { color: colors.mutedForeground }]}>
            Height: {heightCm ? `${heightCm} cm` : "missing"}
          </Text>
          <Text style={[typography.small, { color: colors.mutedForeground }]}>
            Current weight: {currentWeight ? `${currentWeight} kg` : "missing"}
          </Text>
          {typeof bmiNow === "number" ? (
            <Text style={[typography.small, { color: colors.mutedForeground }]}>
              Current BMI: {bmiNow.toFixed(1)}
            </Text>
          ) : null}
        </View>

        <View style={{ gap: 8 }}>
          <Text style={[typography.smallMedium, { color: colors.foreground }]}>
            Target weight (kg)
          </Text>
          <TextInput
            keyboardType="decimal-pad"
            value={goalWeightInput}
            onChangeText={(value) => {
              setGoalWeightInput(value);
              const parsed = parseDecimal(value);
              if (typeof parsed === "number") {
                setField("goal_weight_kg", Math.round(parsed * 10) / 10);
              }
            }}
            placeholder="Ex: 72.5"
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
