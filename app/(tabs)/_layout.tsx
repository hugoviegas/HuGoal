import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect, Tabs, useSegments } from "expo-router";
import { ModernMobileMenu } from "@/components/ui/modern-mobile-menu";
import { useAuthStore } from "@/stores/auth.store";
import { useChatStore, type ChatContext } from "@/stores/chat.store";
import { useThemeStore } from "@/stores/theme.store";

function resolveContextFromSegments(segments: string[]): ChatContext {
  const active = segments[1]?.toLowerCase() ?? "home";

  if (active.startsWith("workouts")) return "workouts";
  if (active.startsWith("nutrition")) return "nutrition";
  if (active.startsWith("community")) return "community";
  return "home";
}

export default function TabsLayout() {
  const { isAuthenticated, isInitializing, isLoading } = useAuthStore();
  const colors = useThemeStore((s) => s.colors);
  const segments = useSegments();
  const setContext = useChatStore((state) => state.setContext);

  useEffect(() => {
    setContext(resolveContextFromSegments(segments));
  }, [segments, setContext]);

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

  return (
    <Tabs
      backBehavior="history"
      detachInactiveScreens={false}
      tabBar={(props) => <ModernMobileMenu {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
        freezeOnBlur: true,
        animation: "fade",
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="workouts" options={{ href: "/workouts" }} />
      <Tabs.Screen name="nutrition" />
      <Tabs.Screen name="community" />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
