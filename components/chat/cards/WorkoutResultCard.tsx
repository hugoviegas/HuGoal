import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  ChevronDown,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flame,
  Snowflake,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import Animated, { Easing, FadeIn, SlideInDown } from "react-native-reanimated";

import { radius, spacing, typography } from "@/constants/design-system";
import { withOpacity } from "@/lib/color";
import type {
  WorkoutTemplateBlockRecord,
  WorkoutTemplateRecord,
} from "@/lib/firestore/workouts";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import { useWorkoutStore } from "@/stores/workout.store";

interface WorkoutResultCardProps {
  template: WorkoutTemplateRecord;
}

function sectionIcon(type?: string) {
  if (type === "warmup") return Flame;
  if (type === "cooldown") return Snowflake;
  return Dumbbell;
}

function formatBlock(block: WorkoutTemplateBlockRecord): string {
  if (block.type === "rest") {
    return `${block.rest_seconds ?? block.duration_seconds ?? 60}s rest`;
  }

  if ((block.execution_mode ?? "reps") === "time") {
    const work = block.exercise_seconds ?? block.duration_seconds ?? 30;
    const prep = block.prep_seconds ? ` + prep ${block.prep_seconds}s` : "";
    return `${work}s${prep}`;
  }

  return block.reps ? `${block.reps} reps` : "-";
}

function difficultyColor(difficulty: string): string {
  if (difficulty === "advanced") return "#ef4444";
  if (difficulty === "intermediate") return "#f59e0b";
  return "#22c55e";
}

