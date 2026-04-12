import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Pressable, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/auth.store";
import { useCommunityStore } from "@/stores/community.store";
import { useDashboardStore } from "@/stores/dashboard.store";
import { WidgetGrid } from "@/components/dashboard/WidgetGrid";
import { CustomizeSheet } from "@/components/dashboard/CustomizeSheet";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { useThemeStore } from "@/stores/theme.store";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";
import { typography } from "@/constants/typography";
import { DASHBOARD_EDIT_ACTIONS_BOTTOM_OFFSET } from "@/constants/layout";
import { withOpacity } from "@/lib/color";
import type { WidgetConfig, WidgetSize, WidgetType } from "@/types/dashboard";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const { user, profile } = useAuthStore();
  const unreadCount = useCommunityStore((s) => s.unreadCount);

  const {
    config,
    isLoading,
    isEditMode,
    initialize,
    enterEditMode,
    exitEditMode,
    reorderWidgets,
    toggleWidget,
  } = useDashboardStore();

  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [draftWidgets, setDraftWidgets] = useState<WidgetConfig[] | null>(null);
  const uid = user?.uid;

  const isEditingWithDraft = isEditMode && draftWidgets !== null;
  const gridConfig = useMemo(
    () => (isEditingWithDraft ? { ...config, widgets: draftWidgets } : config),
    [config, draftWidgets, isEditingWithDraft],
  );

  const handleEnterEditMode = useCallback(() => {
    setDraftWidgets(config.widgets.map((widget) => ({ ...widget })));
    enterEditMode();
  }, [config.widgets, enterEditMode]);

  const handleReorder = useCallback(
    (widgets: WidgetConfig[]) => {
      if (!uid) return;
      if (isEditingWithDraft) {
        setDraftWidgets(widgets);
        return;
      }
      reorderWidgets(uid, widgets);
    },
    [isEditingWithDraft, reorderWidgets, uid],
  );

  const handleToggle = useCallback(
    (type: WidgetType, enabled: boolean) => {
      if (!uid) return;
      if (isEditingWithDraft) {
        setDraftWidgets((prev) => {
          if (!prev) return prev;
          return prev.map((w) => (w.type === type ? { ...w, enabled } : w));
        });
        return;
      }
      toggleWidget(uid, type, enabled);
    },
    [isEditingWithDraft, toggleWidget, uid],
  );

  const handleResize = useCallback(
    (type: WidgetType, size: WidgetSize) => {
      if (!uid) return;
      if (isEditingWithDraft) {
        setDraftWidgets((prev) => {
          if (!prev) return prev;
          return prev.map((w) => (w.type === type ? { ...w, size } : w));
        });
        return;
      }
      const widget = config.widgets.find((w) => w.type === type);
      if (widget) {
        // Keep the store API path consistent for immediate edits outside draft mode.
        useDashboardStore.getState().resizeWidget(uid, widget.id, size);
      }
    },
    [config.widgets, isEditingWithDraft, uid],
  );

  const handleSaveEdit = useCallback(() => {
    if (!uid) return;
    if (draftWidgets) {
      reorderWidgets(uid, draftWidgets);
    }
    setDraftWidgets(null);
    exitEditMode();
  }, [draftWidgets, exitEditMode, reorderWidgets, uid]);

  const handleCancelEdit = useCallback(() => {
    setDraftWidgets(null);
    exitEditMode();
  }, [exitEditMode]);

  useEffect(() => {
    if (uid) {
      initialize(uid);
    }
  }, [uid, initialize]);

  if (isLoading || !uid) {
    return <DashboardSkeleton />;
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top,
      }}
    >
      <WidgetGrid
        config={gridConfig}
        profile={profile}
        unreadCount={unreadCount}
        isEditMode={isEditMode}
        uid={uid}
        insets={insets}
        onEnterEditMode={handleEnterEditMode}
        onExitEditMode={handleSaveEdit}
        onReorder={handleReorder}
        onToggle={handleToggle}
        onOpenCustomize={() => setCustomizeOpen(true)}
      />

      {isEditingWithDraft && (
        <View
          style={{
            position: "absolute",
            left: spacing.md,
            right: spacing.md,
            bottom: insets.bottom + DASHBOARD_EDIT_ACTIONS_BOTTOM_OFFSET,
            flexDirection: "row",
            gap: spacing.sm,
            padding: spacing.xs,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            backgroundColor: colors.card,
            zIndex: 30,
            elevation: 10,
          }}
        >
          <Pressable
            onPress={handleCancelEdit}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 44,
              borderRadius: radius.md,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed ? colors.surface : colors.secondary,
            })}
          >
            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: typography.small.fontSize,
                fontWeight: "700",
              }}
            >
              Cancelar
            </Text>
          </Pressable>

          <Pressable
            onPress={handleSaveEdit}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 44,
              borderRadius: radius.md,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed
                ? withOpacity(colors.primary, 0.85)
                : colors.primary,
            })}
          >
            <Text
              style={{
                color: colors.primaryForeground,
                fontSize: typography.small.fontSize,
                fontWeight: "700",
              }}
            >
              Salvar
            </Text>
          </Pressable>
        </View>
      )}

      <CustomizeSheet
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        config={gridConfig}
        uid={uid}
        onToggle={handleToggle}
        onResize={handleResize}
      />
    </View>
  );
}
