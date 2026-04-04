import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';

export default function AuthLayout() {
  const { isAuthenticated, profile } = useAuthStore();
  const colors = useThemeStore((s) => s.colors);

  // Already fully onboarded → go to tabs
  if (isAuthenticated && profile?.onboarding_complete) {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
