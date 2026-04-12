import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Compass,
  Dumbbell,
  Flame,
  Globe,
  MapPin,
  Play,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Target,
  Timer,
} from "lucide-react-native";
import { ExerciseInspectModal } from "@/components/workouts/ExerciseInspectModal";
import {
  listWorkoutTemplates,
  getPausedWorkoutSession,
  getCompletedSessionDates,
  type WorkoutTemplateRecord,
} from "@/lib/firestore/workouts";
import { getExerciseCatalog } from "@/lib/workouts/exercise-catalog";
import type { OfficialExerciseRecord } from "@/lib/workouts/generated/official-exercises";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import { useWorkoutStore } from "@/stores/workout.store";
import { cn } from "@/lib/utils";

type SessionSectionKey = "warmup" | "workout" | "cooldown";

interface SessionSection {
  key: SessionSectionKey;
  title: string;
  subtitle: string;
  exercises: {
    id: string;
    name: string;
    sets: number;
    reps: string;
    muscleGroups: string[];
    prescription: string;
  }[];
}

function formatTimedPrescription(workSeconds: number, prepSeconds = 0): string {
  const safeWork = Math.max(1, workSeconds);
  const safePrep = Math.max(0, prepSeconds);
  return safePrep > 0 ? `${safeWork}s + prep ${safePrep}s` : `${safeWork}s`;
}

function formatBlockPrescription(block: {
  reps?: string;
  execution_mode?: "reps" | "time";
  exercise_seconds?: number;
  prep_seconds?: number;
  duration_seconds?: number;
}): string {
  const executionMode =
    block.execution_mode ??
    ((block.exercise_seconds ?? block.duration_seconds ?? 0) > 0
      ? "time"
      : "reps");

  if (executionMode === "time") {
    return formatTimedPrescription(
      block.exercise_seconds ?? block.duration_seconds ?? 30,
      block.prep_seconds ?? 0,
    );
  }

  return block.reps || "-";
}

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SECTION_COLORS: Record<
  string,
  { bg: string; border: string; label: string }
> = {
  warmup: { bg: "#fef9c3", border: "#fde047", label: "#a16207" },
  workout: { bg: "#dbeafe", border: "#93c5fd", label: "#1d4ed8" },
  cooldown: { bg: "#dcfce7", border: "#86efac", label: "#15803d" },
};
const SECTION_COLORS_DARK: Record<
  string,
  { bg: string; border: string; label: string }
> = {
  warmup: { bg: "#422006", border: "#78350f", label: "#fde68a" },
  workout: { bg: "#1e3a5f", border: "#1e40af", label: "#93c5fd" },
  cooldown: { bg: "#14532d", border: "#166534", label: "#86efac" },
};

function toMondayFirstIndex(date: Date): number {
  const weekday = date.getDay();
  return weekday === 0 ? 6 : weekday - 1;
}

function startOfWeekMonday(date: Date): Date {
  const base = new Date(date);
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() - toMondayFirstIndex(base));
  return base;
}

