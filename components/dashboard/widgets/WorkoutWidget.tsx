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
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { radius } from "@/constants/radius";
import type { WorkoutTemplateRecord } from "@/lib/firestore/workouts";

interface WorkoutWidgetProps {
  staggerIndex?: number;
}

function ShimmerBar({ width }: { width: string }) {
  const shimmer = useSharedValue(0);
  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, []);
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

    // Load all templates (same approach as workouts/index.tsx) and pick the
    // most recently updated one as "today's workout". Filter by schedule_day_of_week
    // when available, fall back to the first template otherwise.
    listWorkoutTemplates(user.uid)
      .then((templates) => {
        if (templates.length === 0) {
          setTodayTemplate(null);
          return;
        }

        const todayDow = new Date().getDay();

        // Try to find one scheduled for today
        const scheduled = templates.find(
          (t) => t.schedule_day_of_week === todayDow,
        );

        // Fall back to the most recently updated template (workouts[0])
        setTodayTemplate(scheduled ?? templates[0]);
      })
      .catch(() => setTodayTemplate(null))
      .finally(() => setIsLoading(false));
  }, [user?.uid, isActive]);

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
                  paddingVertical: spacing.sm,
                  borderRadius: radius.md,
                  backgroundColor: pressed
                    ? colors.accent + "CC"
                    : colors.accent,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: spacing.xs,
                })}
              >
                <RotateCcw size={16} color="#fff" />
                <Text
                  style={{
                    color: "#fff",
                    fontSize: typography.bodyMedium.fontSize,
                    fontWeight: "700",
                  }}
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
                  paddingVertical: spacing.sm,
                  borderRadius: radius.md,
                  backgroundColor: pressed
                    ? colors.primary + "CC"
                    : colors.primary,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: spacing.xs,
                })}
              >
                <Play size={16} color="#fff" />
                <Text
                  style={{
                    color: "#fff",
                    fontSize: typography.bodyMedium.fontSize,
                    fontWeight: "700",
                  }}
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
