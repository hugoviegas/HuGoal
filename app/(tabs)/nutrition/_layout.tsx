import { Stack } from "expo-router";

export default function NutritionStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="log" />
      <Stack.Screen name="add-food" />
      <Stack.Screen name="ai-debug" />
      <Stack.Screen name="plan" />
      <Stack.Screen name="history" />
      <Stack.Screen name="library" />
    </Stack>
  );
}
