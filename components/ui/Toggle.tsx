import { useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, View, type PressableProps } from "react-native";
import { useThemeStore } from "@/stores/theme.store";
import { cn } from "@/lib/utils";

type ToggleVariant = "default" | "success" | "warning" | "danger";

interface ToggleProps extends Omit<PressableProps, "children"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  variant?: ToggleVariant;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { track: "w-10 h-6", thumb: "h-5 w-5", travel: 18 },
  md: { track: "w-12 h-7", thumb: "h-6 w-6", travel: 22 },
  lg: { track: "w-14 h-8", thumb: "h-7 w-7", travel: 26 },
};

const variantMap: Record<ToggleVariant, string> = {
  default: "#0EA5B0",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
};

/**
 * Toggle - Animated toggle switch component
 *
 * @example
 * const [enabled, setEnabled] = useState(false);
 * <Toggle checked={enabled} onCheckedChange={setEnabled} />
 */
export function Toggle({
  checked = false,
  onCheckedChange,
  variant = "default",
  size = "md",
  disabled = false,
  className,
  accessibilityRole = "switch",
  accessibilityState,
  ...props
}: ToggleProps) {
  const colors = useThemeStore((s) => s.colors);
  const translateX = useRef(new Animated.Value(checked ? sizeMap[size].travel : 0)).current;
  const palette = useMemo(() => variantMap[variant], [variant]);

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: checked ? sizeMap[size].travel : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [checked, translateX, size]);

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityState={{ checked, disabled, ...accessibilityState }}
      className={cn(
        "justify-center rounded-full",
        sizeMap[size].track,
        checked
          ? "bg-cyan-500 dark:bg-cyan-600"
          : "bg-gray-300 dark:bg-gray-600",
        disabled && "opacity-50",
        className,
      )}
      onPress={() => !disabled && onCheckedChange?.(!checked)}
      disabled={disabled}
      {...props}
    >
      <View className="absolute inset-0 rounded-full" style={{ borderColor: palette, borderWidth: checked ? 0 : 1 }} />
      <Animated.View
        style={[
          { transform: [{ translateX }] },
          {
            position: 'absolute',
            left: 2,
            top: 2,
            borderRadius: 9999,
            backgroundColor: '#ffffff',
            width: sizeMap[size].width,
            height: sizeMap[size].height,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.15,
            shadowRadius: 3,
            elevation: 3,
          },
        ]}
      />
      {checked ? (
        <View className="absolute inset-0 rounded-full opacity-20" style={{ backgroundColor: colors.background }} />
      ) : null}
    </Pressable>
  );
}
