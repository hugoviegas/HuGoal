import { Stack } from "expo-router";
import { useThemeStore } from "@/stores/theme.store";

export default function NutritionStackLayout() {
  const colors = useThemeStore((s) => s.colors);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="log" />
      <Stack.Screen name="add-food" />
      <Stack.Screen name="ai-debug" />
      <Stack.Screen name="plan" />
      <Stack.Screen name="history" />
      <Stack.Screen name="library" />
      <Stack.Screen name="pantry" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
