import { Stack } from "expo-router";

export default function CommunityLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="discover" />
      <Stack.Screen name="[postId]" />
      <Stack.Screen name="create-post" options={{ presentation: "modal" }} />
      <Stack.Screen name="groups/index" />
      <Stack.Screen name="groups/create" options={{ presentation: "modal" }} />
      <Stack.Screen name="groups/[id]" />
    </Stack>
  );
}
