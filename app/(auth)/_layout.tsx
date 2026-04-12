import { ActivityIndicator, View } from "react-native";
import { Redirect, Stack, useSegments } from "expo-router";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";

export default function AuthLayout() {
  const { user, isAuthenticated, profile, isInitializing, isLoading } =
    useAuthStore();
  const colors = useThemeStore((s) => s.colors);
  const segments = useSegments();
  const isOnboardingRoute = segments.includes("onboarding");
  const isVerifyEmailRoute = segments.includes("verify-email");
  const isLogoutFeedbackRoute = segments.includes("logout-feedback");

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

  if (
    !isAuthenticated &&
    (isOnboardingRoute || isVerifyEmailRoute || isLogoutFeedbackRoute)
  ) {
    return <Redirect href="/(auth)/login" />;
  }

  if (isAuthenticated && user && !user.emailVerified && !isVerifyEmailRoute) {
    return <Redirect href="/(auth)/verify-email" />;
  }

  // Verified users should not stay on the verify email screen.
  if (isAuthenticated && user?.emailVerified && isVerifyEmailRoute) {
    if (profile?.onboarding_complete) {
      return <Redirect href="/(tabs)/dashboard" />;
    }
    return <Redirect href="/(auth)/onboarding/gender" />;
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
    return <Redirect href="/(auth)/onboarding/gender" />;
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
