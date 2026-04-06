import React, { useMemo } from "react";
import { Text, View } from "react-native";
import Body, { ExtendedBodyPart } from "react-native-body-highlighter";
import { useThemeStore } from "@/stores/theme.store";
import { cn } from "@/lib/utils";
import { getMusclesSlugs } from "@/lib/workouts/muscle-slug-mapping";

interface MuscleMapProps {
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  title?: string;
  subtitle?: string;
  className?: string;
  gender?: "male" | "female";
  scale?: number;
  onMuscleSelect?: (slug: string) => void;
}

/**
 * MuscleMap component - Displays interactive muscle highlighting using react-native-body-highlighter
 * Converts muscle names to body-highlighter slugs and manages the visualization
 */
export function MuscleMap({
  primaryMuscles,
  secondaryMuscles = [],
  title,
  subtitle,
  className,
  gender = "male",
  scale = 1.6,
  onMuscleSelect,
}: MuscleMapProps) {
  const isDark = useThemeStore((state) => state.isDark);

  // Convert muscle names to slugs for the library
  const primarySlugs = useMemo(
    () => getMusclesSlugs(primaryMuscles),
    [primaryMuscles],
  );
  const secondarySlugs = useMemo(
    () => getMusclesSlugs(secondaryMuscles),
    [secondaryMuscles],
  );

  // Build the data array for react-native-body-highlighter
  // Primary muscles have intensity 2, secondary have intensity 1
  const bodyData: ExtendedBodyPart[] = useMemo(() => {
    const data: ExtendedBodyPart[] = [];

    // Add primary muscles with intensity 2 (stronger highlighting)
    for (const slug of primarySlugs) {
      data.push({
        slug: slug as any,
        intensity: 2,
      });
    }

    // Add secondary muscles with intensity 1 (lighter highlighting)
    for (const slug of secondarySlugs) {
      // Only add if not already in primary
      if (!primarySlugs.includes(slug)) {
        data.push({
          slug: slug as any,
          intensity: 1,
        });
      }
    }

    return data;
  }, [primarySlugs, secondarySlugs]);

  const colors = isDark ? ["#60a5fa", "#1e40af"] : ["#0984e3", "#74b9ff"];
  const borderColor = isDark ? "none" : "#dfdfdf";
  const defaultFill = isDark ? "#1f2937" : "#f3f4f6";

  const handleMusclePress = (bodyPart: ExtendedBodyPart) => {
    // Log which muscle was selected
    console.log(`Muscle selected: ${bodyPart.slug}`);
    if (bodyPart.slug) {
      onMuscleSelect?.(bodyPart.slug);
    }
  };

  return (
    <View
      className={cn(
        "rounded-xl border p-2",
        isDark
          ? "bg-dark-card border-dark-border"
          : "bg-light-card border-light-border",
        className,
      )}
    >
      {/* Title and subtitle */}
      {title ? (
        <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </Text>
      ) : null}
      {subtitle ? (
        <Text className="text-xs mt-1 text-gray-600 dark:text-gray-400">
          {subtitle}
        </Text>
      ) : null}

      {/* Front/back side by side */}
      <View className="mt-2 flex-row items-start justify-center gap-3 py-1">
        <Body
          data={bodyData}
          gender={gender}
          side="front"
          scale={scale}
          colors={colors}
          border={borderColor}
          defaultFill={defaultFill}
          defaultStroke={isDark ? "#4b5563" : "#d1d5db"}
          defaultStrokeWidth={0.5}
          onBodyPartPress={handleMusclePress}
        />
        <Body
          data={bodyData}
          gender={gender}
          side="back"
          scale={scale}
          colors={colors}
          border={borderColor}
          defaultFill={defaultFill}
          defaultStroke={isDark ? "#4b5563" : "#d1d5db"}
          defaultStrokeWidth={0.5}
          onBodyPartPress={handleMusclePress}
        />
      </View>
    </View>
  );
}
