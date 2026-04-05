/**
 * MacroBar -- Horizontal macro progress bar
 * @example
 * <MacroBar label="Protein" current={120} target={150} unit="g" color="#22C4D5" />
 */
import { View, Text } from "react-native";
import { useThemeStore } from "@/stores/theme.store";
import { typography } from "@/constants/typography";
import { radius } from "@/constants/radius";

interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  unit?: string;
  color: string;
}

export function MacroBar({
  label,
  current,
  target,
  unit = "g",
  color,
}: MacroBarProps) {
  const colors = useThemeStore((s) => s.colors);
  const progress = Math.min(current / Math.max(target, 1), 1);
  const isOver = current > target;

  return (
    <View style={{ gap: 4 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={[typography.smallMedium, { color: colors.foreground }]}>
          {label}
        </Text>
        <Text
          style={[
            typography.caption,
            {
              color: isOver
                ? colors.destructive
                : colors.mutedForeground,
            },
          ]}
        >
          {current} / {target} {unit}
        </Text>
      </View>
      <View
        style={{
          height: 8,
          borderRadius: radius.full,
          backgroundColor: colors.cardBorder,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: 8,
            borderRadius: radius.full,
            backgroundColor: isOver ? colors.destructive : color,
            width: `${Math.min(progress * 100, 100)}%`,
          }}
        />
      </View>
    </View>
  );
}
