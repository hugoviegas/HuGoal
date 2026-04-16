import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalendarDays, Flame, Settings2 } from "lucide-react-native";
import { typography } from "@/constants/typography";
import { useThemeStore } from "@/stores/theme.store";

type PageHeaderProps = {
  title: string;
  streakCount: number;
  onSettingsPress: () => void;
  /** Pass undefined when already on today — button hides, spacer shown instead */
  onTodayPress?: () => void;
  calendarSlot?: ReactNode;
};

export function PageHeader({
  title,
  streakCount,
  onSettingsPress,
  onTodayPress,
  calendarSlot,
}: PageHeaderProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const isDark = useThemeStore((s) => s.isDark);

  // SHARED STYLE — if changed here, update PageHeader usage in: Workouts, Nutrition, Community
  const iconBtn = {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  };

  return (
    <View
      style={{
        paddingTop: insets.top + 8,
        paddingBottom: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        backgroundColor: colors.card,
        borderBottomColor: colors.cardBorder,
      }}
    >
      {/* Single row: [Settings] [Title · Streak badge] [Today icon | spacer] */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: calendarSlot ? 12 : 0,
        }}
      >
        <Pressable
          onPress={onSettingsPress}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          style={iconBtn}
        >
          <Settings2 size={18} color={isDark ? "#9ca3af" : "#64748b"} />
        </Pressable>

        {/* Title + Streak inline, centered */}
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Text style={[typography.h2, { color: colors.foreground }]}>
            {title}
          </Text>
          {/* SHARED STYLE — if changed here, update PageHeader usage in: Workouts, Nutrition, Community */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 3,
              backgroundColor: isDark
                ? "rgba(14,165,176,0.15)"
                : "rgba(14,165,176,0.10)",
              borderRadius: 10,
              paddingHorizontal: 7,
              paddingVertical: 3,
            }}
          >
            <Flame size={12} color={colors.primary} />
            <Text
              style={[typography.smallMedium, { color: colors.foreground }]}
            >
              {streakCount}d
            </Text>
          </View>
        </View>

        {/* Icon-only Today button — only visible when not on today */}
        {onTodayPress ? (
          <Pressable
            onPress={onTodayPress}
            accessibilityRole="button"
            accessibilityLabel="Return to today"
            style={iconBtn}
          >
            <CalendarDays size={18} color={isDark ? "#9ca3af" : "#64748b"} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Calendar slot — caller controls calendar layout and data */}
      {calendarSlot}
    </View>
  );
}
