import "@/global.css";
import "@/lib/i18n";
import { useEffect, useState, type ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { ToastContainer } from "@/components/ui/Toast";
import { bootstrapApp } from "@/lib/bootstrap";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

function RootLayoutContent() {
  const initialize = useAuthStore((s) => s.initialize);
  const isDark = useThemeStore((s) => s.isDark);
  const colors = useThemeStore((s) => s.colors);

  useEffect(() => {
    const unsubscribe = initialize();
    bootstrapApp();
    return unsubscribe;
  }, [initialize]);

  return (
    <GestureHandlerRootView
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <SafeAreaProvider>
        <StatusBar style={isDark ? "light" : "dark"} />
        <View
          className={isDark ? "dark flex-1" : "flex-1"}
          style={styles.container}
        >
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <RootLayoutContent />
    </ErrorBoundary>
  );
}