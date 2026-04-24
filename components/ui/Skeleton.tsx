import { useEffect, useRef } from "react";
import { Animated, View, StyleSheet, type ViewStyle } from "react-native";
import { useThemeStore } from "@/stores/theme.store";

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  className?: string;
  style?: ViewStyle;
}

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 8,
  className,
  style,
}: SkeletonProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const shimmer = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-1, 2],
  });

  const baseColor = isDark ? "#2a2a2a" : "#e0e0e0";
  const highlightColor = isDark ? "#3a3a3a" : "#f0f0f0";

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: baseColor,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: highlightColor,
            transform: [{ translateX: shimmer }],
          },
        ]}
      />
    </View>
  );
}

interface SkeletonTextProps {
  lines?: number;
  lastLineWidth?: number;
  className?: string;
  style?: ViewStyle;
}

export function SkeletonText({
  lines = 3,
  lastLineWidth = "60%",
  className,
  style,
}: SkeletonTextProps) {
  return (
    <View style={[styles.textContainer, style]}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={14}
          width={i === lines - 1 ? lastLineWidth : "100%"}
          borderRadius={4}
          style={i > 0 ? styles.textLine : undefined}
        />
      ))}
    </View>
  );
}

interface SkeletonCardProps {
  className?: string;
  style?: ViewStyle;
}

export function SkeletonCard({ className, style }: SkeletonCardProps) {
  return (
    <View style={[styles.card, style]}>
      <Skeleton width={60} height={60} borderRadius={30} />
      <View style={styles.cardContent}>
        <Skeleton width="70%" height={16} borderRadius={4} />
        <Skeleton width="50%" height={14} borderRadius={4} style={styles.cardLine} />
      </View>
    </View>
  );
}

interface SkeletonListProps {
  count?: number;
  className?: string;
  style?: ViewStyle;
}

export function SkeletonList({ count = 5, className, style }: SkeletonListProps) {
  return (
    <View style={className}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} style={styles.listItem} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  textContainer: {
    gap: 8,
  },
  textLine: {
    marginTop: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  cardContent: {
    flex: 1,
    gap: 8,
  },
  cardLine: {
    marginTop: 4,
  },
  listItem: {
    marginBottom: 8,
  },
});