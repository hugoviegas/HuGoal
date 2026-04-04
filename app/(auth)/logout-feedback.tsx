import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useThemeStore } from '@/stores/theme.store';

export default function LogoutFeedbackScreen() {
  const router = useRouter();
  const colors = useThemeStore((s) => s.colors);

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(auth)/welcome');
    }, 2000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}
    >
      <Text style={{ fontSize: 42, marginBottom: 16 }}>👋</Text>
      <Text style={{ fontSize: 22, fontWeight: '700', color: colors.foreground }}>
        Logged out
      </Text>
      <Text style={{ marginTop: 8, fontSize: 15, color: colors.mutedForeground }}>
        See you soon!
      </Text>
    </View>
  );
}
