import React from "react";
import { Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { GripVertical, X } from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";
import { duration } from "@/constants/animation";
import type { WidgetConfig } from "@/types/dashboard";

interface WidgetCellProps {
  children: React.ReactNode;
  widget: WidgetConfig;
  isEditMode: boolean;
  canDrag: boolean;
  isActive: boolean;
  drag: () => void;
  onRemove: (widgetId: string) => void;
  style?: object;
}

export function WidgetCell({
  children,
  widget,
  isEditMode,
  canDrag,
  isActive,
  drag,
  onRemove,
  style,
}: WidgetCellProps) {
  const colors = useThemeStore((s) => s.colors);

  const scaleValue = useSharedValue(1);
  scaleValue.value = withTiming(isActive ? 1.03 : 1, {
    duration: duration.fast,
  });

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
    zIndex: isActive ? 100 : 0,
  }));

  return (
    <Animated.View style={[animatedContainerStyle, style]}>
      {children}

      {/* Edit mode overlay */}
      {isEditMode && (
        <Animated.View
          entering={FadeIn.duration(duration.normal)}
          exiting={FadeOut.duration(duration.normal)}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: radius.lg,
            overflow: "hidden",
          }}
          pointerEvents="box-none"
        >
          {/* Remove button — top left */}
          <Pressable
            onPress={() => onRemove(widget.id)}
            style={({ pressed }) => ({
              position: "absolute",
              top: spacing.xs,
              left: spacing.xs,
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: pressed
                ? colors.destructive
                : colors.destructive + "EE",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
            })}
          >
            <X size={14} color="#fff" />
          </Pressable>

          {/* Drag handle — top right */}
          {canDrag && (
            <Pressable
              onLongPress={drag}
              delayLongPress={150}
              style={({ pressed }) => ({
                position: "absolute",
                top: spacing.xs,
                right: spacing.xs,
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: pressed
                  ? colors.foreground + "20"
                  : colors.foreground + "10",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
              })}
            >
              <GripVertical size={14} color={colors.mutedForeground} />
            </Pressable>
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
}
