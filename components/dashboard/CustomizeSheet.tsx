import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { ResponsiveModal } from '@/components/ui/ResponsiveModal';
import { Toggle } from '@/components/ui/Toggle';
import { WIDGET_META } from '@/constants/dashboard';
import { useThemeStore } from '@/stores/theme.store';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { radius } from '@/constants/radius';
import type { DashboardConfig, WidgetType } from '@/types/dashboard';

interface CustomizeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: DashboardConfig;
  onToggle: (type: WidgetType, enabled: boolean) => void;
  uid: string;
}

const WIDGET_ORDER: WidgetType[] = [
  'workout',
  'streak',
  'xp',
  'macros',
  'water',
  'weekly_activity',
  'community',
  'quick_actions',
];

export function CustomizeSheet({
  open,
  onOpenChange,
  config,
  onToggle,
}: CustomizeSheetProps) {
  const colors = useThemeStore((s) => s.colors);

  const isEnabled = (type: WidgetType): boolean =>
    config.widgets.find((w) => w.type === type)?.enabled ?? false;

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} position="bottom">
      <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.lg, gap: spacing.md }}>
        {/* Title */}
        <Text
          style={{
            color: colors.foreground,
            fontSize: typography.h3.fontSize,
            fontWeight: '700',
            textAlign: 'center',
          }}
        >
          Personalizar Dashboard
        </Text>
        <Text
          style={{
            color: colors.mutedForeground,
            fontSize: typography.small.fontSize,
            textAlign: 'center',
            marginTop: -spacing.xs,
          }}
        >
          Escolhe os widgets que queres ver
        </Text>

        {/* Widget list */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: 400 }}
        >
          <View style={{ gap: spacing.xs }}>
            {WIDGET_ORDER.map((type) => {
              const meta = WIDGET_META[type];
              const enabled = isEnabled(type);

              return (
                <View
                  key={type}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.md,
                    backgroundColor: enabled ? colors.primary + '0A' : 'transparent',
                    borderWidth: 1,
                    borderColor: enabled ? colors.primary + '30' : colors.cardBorder,
                  }}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      style={{
                        color: colors.foreground,
                        fontSize: typography.bodyMedium.fontSize,
                        fontWeight: '600',
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
                  <Toggle
                    checked={enabled}
                    onCheckedChange={(val) => onToggle(type, val)}
                    size="sm"
                  />
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </ResponsiveModal>
  );
}
