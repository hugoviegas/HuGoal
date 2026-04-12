import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import {
  Dumbbell,
  Play,
  RotateCcw,
  Clock,
  ChevronRight,
} from "lucide-react-native";
import { GlassCard } from "@/components/ui/GlassCard";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useWorkoutStore } from "@/stores/workout.store";
import { listWorkoutTemplates } from "@/lib/firestore/workouts";
import { ensureDailyWorkoutResolution } from "@/lib/workouts/daily-workout-resolver";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { radius } from "@/constants/radius";
import { withOpacity } from "@/lib/color";
import type { WorkoutTemplateRecord } from "@/lib/firestore/workouts";

interface WorkoutWidgetProps {
  staggerIndex?: number;
}

function ShimmerBar({ width }: { width: string }) {
  const shimmer = useSharedValue(0);
  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [shimmer]);
  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.3, 0.7]),
  }));
  const colors = useThemeStore((s) => s.colors);
  return (
    <Animated.View
      style={[
        {
          height: 12,
          borderRadius: radius.full,
          width,
          backgroundColor: colors.surface,
        } as any,
        animStyle,
      ]}
    />
  );
}

/**
 * Counts exercise blocks across sections (or falls back to exercises array).
 */
function countExercises(template: WorkoutTemplateRecord): number {
  if (template.sections && template.sections.length > 0) {
    return template.sections.reduce(
      (acc, s) => acc + s.blocks.filter((b) => b.type === "exercise").length,
      0,
    );
  }
  return template.exercises?.length ?? 0;
}

export function WorkoutWidget({ staggerIndex = 0 }: WorkoutWidgetProps) {
  const colors = useThemeStore((s) => s.colors);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const { isActive, templateName, exercises, elapsedSeconds } =
    useWorkoutStore();

  const [todayTemplate, setTodayTemplate] =
    useState<WorkoutTemplateRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }

    if (isActive) {
      // Already has an active session — no need to load a template
      setIsLoading(false);
      return;
    }

    listWorkoutTemplates(user.uid)
      .then((templates) => {
        if (templates.length === 0) {
          setTodayTemplate(null);
          return;
        }

        const sorted = [...templates].sort((a, b) =>
          b.updated_at.localeCompare(a.updated_at),
        );

        const trainingDays = profile?.workout_settings?.training_days ?? [];

        if (trainingDays.length === 0) {
          setTodayTemplate(sorted[0] ?? null);
          return;
        }

        return ensureDailyWorkoutResolution({
          uid: user.uid,
          templates: sorted,
          trainingDays,
        }).then((resolution) => {
          const resolved = sorted.find(
            (item) => item.id === resolution.resolvedTemplateId,
          );
          setTodayTemplate(resolved ?? null);
        });
      })
      .catch(() => setTodayTemplate(null))
      .finally(() => setIsLoading(false));
  }, [isActive, profile?.workout_settings?.training_days, user?.uid]);

  const formatElapsed = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}min ${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <Animated.View entering={FadeInDown.delay(staggerIndex * 60).duration(350)}>
      <GlassCard>
        <View style={{ gap: spacing.sm }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: typography.label.fontSize,
                fontWeight: "600",
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              Treino de hoje
            </Text>
            {(isActive || todayTemplate) && (
              <Pressable onPress={() => router.push("/(tabs)/workouts")}>
                <ChevronRight size={16} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>

          {/* Content */}
          {isLoading ? (
            /* Skeleton */
            <View style={{ gap: spacing.sm }}>
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radius.sm,
                  padding: spacing.sm,
                }}
              >
                <ShimmerBar width="60%" />
              </View>
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radius.sm,
                  padding: spacing.sm,
                }}
              >
                <ShimmerBar width="40%" />
              </View>
            </View>
          ) : isActive ? (
            /* Active session */
            <View style={{ gap: spacing.xs }}>
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: typography.h3.fontSize,
                  fontWeight: "700",
                }}
                numberOfLines={1}
              >
                {templateName ?? "Treino em curso"}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.xs,
                }}
              >
                <Clock size={14} color={colors.accent} />
                <Text
                  style={{
                    color: colors.accent,
                    fontSize: typography.small.fontSize,
                    fontWeight: "600",
                  }}
                >
                  {formatElapsed(elapsedSeconds)}
                </Text>
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontSize: typography.small.fontSize,
                  }}
                >
                  • {exercises.length} exercícios
                </Text>
              </View>
              <Pressable
                onPress={() => router.push("/(tabs)/workouts")}
                style={({ pressed }) => ({
                  marginTop: spacing.xs,
                  width: "100%",
                  alignSelf: "stretch",
                  minHeight: 48,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.md,
                  backgroundColor: pressed
                    ? withOpacity(colors.accent, 0.85)
                    : colors.accent,
                  flexDirection: "row",
                  flexWrap: "nowrap",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: spacing.xs,
                  overflow: "hidden",
                })}
              >
                <RotateCcw size={16} color={colors.accentForeground} />
                <Text
                  style={{
                    color: colors.accentForeground,
                    fontSize: typography.bodyMedium.fontSize,
                    fontWeight: "700",
                    flexShrink: 1,
                  }}
                  numberOfLines={1}
                >
                  Retomar Treino
                </Text>
              </Pressable>
            </View>
          ) : todayTemplate ? (
            /* Template available */
            <View style={{ gap: spacing.xs }}>
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: typography.h3.fontSize,
                  fontWeight: "700",
                }}
                numberOfLines={2}
              >
                {todayTemplate.name}
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: typography.small.fontSize,
                }}
              >
                {countExercises(todayTemplate)} exercícios
                {todayTemplate.estimated_duration_minutes
                  ? ` · ${todayTemplate.estimated_duration_minutes}min`
                  : ""}
              </Text>
              <Pressable
                onPress={() => router.push("/(tabs)/workouts")}
                style={({ pressed }) => ({
                  marginTop: spacing.xs,
                  width: "100%",
                  alignSelf: "stretch",
                  minHeight: 48,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.md,
                  backgroundColor: pressed
                    ? withOpacity(colors.primary, 0.85)
                    : colors.primary,
                  flexDirection: "row",
                  flexWrap: "nowrap",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: spacing.xs,
                  overflow: "hidden",
                })}
              >
                <Play size={16} color={colors.primaryForeground} />
                <Text
                  style={{
                    color: colors.primaryForeground,
                    fontSize: typography.bodyMedium.fontSize,
                    fontWeight: "700",
                    flexShrink: 1,
                  }}
                  numberOfLines={1}
                >
                  Iniciar Treino
                </Text>
              </Pressable>
            </View>
          ) : (
            /* No templates yet */
            <Pressable
              onPress={() => router.push("/(tabs)/workouts")}
              style={({ pressed }) => ({
                alignItems: "center",
                paddingVertical: spacing.lg,
                gap: spacing.sm,
                borderRadius: radius.md,
                backgroundColor: pressed ? colors.surface : "transparent",
              })}
            >
              <Dumbbell size={32} color={colors.mutedForeground} />
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: typography.small.fontSize,
                  textAlign: "center",
                }}
              >
                Nenhum treino criado ainda
              </Text>
              <Text
                style={{
                  color: colors.primary,
                  fontSize: typography.small.fontSize,
                  fontWeight: "600",
                }}
              >
                Criar treino
              </Text>
            </Pressable>
          )}
        </View>
      </GlassCard>
    </Animated.View>
  );
}
