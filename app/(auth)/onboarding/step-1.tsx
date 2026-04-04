import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '@/stores/theme.store';
import { Button } from '@/components/ui/Button';

export default function OnboardingStep1() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);

  return (
    <View
      style={{
        flex: 1,
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: 24,
        backgroundColor: colors.background,
      }}
    >
      {/* Progress */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 40 }}>
        {[1, 2, 3, 4].map((n) => (
          <View
            key={n}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: n === 1 ? colors.primary : colors.secondary,
            }}
          />
        ))}
      </View>

      {/* Content */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 48, marginBottom: 24 }}>👤</Text>
        <Text
          style={{
            fontSize: 28,
            fontWeight: '800',
            color: colors.foreground,
            textAlign: 'center',
            marginBottom: 12,
          }}
        >
          About You
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: colors.mutedForeground,
            textAlign: 'center',
            lineHeight: 24,
          }}
        >
          Tell us a bit about yourself so we can personalise your experience.
        </Text>
        <Text
          style={{
            marginTop: 16,
            fontSize: 13,
            color: colors.muted,
            textAlign: 'center',
          }}
        >
          Step 1 of 4 — Personal info coming in Phase 2
        </Text>
      </View>

      {/* Actions */}
      <Button
        variant="primary"
        size="lg"
        onPress={() => router.push('/(auth)/onboarding/step-2')}
      >
        Next
      </Button>
    </View>
  );
}
