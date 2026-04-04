import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { useThemeStore } from '@/stores/theme.store';
import { Button } from '@/components/ui/Button';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const colors = useThemeStore((s) => s.colors);

  return (
    <View
      style={{
        flex: 1,
        paddingTop: insets.top + 40,
        paddingBottom: insets.bottom + 24,
        backgroundColor: colors.background,
        paddingHorizontal: 24,
      }}
    >
      {/* Logo + Hero */}
      <Animated.View entering={FadeInUp.delay(150).springify()} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            height: 96,
            width: 96,
            borderRadius: 28,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <Text style={{ fontSize: 36, fontWeight: '800', color: '#fff' }}>BU</Text>
        </View>

        <Text style={{ fontSize: 38, fontWeight: '800', color: colors.foreground, textAlign: 'center' }}>
          {t('auth.welcome_title')}
        </Text>
        <Text style={{ marginTop: 12, fontSize: 17, color: colors.mutedForeground, textAlign: 'center', maxWidth: 280, lineHeight: 24 }}>
          {t('auth.welcome_subtitle')}
        </Text>
      </Animated.View>

      {/* CTA Buttons */}
      <Animated.View entering={FadeInDown.delay(350).springify()} style={{ gap: 12 }}>
        <Button
          variant="primary"
          size="lg"
          onPress={() => router.push('/(auth)/signup')}
          className="w-full"
        >
          {t('auth.signup')}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onPress={() => router.push('/(auth)/login')}
          className="w-full"
        >
          {t('auth.login')}
        </Button>
      </Animated.View>
    </View>
  );
}
