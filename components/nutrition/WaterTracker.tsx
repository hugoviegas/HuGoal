/**
 * WaterTracker -- Compact hydration tracker widget
 * @example
 * <WaterTracker current={1500} target={2500} onAdd={(ml) => addWater(ml)} />
 */
import { View, Text, Pressable } from "react-native";
import { Droplets, Plus } from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";
import { typography } from "@/constants/typography";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";

interface WaterTrackerProps {
  /** Current intake in ml */
  current: number;
  /** Target intake in ml */
  target?: number;
  onAdd?: (ml: number) => void;
}

const WATER_COLOR = "#3B82F6";
const WATER_OPTIONS = [250, 500];

export function WaterTracker({
  current,
  target = 2500,
  onAdd,
}: WaterTrackerProps) {
  const colors = useThemeStore((s) => s.colors);
  const progress = Math.min(current / Math.max(target, 1), 1);
  const liters = (current / 1000).toFixed(1);
  const targetLiters = (target / 1000).toFixed(1);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        padding: spacing.sm,
        gap: spacing.sm,
      }}
    >
      <Droplets size={20} color={WATER_COLOR} strokeWidth={2} />

      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[typography.smallMedium, { color: colors.foreground }]}>
          {liters} / {targetLiters} L
        </Text>
        <View
          style={{
            height: 4,
            borderRadius: radius.full,
            backgroundColor: colors.cardBorder,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: 4,
              borderRadius: radius.full,
              backgroundColor: WATER_COLOR,
              width: `${Math.min(progress * 100, 100)}%`,
            }}
          />
        </View>
      </View>

      {/* Quick add buttons */}
      {WATER_OPTIONS.map((ml) => (
        <Pressable
          key={ml}
          onPress={() => onAdd?.(ml)}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            backgroundColor: pressed
              ? WATER_COLOR + "33"
              : WATER_COLOR + "1A",
            borderRadius: radius.sm,
            paddingHorizontal: 8,
            paddingVertical: 4,
            minHeight: 44,
            minWidth: 44,
          })}
          accessibilityLabel={`Add ${ml} ml of water`}
          accessibilityRole="button"
        >
          <Plus size={12} color={WATER_COLOR} strokeWidth={2.5} />
          <Text
            style={{
              color: WATER_COLOR,
              fontSize: 12,
              fontWeight: "600",
            }}
          >
            {ml}ml
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
