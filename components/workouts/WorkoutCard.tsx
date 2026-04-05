import React from "react";
import { View, Text, Pressable } from "react-native";
import {
  Clock3,
  Dumbbell,
  MoreHorizontal,
  Sparkles,
} from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";
import { cn } from "@/lib/utils";
import type { WorkoutTemplate } from "@/types";

interface WorkoutCardProps {
  template: Partial<WorkoutTemplate>;
  onPress?: () => void;
  onMenuPress?: () => void;
  showDifficulty?: boolean;
  variant?: "compact" | "expanded";
  className?: string;
}

const difficultyColors = {
  beginner:
    "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  intermediate:
    "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  advanced: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

/**
 * WorkoutCard - Displays a workout template card
 *
 * @example
 * <WorkoutCard
 *   template={workout}
 *   onPress={() => navigate(`/workouts/${workout.id}`)}
 *   showDifficulty
 * />
 */
export function WorkoutCard({
  template,
  onPress,
  onMenuPress,
  showDifficulty = true,
  variant = "expanded",
  className,
  ...props
}: WorkoutCardProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const mutedColor = isDark ? "#9ca3af" : "#6b7280";

  const exerciseCount = template.exercises?.length || 0;
  const duration = template.estimated_duration_minutes || 0;
  const difficulty = template.difficulty || "intermediate";

  if (variant === "compact") {
    return (
      <Pressable
        onPress={onPress}
        className={cn(
          "bg-light-surface dark:bg-dark-surface rounded-xl p-3 flex-row items-center gap-3 border border-light-border dark:border-dark-border",
          className,
        )}
      >
        <View className="flex-1 gap-1">
          <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {template.name}
          </Text>
          <View className="flex-row items-center gap-2">
            <Clock3 size={14} color={mutedColor} />
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              {duration} min • {exerciseCount} exercises
            </Text>
          </View>
        </View>
        {onMenuPress && (
          <Pressable onPress={onMenuPress} className="p-2">
            <MoreHorizontal size={18} color={mutedColor} />
          </Pressable>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "bg-light-card dark:bg-dark-card rounded-2xl p-4 gap-3 border border-light-border dark:border-dark-border shadow-sm",
        className,
      )}
      {...props}
    >
      {/* Header */}
      <View className="flex-row items-start justify-between">
        <View className="flex-1 gap-1">
          <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {template.name}
          </Text>
          {template.description && (
            <Text
              className="text-sm text-gray-600 dark:text-gray-400"
              numberOfLines={1}
            >
              {template.description}
            </Text>
          )}
        </View>
        {onMenuPress && (
          <Pressable onPress={onMenuPress} className="p-2">
            <MoreHorizontal size={18} color={mutedColor} />
          </Pressable>
        )}
      </View>

      <View className="flex-row items-center gap-4">
        <View className="flex-row items-center gap-1.5">
          <Clock3 size={14} color={mutedColor} />
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {duration} min
          </Text>
        </View>

        <View className="flex-row items-center gap-1.5">
          <Dumbbell size={14} color={mutedColor} />
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {exerciseCount} exercises
          </Text>
        </View>

        {showDifficulty && (
          <View
            className={cn(
              "rounded-full px-2 py-1",
              difficultyColors[difficulty],
            )}
          >
            <Text className="text-xs font-semibold capitalize">
              {difficulty}
            </Text>
          </View>
        )}
      </View>

      {/* Tags */}
      {template.tags && template.tags.length > 0 && (
        <View className="flex-row gap-2 flex-wrap">
          {template.tags.slice(0, 3).map((tag) => (
            <View
              key={tag}
              className="bg-gray-100 dark:bg-gray-800 rounded-full px-2.5 py-1"
            >
              <Text className="text-xs text-gray-600 dark:text-gray-400">
                {tag}
              </Text>
            </View>
          ))}
          {template.tags.length > 3 && (
            <View className="bg-gray-100 dark:bg-gray-800 rounded-full px-2.5 py-1">
              <Text className="text-xs text-gray-600 dark:text-gray-400">
                +{template.tags.length - 3}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* AI Badge */}
      {template.is_ai_generated && (
        <View className="flex-row items-center gap-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg px-3 py-2">
          <Sparkles size={14} color={isDark ? "#c4b5fd" : "#7c3aed"} />
          <Text className="text-xs font-medium text-purple-700 dark:text-purple-300">
            AI Generated
          </Text>
        </View>
      )}
    </Pressable>
  );
}
