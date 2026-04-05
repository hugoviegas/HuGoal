import "@/global.css";
import "@/lib/i18n";
import { useEffect } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { ToastContainer } from "@/components/ui/Toast";
import { bootstrapApp } from "@/lib/bootstrap";

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);
  const isDark = useThemeStore((s) => s.isDark);
  const colors = useThemeStore((s) => s.colors);

  useEffect(() => {
    const unsubscribe = initialize();
    bootstrapApp(); // background: reads SecureStore API keys
    return unsubscribe;
  }, [initialize]);

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <SafeAreaProvider>
        <StatusBar style={isDark ? "light" : "dark"} />
        <View className={isDark ? "dark flex-1" : "flex-1"} style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: "slide_from_right",
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
            <Stack.Screen name="settings" />
          </Stack>
          <ToastContainer />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