function resolveFocusArea(workout: WorkoutTemplateRecord | null): string {
  if (!workout || workout.exercises.length === 0) {
    return "Full body";
  }

  const counter = new Map<string, number>();
  for (const exercise of workout.exercises) {
    for (const muscle of exercise.muscleGroups ?? []) {
      const key = muscle.toLowerCase();
      counter.set(key, (counter.get(key) ?? 0) + 1);
    }
  }

  const [topMuscle] =
    [...counter.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (!topMuscle) {
    return "Strength";
  }

  return topMuscle
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function buildSessionSections(
  exercises: WorkoutTemplateRecord["exercises"],
): SessionSection[] {
  const total = exercises.length;
  if (total === 0) {
    return [
      {
        key: "warmup",
        title: "Warmup",
        subtitle: "No warmup planned",
        exercises: [],
      },
      {
        key: "workout",
        title: "Workout",
        subtitle: "No exercises yet",
        exercises: [],
      },
      {
        key: "cooldown",
        title: "Cooldown",
        subtitle: "No cooldown planned",
        exercises: [],
      },
    ];
  }

  const warmupCount = total > 5 ? 2 : 1;
  const cooldownCount = total > 3 ? 1 : 0;
  const toSessionExercise = (
    exercise: WorkoutTemplateRecord["exercises"][number],
  ) => ({
    id: exercise.id,
    name: exercise.name,
    sets: exercise.sets,
    reps: exercise.reps,
    muscleGroups: exercise.muscleGroups,
    prescription: exercise.reps || "-",
  });

  const warmup = exercises.slice(0, warmupCount).map(toSessionExercise);
  const cooldown =
    cooldownCount > 0 ? exercises.slice(total - cooldownCount) : [];
  const cooldownMapped = cooldown.map(toSessionExercise);
  const mainStart = warmup.length;
  const mainEnd =
    cooldownMapped.length > 0 ? total - cooldownMapped.length : total;
  const workout = exercises.slice(mainStart, mainEnd).map(toSessionExercise);

  const roundCount = Math.max(1, Math.ceil(workout.length / 3));

  return [
    {
      key: "warmup",
      title: "Warmup",
      subtitle:
        warmup.length > 0
          ? `${warmup.length} exercise${warmup.length > 1 ? "s" : ""}`
          : "No warmup planned",
      exercises: warmup,
    },
    {
      key: "workout",
      title: "Workout",
      subtitle:
        workout.length > 0
          ? `${roundCount} round${roundCount > 1 ? "s" : ""} - ${workout.length} exercises`
          : "No exercises yet",
      exercises: workout,
    },
    {
      key: "cooldown",
      title: "Cooldown",
      subtitle:
        cooldown.length > 0
          ? `${cooldownMapped.length} exercise${cooldownMapped.length > 1 ? "s" : ""}`
          : "No cooldown planned",
      exercises: cooldownMapped,
    },
  ];
}

export default function WorkoutsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const { isDark, colors } = useThemeStore();
  const showToast = useToastStore((state) => state.show);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { isActive: sessionActive, templateId: sessionTemplateId } =
    useWorkoutStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutTemplateRecord[]>([]);
  const [catalogById, setCatalogById] = useState<
    Record<string, OfficialExerciseRecord>
  >({});
  const [openSections, setOpenSections] = useState<
    Record<SessionSectionKey, boolean>
  >({
    warmup: true,
    workout: true,
    cooldown: false,
  });
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [, setWeekOffset] = useState(1);
  const [initialWeekMonday] = useState(() => startOfWeekMonday(new Date()));
  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set());

  // Panel slide-up animation
  const COLLAPSED_H = insets.bottom + 144; // pt-3(12) + btn-lg(52) + tabBar(80)
  const EXPAND_CONTENT_H = Math.min(420, Math.max(300, windowHeight * 0.48));
  const EXPANDED_H = COLLAPSED_H + EXPAND_CONTENT_H;

  const panelHeight = useRef(new Animated.Value(COLLAPSED_H)).current;
  const panelExpandedRef = useRef(false);
  const panelBaseHRef = useRef(COLLAPSED_H);
  const webPanelTouchStartY = useRef<number | null>(null);

  const backdropOpacity = panelHeight.interpolate({
    inputRange: [COLLAPSED_H, EXPANDED_H],
    outputRange: [0, 0.5],
    extrapolate: "clamp",
  });

  const adaptContentOpacity = panelHeight.interpolate({
    inputRange: [
      COLLAPSED_H,
      COLLAPSED_H + EXPAND_CONTENT_H * 0.25,
      COLLAPSED_H + EXPAND_CONTENT_H * 0.65,
    ],
    outputRange: [0, 0, 1],
    extrapolate: "clamp",
  });

  const weekPagerWidth = Math.max(280, windowWidth - 52);
  const weekScrollRef = useRef<FlatList<(typeof weekPages)[number]> | null>(
    null,
  );

  const todayWorkout = workouts[0] ?? null;
  const focusArea = useMemo(
    () => resolveFocusArea(todayWorkout),
    [todayWorkout],
  );
  const sections = useMemo(() => {
    if (!todayWorkout) return buildSessionSections([]);
    // Use structured sections when available
    if (todayWorkout.sections && todayWorkout.sections.length > 0) {
      return todayWorkout.sections
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((section, sectionIndex) => {
          const exercises = section.blocks
            .filter((b) => b.type === "exercise" && b.exercise_id)
            .sort((a, b) => a.order - b.order)
            .map((b) => ({
              id: b.exercise_id!,
              name: b.name ?? b.exercise_id!,
              sets: 1,
              reps: b.reps ?? "",
              muscleGroups: b.primary_muscles ?? [],
              prescription: formatBlockPrescription(b),
            }));
          const baseKey =
            section.type === "warmup"
              ? "warmup"
              : section.type === "cooldown"
                ? "cooldown"
                : "workout";
          return {
            key: `${baseKey}-${sectionIndex}` as SessionSectionKey,
            title: section.name,
            subtitle:
              exercises.length > 0
                ? `${exercises.length} exercise${exercises.length > 1 ? "s" : ""}`
                : "Empty",
            exercises,
          };
        });
    }
    return buildSessionSections(todayWorkout.exercises);
  }, [todayWorkout]);
  const [pausedTemplateId, setPausedTemplateId] = useState<string | null>(null);

  const sessionTargetId =
    sessionActive && sessionTemplateId
      ? sessionTemplateId
      : (pausedTemplateId ?? todayWorkout?.id);
  const startActionLabel =
    sessionActive || !!pausedTemplateId ? "Resume" : "Start";

  useEffect(() => {
    let mounted = true;
    if (!user?.uid) {
      setPausedTemplateId(null);
      return () => {
        mounted = false;
      };
    }

    const checkPaused = async () => {
      try {
        if (sessionActive) {
          if (mounted) setPausedTemplateId(sessionTemplateId ?? null);
          return;
        }

        // prefer to check today's workout first
        const toCheck: string[] = [];
        if (todayWorkout?.id) toCheck.push(todayWorkout.id);
        // include a few recent templates as fallback
        toCheck.push(...workouts.map((w) => w.id).slice(0, 6));

        const unique = Array.from(new Set(toCheck));
        const results = await Promise.all(
          unique.map((tplId) => getPausedWorkoutSession(user.uid, tplId)),
        );

        const foundIndex = results.findIndex((r) => !!r);
        if (mounted) {
          if (foundIndex >= 0) {
            setPausedTemplateId(unique[foundIndex]);
          } else {
            setPausedTemplateId(null);
          }
        }
      } catch {
        if (mounted) setPausedTemplateId(null);
      }
    };

    void checkPaused();

    return () => {
      mounted = false;
    };
  }, [user?.uid, sessionActive, sessionTemplateId, todayWorkout?.id, workouts]);

  const weekPages = useMemo(() => {
    const today = new Date();
    const currentMonday = initialWeekMonday;
    const offsets = [-1, 0, 1];

    return offsets.map((off) => {
      const monday = new Date(currentMonday);
      monday.setDate(currentMonday.getDate() + off * 7);

      return Array.from({ length: 7 }, (_, idx) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + idx);
        const isToday =
          date.getFullYear() === today.getFullYear() &&
          date.getMonth() === today.getMonth() &&
          date.getDate() === today.getDate();
        const dateStr = date.toISOString().slice(0, 10);

        return {
          key: `${off}-${dateStr}`,
          dayLabel: WEEK_DAYS[idx],
          dayNumber: date.getDate(),
          isToday,
          isDone: completedDates.has(dateStr),
        };
      });
    });
  }, [initialWeekMonday, completedDates]);

  const heroImageUri = useMemo(() => {
    if (todayWorkout?.cover_image_url) return todayWorkout.cover_image_url;
    const firstExercise = todayWorkout?.exercises[0];
    if (!firstExercise) return null;
    return catalogById[firstExercise.id]?.remote_image_urls?.[0] ?? null;
  }, [catalogById, todayWorkout]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!user?.uid) {
        setWorkouts([]);
        return;
      }

      // Build 3-week date range for the calendar
      const startDate = new Date(initialWeekMonday);
      startDate.setDate(initialWeekMonday.getDate() - 7);
      const endDate = new Date(initialWeekMonday);
      endDate.setDate(initialWeekMonday.getDate() + 13);
      const startStr = startDate.toISOString().slice(0, 10);
      const endStr = endDate.toISOString().slice(0, 10);

      // Load templates and catalog in parallel; fetch session dates separately
      // so a permissions error there doesn't break the whole workout load.
      const [templates, catalog] = await Promise.all([
        listWorkoutTemplates(user.uid),
        getExerciseCatalog(),
      ]);

      const sorted = [...templates].sort((a, b) =>
        b.updated_at.localeCompare(a.updated_at),
      );
      setWorkouts(sorted);

      try {
        const doneDates = await getCompletedSessionDates(
          user.uid,
          startStr,
          endStr,
        );
        setCompletedDates(new Set(doneDates));
      } catch (sessionErr) {
        // Non-fatal — calendar dots just won't show until rules propagate
        console.warn("[workouts] could not load session dates", sessionErr);
      }

      const byId: Record<string, OfficialExerciseRecord> = {};
      for (const item of catalog.exercises) {
        byId[item.id] = item;
      }
      setCatalogById(byId);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Failed to load workouts";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [initialWeekMonday, showToast, user?.uid]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openPanel = useCallback(() => {
    panelExpandedRef.current = true;
    setPanelExpanded(true);
    Animated.spring(panelHeight, {
      toValue: EXPANDED_H,
      useNativeDriver: false,
      bounciness: 4,
      speed: 12,
    }).start();
  }, [panelHeight, EXPANDED_H]);

  const closePanel = useCallback(() => {
    panelExpandedRef.current = false;
    setPanelExpanded(false);
    Animated.spring(panelHeight, {
      toValue: COLLAPSED_H,
      useNativeDriver: false,
      bounciness: 4,
      speed: 12,
    }).start();
  }, [panelHeight, COLLAPSED_H]);

  const panelPanResponder = useMemo(() => {
    const CH = COLLAPSED_H;
    const EH = EXPANDED_H;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderGrant: () => {
        panelBaseHRef.current = panelExpandedRef.current ? EH : CH;
      },
      onPanResponderMove: (_, g) => {
        const newH = Math.max(CH, Math.min(EH, panelBaseHRef.current - g.dy));
        panelHeight.setValue(newH);
      },
      onPanResponderRelease: (_, g) => {
        const THRESHOLD = (EH - CH) * 0.3;
        let willExpand: boolean;
        if (panelExpandedRef.current) {
          willExpand = g.dy < THRESHOLD;
          if (g.vy > 0.5) willExpand = false;
        } else {
          willExpand = -g.dy > THRESHOLD;
          if (g.vy < -0.5) willExpand = true;
        }
        panelExpandedRef.current = willExpand;
        setPanelExpanded(willExpand);
        Animated.spring(panelHeight, {
          toValue: willExpand ? EH : CH,
          useNativeDriver: false,
          bounciness: 4,
          speed: 12,
        }).start();
      },
    });
  }, [COLLAPSED_H, EXPANDED_H, panelHeight]);

  const handleWebPanelTouchStart = (event: any) => {
    if (Platform.OS !== "web") return;
    const touch = event?.nativeEvent?.touches?.[0];
    webPanelTouchStartY.current =
      typeof touch?.clientY === "number" ? touch.clientY : null;
    panelBaseHRef.current = panelExpandedRef.current ? EXPANDED_H : COLLAPSED_H;
  };

  const handleWebPanelTouchMove = (event: any) => {
    if (Platform.OS !== "web") return;
    const touch = event?.nativeEvent?.touches?.[0];
    if (!touch || webPanelTouchStartY.current == null) return;
    const deltaY = touch.clientY - webPanelTouchStartY.current;
    const newH = Math.max(
      COLLAPSED_H,
      Math.min(EXPANDED_H, panelBaseHRef.current - deltaY),
    );
    panelHeight.setValue(newH);
  };

  const handleWebPanelTouchEnd = (event: any) => {
    if (Platform.OS !== "web") return;
    const touch = event?.nativeEvent?.changedTouches?.[0];
    if (!touch || webPanelTouchStartY.current == null) {
      webPanelTouchStartY.current = null;
      return;
    }
    const deltaY = touch.clientY - webPanelTouchStartY.current;
    webPanelTouchStartY.current = null;
    const THRESHOLD = (EXPANDED_H - COLLAPSED_H) * 0.3;
    let willExpand: boolean;
    if (panelExpandedRef.current) {
      willExpand = deltaY < THRESHOLD;
    } else {
      willExpand = -deltaY > THRESHOLD;
    }
    panelExpandedRef.current = willExpand;
    setPanelExpanded(willExpand);
    Animated.spring(panelHeight, {
      toValue: willExpand ? EXPANDED_H : COLLAPSED_H,
      useNativeDriver: false,
      bounciness: 4,
      speed: 12,
    }).start();
  };

  const toggleSection = (key: SessionSectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleOpenExerciseDetail = (exerciseId: string) => {
    setInspectId(exerciseId);
  };

  const renderExerciseRow = (
    exercise: SessionSection["exercises"][number],
    index: number,
    isLast: boolean,
  ) => {
    const imageUri = catalogById[exercise.id]?.remote_image_urls?.[0] ?? null;
    return (
      <Pressable
        key={`${exercise.id}-${index}`}
        onPress={() => handleOpenExerciseDetail(exercise.id)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 12,
          paddingVertical: 11,
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: isDark ? "#1f2937" : "#f3f4f6",
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            overflow: "hidden",
            backgroundColor: isDark ? "#2a2d3a" : "#e2e8f0",
          }}
        >
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Dumbbell size={16} color={colors.muted} />
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: isDark ? "#f3f4f6" : "#111827",
            }}
            numberOfLines={1}
          >
            {exercise.name}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: isDark ? "#9ca3af" : "#6b7280",
              marginTop: 2,
            }}
          >
            {exercise.sets > 1
              ? `${exercise.sets} sets × ${exercise.prescription || "—"}`
              : exercise.prescription || "—"}
          </Text>
        </View>
        <ChevronRight size={14} color={colors.muted} />
      </Pressable>
    );
  };

  // Local inspect modal state
  const [inspectId, setInspectId] = useState<string | null>(null);

  const inspectOfficial = useMemo(() => {
    if (!inspectId) return null;
    return catalogById[inspectId] ?? null;
  }, [inspectId, catalogById]);

  const inspectExercise = useMemo(() => {
    if (!inspectId) return null;
    // find from today's sections
    for (const sec of sections) {
      const found = sec.exercises.find((e) => e.id === inspectId);
      if (found) return found;
    }
    // fallback: search in workouts list
    for (const w of workouts) {
      const found = w.exercises.find((e) => e.id === inspectId);
      if (found)
        return {
          id: found.id,
          name: found.name,
          sets: found.sets,
          prescription: found.reps,
          muscleGroups: found.muscleGroups,
        };
    }
    return null;
  }, [inspectId, sections, workouts]);

  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 14,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          backgroundColor: isDark ? "#13161e" : "#ffffff",
          borderBottomColor: isDark ? "#1f2937" : "#f1f5f9",
        }}
      >
        {/* ── Top row: streak + settings ── */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 11,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isDark
                  ? "rgba(14,165,176,0.15)"
                  : "rgba(14,165,176,0.1)",
              }}
            >
              <Flame size={17} color={colors.primary} />
            </View>
            <View>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "700",
                  lineHeight: 20,
                  color: isDark ? "#f3f4f6" : "#111827",
                }}
              >
                {profile?.streak_current ?? 0}d
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: isDark ? "#6b7280" : "#9ca3af",
                  lineHeight: 14,
                }}
              >
                streak
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => router.push("/settings")}
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.04)",
            }}
          >
            <Settings2 size={17} color={isDark ? "#9ca3af" : "#64748b"} />
          </Pressable>
        </View>

        {/* ── Week pager ── */}
        <FlatList
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          data={weekPages}
          initialScrollIndex={1}
          getItemLayout={(_, index) => ({
            length: weekPagerWidth,
            offset: weekPagerWidth * index,
            index,
          })}
          ref={weekScrollRef}
          keyExtractor={(_, idx) => `week-${idx}`}
          onMomentumScrollEnd={(event) => {
            const page = Math.round(
              event.nativeEvent.contentOffset.x / weekPagerWidth,
            );
            setWeekOffset(Math.max(0, Math.min(weekPages.length - 1, page)));
          }}
          onScrollToIndexFailed={(info) => {
            weekScrollRef.current?.scrollToOffset({
              offset: info.index * weekPagerWidth,
              animated: false,
            });
          }}
          renderItem={({ item: days, index: pageIndex }) => (
            <View
              key={`week-${pageIndex}`}
              style={{ width: weekPagerWidth, paddingHorizontal: 2 }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                {days.map((item) => {
                  const filled = item.isDone;
                  const today = item.isToday;
                  return (
                    <View
                      key={item.key}
                      style={{ alignItems: "center", minWidth: 40 }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "500",
                          marginBottom: 5,
                          color: today
                            ? colors.primary
                            : isDark
                              ? "#4b5563"
                              : "#9ca3af",
                        }}
                      >
                        {item.dayLabel}
                      </Text>
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: filled
                            ? today
                              ? colors.primary
                              : isDark
                                ? "rgba(14,165,176,0.22)"
                                : "rgba(14,165,176,0.14)"
                            : today
                              ? "transparent"
                              : "transparent",
                          borderWidth: today && !filled ? 1.5 : 0,
                          borderColor: colors.primary,
                        }}
                      >
                        {filled && today ? (
                          <Check size={14} color="#fff" strokeWidth={3} />
                        ) : (
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: today || filled ? "700" : "400",
                              color: filled
                                ? today
                                  ? "#fff"
                                  : colors.primary
                                : today
                                  ? colors.primary
                                  : isDark
                                    ? "#d1d5db"
                                    : "#374151",
                            }}
                          >
                            {item.dayNumber}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 14,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 160,
        }}
      >
        {loading ? (
          <View className="rounded-3xl py-14 items-center justify-center">
            <ActivityIndicator color={colors.primary} size="large" />
            <Text className="text-sm text-gray-500 dark:text-gray-400 mt-3">
              Loading workout
            </Text>
          </View>
        ) : error ? (
          <View className="rounded-3xl border border-red-500/30 bg-red-500/10 p-4 mb-5">
            <Text className="text-red-300 font-semibold">
              Could not load your workout
            </Text>
            <Text className="text-red-200/90 text-sm mt-1">{error}</Text>
            <Button
              className="mt-4"
              variant="outline"
              onPress={() => void loadData()}
            >
              Try again
            </Button>
          </View>
        ) : !todayWorkout ? (
          <View
            className={cn(
              "rounded-3xl p-5 mb-5",
              isDark ? "bg-dark-card" : "bg-light-card",
            )}
          >
            <Text className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              No workout planned yet
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Create your first template and we will build your daily flow here.
            </Text>
            <View className="flex-row gap-2 mt-4">
              <Button
                className="flex-1"
                onPress={() => router.push("/workouts/create")}
              >
                Create workout
              </Button>
              <Button
                className="flex-1"
                variant="secondary"
                onPress={() => router.push("/workouts/explore")}
              >
                Explore
              </Button>
            </View>
          </View>
        ) : (
          <>
            {/* ── Today workout hero card ── */}
            <View
              style={{
                borderRadius: 24,
                overflow: "hidden",
                marginBottom: 20,
                backgroundColor: isDark ? "#1c1f27" : "#ffffff",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0.32 : 0.07,
                shadowRadius: 16,
                elevation: 6,
              }}
            >
              {/* Cover image */}
              <View
                style={{
                  aspectRatio: 16 / 9,
                  backgroundColor: isDark ? "#22252f" : "#f1f5f9",
                }}
              >
                {heroImageUri ? (
                  <Image
                    source={{ uri: heroImageUri }}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                    }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Dumbbell
                      size={36}
                      color={colors.muted}
                      strokeWidth={1.5}
                    />
                  </View>
                )}

                {/* Today badge — top left */}
                <View style={{ position: "absolute", top: 12, left: 12 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 20,
                      backgroundColor: colors.primary,
                    }}
                  >
                    <Flame size={11} color="#fff" />
                    <Text
                      style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}
                    >
                      Today
                    </Text>
                  </View>
                </View>

                {/* Active/Inactive badge — top right */}
                <View style={{ position: "absolute", top: 12, right: 12 }}>
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 20,
                      backgroundColor: todayWorkout.is_active
                        ? "rgba(5,150,105,0.85)"
                        : "rgba(100,116,139,0.75)",
                    }}
                  >
                    <Text
                      style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}
                    >
                      {todayWorkout.is_active ? "Active" : "Inactive"}
                    </Text>
                  </View>
                </View>

                {/* Name overlay — bottom */}
                <View
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 72,
                    backgroundColor: "rgba(0,0,0,0.48)",
                    justifyContent: "flex-end",
                    paddingHorizontal: 16,
                    paddingBottom: 12,
                  }}
                >
                  <Text
                    style={{ fontSize: 20, fontWeight: "700", color: "#fff" }}
                    numberOfLines={1}
                  >
                    {todayWorkout.name}
                  </Text>
                </View>
              </View>

              {/* Stats + action row */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    flexWrap: "wrap",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Clock3 size={13} color={colors.muted} />
                    <Text
                      style={{
                        fontSize: 13,
                        color: isDark ? "#d1d5db" : "#374151",
                      }}
                    >
                      {todayWorkout.estimated_duration_minutes} min
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Dumbbell size={13} color={colors.muted} />
                    <Text
                      style={{
                        fontSize: 13,
                        color: isDark ? "#d1d5db" : "#374151",
                      }}
                    >
                      {sections.reduce((acc, s) => acc + s.exercises.length, 0)}{" "}
                      exercises
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Target size={13} color={colors.muted} />
                    <Text
                      style={{
                        fontSize: 13,
                        color: isDark ? "#d1d5db" : "#374151",
                      }}
                    >
                      {focusArea}
                    </Text>
                  </View>
                  {todayWorkout.location ? (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <MapPin size={13} color={colors.muted} />
                      <Text
                        style={{
                          fontSize: 13,
                          color: isDark ? "#d1d5db" : "#374151",
                        }}
                      >
                        {todayWorkout.location}
                      </Text>
                    </View>
                  ) : null}
                  {todayWorkout.is_public ? (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <Globe size={13} color={colors.muted} />
                      <Text
                        style={{
                          fontSize: 13,
                          color: isDark ? "#d1d5db" : "#374151",
                        }}
                      >
                        Public
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Pressable
                  onPress={() => router.push(`/workouts/${todayWorkout.id}`)}
                  style={{ marginLeft: 8 }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: colors.primary,
                    }}
                  >
                    Details
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* ── Exercise plan ── */}
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: isDark ? "#f3f4f6" : "#111827",
                marginBottom: 12,
              }}
            >
              Exercise Plan
            </Text>

            <View style={{ gap: 10, marginBottom: 20 }}>
              {sections.map((section, sectionIndex) => {
                const baseKey = section.key.split("-")[0] as SessionSectionKey;
                const open = openSections[baseKey];
                const sectionTheme = isDark
                  ? (SECTION_COLORS_DARK[baseKey] ??
                    SECTION_COLORS_DARK.workout)
                  : (SECTION_COLORS[baseKey] ?? SECTION_COLORS.workout);

                return (
                  <View
                    key={`section-${sectionIndex}`}
                    style={{
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: sectionTheme.border,
                      overflow: "hidden",
                    }}
                  >
                    {/* Section header */}
                    <Pressable
                      onPress={() => toggleSection(baseKey)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        backgroundColor: sectionTheme.bg,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        {baseKey === "warmup" && (
                          <Flame size={15} color={sectionTheme.label} />
                        )}
                        {baseKey === "workout" && (
                          <Dumbbell size={15} color={sectionTheme.label} />
                        )}
                        {baseKey === "cooldown" && (
                          <Timer size={15} color={sectionTheme.label} />
                        )}
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: sectionTheme.label,
                            textTransform: "uppercase",
                            letterSpacing: 0.7,
                          }}
                        >
                          {section.title}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: sectionTheme.label,
                            opacity: 0.75,
                          }}
                        >
                          {section.subtitle}
                        </Text>
                      </View>
                      {open ? (
                        <ChevronDown size={16} color={sectionTheme.label} />
                      ) : (
                        <ChevronRight size={16} color={sectionTheme.label} />
                      )}
                    </Pressable>

                    {/* Exercise rows */}
                    {open ? (
                      <View
                        style={{
                          backgroundColor: isDark ? "#16181e" : "#ffffff",
                        }}
                      >
                        {section.exercises.length === 0 ? (
                          <Text
                            style={{
                              paddingHorizontal: 14,
                              paddingVertical: 14,
                              fontSize: 13,
                              fontStyle: "italic",
                              color: isDark ? "#6b7280" : "#9ca3af",
                            }}
                          >
                            No exercises in this section
                          </Text>
                        ) : (
                          section.exercises.map((exercise, idx) =>
                            renderExerciseRow(
                              exercise,
                              idx,
                              idx === section.exercises.length - 1,
                            ),
                          )
                        )}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* ── My Workouts section ── */}
        <View className="mt-2">
          {/* Section header */}
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
                My Workouts
              </Text>
              {workouts.length > 0 ? (
                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {workouts.filter((w) => w.is_active).length} active ·{" "}
                  {workouts.length} total
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={() => router.push("/workouts/library")}
              className="flex-row items-center gap-1 py-1 px-2"
            >
              <Text className="text-sm text-primary-500 font-semibold">
                See all
              </Text>
              <ChevronRight size={14} color={colors.primary} />
            </Pressable>
          </View>

          {/* Horizontal scroll cards */}
          {workouts.length > 0 ? (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={workouts.slice(0, 8)}
              keyExtractor={(item) => `card-${item.id}`}
              contentContainerStyle={{ gap: 10 }}
              renderItem={({ item: w }) => {
                const firstExercise = w.exercises[0];
                const thumbUri =
                  w.cover_image_url ??
                  (firstExercise
                    ? (catalogById[firstExercise.id]?.remote_image_urls?.[0] ??
                      null)
                    : null);
                const DIFF_COLOR: Record<string, string> = {
                  beginner: "#059669",
                  intermediate: "#0284c7",
                  advanced: "#dc2626",
                };
                const diffColor = DIFF_COLOR[w.difficulty] ?? "#0284c7";

                return (
                  <Pressable
                    onPress={() => router.push(`/workouts/${w.id}`)}
                    style={{
                      width: 158,
                      height: 136,
                      borderRadius: 18,
                      overflow: "hidden",
                    }}
                  >
                    {/* Background */}
                    {thumbUri ? (
                      <Image
                        source={{ uri: thumbUri }}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                        }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: diffColor + "20",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Dumbbell
                          size={28}
                          color={diffColor}
                          strokeWidth={1.5}
                        />
                      </View>
                    )}

                    {/* Bottom gradient overlay */}
                    <View
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 72,
                        backgroundColor: "rgba(0,0,0,0.55)",
                        paddingHorizontal: 10,
                        paddingBottom: 10,
                        justifyContent: "flex-end",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color: "#fff",
                        }}
                        numberOfLines={1}
                      >
                        {w.name}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 3,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            color: "rgba(255,255,255,0.65)",
                          }}
                        >
                          {w.estimated_duration_minutes} min
                        </Text>
                        <View
                          style={{
                            width: 2,
                            height: 2,
                            borderRadius: 1,
                            backgroundColor: "rgba(255,255,255,0.4)",
                          }}
                        />
                        <Text
                          style={{
                            fontSize: 11,
                            color: "rgba(255,255,255,0.65)",
                          }}
                        >
                          {w.exercises.length} exs
                        </Text>
                      </View>
                    </View>

                    {/* Active indicator badge — top left */}
                    <View
                      style={{
                        position: "absolute",
                        top: 8,
                        left: 8,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        paddingHorizontal: 7,
                        paddingVertical: 3,
                        borderRadius: 12,
                        backgroundColor: w.is_active
                          ? "rgba(5,150,105,0.85)"
                          : "rgba(71,85,105,0.7)",
                      }}
                    >
                      <View
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: 2.5,
                          backgroundColor: "#fff",
                        }}
                      />
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "700",
                          color: "#fff",
                        }}
                      >
                        {w.is_active ? "Active" : "Off"}
                      </Text>
                    </View>
                  </Pressable>
                );
              }}
            />
          ) : (
            <Pressable
              onPress={() => router.push("/workouts/library")}
              className={cn(
                "rounded-2xl p-4 flex-row items-center justify-between",
                isDark ? "bg-dark-surface" : "bg-light-card",
              )}
            >
              <View>
                <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  No workouts yet
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Create your first template to get started
                </Text>
              </View>
              <ChevronRight size={16} color={colors.muted} />
            </Pressable>
          )}
        </View>

        {/* ── Quick actions ── */}
        <View className="flex-row gap-2 mt-4">
          <Pressable
            onPress={() => router.push("/workouts/create")}
            className="flex-1 flex-row items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary-600 active:bg-primary-700"
          >
            <Sparkles size={15} color="#fff" />
            <Text className="text-sm font-semibold text-white">
              Create workout
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/workouts/history")}
            className={cn(
              "flex-1 flex-row items-center justify-center gap-2 py-3.5 rounded-2xl",
              isDark ? "bg-dark-surface" : "bg-light-card",
            )}
          >
            <Timer size={15} color={colors.muted} />
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              History
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {todayWorkout ? (
        <>
          {/* Backdrop – fades in as panel expands */}
          <Animated.View
            pointerEvents={panelExpanded ? "box-none" : "none"}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "#000",
              opacity: backdropOpacity,
            }}
          >
            <Pressable style={{ flex: 1 }} onPress={closePanel} />
          </Animated.View>

          {/* Expanding bottom panel */}
          <Animated.View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: panelHeight,
              overflow: "hidden",
              backgroundColor: colors.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: isDark ? 0.35 : 0.08,
              shadowRadius: 10,
              elevation: 10,
              flexDirection: "column-reverse",
            }}
            {...(Platform.OS === "web" ? {} : panelPanResponder.panHandlers)}
            onTouchStart={handleWebPanelTouchStart}
            onTouchMove={handleWebPanelTouchMove}
            onTouchEnd={handleWebPanelTouchEnd}
          >
            {/* 1st child in column-reverse = BOTTOM = always visible: action buttons */}
            <View
              style={{
                paddingTop: 12,
                paddingHorizontal: 16,
                paddingBottom: insets.bottom + 80,
              }}
            >
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Button
                  variant="outline"
                  className="flex-1"
                  size="lg"
                  onPress={() => (panelExpanded ? closePanel() : openPanel())}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <SlidersHorizontal
                      size={16}
                      color={isDark ? "#e5e7eb" : "#111827"}
                    />
                    <Text
                      style={{
                        color: isDark ? "#e5e7eb" : "#111827",
                        fontWeight: "600",
                        fontSize: 16,
                      }}
                    >
                      Adapt workout
                    </Text>
                  </View>
                </Button>

                <Button
                  className="flex-1"
                  size="lg"
                  onPress={() => {
                    if (!sessionTargetId) return;
                    router.push(`/workouts/${sessionTargetId}/run`);
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <Play size={16} color="#ffffff" />
                    <Text
                      style={{
                        color: "#ffffff",
                        fontWeight: "600",
                        fontSize: 16,
                      }}
                    >
                      {startActionLabel}
                    </Text>
                  </View>
                </Button>
              </View>
            </View>

            {/* 2nd child in column-reverse = MIDDLE = adapt options (revealed on expand) */}
            <Animated.View
              style={{
                paddingHorizontal: 16,
                paddingBottom: 16,
                opacity: adaptContentOpacity,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "600",
                  color: isDark ? "#f3f4f6" : "#111827",
                  marginTop: 4,
                }}
              >
                Adapt today session
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: isDark ? "#9ca3af" : "#4b5563",
                  marginTop: 4,
                  marginBottom: 12,
                }}
              >
                Tune this workout before starting.
              </Text>

              <View style={{ gap: 8 }}>
                <Pressable
                  style={{
                    borderRadius: 16,
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    backgroundColor: colors.card,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Dumbbell size={16} color={colors.muted} />
                    <Text
                      style={{
                        fontSize: 15,
                        color: isDark ? "#f3f4f6" : "#111827",
                      }}
                    >
                      Change workout type
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.muted} />
                </Pressable>

                <Pressable
                  style={{
                    borderRadius: 16,
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    backgroundColor: colors.card,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Timer size={16} color={colors.muted} />
                    <Text
                      style={{
                        fontSize: 15,
                        color: isDark ? "#f3f4f6" : "#111827",
                      }}
                    >
                      Adjust workout time
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.muted} />
                </Pressable>

                <Pressable
                  style={{
                    borderRadius: 16,
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    backgroundColor: colors.card,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Target size={16} color={colors.muted} />
                    <Text
                      style={{
                        fontSize: 15,
                        color: isDark ? "#f3f4f6" : "#111827",
                      }}
                    >
                      Change difficulty
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.muted} />
                </Pressable>

                <Pressable
                  style={{
                    borderRadius: 16,
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    backgroundColor: colors.card,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Compass size={16} color={colors.muted} />
                    <Text
                      style={{
                        fontSize: 15,
                        color: isDark ? "#f3f4f6" : "#111827",
                      }}
                    >
                      Use another location
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.muted} />
                </Pressable>
              </View>

              <View style={{ marginTop: 12 }}>
                <Button
                  variant="secondary"
                  onPress={() => {
                    closePanel();
                    router.push("/workouts/create");
                  }}
                >
                  Create new session
                </Button>
              </View>
            </Animated.View>

            {/* 3rd child in column-reverse = TOP = drag handle (visible when expanded) */}
            <View
              style={{ alignItems: "center", paddingTop: 10, paddingBottom: 6 }}
            >
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: isDark ? "#4b5563" : "#d1d5db",
                }}
              />
            </View>
          </Animated.View>
        </>
      ) : null}

      {inspectId && inspectExercise ? (
        <ExerciseInspectModal
          visible
          exerciseId={inspectId}
          exerciseName={inspectExercise.name}
          sets={inspectExercise.sets}
          prescription={inspectExercise.prescription}
          official={inspectOfficial}
          onClose={() => setInspectId(null)}
        />
      ) : null}
    </View>
  );
}
