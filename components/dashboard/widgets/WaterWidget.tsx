import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Droplets } from 'lucide-react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { MacroRing } from '@/components/nutrition/MacroRing';
import { useThemeStore } from '@/stores/theme.store';
import { useNutritionStore } from '@/stores/nutrition.store';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { radius } from '@/constants/radius';

const WATER_COLOR = '#3B82F6';
const DAILY_GOAL_L = 2;

interface WaterWidgetProps {
  staggerIndex?: number;
}

export function WaterWidget({ staggerIndex = 0 }: WaterWidgetProps) {
  const colors = useThemeStore((s) => s.colors);
  const { waterMl, addWater } = useNutritionStore();

  const currentL = parseFloat((waterMl / 1000).toFixed(1));

  return (
    <Animated.View
      style={{ flex: 1 }}
      entering={FadeInDown.delay(staggerIndex * 60).duration(350)}
    >
      <GlassCard style={{ flex: 1, backgroundColor: WATER_COLOR + '10' }}>
        <View style={{ flex: 1, alignItems: 'center', gap: spacing.sm }}>
          {/* Label */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Droplets size={14} color={WATER_COLOR} />
            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: typography.label.fontSize,
                fontWeight: '600',
                letterSpacing: 0.5,
                textTransform: 'uppercase',
              }}
            >
              Hidratação
            </Text>
          </View>

          {/* Ring */}
          <MacroRing
            current={currentL}
            target={DAILY_GOAL_L}
            label={`${waterMl}ml`}
            unit="L"
            color={WATER_COLOR}
            size={64}
            strokeWidth={5}
          />

          {/* Quick add buttons */}
          <View style={{ flexDirection: 'row', gap: spacing.xs, width: '100%' }}>
            {[250, 500].map((ml) => (
              <Pressable
                key={ml}
                onPress={() => addWater(ml)}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 6,
                  borderRadius: radius.sm,
                  backgroundColor: pressed ? WATER_COLOR + '30' : WATER_COLOR + '18',
                  alignItems: 'center',
                })}
              >
                <Text
                  style={{
                    color: WATER_COLOR,
                    fontSize: typography.caption.fontSize,
                    fontWeight: '600',
                  }}
                >
                  +{ml}ml
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
}
