import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { useThemeStore } from "@/stores/theme.store";

interface MorphingSpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: string;
}

/**
 * MorphingSpinner - Animated loading indicator with morphing shapes
 *
 * @example
 * <MorphingSpinner size="lg" />
 * <MorphingSpinner size="md" color="#0ea5b0" />
 */
export function Spinner({ size = "md", color }: MorphingSpinnerProps) {
  const colors = useThemeStore((s) => s.colors);
  const spinnerColor = color || colors.primary;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const radiusAnim = useRef(new Animated.Value(50)).current;

  const sizeClasses = {
    sm: { width: 24, height: 24 },
    md: { width: 32, height: 32 },
    lg: { width: 48, height: 48 },
  };

  useEffect(() => {
    const morphSequence = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
      ]),
    );

    const morphShapes = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.85,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );

    morphSequence.start();
    morphShapes.start();

    return () => {
      morphSequence.stop();
      morphShapes.stop();
    };
  }, [rotateAnim, scaleAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View
      style={[
        sizeClasses[size],
        {
          transform: [{ rotate: spin }, { scale: scaleAnim }],
          borderRadius: 50,
          backgroundColor: spinnerColor,
        },
      ]}
    >
      <View style={{ flex: 1 }} />
    </Animated.View>
  );
}
