import React, { useCallback, useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import type { EdgeInsets } from "react-native-safe-area-context";
import { LayoutGrid } from "lucide-react-native";
import { DashboardHeader } from "./DashboardHeader";
import { WidgetRow } from "./WidgetRow";
import { buildRowItems, rebuildFullList } from "@/lib/dashboard-layout";
import { useThemeStore } from "@/stores/theme.store";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { radius } from "@/constants/radius";
import type {
  DashboardConfig,
  WidgetConfig,
  WidgetRowItem,
  WidgetType,
} from "@/types/dashboard";
import type { UserProfile } from "@/types";

interface WidgetGridProps {
  config: DashboardConfig;
  profile: UserProfile | null;
  unreadCount: number;
  isEditMode: boolean;
  uid: string;
  insets: EdgeInsets;
  onEnterEditMode: () => void;
  onExitEditMode: () => void;
  onReorder: (widgets: WidgetConfig[]) => void;
  onToggle: (type: WidgetType, enabled: boolean) => void;
  onOpenCustomize: () => void;
}

export function WidgetGrid({
  config,
  profile,
  unreadCount,
  isEditMode,
  uid,
  insets,
  onEnterEditMode,
  onExitEditMode,
  onReorder,
  onToggle,
  onOpenCustomize,
}: WidgetGridProps) {
  const colors = useThemeStore((s) => s.colors);

  const enabledWidgets = useMemo(
    () => config.widgets.filter((w) => w.enabled),
    [config.widgets],
  );

  // In normal mode: grouped row items; in edit mode: flat per-widget list
  const listData = useMemo(
    () => (isEditMode ? enabledWidgets : buildRowItems(enabledWidgets)),
    [isEditMode, enabledWidgets],
  );

  const handleRemoveWidget = useCallback(
    (widgetId: string) => {
      const widget = config.widgets.find((w) => w.id === widgetId);
      if (widget) onToggle(widget.type, false);
    },
    [config.widgets, onToggle],
  );

  const handleToggleEditMode = useCallback(() => {
    if (isEditMode) {
      onExitEditMode();
    } else {
      onEnterEditMode();
    }
  }, [isEditMode, onEnterEditMode, onExitEditMode]);

  // ─── Render in edit mode: flat single widgets ────────────────────────────────
  const renderEditItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<WidgetConfig>) => {
      const index = enabledWidgets.findIndex((w) => w.id === item.id);
      return (
        <ScaleDecorator activeScale={1.03}>
          <WidgetRow
            item={{ kind: "single", id: item.id, widget: item }}
            staggerIndex={index}
            isEditMode
            isActive={isActive}
            drag={drag}
            onRemove={handleRemoveWidget}
          />
        </ScaleDecorator>
      );
    },
    [enabledWidgets, handleRemoveWidget],
  );

  // ─── Render in normal mode: grouped row items ─────────────────────────────────
  const renderNormalItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<WidgetRowItem>) => {
      const index = listData.findIndex((r) => r.id === item.id);
      return (
        <WidgetRow
          item={item}
          staggerIndex={index}
          isEditMode={false}
          onRemove={handleRemoveWidget}
        />
      );
    },
    [listData, handleRemoveWidget],
  );

  const renderItem = isEditMode ? renderEditItem : (renderNormalItem as any);

  const keyExtractor = useCallback(
    (item: WidgetConfig | WidgetRowItem) => item.id,
    [],
  );

  const ListHeader = (
    <DashboardHeader
      profile={profile}
      unreadCount={unreadCount}
      isEditMode={isEditMode}
      onToggleEditMode={handleToggleEditMode}
    />
  );

  const ListFooter = (
    <View
      style={{
        alignItems: "center",
        paddingVertical: spacing.xl,
        gap: spacing.sm,
      }}
    >
      <Pressable
        onPress={onOpenCustomize}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.xs,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
          borderRadius: radius.full,
          backgroundColor: pressed ? colors.secondary : colors.secondary,
          borderWidth: 1,
          borderColor: colors.cardBorder,
        })}
      >
        <LayoutGrid size={16} color={colors.mutedForeground} />
        <Text
          style={{
            color: colors.mutedForeground,
            fontSize: typography.small.fontSize,
            fontWeight: "600",
          }}
        >
          Personalizar Dashboard
        </Text>
      </Pressable>
    </View>
  );

  return (
    <DraggableFlatList
      data={listData as any[]}
      keyExtractor={keyExtractor as any}
      renderItem={renderItem as any}
      activationDistance={10}
      showsVerticalScrollIndicator={false}
      style={{ flex: 1 }}
      nestedScrollEnabled={true}
      keyboardShouldPersistTaps="handled"
      onDragBegin={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      onDragEnd={({ data }) => {
        if (isEditMode) {
          const reorderedEnabled = data as WidgetConfig[];
          const rebuilt = rebuildFullList(reorderedEnabled, config.widgets);
          onReorder(rebuilt);
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }}
      ListHeaderComponent={ListHeader}
      ListFooterComponent={ListFooter}
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: spacing.md,
        paddingBottom: insets.bottom + 100,
      }}
    />
  );
}
