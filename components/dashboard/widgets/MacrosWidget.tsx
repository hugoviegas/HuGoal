import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { GlassCard } from '@/components/ui/GlassCard';
import { MacroSummary } from '@/components/nutrition/MacroSummary';
import { useThemeStore } from '@/stores/theme.store';
import { useNutritionStore } from '@/stores/nutrition.store';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

interface MacrosWidgetProps {
  staggerIndex?: number;
}

export function MacrosWidget({ staggerIndex = 0 }: MacrosWidgetProps) {
  const colors = useThemeStore((s) => s.colors);
  const { todayTotals, dailyGoal } = useNutritionStore();
  const router = useRouter();

  return (
    <Animated.View entering={FadeInDown.delay(staggerIndex * 60).duration(350)}>
      <GlassCard>
        <View style={{ gap: spacing.sm }}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: typography.label.fontSize,
                fontWeight: '600',
                letterSpacing: 0.5,
                textTransform: 'uppercase',
              }}
            >
              Nutrição de hoje
            </Text>
            <Pressable onPress={() => router.push('/(tabs)/nutrition')}>
              <Text
                style={{
                  color: colors.primary,
                  fontSize: typography.small.fontSize,
                  fontWeight: '500',
                }}
              >
                Ver detalhes
              </Text>
            </Pressable>
          </View>

          <MacroSummary totals={todayTotals} goal={dailyGoal} />
        </View>
      </GlassCard>
    </Animated.View>
  );
}
