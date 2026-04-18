import "@/global.css";
import "@/lib/i18n";
import { useEffect, useRef, useState } from "react";
import { Appearance, View, Text, ScrollView } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { ToastContainer } from "@/components/ui/Toast";
import { bootstrapApp } from "@/lib/bootstrap";

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);
  const initializeTheme = useThemeStore((s) => s.initialize);
  const syncWithSystem = useThemeStore((s) => s.syncWithSystem);
  const mode = useThemeStore((s) => s.mode);
  const isDark = useThemeStore((s) => s.isDark);
  const colors = useThemeStore((s) => s.colors);
  const { setColorScheme } = useColorScheme();
  const lastAppliedMode = useRef<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  // Register global JS error handler after mount (ErrorUtils is a RN global, not an import)
  useEffect(() => {
    try {
      const EU = (global as any).ErrorUtils;
      if (EU) {
        const prev = EU.getGlobalHandler();
        EU.setGlobalHandler((error: Error, isFatal?: boolean) => {
          console.error("[GlobalErrorHandler] isFatal:", isFatal, "message:", error?.message ?? String(error));
          console.error("[GlobalErrorHandler] stack:", error?.stack);
          prev?.(error, isFatal);
        });
        console.log("[RootLayout] Global error handler registered.");
      }
    } catch (e) {
      console.warn("[RootLayout] Could not register global error handler:", e);
    }
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | void;
    let isMounted = true;

    const start = async () => {
      try {
        console.log("[RootLayout] Starting Firebase import...");
        const { isFirebaseReady, firebaseInitError } =
          await import("@/lib/firebase");

        console.log("[RootLayout] Firebase ready:", isFirebaseReady, "error:", firebaseInitError ?? "none");

        if (!isFirebaseReady) {
          throw new Error(
            firebaseInitError ??
              "Firebase is not ready. Check EXPO_PUBLIC_FIREBASE_* values.",
          );
        }

        console.log("[RootLayout] Calling auth.initialize()...");
        unsubscribe = initialize();
        bootstrapApp(); // background: reads SecureStore API keys
        console.log("[RootLayout] Init complete.");
      } catch (error) {
        if (!isMounted) return;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error("[RootLayout Init Error]", errorMessage);
        setInitError(errorMessage);
      }
    };

    void start();

    return () => {
      isMounted = false;
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [initialize]);

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  useEffect(() => {
    if (lastAppliedMode.current === mode) return;
    lastAppliedMode.current = mode;
    setColorScheme(mode);
  }, [mode, setColorScheme]);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(() => {
      syncWithSystem();
    });
    return () => subscription.remove();
  }, [syncWithSystem]);

  // Show error screen if initialization failed
  if (initError) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#1a1a1a" }}>
        <SafeAreaProvider>
          <View className="flex-1 bg-neutral-900 justify-center items-center px-4">
            <ScrollView
              contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
            >
              <View className="items-center gap-4">
                <Text className="text-white text-2xl font-bold text-center">
                  Initialization Error
                </Text>
                <Text className="text-red-500 text-center text-base leading-6">
                  {initError}
                </Text>
                <Text className="text-neutral-400 text-center text-sm mt-4">
                  Please ensure all EXPO_PUBLIC_FIREBASE_* environment variables
                  are properly configured for EAS builds. Restart the app once
                  variables are set.
                </Text>
              </View>
            </ScrollView>
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

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
            <Stack.Screen name="user" />
          </Stack>
          <ToastContainer />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
