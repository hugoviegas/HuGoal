import { Tabs } from "expo-router";
import { ModernMobileMenu } from "@/components/ui/modern-mobile-menu";

export default function TabsLayout() {
  return (
    <Tabs
      backBehavior="history"
      detachInactiveScreens={false}
      tabBar={(props) => <ModernMobileMenu {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
        freezeOnBlur: true,
      }}
    >
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="workouts" options={{ href: "/workouts" }} />
      <Tabs.Screen name="nutrition" />
      <Tabs.Screen name="community" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
