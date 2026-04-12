import React, { useMemo, useState } from "react";
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
  bodySize?: number;
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
  scale = 1.05,
  bodySize = 300,
  onMuscleSelect,
}: MuscleMapProps) {
  const isDark = useThemeStore((state) => state.isDark);
  const [contentWidth, setContentWidth] = useState(0);

  const availableContentWidth = Math.max(0, contentWidth - 16);
  const widthPerBody =
    availableContentWidth > 0
      ? Math.floor((availableContentWidth - 10) / 2)
      : Math.round(bodySize * 0.44);
  const itemWidth = Math.max(
    108,
    Math.min(widthPerBody, Math.round(bodySize * 0.48)),
  );
  const itemHeight = Math.round(Math.min(bodySize, itemWidth * 2.2));
  const adaptiveScale =
    contentWidth > 0 && contentWidth < 370 ? Math.min(scale, 0.9) : scale;

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
      onLayout={(event) => {
        const measured = Math.round(event.nativeEvent.layout.width);
        if (measured !== contentWidth) {
          setContentWidth(measured);
        }
      }}
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

      {/* Front/back side by side with adaptive sizing to avoid clipping */}
      <View
        className="mt-2 flex-row items-start justify-center"
        style={{ gap: 10, paddingVertical: 4, paddingHorizontal: 8 }}
      >
        <View
          className="items-center justify-center overflow-hidden rounded-xl"
          style={{ width: itemWidth, height: itemHeight }}
        >
          <Text className="mb-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
            Front
          </Text>
          <Body
            data={bodyData}
            gender={gender}
            side="front"
            scale={adaptiveScale}
            colors={colors}
            border={borderColor}
            defaultFill={defaultFill}
            defaultStroke={isDark ? "#4b5563" : "#d1d5db"}
            defaultStrokeWidth={0.5}
            onBodyPartPress={handleMusclePress}
          />
        </View>
        <View
          className="items-center justify-center overflow-hidden rounded-xl"
          style={{ width: itemWidth, height: itemHeight }}
        >
          <Text className="mb-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
            Back
          </Text>
          <Body
            data={bodyData}
            gender={gender}
            side="back"
            scale={adaptiveScale}
            colors={colors}
            border={borderColor}
            defaultFill={defaultFill}
            defaultStroke={isDark ? "#4b5563" : "#d1d5db"}
            defaultStrokeWidth={0.5}
            onBodyPartPress={handleMusclePress}
          />
        </View>
      </View>
    </View>
  );
}
