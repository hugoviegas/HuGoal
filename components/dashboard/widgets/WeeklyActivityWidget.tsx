import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { GlassCard } from '@/components/ui/GlassCard';
import { useThemeStore } from '@/stores/theme.store';
import { useAuthStore } from '@/stores/auth.store';
import { useWeeklyActivity } from '@/hooks/useWeeklyActivity';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { radius } from '@/constants/radius';

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface WeeklyActivityWidgetProps {
  staggerIndex?: number;
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export function WeeklyActivityWidget({ staggerIndex = 0 }: WeeklyActivityWidgetProps) {
  const colors = useThemeStore((s) => s.colors);
  const user = useAuthStore((s) => s.user);
  const { activeDays, isLoading } = useWeeklyActivity(user?.uid ?? '');

  const days = getLast7Days();
  const todayStr = new Date().toISOString().slice(0, 10);

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
            Atividade semanal
          </Text>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
            }}
          >
            {days.map((dateStr) => {
              const isActive = activeDays.has(dateStr);
              const isToday = dateStr === todayStr;
              const dayIndex = new Date(dateStr + 'T12:00:00').getDay();

              return (
                <View
                  key={dateStr}
                  style={{ alignItems: 'center', gap: spacing.xxs }}
                >
                  <View
                    style={{
                      width: isToday ? 14 : 12,
                      height: isToday ? 14 : 12,
                      borderRadius: radius.full,
                      backgroundColor: isActive ? colors.primary : colors.surface,
                      borderWidth: isToday ? 2 : 0,
                      borderColor: isToday ? colors.primary : 'transparent',
                      ...(isActive && !isToday
                        ? {
                            shadowColor: colors.primary,
                            shadowOpacity: 0.5,
                            shadowRadius: 4,
                            shadowOffset: { width: 0, height: 0 },
                            elevation: 2,
                          }
                        : {}),
                    }}
                  />
                  <Text
                    style={{
                      color: isToday ? colors.primary : colors.mutedForeground,
                      fontSize: 10,
                      fontWeight: isToday ? '700' : '400',
                    }}
                  >
                    {DAY_LABELS[dayIndex]}
                  </Text>
                </View>
              );
            })}
          </View>

          {!isLoading && (
            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: typography.caption.fontSize,
                marginTop: 2,
              }}
            >
              {activeDays.size} de 7 dias com treino
            </Text>
          )}
        </View>
      </GlassCard>
    </Animated.View>
  );
}
