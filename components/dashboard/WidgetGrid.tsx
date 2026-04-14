import React, { useCallback, useMemo } from "react";
import { View, Text, Pressable, FlatList, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import DraggableFlatList from "react-native-draggable-flatlist";
import type { EdgeInsets } from "react-native-safe-area-context";
import { LayoutGrid } from "lucide-react-native";
import { DashboardHeader } from "./DashboardHeader";
import { WidgetRow } from "./WidgetRow";
import { rebuildFullList } from "@/lib/dashboard-layout";
import { useThemeStore } from "@/stores/theme.store";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { radius } from "@/constants/radius";
import {
  DASHBOARD_EDIT_ACTIONS_CLEARANCE,
  FLOATING_TAB_BAR_CLEARANCE,
} from "@/constants/layout";
import type {
  DashboardConfig,
  WidgetConfig,
  WidgetRowItem,
  WidgetType,
} from "@/types/dashboard";
import type { UserProfile } from "@/types";

// Workaround: current typings for DraggableFlatList in this workspace
// are incompatible with our usage (some props like `dragEnabled`
// are not present). Cast to `any` for the JSX to keep runtime
// behavior while TypeScript stays happy.
const DraggableFlatListAny: any = DraggableFlatList as any;

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
  // Native drag flow has been unstable on some Android devices.
  // Keep edit mode reliable on mobile and use drag only on web.
  const canDrag = Platform.OS === "web";

  const enabledWidgets = useMemo(
    () => config.widgets.filter((w) => w.enabled),
    [config.widgets],
  );

  /**
   * Always use flat WidgetConfig[] as FlatList data so that keys never change
   * when toggling edit mode — prevents all items from unmounting/remounting.
   *
   * For normal mode, precompute a map from widget id → WidgetRowItem (or null
   * for the right-hand item of a compact pair, which is rendered by the left).
   */
  const normalRenderMap = useMemo(() => {
    const map = new Map<string, WidgetRowItem | null>();
    let i = 0;
    while (i < enabledWidgets.length) {
      const cur = enabledWidgets[i];
      if (cur.size === "full") {
        map.set(cur.id, { kind: "full", id: cur.id, widget: cur });
        i++;
      } else {
        const nxt = enabledWidgets[i + 1];
        if (nxt?.size === "compact") {
          map.set(cur.id, {
            kind: "pair",
            id: `${cur.id}:${nxt.id}`,
            left: cur,
            right: nxt,
          });
          map.set(nxt.id, null); // rendered inside the pair — skip own row
          i += 2;
        } else {
          map.set(cur.id, { kind: "single", id: cur.id, widget: cur });
          i++;
        }
      }
    }
    return map;
  }, [enabledWidgets]);

  const handleRemoveWidget = useCallback(
    (widgetId: string) => {
      const widget = config.widgets.find((w) => w.id === widgetId);
      if (widget) onToggle(widget.type, false);
    },
    [config.widgets, onToggle],
  );

  const handleToggleEditMode = useCallback(() => {
    if (isEditMode) onExitEditMode();
    else onEnterEditMode();
  }, [isEditMode, onEnterEditMode, onExitEditMode]);

  // ─── Normal mode: render grouped rows ────────────────────────────────────────
  const renderNormalItem = useCallback(
    (params: any) => {
      const { item, index } = params as { item: WidgetConfig; index: number };
      const rowItem = normalRenderMap.get(item.id);

      // Right side of a pair — already rendered alongside the left item
      if (rowItem === null) return <View style={{ height: 0 }} />;
      if (!rowItem) return null;

      return (
        <WidgetRow
          item={rowItem}
          staggerIndex={index}
          isEditMode={false}
          canDrag={false}
          onRemove={handleRemoveWidget}
        />
      );
    },
    [normalRenderMap, handleRemoveWidget],
  );

  // ─── Edit mode: every widget is a full-width row ──────────────────────────────
  const renderEditItem = useCallback(
    (params: any) => {
      const { item, drag, isActive } = params as {
        item: WidgetConfig;
        drag?: () => void;
        isActive?: boolean;
      };
      const index = enabledWidgets.findIndex((w) => w.id === item.id);
      return (
        <WidgetRow
          item={{ kind: "full", id: item.id, widget: item }}
          staggerIndex={index}
          isEditMode
          canDrag={canDrag}
          isActive={Boolean(isActive)}
          drag={drag ?? (() => {})}
          onRemove={handleRemoveWidget}
        />
      );
    },
    [enabledWidgets, handleRemoveWidget, canDrag],
  );

  const renderItem = isEditMode ? renderEditItem : (renderNormalItem as any);

  const keyExtractor = useCallback((item: WidgetConfig) => item.id, []);

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
          backgroundColor: pressed ? colors.surface : colors.secondary,
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

  const ListEmpty = (
    <View
      style={{
        paddingVertical: spacing.xl,
        alignItems: "center",
        gap: spacing.xs,
      }}
    >
      <Text
        style={{
          color: colors.mutedForeground,
          fontSize: typography.small.fontSize,
          textAlign: "center",
        }}
      >
        Nenhum widget ativo no momento
      </Text>
      <Text
        style={{
          color: colors.muted,
          fontSize: typography.caption.fontSize,
          textAlign: "center",
        }}
      >
        Usa Personalizar Dashboard para ativar widgets
      </Text>
    </View>
  );

  const commonListProps = {
    data: enabledWidgets,
    keyExtractor: keyExtractor as any,
    showsVerticalScrollIndicator: false,
    style: { flex: 1 },
    ListHeaderComponent: ListHeader,
    ListFooterComponent: ListFooter,
    ListEmptyComponent: ListEmpty,
    keyboardShouldPersistTaps: "handled" as const,
    contentContainerStyle: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xs,
      paddingBottom:
        insets.bottom +
        (isEditMode
          ? DASHBOARD_EDIT_ACTIONS_CLEARANCE
          : FLOATING_TAB_BAR_CLEARANCE),
      flexGrow: 1,
      minHeight: 1,
    },
  };

  if (!isEditMode) {
    return <FlatList {...commonListProps} renderItem={renderItem as any} />;
  }

  if (!canDrag) {
    return <FlatList {...commonListProps} renderItem={renderEditItem as any} />;
  }

  return (
    <DraggableFlatListAny
      {...commonListProps}
      renderItem={renderItem as any}
      dragEnabled
      activationDistance={10}
      onDragBegin={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      onDragEnd={({ data }: { data: WidgetConfig[] }) => {
        // data is WidgetConfig[] — rebuild full list (including disabled widgets)
        const rebuilt = rebuildFullList(data, config.widgets);
        onReorder(rebuilt);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }}
    />
  );
}
