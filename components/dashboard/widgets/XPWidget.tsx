import React from "react";
import { View, Text } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Zap } from "lucide-react-native";
import { GlassCard } from "@/components/ui/GlassCard";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { radius } from "@/constants/radius";
import { withOpacity } from "@/lib/color";

const XP_PER_LEVEL = 500;

interface XPWidgetProps {
  staggerIndex?: number;
}

export function XPWidget({ staggerIndex = 0 }: XPWidgetProps) {
  const colors = useThemeStore((s) => s.colors);
  const profile = useAuthStore((s) => s.profile);

  const xp = profile?.xp ?? 0;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const progressToNext = (xp % XP_PER_LEVEL) / XP_PER_LEVEL;

  return (
    <Animated.View entering={FadeInDown.delay(staggerIndex * 60).duration(350)}>
      <GlassCard
        style={{
          minHeight: 162,
          backgroundColor: withOpacity(colors.accent, 0.08),
        }}
      >
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            gap: spacing.xs,
          }}
        >
          <Zap size={26} color={colors.accent} />
          <Text
            style={{
              color: colors.foreground,
              fontSize: typography.display.fontSize,
              fontWeight: "800",
              lineHeight: 40,
            }}
          >
            {xp.toLocaleString()}
          </Text>
          <View
            style={{
              paddingHorizontal: spacing.sm,
              paddingVertical: 3,
              borderRadius: radius.full,
              backgroundColor: withOpacity(colors.accent, 0.14),
            }}
          >
            <Text
              style={{
                color: colors.accent,
                fontSize: typography.label.fontSize,
                fontWeight: "700",
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              Nível {level}
            </Text>
          </View>

          {/* Progress to next level */}
          <View
            style={{
              width: "100%",
              marginTop: spacing.xs,
              height: 4,
              borderRadius: radius.full,
              backgroundColor: colors.surface,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${Math.round(progressToNext * 100)}%`,
                borderRadius: radius.full,
                backgroundColor: colors.accent,
              }}
            />
          </View>
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 10,
              fontWeight: "500",
            }}
          >
            {XP_PER_LEVEL - (xp % XP_PER_LEVEL)} XP p/ nível {level + 1}
          </Text>
        </View>
      </GlassCard>
    </Animated.View>
  );
}
