import { ActivityIndicator, View } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { ModernMobileMenu } from "@/components/ui/modern-mobile-menu";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";

export default function TabsLayout() {
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
