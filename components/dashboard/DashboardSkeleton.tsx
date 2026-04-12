import React, { useEffect } from "react";
import { ScrollView, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { useThemeStore } from "@/stores/theme.store";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";
import { duration } from "@/constants/animation";

function Shimmer({
  width,
  height,
  borderRadius = radius.md,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
}) {
  const colors = useThemeStore((s) => s.colors);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.25, 0.6]),
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.surface,
        } as any,
        animStyle,
      ]}
    />
  );
}

export function DashboardSkeleton() {
  const colors = useThemeStore((s) => s.colors);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        flexGrow: 1,
        backgroundColor: colors.background,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.xl,
        gap: spacing.sm,
      }}
    >
      {/* Header skeleton */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          paddingVertical: spacing.lg,
        }}
      >
        <Shimmer width={64} height={64} borderRadius={32} />
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Shimmer width="40%" height={12} />
          <Shimmer width="55%" height={20} />
          <Shimmer width="70%" height={10} />
        </View>
      </View>

      {/* Full card skeleton */}
      <Shimmer width="100%" height={120} borderRadius={radius.lg} />

      {/* Compact pair skeleton */}
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Shimmer width="100%" height={120} borderRadius={radius.lg} />
        </View>
        <View style={{ flex: 1 }}>
          <Shimmer width="100%" height={120} borderRadius={radius.lg} />
        </View>
      </View>

      {/* Another full card skeleton */}
      <Shimmer width="100%" height={140} borderRadius={radius.lg} />

      {/* Another compact pair */}
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Shimmer width="100%" height={110} borderRadius={radius.lg} />
        </View>
        <View style={{ flex: 1 }}>
          <Shimmer width="100%" height={110} borderRadius={radius.lg} />
        </View>
      </View>
    </ScrollView>
  );
}
