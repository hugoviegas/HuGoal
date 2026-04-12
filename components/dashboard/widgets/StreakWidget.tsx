import React from "react";
import { View, Text } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Flame } from "lucide-react-native";
import { GlassCard } from "@/components/ui/GlassCard";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";

interface StreakWidgetProps {
  staggerIndex?: number;
}

export function StreakWidget({ staggerIndex = 0 }: StreakWidgetProps) {
  const colors = useThemeStore((s) => s.colors);
  const profile = useAuthStore((s) => s.profile);

  const streak = profile?.streak_current ?? 0;
  const longest = profile?.streak_longest ?? 0;

  return (
    <Animated.View entering={FadeInDown.delay(staggerIndex * 60).duration(350)}>
      <GlassCard
        style={{ minHeight: 162, backgroundColor: colors.primary + "14" }}
      >
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            gap: spacing.xs,
          }}
        >
          <Flame size={26} color={colors.primary} />
          <Text
            style={{
              color: colors.foreground,
              fontSize: typography.display.fontSize,
              fontWeight: "800",
              lineHeight: 40,
            }}
          >
            {streak}
          </Text>
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: typography.caption.fontSize,
              fontWeight: "500",
              textAlign: "center",
            }}
          >
            dias seguidos
          </Text>
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: typography.caption.fontSize,
            }}
          >
            Melhor: {longest}
          </Text>
        </View>
      </GlassCard>
    </Animated.View>
  );
}
