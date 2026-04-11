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
  ChevronDown,
  ChevronRight,
  Clock3,
  Compass,
  Dumbbell,
  Flame,
  FolderOpen,
  Play,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Target,
  Timer,
} from "lucide-react-native";
import {
  listWorkoutTemplates,
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
  exercises: WorkoutTemplateRecord["exercises"];
}

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
  const warmup = exercises.slice(0, warmupCount);
  const cooldown =
    cooldownCount > 0 ? exercises.slice(total - cooldownCount) : [];
  const mainStart = warmup.length;
  const mainEnd = cooldown.length > 0 ? total - cooldown.length : total;
  const workout = exercises.slice(mainStart, mainEnd);

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
          ? `${cooldown.length} exercise${cooldown.length > 1 ? "s" : ""}`
          : "No cooldown planned",
      exercises: cooldown,
    },
  ];
}

export default function WorkoutsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
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
  const [weekOffset, setWeekOffset] = useState(0);

  // Panel slide-up animation
  const COLLAPSED_H = insets.bottom + 144; // pt-3(12) + btn-lg(52) + tabBar(80)
  const EXPAND_CONTENT_H = 400;
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
  const weekScrollRef = useRef<ScrollView | null>(null);

  const todayWorkout = workouts[0] ?? null;
  const focusArea = useMemo(
    () => resolveFocusArea(todayWorkout),
    [todayWorkout],
  );
  const sections = useMemo(
    () => buildSessionSections(todayWorkout?.exercises ?? []),
    [todayWorkout],
  );

  const weekCompletion = useMemo(() => {
    const todayIdx = toMondayFirstIndex(new Date());
    const result = new Set<number>();
    if (workouts.length > 0) {
      result.add(todayIdx);
      result.add((todayIdx + 6) % 7);
      if (workouts.length > 1) {
        result.add((todayIdx + 5) % 7);
      }
    }
    return { todayIdx, done: result };
  }, [workouts.length]);

  const weekPages = useMemo(() => {
    const today = new Date();
    const currentMonday = startOfWeekMonday(today);
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

        return {
          key: `${off}-${date.toISOString()}`,
          dayLabel: WEEK_DAYS[idx],
          dayNumber: date.getDate(),
          isToday,
          isDone: off === 0 && weekCompletion.done.has(idx),
        };
      });
    });
  }, [weekCompletion.done]);

  useEffect(() => {
    // ensure current (center) week visible on mount
    const node = weekScrollRef.current as any;
    if (!node) return;

    const tryScroll = () => {
      try {
        if (Platform.OS === "web") {
          if (typeof node.scrollTo === "function") {
            node.scrollTo({ left: weekPagerWidth * 1, behavior: "auto" });
            return;
          }
          if (node && "scrollLeft" in node) {
            node.scrollLeft = weekPagerWidth * 1;
            return;
          }
        }

        // native ScrollView
        if (typeof node.scrollTo === "function") {
          node.scrollTo({ x: weekPagerWidth * 1, animated: false });
        }
      } catch (_e) {}
    };

    const id = setTimeout(tryScroll, 50);
    return () => clearTimeout(id);
  }, [weekPagerWidth, weekPages.length]);

  const heroImageUri = useMemo(() => {
    const firstExercise = todayWorkout?.exercises[0];
    if (!firstExercise) {
      return null;
    }
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

      const [templates, catalog] = await Promise.all([
        listWorkoutTemplates(user.uid),
        getExerciseCatalog(),
      ]);

      const sorted = [...templates].sort((a, b) =>
        b.updated_at.localeCompare(a.updated_at),
      );
      setWorkouts(sorted);

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
  }, [showToast, user?.uid]);

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
    if (!todayWorkout) {
      return;
    }
    router.push(
      `/workouts/${todayWorkout.id}?exerciseId=${encodeURIComponent(exerciseId)}`,
    );
  };

  const renderExerciseRow = (
    exercise: WorkoutTemplateRecord["exercises"][number],
    sectionKey: SessionSectionKey,
    index: number,
  ) => {
    const imageUri = catalogById[exercise.id]?.remote_image_urls?.[0] ?? null;
    const roundLabel =
      sectionKey === "workout"
        ? `Round ${Math.floor(index / 3) + 1}`
        : undefined;

    return (
      <Pressable
        key={`${sectionKey}-${exercise.id}-${index}`}
        onPress={() => handleOpenExerciseDetail(exercise.id)}
        className={cn(
          "rounded-2xl p-3 mb-3",
          isDark ? "bg-dark-surface" : "bg-light-surface",
        )}
      >
        {roundLabel ? (
          <Text className="text-xs font-semibold text-primary-500 mb-2">
            {roundLabel}
          </Text>
        ) : null}

        <View className="flex-row items-center gap-3">
          <View className="h-16 w-16 rounded-xl overflow-hidden bg-black/10">
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                className="h-full w-full"
                resizeMode="cover"
              />
            ) : (
              <View className="h-full w-full items-center justify-center">
                <Dumbbell size={20} color={colors.muted} />
              </View>
            )}
          </View>

          <View className="flex-1">
            <Text
              className="text-base font-semibold text-gray-900 dark:text-gray-100"
              numberOfLines={1}
            >
              {exercise.name}
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {exercise.sets} sets x {exercise.reps} reps
            </Text>
          </View>

          <ChevronRight size={18} color={colors.muted} />
        </View>
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <View
        className={cn(
          "px-4 border-b",
          isDark
            ? "bg-dark-surface border-dark-border"
            : "bg-light-surface border-light-border",
        )}
        style={{ paddingTop: insets.top + 8, paddingBottom: 12 }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Flame size={16} color={colors.primary} />
            <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Streak {weekCompletion.done.size}d
            </Text>
          </View>

          <Pressable
            onPress={() => router.push("/settings")}
            className={cn(
              "h-10 w-10 rounded-xl items-center justify-center",
              isDark ? "bg-dark-card" : "bg-light-card",
            )}
          >
            <Settings2 size={18} color={isDark ? "#d1d5db" : "#334155"} />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          className={cn(
            "mt-3 rounded-2xl",
            isDark ? "bg-dark-card" : "bg-light-card",
          )}
          contentContainerStyle={{ width: weekPagerWidth * weekPages.length }}
          ref={(r) => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore - platform ScrollView ref type
            weekScrollRef.current = r;
          }}
          onMomentumScrollEnd={(event) => {
            const page = Math.round(
              event.nativeEvent.contentOffset.x / weekPagerWidth,
            );
            setWeekOffset(Math.max(0, Math.min(weekPages.length - 1, page)));
          }}
        >
          {weekPages.map((days, pageIndex) => {
            return (
              <View
                key={`week-${pageIndex}`}
                className="px-2 py-2"
                style={{ width: weekPagerWidth }}
              >
                <View className="flex-row items-center justify-between">
                  {days.map((item) => {
                    return (
                      <View
                        key={item.key}
                        className="items-center gap-1.5 min-w-[44px]"
                      >
                        <View
                          className={cn(
                            "h-2.5 w-2.5 rounded-full",
                            item.isDone ? "bg-primary-500" : "bg-gray-500/25",
                          )}
                        />
                        <View
                          className={cn(
                            "px-2 py-1 rounded-full",
                            item.isToday
                              ? "bg-primary-500/20"
                              : "bg-transparent",
                          )}
                        >
                          <Text
                            className={cn(
                              "text-[11px] text-center",
                              item.isToday
                                ? "text-primary-500 font-semibold"
                                : "text-gray-500 dark:text-gray-400",
                            )}
                          >
                            {item.dayLabel}
                          </Text>
                          <Text
                            className={cn(
                              "text-sm text-center",
                              item.isToday
                                ? "text-gray-900 dark:text-gray-100 font-semibold"
                                : "text-gray-700 dark:text-gray-300",
                            )}
                          >
                            {item.dayNumber}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 14,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 120,
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
            <View
              className={cn(
                "rounded-3xl p-4 mb-5",
                isDark ? "bg-dark-card" : "bg-light-card",
              )}
            >
              <View className="flex-row items-start justify-between mb-3">
                <View className="flex-1 pr-3">
                  <Text className="text-xs uppercase tracking-widest text-primary-500 font-semibold">
                    Today plan
                  </Text>
                  <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {todayWorkout.name}
                  </Text>
                </View>

                <Button
                  size="sm"
                  onPress={() => {
                    const id =
                      sessionActive && sessionTemplateId
                        ? sessionTemplateId
                        : todayWorkout.id;
                    router.push(`/workouts/${id}/run`);
                  }}
                >
                  <View className="flex-row items-center gap-1">
                    <Play size={14} color="#ffffff" />
                    <Text className="text-white font-semibold">
                      {sessionActive ? "Resume" : "Start"}
                    </Text>
                  </View>
                </Button>
              </View>

              <View
                className="rounded-2xl overflow-hidden bg-black/10 mb-4"
                style={{ aspectRatio: 16 / 9 }}
              >
                {heroImageUri ? (
                  <Image
                    source={{ uri: heroImageUri }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="h-full w-full items-center justify-center">
                    <Dumbbell size={28} color={colors.muted} />
                  </View>
                )}
              </View>

              <View className="flex-row flex-wrap gap-3">
                <View className="flex-row items-center gap-1.5">
                  <Clock3 size={15} color={colors.muted} />
                  <Text className="text-sm text-gray-700 dark:text-gray-300">
                    {todayWorkout.estimated_duration_minutes} min
                  </Text>
                </View>

                <View className="flex-row items-center gap-1.5">
                  <Target size={15} color={colors.muted} />
                  <Text className="text-sm text-gray-700 dark:text-gray-300">
                    {focusArea}
                  </Text>
                </View>

                <View className="flex-row items-center gap-1.5">
                  <Dumbbell size={15} color={colors.muted} />
                  <Text className="text-sm text-gray-700 dark:text-gray-300">
                    {todayWorkout.exercises.length} exercises
                  </Text>
                </View>
              </View>
            </View>

            {workouts.length > 1 ? (
              <View
                className={cn(
                  "rounded-2xl p-4 mb-4",
                  isDark ? "bg-dark-card" : "bg-light-card",
                )}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    History
                  </Text>
                  <Pressable onPress={() => router.push("/workouts/history")}>
                    <Text className="text-sm text-primary-500">View all</Text>
                  </Pressable>
                </View>

                {workouts.slice(1, 4).map((w) => (
                  <Pressable
                    key={w.id}
                    onPress={() => router.push(`/workouts/${w.id}`)}
                    className={cn(
                      "py-3",
                      isDark
                        ? "border-b border-dark-border"
                        : "border-b border-light-border",
                    )}
                  >
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {w.name}
                        </Text>
                        <Text className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(
                            w.updated_at || w.created_at,
                          ).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text className="text-xs text-gray-500 dark:text-gray-400">
                        {w.estimated_duration_minutes} min
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View className="mb-5">
              {sections.map((section) => {
                const open = openSections[section.key];
                return (
                  <View
                    key={section.key}
                    className={cn(
                      "rounded-2xl mb-3 overflow-hidden",
                      isDark ? "bg-dark-card" : "bg-light-card",
                    )}
                  >
                    <Pressable
                      onPress={() => toggleSection(section.key)}
                      className="px-4 py-3 flex-row items-center justify-between"
                    >
                      <View>
                        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {section.title}
                        </Text>
                        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {section.subtitle}
                        </Text>
                      </View>
                      {open ? (
                        <ChevronDown size={18} color={colors.muted} />
                      ) : (
                        <ChevronRight size={18} color={colors.muted} />
                      )}
                    </Pressable>

                    {open ? (
                      <View className="px-3 pb-2">
                        {section.exercises.length === 0 ? (
                          <Text className="text-sm text-gray-500 dark:text-gray-400 px-1 pb-2">
                            No items in this section.
                          </Text>
                        ) : (
                          section.exercises.map((exercise, idx) =>
                            renderExerciseRow(exercise, section.key, idx),
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

        <View
          className={cn(
            "rounded-3xl p-4",
            isDark ? "bg-dark-card" : "bg-light-card",
          )}
        >
          <Text className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Build and manage workouts
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-4">
            Open your templates, explore public workouts, or create custom plans
            manually and with AI.
          </Text>

          <View className="gap-2">
            <Pressable
              onPress={() => router.push("/workouts")}
              className={cn(
                "rounded-2xl p-3 flex-row items-center justify-between",
                isDark ? "bg-dark-surface" : "bg-light-surface",
              )}
            >
              <View className="flex-row items-center gap-3">
                <FolderOpen size={18} color={colors.muted} />
                <Text className="text-base text-gray-900 dark:text-gray-100">
                  My workout templates
                </Text>
              </View>
              <ChevronRight size={16} color={colors.muted} />
            </Pressable>

            <Pressable
              onPress={() => router.push("/workouts/explore")}
              className={cn(
                "rounded-2xl p-3 flex-row items-center justify-between",
                isDark ? "bg-dark-surface" : "bg-light-surface",
              )}
            >
              <View className="flex-row items-center gap-3">
                <Compass size={18} color={colors.muted} />
                <Text className="text-base text-gray-900 dark:text-gray-100">
                  Explore public workouts
                </Text>
              </View>
              <ChevronRight size={16} color={colors.muted} />
            </Pressable>

            <Pressable
              onPress={() => router.push("/workouts/create")}
              className={cn(
                "rounded-2xl p-3 flex-row items-center justify-between",
                isDark ? "bg-dark-surface" : "bg-light-surface",
              )}
            >
              <View className="flex-row items-center gap-3">
                <Sparkles size={18} color={colors.primary} />
                <Text className="text-base text-gray-900 dark:text-gray-100">
                  Create manual or AI workout
                </Text>
              </View>
              <ChevronRight size={16} color={colors.muted} />
            </Pressable>
          </View>
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
                    const id =
                      sessionActive && sessionTemplateId
                        ? sessionTemplateId
                        : todayWorkout.id;
                    router.push(`/workouts/${id}/run`);
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
                      {sessionActive ? "Resume" : "Start"}
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
    </View>
  );
}
