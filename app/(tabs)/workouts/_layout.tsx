import { Stack } from "expo-router";
import { useThemeStore } from "@/stores/theme.store";

export default function WorkoutsStackLayout() {
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
      <Stack.Screen name="settings" />
      <Stack.Screen name="library" />
      <Stack.Screen name="create" />
      <Stack.Screen name="history" />
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/edit" />
      <Stack.Screen name="[id]/run" />
      <Stack.Screen name="[id]/summary" />
    </Stack>
  );
}
