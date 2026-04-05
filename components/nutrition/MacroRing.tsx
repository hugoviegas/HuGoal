/**
 * MacroRing -- Circular progress indicator for a single macro
 * @example
 * <MacroRing current={120} target={150} label="Protein" unit="g" color="#22C4D5" size={80} />
 */
import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useThemeStore } from "@/stores/theme.store";
import { typography } from "@/constants/typography";

interface MacroRingProps {
  current: number;
  target: number;
  label: string;
  unit?: string;
  color: string;
  size?: number;
  strokeWidth?: number;
}

export function MacroRing({
  current,
  target,
  label,
  unit = "g",
  color,
  size = 80,
  strokeWidth = 6,
}: MacroRingProps) {
  const colors = useThemeStore((s) => s.colors);
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = Math.min(current / Math.max(target, 1), 1);
  const strokeDashoffset = circumference * (1 - progress);
  const isOver = current > target;

  return (
    <View style={{ alignItems: "center", gap: 4, width: size }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {/* Track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={colors.cardBorder}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={isOver ? colors.destructive : color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={strokeDashoffset}
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        {/* Center label */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              ...typography.bodyMedium,
              fontSize: size > 70 ? 16 : 12,
              color: colors.foreground,
            }}
          >
            {current}
          </Text>
        </View>
      </View>
      <Text
        style={[
          typography.caption,
          { color: colors.mutedForeground, textAlign: "center" },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}
