import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '@/stores/theme.store';
import { Button } from '@/components/ui/Button';

export default function OnboardingStep3() {
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
              backgroundColor: n <= 3 ? colors.primary : colors.secondary,
            }}
          />
        ))}
      </View>

      {/* Content */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 48, marginBottom: 24 }}>💪</Text>
        <Text
          style={{
            fontSize: 28,
            fontWeight: '800',
            color: colors.foreground,
            textAlign: 'center',
            marginBottom: 12,
          }}
        >
          Experience & Equipment
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: colors.mutedForeground,
            textAlign: 'center',
            lineHeight: 24,
          }}
        >
          How experienced are you and what equipment do you have access to?
        </Text>
        <Text
          style={{
            marginTop: 16,
            fontSize: 13,
            color: colors.muted,
            textAlign: 'center',
          }}
        >
          Step 3 of 4 — Experience coming in Phase 2
        </Text>
      </View>

      {/* Actions */}
      <View style={{ gap: 12 }}>
        <Button
          variant="primary"
          size="lg"
          onPress={() => router.push('/(auth)/onboarding/step-4')}
        >
          Next
        </Button>
        <Button
          variant="ghost"
          size="lg"
          onPress={() => router.back()}
        >
          Back
        </Button>
      </View>
    </View>
  );
}
