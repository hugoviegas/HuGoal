import { Stack } from "expo-router";

import { useThemeStore } from "@/stores/theme.store";

export default function NutritionOnboardingLayout() {
  const colors = useThemeStore((s) => s.colors);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="goal-weight" />
      <Stack.Screen name="activity" />
      <Stack.Screen name="result" />
    </Stack>
  );
}
