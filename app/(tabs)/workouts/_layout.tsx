import { Stack } from "expo-router";

export default function WorkoutsStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="library" />
      <Stack.Screen name="create" />
      <Stack.Screen name="explore" />
      <Stack.Screen name="history" />
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/edit" />
      <Stack.Screen name="[id]/run" />
      <Stack.Screen name="[id]/summary" />
    </Stack>
  );
}
