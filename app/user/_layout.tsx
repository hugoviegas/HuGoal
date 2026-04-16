import { View } from "react-native";
import { Spinner } from "@/components/ui/Spinner";
import { Redirect, Stack } from "expo-router";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";

export default function UserLayout() {
  const { isAuthenticated, isInitializing, isLoading } = useAuthStore();
  const colors = useThemeStore((s) => s.colors);

  if (isInitializing || isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        {/* SHARED LOADING — use <Spinner size="lg" /> for full-screen loading states */}
        <Spinner size="lg" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
