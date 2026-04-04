import { Stack } from 'expo-router';
import { useThemeStore } from '@/stores/theme.store';

export default function SettingsLayout() {
  const colors = useThemeStore((s) => s.colors);
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
