import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";

const INIT_TIMEOUT_MS = 10000;

export default function Index() {
  const colors = useThemeStore((s) => s.colors);
  const { isAuthenticated, isInitializing, isLoading, forceReady } =
    useAuthStore();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      forceReady();
    }, INIT_TIMEOUT_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  if (isInitializing || isLoading) {
    console.log("[index] Waiting — isInitializing:", isInitializing, "isLoading:", isLoading);
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
    console.log("[index] Not authenticated — redirecting to /(auth)/auth");
    return <Redirect href="/(auth)/auth" />;
  }

  console.log("[index] Authenticated — redirecting to /(tabs)/home");
  return <Redirect href="/(tabs)/home" />;
}
