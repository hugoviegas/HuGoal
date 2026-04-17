import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { typography } from "@/constants/typography";
import {
  calculateMacroTargetsFromRdi,
  calculateRDI,
} from "@/lib/nutrition/rdi";
import { useNutritionGoal } from "@/hooks/useNutritionGoal";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import { useNutritionOnboardingStore } from "@/stores/nutrition-onboarding.store";

export default function NutritionOnboardingResultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const showToast = useToastStore((s) => s.show);

  const [saving, setSaving] = useState(false);

  const getPayload = useNutritionOnboardingStore((s) => s.getPayload);
  const reset = useNutritionOnboardingStore((s) => s.reset);
  const { save } = useNutritionGoal();

  const payload = getPayload();
  const result = useMemo(() => {
    if (!payload) {
      return null;
    }

    return calculateRDI(payload);
  }, [payload]);

  const macros = useMemo(() => {
    if (!result) {
      return null;
    }

    return calculateMacroTargetsFromRdi(result.rdi_kcal, result.macro_split);
  }, [result]);

  const handleSave = async () => {
    if (!payload) {
      showToast("Missing onboarding fields", "error");
      return;
    }

    try {
      setSaving(true);
      await save(payload);
      reset();
      showToast("Nutrition settings updated", "success");
      router.replace("/(tabs)/nutrition/settings");
    } catch {
      showToast("Failed to save nutrition settings", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 16,
          gap: 14,
        }}
      >
        <Text style={[typography.h2, { color: colors.foreground }]}>
          Your Daily Target
        </Text>

        {!payload || !result ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.cardBorder,
              backgroundColor: colors.card,
              borderRadius: 12,
              padding: 12,
            }}
          >
            <Text style={[typography.body, { color: colors.mutedForeground }]}>
              Incomplete onboarding data. Please go back and complete the
              previous steps.
            </Text>
          </View>
        ) : (
          <>
            <View
              style={{
                borderWidth: 1,
                borderColor: colors.cardBorder,
                backgroundColor: colors.card,
                borderRadius: 12,
                padding: 14,
                gap: 8,
              }}
            >
              <Text
                style={[typography.smallMedium, { color: colors.foreground }]}
              >
                Calories
              </Text>
              <Text style={[typography.h1, { color: colors.foreground }]}>
                {result.rdi_kcal} kcal
              </Text>
              <Text
                style={[typography.caption, { color: colors.mutedForeground }]}
              >
                BMR {result.bmr} · TDEE {result.tdee}
              </Text>
            </View>

            <View
              style={{
                borderWidth: 1,
                borderColor: colors.cardBorder,
                backgroundColor: colors.card,
                borderRadius: 12,
                padding: 14,
                gap: 6,
              }}
            >
              <Text
                style={[typography.smallMedium, { color: colors.foreground }]}
              >
                Macro split
              </Text>
              <Text
                style={[typography.body, { color: colors.mutedForeground }]}
              >
                Protein {result.macro_split.protein_pct}% · Carbs{" "}
                {result.macro_split.carbs_pct}% · Fat{" "}
                {result.macro_split.fat_pct}%
              </Text>
              {macros ? (
                <Text style={[typography.body, { color: colors.foreground }]}>
                  ~ {macros.protein_g}g protein · {macros.carbs_g}g carbs ·{" "}
                  {macros.fat_g}g fat
                </Text>
              ) : null}
            </View>
          </>
        )}
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
          onPress={handleSave}
          disabled={saving || !payload || !result}
          style={{
            minHeight: 48,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.primary,
            opacity: saving || !payload || !result ? 0.6 : 1,
          }}
        >
          <Text
            style={[typography.bodyMedium, { color: colors.primaryForeground }]}
          >
            {saving ? "Saving..." : "Confirm & save"}
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
