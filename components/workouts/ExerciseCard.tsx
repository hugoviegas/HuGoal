import React from "react";
import { View, Text, Pressable, Image } from "react-native";
import { CirclePlus, Dumbbell } from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/types";

interface ExerciseCardProps {
  exercise: Partial<Exercise>;
  onPress?: () => void;
  onAddPress?: () => void;
  imageUrl?: string;
  variant?: "grid" | "list";
  className?: string;
  showImage?: boolean;
}

const difficultyColors = {
  beginner: "text-green-600 dark:text-green-400",
  intermediate: "text-amber-600 dark:text-amber-400",
  advanced: "text-red-600 dark:text-red-400",
};

const difficultyBgColors = {
  beginner: "bg-green-100 dark:bg-green-900/30",
  intermediate: "bg-amber-100 dark:bg-amber-900/30",
  advanced: "bg-red-100 dark:bg-red-900/30",
};

/**
 * ExerciseCard - Displays an exercise for selection/browsing
 *
 * @example
 * <ExerciseCard
 *   exercise={exercise}
 *   onPress={() => openDetail(exercise.id)}
 *   onAddPress={() => addToWorkout(exercise)}
 *   showImage
 * />
 */
export function ExerciseCard({
  exercise,
  onPress,
  onAddPress,
  imageUrl,
  variant = "list",
  className,
  showImage = true,
  ...props
}: ExerciseCardProps) {
  const colors = useThemeStore((s) => s.colors);
  const difficulty = exercise.difficulty || "beginner";
  const equipment = Array.isArray(exercise.equipment)
    ? exercise.equipment[0]
    : exercise.equipment;
  const primaryMuscles = (exercise.primary_muscles || []).slice(0, 2);

  if (variant === "grid") {
    return (
      <Pressable
        onPress={onPress}
        className={cn(
          "bg-light-card dark:bg-dark-card rounded-2xl overflow-hidden border border-light-border dark:border-dark-border",
          className,
        )}
        style={{
          boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
        }}
        {...props}
      >
        {showImage && imageUrl && (
          <View className="h-32 bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <Image
              source={{ uri: imageUrl }}
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>
        )}

        <View className="p-3 gap-2">
          <Text
            className="font-bold text-gray-900 dark:text-gray-100"
            numberOfLines={2}
          >
            {exercise.name}
          </Text>

          <View className="flex-row flex-wrap gap-1">
            {primaryMuscles.map((muscle) => (
              <View
                key={muscle}
                className="bg-gray-100 dark:bg-gray-800 rounded px-2 py-1"
              >
                <Text className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                  {muscle}
                </Text>
              </View>
            ))}
          </View>

          <View
            className={cn("px-2 py-1 rounded", difficultyBgColors[difficulty])}
          >
            <Text
              className={cn(
                "text-xs font-semibold capitalize",
                difficultyColors[difficulty],
              )}
            >
              {difficulty}
            </Text>
          </View>

          {onAddPress && (
            <Pressable
              onPress={onAddPress}
              className="flex-row items-center justify-center gap-1 bg-cyan-500 dark:bg-cyan-600 rounded-lg py-2 mt-2"
            >
              <CirclePlus size={14} color="#ffffff" />
              <Text className="text-sm font-semibold text-white">Add</Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  }

  // List variant
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "bg-light-surface dark:bg-dark-surface rounded-xl p-3 flex-row items-start gap-3 border border-light-border dark:border-dark-border",
        className,
      )}
      {...props}
    >
      {showImage && imageUrl && (
        <Image
          source={{ uri: imageUrl }}
          className="h-16 w-16 rounded-lg bg-gray-200 dark:bg-gray-700"
          resizeMode="cover"
        />
      )}

      <View className="flex-1 gap-1">
        <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {exercise.name}
        </Text>

        {equipment && (
          <View className="flex-row items-center gap-1">
            <Dumbbell size={14} color={colors.muted} />
            <Text className="text-xs text-gray-600 dark:text-gray-400 capitalize">
              {equipment}
            </Text>
          </View>
        )}

        <View className="flex-row items-center gap-2 flex-wrap">
          {primaryMuscles.map((muscle) => (
            <Text
              key={muscle}
              className="text-xs text-gray-600 dark:text-gray-400 capitalize"
            >
              {muscle}
            </Text>
          ))}
          <View
            className={cn(
              "px-1.5 py-0.5 rounded",
              difficultyBgColors[difficulty],
            )}
          >
            <Text
              className={cn(
                "text-xs font-semibold capitalize",
                difficultyColors[difficulty],
              )}
            >
              {difficulty}
            </Text>
          </View>
        </View>
      </View>

      {onAddPress && (
        <Pressable
          onPress={onAddPress}
          className="p-2 rounded-lg active:bg-gray-100 dark:active:bg-gray-800"
        >
          <CirclePlus size={20} color={colors.primary} />
        </Pressable>
      )}
    </Pressable>
  );
}
