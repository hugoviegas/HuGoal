import React, { useMemo, useState } from "react";
import { Text, View, StyleSheet, Pressable } from "react-native";
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
  onMuscleSelect?: (slug: string) => void;
}

/**
 * MuscleMap component - Displays interactive muscle highlighting using react-native-body-highlighter
 * Converts muscle names to body-highlighter slugs and manages the visualization
 */
export function MuscleMap({
  primaryMuscles,
  secondaryMuscles = [],
  title = "Muscle Activation",
  subtitle,
  className,
  gender = "male",
  onMuscleSelect,
}: MuscleMapProps) {
  const isDark = useThemeStore((state) => state.isDark);
  const [currentSide, setCurrentSide] = useState<"front" | "back">("front");

  // Convert muscle names to slugs for the library
  const primarySlugs = useMemo(() => getMusclesSlugs(primaryMuscles), [primaryMuscles]);
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
    onMuscleSelect?.(bodyPart.slug);
  };

  return (
    <View
      className={cn(
        "rounded-2xl border p-4",
        isDark ? "bg-dark-card border-dark-border" : "bg-light-card border-light-border",
        className,
      )}
    >
      {/* Title and subtitle */}
      <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </Text>
      {subtitle ? (
        <Text className="text-xs mt-1 text-gray-600 dark:text-gray-400">{subtitle}</Text>
      ) : null}

      {/* Body highlighter */}
      <View className="mt-4 items-center justify-center py-4">
        <Body
          data={bodyData}
          gender={gender}
          side={currentSide}
          scale={1.6}
          colors={colors}
          border={borderColor}
          defaultFill={defaultFill}
          defaultStroke={isDark ? "#4b5563" : "#d1d5db"}
          defaultStrokeWidth={0.5}
          onBodyPartPress={handleMusclePress}
        />
      </View>

      {/* Side toggle buttons */}
      <View className="mt-4 flex-row justify-center gap-2">
        <Pressable
          onPress={() => setCurrentSide("front")}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor:
                currentSide === "front"
                  ? isDark
                    ? "#3b82f6"
                    : "#0984e3"
                  : isDark
                    ? "#374151"
                    : "#e5e7eb",
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.buttonText,
              {
                color:
                  currentSide === "front"
                    ? "#ffffff"
                    : isDark
                      ? "#9ca3af"
                      : "#6b7280",
              },
            ]}
          >
            Front
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setCurrentSide("back")}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor:
                currentSide === "back"
                  ? isDark
                    ? "#3b82f6"
                    : "#0984e3"
                  : isDark
                    ? "#374151"
                    : "#e5e7eb",
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.buttonText,
              {
                color:
                  currentSide === "back"
                    ? "#ffffff"
                    : isDark
                      ? "#9ca3af"
                      : "#6b7280",
              },
            ]}
          >
            Back
          </Text>
        </Pressable>
      </View>

      {/* Legend */}
      <View className="mt-3 flex-row gap-6 justify-center">
        <View style={styles.legendItem}>
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              backgroundColor: isDark ? "#60a5fa" : "#0984e3",
            }}
          />
          <Text
            style={{
              fontSize: 12,
              marginLeft: 6,
              color: isDark ? "#d1d5db" : "#6b7280",
            }}
          >
            Primary
          </Text>
        </View>

        <View style={styles.legendItem}>
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              backgroundColor: isDark ? "#1e40af" : "#74b9ff",
            }}
          />
          <Text
            style={{
              fontSize: 12,
              marginLeft: 6,
              color: isDark ? "#d1d5db" : "#6b7280",
            }}
          >
            Secondary
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
});