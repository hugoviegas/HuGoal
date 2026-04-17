import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { typography } from "@/constants/typography";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import { useNutritionOnboardingStore } from "@/stores/nutrition-onboarding.store";
import type { NutritionActivityLevel } from "@/types";

const ACTIVITY_OPTIONS: Array<{
  value: NutritionActivityLevel;
  title: string;
  description: string;
}> = [
  {
    value: "low",
    title: "Low",
    description: "Little or no exercise",
  },
  {
    value: "moderate",
    title: "Moderate",
    description: "Training 2-3x per week",
  },
  {
    value: "high",
    title: "High",
    description: "Training 4-5x per week",
  },
  {
    value: "very_high",
    title: "Very high",
    description: "Athlete or very active routine",
  },
];

export default function NutritionOnboardingActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const showToast = useToastStore((s) => s.show);

  const activityLevel = useNutritionOnboardingStore((s) => s.activity_level);
  const setField = useNutritionOnboardingStore((s) => s.setField);

  const handleNext = () => {
    if (!activityLevel) {
      showToast("Choose your activity level", "error");
      return;
    }

    router.push("/nutrition/onboarding/result");
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
          Activity Level
        </Text>
        <Text style={[typography.body, { color: colors.mutedForeground }]}>
          Pick the option that best matches your routine.
        </Text>

        <View style={{ gap: 10 }}>
          {ACTIVITY_OPTIONS.map((option) => {
            const selected = activityLevel === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setField("activity_level", option.value)}
                style={{
                  borderWidth: 1,
                  borderColor: selected ? colors.primary : colors.cardBorder,
                  borderRadius: 12,
                  backgroundColor: selected
                    ? `${colors.primary}22`
                    : colors.card,
                  padding: 12,
                  gap: 4,
                }}
              >
                <Text
                  style={[typography.bodyMedium, { color: colors.foreground }]}
                >
                  {option.title}
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
            Calculate
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
