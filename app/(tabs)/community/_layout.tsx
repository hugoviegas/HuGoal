import { Stack } from "expo-router";
import { useThemeStore } from "@/stores/theme.store";

export default function CommunityLayout() {
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
      <Stack.Screen name="discover" />
      <Stack.Screen name="[postId]" />
      <Stack.Screen
        name="create-post"
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen name="groups" />
    </Stack>
  );
}
