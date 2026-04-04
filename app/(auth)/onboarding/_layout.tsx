import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useThemeStore } from '@/stores/theme.store';

export default function OnboardingLayout() {
  const colors = useThemeStore((s) => s.colors);

  // Disable Android back button during onboarding
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
        gestureEnabled: false,
      }}
    />
  );
}
