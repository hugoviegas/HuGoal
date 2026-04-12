import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { useThemeStore } from "@/stores/theme.store";
import { useRootRoute } from "@/hooks/useRootRoute";

/**
 * Root entry point — reads auth state and redirects to the correct group.
 * Shows a spinner while auth is still initializing.
 */
export default function Index() {
  const { route } = useRootRoute();
  const colors = useThemeStore((s) => s.colors);

  if (route === "loading") {
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

  if (route === "welcome") return <Redirect href="/(auth)/login" />;
  if (route === "verify_email") return <Redirect href="/(auth)/verify-email" />;
  if (route === "onboarding") return <Redirect href="/(auth)/onboarding" />;
  if (route === "error") return <Redirect href="/(auth)/login" />;

  return <Redirect href="/(tabs)/dashboard" />;
}
