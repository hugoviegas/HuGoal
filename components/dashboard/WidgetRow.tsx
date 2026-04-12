import React from "react";
import { View } from "react-native";
import { WidgetCell } from "./WidgetCell";
import { WorkoutWidget } from "./widgets/WorkoutWidget";
import { StreakWidget } from "./widgets/StreakWidget";
import { XPWidget } from "./widgets/XPWidget";
import { MacrosWidget } from "./widgets/MacrosWidget";
import { WaterWidget } from "./widgets/WaterWidget";
import { WeeklyActivityWidget } from "./widgets/WeeklyActivityWidget";
import { CommunityWidget } from "./widgets/CommunityWidget";
import { QuickActionsWidget } from "./widgets/QuickActionsWidget";
import { spacing } from "@/constants/spacing";
import type { WidgetConfig, WidgetRowItem } from "@/types/dashboard";

interface WidgetDispatcherProps {
  widget: WidgetConfig;
  staggerIndex: number;
  style?: object;
  isEditMode: boolean;
  canDrag: boolean;
  isActive?: boolean;
  drag?: () => void;
  onRemove: (id: string) => void;
}

function WidgetDispatcher({
  widget,
  staggerIndex,
  style,
  isEditMode,
  canDrag,
  isActive = false,
  drag = () => {},
  onRemove,
}: WidgetDispatcherProps) {
  const content = (() => {
    switch (widget.type) {
      case "workout":
        return <WorkoutWidget staggerIndex={staggerIndex} />;
      case "streak":
        return <StreakWidget staggerIndex={staggerIndex} />;
      case "xp":
        return <XPWidget staggerIndex={staggerIndex} />;
      case "macros":
        return <MacrosWidget staggerIndex={staggerIndex} />;
      case "water":
        return <WaterWidget staggerIndex={staggerIndex} />;
      case "weekly_activity":
        return <WeeklyActivityWidget staggerIndex={staggerIndex} />;
      case "community":
        return <CommunityWidget staggerIndex={staggerIndex} />;
      case "quick_actions":
        return <QuickActionsWidget staggerIndex={staggerIndex} />;
      default:
        return null;
    }
  })();

  if (!content) return null;

  return (
    <WidgetCell
      widget={widget}
      isEditMode={isEditMode}
      canDrag={canDrag}
      isActive={isActive}
      drag={drag}
      onRemove={onRemove}
      style={style}
    >
      {content}
    </WidgetCell>
  );
}

interface WidgetRowProps {
  item: WidgetRowItem;
  staggerIndex: number;
  isEditMode: boolean;
  canDrag?: boolean;
  isActive?: boolean;
  drag?: () => void;
  onRemove: (id: string) => void;
}

export function WidgetRow({
  item,
  staggerIndex,
  isEditMode,
  canDrag = true,
  isActive = false,
  drag = () => {},
  onRemove,
}: WidgetRowProps) {
  if (item.kind === "full") {
    return (
      <WidgetDispatcher
        widget={item.widget}
        staggerIndex={staggerIndex}
        isEditMode={isEditMode}
        canDrag={canDrag}
        isActive={isActive}
        drag={drag}
        onRemove={onRemove}
        style={{ marginBottom: spacing.sm }}
      />
    );
  }

  if (item.kind === "pair") {
    return (
      <View
        style={{
          flexDirection: "row",
          gap: spacing.sm,
          marginBottom: spacing.sm,
        }}
      >
        <WidgetDispatcher
          widget={item.left}
          staggerIndex={staggerIndex}
          isEditMode={isEditMode}
          canDrag={canDrag}
          onRemove={onRemove}
          style={{ flex: 1 }}
        />
        <WidgetDispatcher
          widget={item.right}
          staggerIndex={staggerIndex + 1}
          isEditMode={isEditMode}
          canDrag={canDrag}
          onRemove={onRemove}
          style={{ flex: 1 }}
        />
      </View>
    );
  }

  // kind === 'single' (compact, unpaired)
  return (
    <View style={{ flexDirection: "row", marginBottom: spacing.sm }}>
      <WidgetDispatcher
        widget={item.widget}
        staggerIndex={staggerIndex}
        isEditMode={isEditMode}
        canDrag={canDrag}
        isActive={isActive}
        drag={drag}
        onRemove={onRemove}
        style={{ flex: 1 }}
      />
      {/* Empty spacer to maintain alignment */}
      <View style={{ flex: 1 }} />
    </View>
  );
}
