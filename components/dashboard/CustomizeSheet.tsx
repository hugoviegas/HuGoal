import React from "react";
import {
  View,
  Text,
  ScrollView,
  useWindowDimensions,
  Pressable,
} from "react-native";
import { ResponsiveModal } from "@/components/ui/ResponsiveModal";
import { Toggle } from "@/components/ui/Toggle";
import { WIDGET_META } from "@/constants/dashboard";
import { useThemeStore } from "@/stores/theme.store";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { radius } from "@/constants/radius";
import { withOpacity } from "@/lib/color";
import type {
  DashboardConfig,
  WidgetSize,
  WidgetType,
} from "@/types/dashboard";

interface CustomizeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: DashboardConfig;
  onToggle: (type: WidgetType, enabled: boolean) => void;
  onResize: (type: WidgetType, size: WidgetSize) => void;
  uid: string;
}

const WIDGET_ORDER: WidgetType[] = [
  "workout",
  "streak",
  "xp",
  "macros",
  "water",
  "weekly_activity",
  "community",
  "quick_actions",
];

export function CustomizeSheet({
  open,
  onOpenChange,
  config,
  onToggle,
  onResize,
}: CustomizeSheetProps) {
  const { height } = useWindowDimensions();
  const colors = useThemeStore((s) => s.colors);
  const listMaxHeight = Math.max(260, Math.min(480, Math.floor(height * 0.52)));

  const isEnabled = (type: WidgetType): boolean =>
    config.widgets.find((w) => w.type === type)?.enabled ?? false;

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} position="bottom">
      <View
        style={{
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.lg,
          gap: spacing.md,
        }}
      >
        {/* Title */}
        <Text
          style={{
            color: colors.foreground,
            fontSize: typography.h3.fontSize,
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          Personalizar Dashboard
        </Text>
        <Text
          style={{
            color: colors.mutedForeground,
            fontSize: typography.small.fontSize,
            textAlign: "center",
            marginTop: -spacing.xs,
          }}
        >
          Escolhe os widgets que queres ver
        </Text>

        {/* Widget list */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: listMaxHeight }}
        >
          <View style={{ gap: spacing.xs }}>
            {WIDGET_ORDER.map((type) => {
              const meta = WIDGET_META[type];
              const enabled = isEnabled(type);
              const currentSize = config.widgets.find(
                (w) => w.type === type,
              )?.size;

              return (
                <View
                  key={type}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.sm,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.md,
                    backgroundColor: enabled
                      ? withOpacity(colors.primary, 0.08)
                      : "transparent",
                    borderWidth: 1,
                    borderColor: enabled
                      ? withOpacity(colors.primary, 0.2)
                      : colors.cardBorder,
                  }}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      style={{
                        color: colors.foreground,
                        fontSize: typography.bodyMedium.fontSize,
                        fontWeight: "600",
                      }}
                    >
                      {meta.label}
                    </Text>
                    <Text
                      style={{
                        color: colors.mutedForeground,
                        fontSize: typography.caption.fontSize,
                      }}
                    >
                      {meta.description}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: spacing.xs }}>
                    <Toggle
                      checked={enabled}
                      onCheckedChange={(val) => onToggle(type, val)}
                      size="sm"
                    />

                    {meta.canResize && enabled && (
                      <View
                        style={{
                          flexDirection: "row",
                          gap: 6,
                          padding: 3,
                          borderRadius: radius.full,
                          backgroundColor: colors.surface,
                          borderWidth: 1,
                          borderColor: colors.cardBorder,
                        }}
                      >
                        {(["compact", "full"] as WidgetSize[]).map((size) => {
                          const selected = currentSize === size;
                          return (
                            <Pressable
                              key={size}
                              onPress={() => onResize(type, size)}
                              style={({ pressed }) => ({
                                minWidth: 56,
                                paddingHorizontal: spacing.sm,
                                paddingVertical: 6,
                                borderRadius: radius.full,
                                backgroundColor: selected
                                  ? colors.primary
                                  : pressed
                                    ? colors.surface
                                    : "transparent",
                                alignItems: "center",
                              })}
                            >
                              <Text
                                style={{
                                  color: selected
                                    ? colors.primaryForeground
                                    : colors.mutedForeground,
                                  fontSize: typography.caption.fontSize,
                                  fontWeight: "700",
                                }}
                              >
                                {size === "compact" ? "Pequeno" : "Largo"}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </ResponsiveModal>
  );
}
