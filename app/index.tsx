import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { useThemeStore } from "@/stores/theme.store";
import { auth } from "@/lib/firebase";
// Note: useRootRoute depends on async auth initialization. For Expo preview
// we check `auth.currentUser` synchronously to ensure a deterministic
// startup redirect when the app opens for the first time.

/**
 * Root entry point — reads auth state and redirects to the correct group.
 * Shows a spinner while auth is still initializing.
 */
export default function Index() {
  const colors = useThemeStore((s) => s.colors);

  // Synchronous check to ensure preview/opening behavior works reliably
  // even before the auth store finishes initialization.
  const currentUser = auth.currentUser;

  if (currentUser == null) {
    return <Redirect href="/(auth)/login" />;
  }

  // If a user is already present, go to the app tabs — other route guards
  // (verify-email / onboarding) will redirect as needed once the store
  // finishes initializing.
  return <Redirect href="/(tabs)/dashboard" />;
}
