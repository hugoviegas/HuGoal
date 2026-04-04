import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '@/stores/theme.store';
import { useAuthStore } from '@/stores/auth.store';
import { useToastStore } from '@/stores/toast.store';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';

export default function OnboardingStep4() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const setOnboardingCompleted = useAuthStore((s) => s.setOnboardingCompleted);
  const showToast = useToastStore((s) => s.show);
  const [loading, setLoading] = useState(false);

  const handleFinish = async () => {
    setLoading(true);
    try {
      await setOnboardingCompleted(true);
      router.replace('/(tabs)/dashboard');
    } catch {
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

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
              backgroundColor: colors.primary,
            }}
          />
        ))}
      </View>

      {/* Content */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 48, marginBottom: 24 }}>🥗</Text>
        <Text
          style={{
            fontSize: 28,
            fontWeight: '800',
            color: colors.foreground,
            textAlign: 'center',
            marginBottom: 12,
          }}
        >
          Diet & Preferences
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: colors.mutedForeground,
            textAlign: 'center',
            lineHeight: 24,
          }}
        >
          Any allergies or dietary preferences? We'll keep them in mind for your nutrition plan.
        </Text>
        <Text
          style={{
            marginTop: 16,
            fontSize: 13,
            color: colors.muted,
            textAlign: 'center',
          }}
        >
          Step 4 of 4 — Diet details coming in Phase 2
        </Text>
      </View>

      {/* Actions */}
      <View style={{ gap: 12 }}>
        <Button
          variant="primary"
          size="lg"
          isLoading={loading}
          onPress={handleFinish}
        >
          Get Started
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
