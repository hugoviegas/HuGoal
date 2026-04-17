import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemeStore } from "@/stores/theme.store";
import { typography } from "@/constants/typography";

export default function NutritionOnboardingIntroScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 20,
        justifyContent: "space-between",
      }}
    >
      <View style={{ gap: 16 }}>
        <Text style={[typography.h1, { color: colors.foreground }]}>
          Nutrition Goals
        </Text>
        <Text style={[typography.body, { color: colors.mutedForeground }]}>
          Vamos definir seus Goals com base em peso, atividade e objetivo. Em
          menos de 2 minutos vamos calcular seu RDI diário.
        </Text>
      </View>

      <View style={{ gap: 10 }}>
        <Pressable
          onPress={() => router.push("/nutrition/onboarding/goals")}
          style={{
            minHeight: 52,
            borderRadius: 12,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={[typography.bodyMedium, { color: colors.primaryForeground }]}
          >
            Start
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          style={{
            minHeight: 52,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.card,
          }}
        >
          <Text style={[typography.bodyMedium, { color: colors.foreground }]}>
            Not now
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