export function WorkoutResultCard({ template }: WorkoutResultCardProps) {
  const router = useRouter();
  const colors = useThemeStore((state) => state.colors);
  const showToast = useToastStore((state) => state.show);
  const setTodayWorkout = useWorkoutStore((state) => state.setTodayWorkout);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});
  const [isSettingToday, setIsSettingToday] = useState(false);
  const [isLockedToday, setIsLockedToday] = useState(false);

  const sections = template.sections ?? [];
  const totalExercises = useMemo(
    () =>
      sections.reduce(
        (acc, section) =>
          acc +
          (section.blocks?.filter((block) => block.type === "exercise")
            .length ?? 0),
        0,
      ),
    [sections],
  );

  const estimatedDuration = template.estimated_duration_minutes;

  const handleSetToday = async () => {
    if (isLockedToday || isSettingToday) {
      return;
    }

    setIsSettingToday(true);
    try {
      setTodayWorkout(template);
      setIsLockedToday(true);
      showToast("Workout set as today", "success");
    } finally {
      setIsSettingToday(false);
    }
  };

  const handleStart = async () => {
    setTodayWorkout(template);
    router.push("/workouts");
  };

  const handleView = async () => {
    router.push(`/workouts/${template.id}`);
  };

  return (
    <Animated.View
      entering={FadeIn.duration(200).easing(Easing.out(Easing.cubic))}
      style={{
        alignSelf: "flex-start",
        maxWidth: "95%",
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        backgroundColor: colors.surface,
        padding: spacing.md,
        gap: spacing.md,
      }}
    >
      <Animated.View
        entering={SlideInDown.duration(200).easing(Easing.out(Easing.cubic))}
        style={{ gap: spacing.md }}
      >
        <View style={{ gap: spacing.xs }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: spacing.sm,
            }}
          >
            <Text
              style={[
                typography.smallMedium,
                { color: colors.foreground, flex: 1 },
              ]}
            >
              {template.name}
            </Text>

            <View
              style={{
                borderRadius: radius.full,
                paddingHorizontal: spacing.sm,
                paddingVertical: 4,
                backgroundColor: withOpacity(
                  difficultyColor(template.difficulty),
                  0.12,
                ),
                borderWidth: 1,
                borderColor: withOpacity(
                  difficultyColor(template.difficulty),
                  0.24,
                ),
              }}
            >
              <Text
                style={[
                  typography.caption,
                  {
                    color: difficultyColor(template.difficulty),
                    fontWeight: "700",
                  },
                ]}
              >
                {template.difficulty}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Clock3 size={14} color={colors.mutedForeground} />
            <Text
              style={[typography.caption, { color: colors.mutedForeground }]}
            >
              {estimatedDuration} min
            </Text>
            <View
              style={{
                width: 4,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.mutedForeground,
              }}
            />
            <Text
              style={[typography.caption, { color: colors.mutedForeground }]}
            >
              {totalExercises} exercises
            </Text>
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          {sections.map((section, index) => {
            const expanded = expandedSections[section.id] ?? false;
            const exerciseBlocks = (section.blocks ?? []).filter(
              (block) => block.type === "exercise",
            );
            const SectionIcon = sectionIcon(section.type);

            return (
              <View
                key={section.id || `${section.name}-${index}`}
                style={{
                  borderRadius: radius.lg,
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  overflow: "hidden",
                }}
              >
                <Pressable
                  onPress={() =>
                    setExpandedSections((current) => ({
                      ...current,
                      [section.id]: !expanded,
                    }))
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Toggle ${section.name}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: spacing.sm,
                    padding: spacing.sm,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      flex: 1,
                    }}
                  >
                    <SectionIcon size={16} color={colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          typography.smallMedium,
                          { color: colors.foreground },
                        ]}
                      >
                        {section.name}
                      </Text>
                      <Text
                        style={[
                          typography.caption,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {exerciseBlocks.length} exercise
                        {exerciseBlocks.length === 1 ? "" : "s"}
                      </Text>
                    </View>
                  </View>

                  {expanded ? (
                    <ChevronDown size={16} color={colors.mutedForeground} />
                  ) : (
                    <ChevronRight size={16} color={colors.mutedForeground} />
                  )}
                </Pressable>

                {expanded ? (
                  <View
                    style={{
                      paddingHorizontal: spacing.sm,
                      paddingBottom: spacing.sm,
                      gap: 6,
                    }}
                  >
                    {section.blocks?.map((block, blockIndex) => (
                      <View
                        key={block.id || `${section.id}-${blockIndex}`}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: spacing.sm,
                          paddingVertical: 6,
                          borderTopWidth: blockIndex === 0 ? 0 : 1,
                          borderTopColor: colors.cardBorder,
                        }}
                      >
                        <Text
                          style={[
                            typography.small,
                            { color: colors.foreground, flex: 1 },
                          ]}
                        >
                          {block.name ?? block.exercise_id ?? block.type}
                        </Text>
                        <Text
                          style={[
                            typography.caption,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          {formatBlock(block)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        <View
          style={{
            flexDirection: "row",
            gap: spacing.sm,
            flexWrap: "wrap",
          }}
        >
          <ActionButton
            label={
              isLockedToday
                ? "Today set"
                : isSettingToday
                  ? "Saving"
                  : "Set as Today"
            }
            onPress={() => void handleSetToday()}
            disabled={isLockedToday || isSettingToday}
            loading={isSettingToday}
            colors={colors}
            tone="primary"
          />
          <ActionButton
            label="Start"
            onPress={() => void handleStart()}
            colors={colors}
            tone="secondary"
          />
          <ActionButton
            label="View"
            onPress={() => void handleView()}
            colors={colors}
            tone="ghost"
          />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function ActionButton({
  label,
  onPress,
  disabled,
  loading,
  tone,
  colors,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone: "primary" | "secondary" | "ghost";
  colors: ReturnType<typeof useThemeStore.getState>["colors"];
}) {
  const isPrimary = tone === "primary";
  const isSecondary = tone === "secondary";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        flex: 1,
        minWidth: 92,
        borderRadius: radius.lg,
        paddingVertical: 12,
        paddingHorizontal: spacing.sm,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: isPrimary
          ? colors.primary
          : isSecondary
            ? colors.secondary
            : colors.card,
        borderWidth: 1,
        borderColor: isPrimary ? colors.primary : colors.cardBorder,
        opacity: disabled || loading ? 0.65 : 1,
      }}
    >
      <Text
        style={[
          typography.smallMedium,
          {
            color: isPrimary
              ? colors.primaryForeground
              : isSecondary
                ? colors.secondaryForeground
                : colors.foreground,
          },
        ]}
      >
        {loading ? "..." : label}
      </Text>
    </Pressable>
  );
}
