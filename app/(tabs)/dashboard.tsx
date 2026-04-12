import { useEffect, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/auth.store";
import { useCommunityStore } from "@/stores/community.store";
import { useDashboardStore } from "@/stores/dashboard.store";
import { WidgetGrid } from "@/components/dashboard/WidgetGrid";
import { CustomizeSheet } from "@/components/dashboard/CustomizeSheet";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { useThemeStore } from "@/stores/theme.store";

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
  const uid = user?.uid;

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
        config={config}
        profile={profile}
        unreadCount={unreadCount}
        isEditMode={isEditMode}
        uid={uid}
        insets={insets}
        onEnterEditMode={enterEditMode}
        onExitEditMode={exitEditMode}
        onReorder={(widgets) => reorderWidgets(uid, widgets)}
        onToggle={(type, enabled) => toggleWidget(uid, type, enabled)}
        onOpenCustomize={() => setCustomizeOpen(true)}
      />

      <CustomizeSheet
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        config={config}
        uid={uid}
        onToggle={(type, enabled) => toggleWidget(uid, type, enabled)}
      />
    </View>
  );
}
