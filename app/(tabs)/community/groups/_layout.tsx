import { Stack } from "expo-router";

export default function GroupsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create" options={{ presentation: "modal" }} />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="edit/[id]" options={{ presentation: "modal" }} />
      <Stack.Screen name="check-in/[groupId]" options={{ presentation: "modal" }} />
    </Stack>
  );
}
