import { ActivityIndicator, View } from "react-native";
import { Redirect, Stack, useSegments } from "expo-router";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";

export default function AuthLayout() {
  const { isAuthenticated, profile, isInitializing, isLoading } =
    useAuthStore();
  const colors = useThemeStore((s) => s.colors);
  const segments = useSegments();
  const isOnboardingRoute = segments.includes("onboarding");

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
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Already fully onboarded → go to tabs
  if (isAuthenticated && profile?.onboarding_complete) {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  // Authenticated but onboarding not complete → continue onboarding flow.
  if (
    isAuthenticated &&
    profile &&
    !profile.onboarding_complete &&
    !isOnboardingRoute
  ) {
    return <Redirect href="/(auth)/onboarding/personal" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: "slide_from_right",
      }}
    />
  );
}
