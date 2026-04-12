import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Users, CheckCircle2 } from 'lucide-react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { useThemeStore } from '@/stores/theme.store';
import { useCommunityStore } from '@/stores/community.store';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { radius } from '@/constants/radius';

interface CommunityWidgetProps {
  staggerIndex?: number;
}

export function CommunityWidget({ staggerIndex = 0 }: CommunityWidgetProps) {
  const colors = useThemeStore((s) => s.colors);
  const router = useRouter();
  const groups = useCommunityStore((s) => s.groups);
  const todayCheckIn = useCommunityStore((s) => s.todayCheckIn);

  const topGroups = groups.filter((g) => g.status === 'active').slice(0, 2);

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
              Meus grupos
            </Text>
            <Pressable onPress={() => router.push('/(tabs)/community')}>
              <Text
                style={{
                  color: colors.primary,
                  fontSize: typography.small.fontSize,
                  fontWeight: '500',
                }}
              >
                Ver todos
              </Text>
            </Pressable>
          </View>

          {topGroups.length === 0 ? (
            /* Empty state */
            <View
              style={{
                alignItems: 'center',
                paddingVertical: spacing.lg,
                gap: spacing.sm,
              }}
            >
              <Users size={32} color={colors.mutedForeground} />
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: typography.small.fontSize,
                  textAlign: 'center',
                }}
              >
                Ainda não fazes parte de nenhum grupo
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/community')}
                style={({ pressed }) => ({
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs,
                  borderRadius: radius.full,
                  backgroundColor: pressed ? colors.primary + 'CC' : colors.primary,
                })}
              >
                <Text
                  style={{
                    color: '#fff',
                    fontSize: typography.small.fontSize,
                    fontWeight: '600',
                  }}
                >
                  Entrar num grupo
                </Text>
              </Pressable>
            </View>
          ) : (
            /* Group rows */
            topGroups.map((group) => {
              const hasCheckedIn = !!todayCheckIn[group.id];
              return (
                <Pressable
                  key={group.id}
                  onPress={() => router.push('/(tabs)/community')}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    padding: spacing.sm,
                    borderRadius: radius.md,
                    backgroundColor: pressed ? colors.surface : colors.card + '80',
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                  })}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: radius.md,
                      backgroundColor: colors.primary + '20',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Users size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.foreground,
                        fontSize: typography.bodyMedium.fontSize,
                        fontWeight: '600',
                      }}
                      numberOfLines={1}
                    >
                      {group.name}
                    </Text>
                    <Text
                      style={{
                        color: colors.mutedForeground,
                        fontSize: typography.caption.fontSize,
                      }}
                    >
                      {group.member_count} membros
                    </Text>
                  </View>

                  {hasCheckedIn ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: 4,
                        borderRadius: radius.full,
                        backgroundColor: '#22C55E20',
                      }}
                    >
                      <CheckCircle2 size={12} color="#22C55E" />
                      <Text
                        style={{
                          color: '#22C55E',
                          fontSize: 11,
                          fontWeight: '600',
                        }}
                      >
                        Feito
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={{
                        paddingHorizontal: spacing.sm,
                        paddingVertical: 4,
                        borderRadius: radius.full,
                        backgroundColor: colors.primary + '20',
                      }}
                    >
                      <Text
                        style={{
                          color: colors.primary,
                          fontSize: 11,
                          fontWeight: '600',
                        }}
                      >
                        Check-in
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })
          )}
        </View>
      </GlassCard>
    </Animated.View>
  );
}
