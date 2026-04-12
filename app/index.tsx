import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";

/**
 * Root entry point — reads auth state and redirects to the correct group.
 * Shows a spinner while auth is still initializing.
 */
export default function Index() {
  const colors = useThemeStore((s) => s.colors);
  const { isAuthenticated, isInitializing, isLoading } = useAuthStore();

  // On native, Firebase auth restoration is async. Never redirect to login
  // until the auth store finishes hydration.
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

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  // Remaining flow constraints (verify-email/onboarding) are handled
  // by route-group guards.
  return <Redirect href="/(tabs)/dashboard" />;
}
