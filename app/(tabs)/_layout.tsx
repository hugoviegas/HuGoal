import { Tabs } from "expo-router";
import { TabBar } from "@/components/ui/TabBar";

export default function TabsLayout() {
  return (
    <Tabs
      backBehavior="history"
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="workouts" options={{ href: "/workouts" }} />
      <Tabs.Screen name="nutrition" />
      <Tabs.Screen name="community" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
