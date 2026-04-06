import { Tabs } from "expo-router";
import { ModernMobileMenu } from "@/components/ui/modern-mobile-menu";
import { TabSwipeProvider } from "@/components/ui/tab-swipe-context";

export default function TabsLayout() {
  return (
    <TabSwipeProvider>
      <Tabs
        backBehavior="history"
        tabBar={(props) => <ModernMobileMenu {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="dashboard" />
        <Tabs.Screen name="workouts" options={{ href: "/workouts" }} />
        <Tabs.Screen name="nutrition" />
        <Tabs.Screen name="community" />
        <Tabs.Screen name="profile" />
      </Tabs>
    </TabSwipeProvider>
  );
}
