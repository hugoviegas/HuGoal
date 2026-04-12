import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Dumbbell, Utensils, Users } from 'lucide-react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { useThemeStore } from '@/stores/theme.store';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { radius } from '@/constants/radius';

interface QuickActionsWidgetProps {
  staggerIndex?: number;
}

export function QuickActionsWidget({ staggerIndex = 0 }: QuickActionsWidgetProps) {
  const colors = useThemeStore((s) => s.colors);
  const router = useRouter();

  const actions = [
    { icon: Dumbbell, label: 'Treino', route: '/(tabs)/workouts', color: colors.primary },
    { icon: Utensils, label: 'Refeição', route: '/(tabs)/nutrition', color: '#22C55E' },
    { icon: Users, label: 'Comunidade', route: '/(tabs)/community', color: '#A78BFA' },
  ] as const;

  return (
    <Animated.View entering={FadeInDown.delay(staggerIndex * 60).duration(350)}>
      <GlassCard>
        <View style={{ gap: spacing.sm }}>
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: typography.label.fontSize,
              fontWeight: '600',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}
          >
            Ações rápidas
          </Text>

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <Pressable
                  key={action.label}
                  onPress={() => router.push(action.route as any)}
                  style={({ pressed }) => ({
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: spacing.xs,
                    paddingVertical: spacing.md,
                    borderRadius: radius.md,
                    backgroundColor: pressed
                      ? action.color + '30'
                      : action.color + '15',
                    borderWidth: 1,
                    borderColor: action.color + '30',
                  })}
                >
                  <Icon size={22} color={action.color} />
                  <Text
                    style={{
                      color: colors.foreground,
                      fontSize: typography.caption.fontSize,
                      fontWeight: '600',
                      textAlign: 'center',
                    }}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
}
