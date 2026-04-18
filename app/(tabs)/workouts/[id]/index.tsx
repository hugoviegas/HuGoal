import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal as RNModal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Check,
  Clock3,
  Copy,
  Dumbbell,
  Edit3,
  Globe,
  Lock,
  MapPin,
  MoreHorizontal,
  Play,
  Trash2,
  X,
} from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { MuscleMap } from "@/components/workouts/MuscleMap";
import { ExerciseInspectModal } from "@/components/workouts/ExerciseInspectModal";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import {
  clearPausedWorkoutSession,
  deleteWorkoutTemplate,
  duplicateWorkoutTemplate,
  getPausedWorkoutSession,
  getWorkoutTemplate,
  updateWorkoutTemplate,
  type PausedWorkoutSessionRecord,
  type WorkoutTemplateBlockRecord,
  type WorkoutTemplateExerciseRecord,
  type WorkoutTemplateRecord,
} from "@/lib/firestore/workouts";
import { getExerciseCatalog } from "@/lib/workouts/exercise-catalog";
import type { OfficialExerciseRecord } from "@/lib/workouts/generated/official-exercises";
import { cn } from "@/lib/utils";

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeExerciseKey(value: string): string {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function difficultyColor(difficulty: string): string {
  if (difficulty === "advanced") return "#ef4444";
  if (difficulty === "intermediate") return "#f59e0b";
  return "#22c55e";
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

// ─── Section helpers ─────────────────────────────────────────────────────────

interface SupersetExercise {
  exercise_id: string;
  name: string;
  primary_muscles: string[];
}

interface ExerciseGroup {
  type: "exercise_group";
  exercise_id: string;
  name: string;
  sets: number;
  reps?: string;
  execution_mode: "reps" | "time";
  exercise_seconds?: number;
  weight_kg?: number;
  rest_seconds?: number;
  primary_muscles: string[];
  superset_pair?: SupersetExercise[];
  rounds?: number;
}

interface RestGroup {
  type: "rest_group";
  rest_seconds: number;
  label: string;
}

type SectionDisplayRow = ExerciseGroup | RestGroup;

interface NormalizedSection {
  key: string;
  label: string;
  type: "warmup" | "round" | "cooldown";
  rows: SectionDisplayRow[];
  exerciseCount: number;
}

function mapBlockToExerciseGroup(
  block: WorkoutTemplateBlockRecord,
): ExerciseGroup | null {
  if (block.type !== "exercise" || !block.exercise_id) {
    return null;
  }

  const executionMode: "reps" | "time" =
    block.execution_mode ??
    ((block.exercise_seconds ?? block.duration_seconds ?? 0) > 0
      ? "time"
      : "reps");

  return {
    type: "exercise_group",
    exercise_id: block.exercise_id,
    name: block.name ?? block.exercise_id,
    sets: 1,
    reps: block.reps,
    execution_mode: executionMode,
    exercise_seconds:
      executionMode === "time"
        ? Math.max(1, block.exercise_seconds ?? block.duration_seconds ?? 30)
        : undefined,
    weight_kg: block.weight_kg,
    primary_muscles: block.primary_muscles ?? [],
  };
}

function buildRestGroup(restBlock: WorkoutTemplateBlockRecord): RestGroup {
  const restSeconds = Math.max(0, restBlock.rest_seconds ?? 0);
  const notesText = (restBlock.notes ?? "").toLowerCase();
  const isBetweenRounds =
    restSeconds >= 90 || notesText.includes("between round");

  return {
    type: "rest_group",
    rest_seconds: restSeconds,
    label: isBetweenRounds ? "Rest between rounds" : "Rest",
  };
}

function buildSupersetGroup(
  blocks: WorkoutTemplateBlockRecord[],
  startIndex: number,
): { group: ExerciseGroup; nextIndex: number } | null {
  const first = blocks[startIndex];
  if (first?.type !== "exercise" || !first.exercise_id) {
    return null;
  }

  const firstRest = blocks[startIndex + 1];
  const second = blocks[startIndex + 2];
  const secondRest = blocks[startIndex + 3];

  if (
    firstRest?.type !== "rest" ||
    second?.type !== "exercise" ||
    !second.exercise_id ||
    second.exercise_id === first.exercise_id ||
    secondRest?.type !== "rest"
  ) {
    return null;
  }

  const firstMode: "reps" | "time" =
    first.execution_mode ??
    ((first.exercise_seconds ?? first.duration_seconds ?? 0) > 0
      ? "time"
      : "reps");

  let cursor = startIndex;
  let rounds = 0;
  let restSeconds = Math.max(
    0,
    firstRest.rest_seconds ?? secondRest.rest_seconds ?? 0,
  );

  while (cursor < blocks.length) {
    const a = blocks[cursor];
    const restAB = blocks[cursor + 1];
    const b = blocks[cursor + 2];

    if (
      a?.type !== "exercise" ||
      a.exercise_id !== first.exercise_id ||
      restAB?.type !== "rest" ||
      b?.type !== "exercise" ||
      b.exercise_id !== second.exercise_id
    ) {
      break;
    }

    rounds += 1;
    restSeconds = Math.max(0, restSeconds || (restAB.rest_seconds ?? 0));
    cursor += 3;

    const restBA = blocks[cursor];
    const nextA = blocks[cursor + 1];
    if (
      restBA?.type === "rest" &&
      nextA?.type === "exercise" &&
      nextA.exercise_id === first.exercise_id
    ) {
      restSeconds = Math.max(0, restSeconds || (restBA.rest_seconds ?? 0));
      cursor += 1;
      continue;
    }

    break;
  }

  if (rounds === 0) {
    return null;
  }

  return {
    group: {
      type: "exercise_group",
      exercise_id: first.exercise_id,
      name: `${first.name ?? first.exercise_id} + ${second.name ?? second.exercise_id}`,
      sets: rounds,
      rounds,
      reps: first.reps,
      execution_mode: firstMode,
      exercise_seconds:
        firstMode === "time"
          ? Math.max(1, first.exercise_seconds ?? first.duration_seconds ?? 30)
          : undefined,
      rest_seconds: restSeconds > 0 ? restSeconds : undefined,
      primary_muscles: Array.from(
        new Set([
          ...(first.primary_muscles ?? []),
          ...(second.primary_muscles ?? []),
        ]),
      ),
      superset_pair: [
        {
          exercise_id: first.exercise_id,
          name: first.name ?? first.exercise_id,
          primary_muscles: first.primary_muscles ?? [],
        },
        {
          exercise_id: second.exercise_id,
          name: second.name ?? second.exercise_id,
          primary_muscles: second.primary_muscles ?? [],
        },
      ],
    },
    nextIndex: cursor,
  };
}

export function groupSectionBlocks(
  blocks: WorkoutTemplateBlockRecord[],
): SectionDisplayRow[] {
  const sorted = [...blocks].sort((a, b) => a.order - b.order);
  const rows: SectionDisplayRow[] = [];

  let index = 0;
  while (index < sorted.length) {
    const current = sorted[index];

    if (current.type === "rest") {
      rows.push(buildRestGroup(current));
      index += 1;
      continue;
    }

    if (!current.exercise_id) {
      index += 1;
      continue;
    }

    const superset = buildSupersetGroup(sorted, index);
    if (superset) {
      rows.push(superset.group);
      index = superset.nextIndex;
      continue;
    }

    const currentGroup = mapBlockToExerciseGroup(current);
    if (!currentGroup) {
      index += 1;
      continue;
    }

    let sets = 1;
    let restSeconds: number | undefined;
    let cursor = index + 1;

    while (cursor < sorted.length) {
      const maybeRest = sorted[cursor];
      const maybeNextExercise = sorted[cursor + 1];

      if (
        maybeRest?.type === "rest" &&
        maybeNextExercise?.type === "exercise" &&
        maybeNextExercise.exercise_id === current.exercise_id
      ) {
        if (restSeconds === undefined && maybeRest.rest_seconds !== undefined) {
          restSeconds = Math.max(0, maybeRest.rest_seconds);
        }
        sets += 1;
        cursor += 2;
        continue;
      }

      if (
        maybeRest?.type === "exercise" &&
        maybeRest.exercise_id === current.exercise_id
      ) {
        sets += 1;
        cursor += 1;
        continue;
      }

      break;
    }

    rows.push({
      ...currentGroup,
      sets,
      rest_seconds: sets > 1 ? restSeconds : undefined,
    });
    index = cursor;
  }

  return rows;
}

function normalizeSections(record: WorkoutTemplateRecord): NormalizedSection[] {
  if (record.sections && record.sections.length > 0) {
    let roundNumber = 0;
    return [...record.sections]
      .sort((a, b) => a.order - b.order)
      .map((section) => {
        if (section.type === "round") {
          roundNumber += 1;
        }

        const sortedBlocks = [...section.blocks].sort(
          (a, b) => a.order - b.order,
        );
        const rows: SectionDisplayRow[] =
          section.type === "round"
            ? groupSectionBlocks(sortedBlocks)
            : sortedBlocks
                .map((block) => mapBlockToExerciseGroup(block))
                .filter((row): row is ExerciseGroup => Boolean(row));

        return {
          key: section.id,
          label:
            section.type === "round"
              ? `Round ${roundNumber}`
              : section.type === "warmup"
                ? "Warmup"
                : "Cooldown",
          type: section.type,
          rows,
          exerciseCount: sortedBlocks.filter(
            (block) => block.type === "exercise" && block.exercise_id,
          ).length,
        };
      });
  }

  const exs = record.exercises;
  const total = exs.length;
  if (total === 0) {
    return [
      {
        key: "warmup",
        label: "Warmup",
        type: "warmup",
        rows: [],
        exerciseCount: 0,
      },
      {
        key: "workout",
        label: "Round 1",
        type: "round",
        rows: [],
        exerciseCount: 0,
      },
      {
        key: "cooldown",
        label: "Cooldown",
        type: "cooldown",
        rows: [],
        exerciseCount: 0,
      },
    ];
  }

  const warmupCount = total > 5 ? 2 : 1;
  const cooldownCount = total > 3 ? 1 : 0;
  const warmup = exs.slice(0, warmupCount);
  const cooldown = cooldownCount > 0 ? exs.slice(total - cooldownCount) : [];
  const main = exs.slice(
    warmup.length,
    cooldown.length > 0 ? total - cooldown.length : total,
  );

  const toRows = (
    items: WorkoutTemplateExerciseRecord[],
  ): SectionDisplayRow[] =>
    items.map((exercise) => ({
      type: "exercise_group",
      exercise_id: exercise.id,
      name: exercise.name,
      sets: Math.max(1, exercise.sets || 1),
      reps: exercise.reps,
      execution_mode: "reps",
      primary_muscles: exercise.muscleGroups ?? [],
    }));

  return [
    {
      key: "warmup",
      label: "Warmup",
      type: "warmup",
      rows: toRows(warmup),
      exerciseCount: warmup.length,
    },
    {
      key: "workout",
      label: "Round 1",
      type: "round",
      rows: toRows(main),
      exerciseCount: main.length,
    },
    {
      key: "cooldown",
      label: "Cooldown",
      type: "cooldown",
      rows: toRows(cooldown),
      exerciseCount: cooldown.length,
    },
  ];
}

const SECTION_COLORS: Record<
  string,
  { bg: string; border: string; label: string }
> = {
  warmup: { bg: "#fef9c3", border: "#fde047", label: "#a16207" },
  round: { bg: "#ccfbf1", border: "#5eead4", label: "#0f766e" },
  cooldown: { bg: "#dbeafe", border: "#93c5fd", label: "#1d4ed8" },
};

const SECTION_COLORS_DARK: Record<
  string,
  { bg: string; border: string; label: string }
> = {
  warmup: { bg: "#422006", border: "#78350f", label: "#fde68a" },
  round: { bg: "#042f2e", border: "#115e59", label: "#5eead4" },
  cooldown: { bg: "#1e3a8a", border: "#1d4ed8", label: "#93c5fd" },
};

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const { isDark, colors } = useThemeStore();
  const showToast = useToastStore((state) => state.show);

  const [workout, setWorkout] = useState<WorkoutTemplateRecord | null>(null);
  const [catalogLookup, setCatalogLookup] = useState<
    Record<string, OfficialExerciseRecord>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pausedSession, setPausedSession] =
    useState<PausedWorkoutSessionRecord | null>(null);

  // Inspect modal
  const [inspectId, setInspectId] = useState<string | null>(null);

  // Options sheet
  const [menuVisible, setMenuVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;

  const openInspect = (exerciseId: string) => {
    setInspectId(exerciseId);
  };

  const closeInspect = () => {
    setInspectId(null);
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const [workoutRecord, catalog] = await Promise.all([
          getWorkoutTemplate(String(id)),
          getExerciseCatalog(),
        ]);

        if (!mounted) return;
        if (!workoutRecord) {
          setWorkout(null);
          setError("Workout not found.");
          return;
        }

        const byId: Record<string, OfficialExerciseRecord> = {};
        for (const item of catalog.exercises) {
          byId[item.id] = item;
          byId[normalizeExerciseKey(item.id)] = item;
          byId[normalizeExerciseKey(item.name)] = item;
          if (item.name_en) byId[normalizeExerciseKey(item.name_en)] = item;
          if ((item as any).source_id)
            byId[normalizeExerciseKey((item as any).source_id)] = item;
          for (const alias of item.aliases ?? []) {
            byId[normalizeExerciseKey(alias)] = item;
          }
        }

        setCatalogLookup(byId);
        setWorkout(workoutRecord);
      } catch (loadError) {
        console.error("[workoutDetail] load failed", loadError);
        if (!mounted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load workout.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!user?.uid || !id) {
        if (mounted) setPausedSession(null);
        return;
      }
      try {
        const paused = await getPausedWorkoutSession(user.uid, String(id));
        if (mounted) setPausedSession(paused);
      } catch {}
    })();

    return () => {
      mounted = false;
    };
  }, [id, user?.uid]);

  const sections = useMemo(() => {
    if (!workout) return [];
    return normalizeSections(workout);
  }, [workout]);

  // All exercises flattened for inspect lookup
  const allExercises = useMemo(() => {
    if (!workout) return [];
    if (workout.sections && workout.sections.length > 0) {
      return workout.sections.flatMap((s) =>
        s.blocks
          .filter((b) => b.type === "exercise" && b.exercise_id)
          .map((b) => ({
            id: b.exercise_id!,
            name: b.name ?? b.exercise_id!,
            sets: 1,
            prescription: formatBlockPrescription(b),
          })),
      );
    }
    return workout.exercises.map((e) => ({
      id: e.id,
      name: e.name,
      sets: e.sets,
      prescription: e.reps,
    }));
  }, [workout]);

  const inspectExercise = useMemo(() => {
    if (!inspectId) return null;
    return allExercises.find((e) => e.id === inspectId) ?? null;
  }, [inspectId, allExercises]);

  const inspectOfficial = useMemo(() => {
    if (!inspectId) return null;
    return (
      catalogLookup[inspectId] ??
      catalogLookup[normalizeExerciseKey(inspectId)] ??
      null
    );
  }, [inspectId, catalogLookup]);

  // Total exercise count across all sections
  const totalExerciseCount = useMemo(
    () => sections.reduce((acc, s) => acc + s.exerciseCount, 0),
    [sections],
  );

  const handleStartWorkout = async () => {
    if (!id) return;
    if (user?.uid) {
      try {
        await clearPausedWorkoutSession(user.uid, String(id));
        setPausedSession(null);
      } catch {}
    }
    router.push(`/workouts/${id}/run`);
  };

  // ── Sheet helpers ─────────────────────────────────────────────────────────

  const backdropOpacity = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.55],
  });

  const sheetTranslateY = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [460, 0],
  });

  const openSheet = () => {
    setMenuVisible(true);
    Animated.spring(sheetAnim, {
      toValue: 1,
      useNativeDriver: true,
      bounciness: 1,
      speed: 14,
    }).start();
  };

  const closeSheet = (callback?: () => void) => {
    Animated.spring(sheetAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 16,
    }).start(() => {
      setMenuVisible(false);
      setConfirmDelete(false);
      callback?.();
    });
  };

  const handleEdit = () =>
    closeSheet(() => router.push(`/workouts/${id}/edit`));

  const handleDuplicate = async () => {
    if (!user?.uid || !workout) return;
    setActionLoading(true);
    try {
      const copy = await duplicateWorkoutTemplate(user.uid, String(id));
      showToast("Workout duplicated", "success");
      closeSheet(() => router.push(`/workouts/${copy.id}`));
    } catch {
      showToast("Could not duplicate workout", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!workout) return;
    const next = !workout.is_active;
    setActionLoading(true);
    try {
      await updateWorkoutTemplate(String(id), { is_active: next });
      setWorkout((prev) => (prev ? { ...prev, is_active: next } : prev));
      showToast(next ? "Workout activated" : "Workout deactivated", "success");
      closeSheet();
    } catch {
      showToast("Could not update workout", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePublic = async () => {
    if (!workout) return;
    const next = !workout.is_public;
    setActionLoading(true);
    try {
      await updateWorkoutTemplate(String(id), { is_public: next });
      setWorkout((prev) => (prev ? { ...prev, is_public: next } : prev));
      showToast(
        next ? "Workout is now public" : "Workout is now private",
        "success",
      );
      closeSheet();
    } catch {
      showToast("Could not update workout", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = () => {
    setConfirmDelete(true);
  };

  const handleDeleteExecute = async () => {
    const workoutId = String(id);
    setActionLoading(true);
    try {
      await deleteWorkoutTemplate(workoutId);
      showToast("Workout deleted", "success");
      closeSheet(() => router.back());
    } catch {
      showToast("Could not delete workout", "error");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View className={cn("flex-1", isDark ? "bg-dark-bg" : "bg-light-bg")}>
        <View className="h-56 bg-gray-300/20" />
        <View className="px-4 pt-4">
          <View className="h-8 w-44 rounded-lg bg-gray-300/25 mb-3" />
          <View className="h-4 w-56 rounded bg-gray-300/25" />
        </View>
      </View>
    );
  }

  if (!workout) {
    return (
      <View
        className={cn(
          "flex-1 items-center justify-center px-6",
          isDark ? "bg-dark-bg" : "bg-light-bg",
        )}
      >
        <Text className="text-base text-center text-gray-900 dark:text-gray-100 font-semibold">
          {error ?? "Workout unavailable."}
        </Text>
        <Button className="mt-4" onPress={() => router.back()}>
          Go back
        </Button>
      </View>
    );
  }

  const hasPausedSession = !!pausedSession;
  const tabBarClearance = insets.bottom + 160;
  const headerHeight = insets.top + 56;

  return (
    <View className={cn("flex-1", isDark ? "bg-dark-bg" : "bg-light-bg")}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: headerHeight + 8,
          paddingBottom: tabBarClearance + 40,
        }}
      >
        {/* ── Workout cover image (full bleed) ── */}
        <View
          className="w-full mb-4 overflow-hidden"
          style={{
            aspectRatio: 16 / 9,
            backgroundColor: isDark ? "#22252f" : "#f1f5f9",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: isDark ? 0.35 : 0.12,
            shadowRadius: 14,
            elevation: 10,
          }}
        >
          {workout.cover_image_url ? (
            <Image
              source={{ uri: workout.cover_image_url }}
              className="h-full w-full"
              resizeMode="cover"
            />
          ) : (
            <View className="h-full w-full items-center justify-center gap-2">
              <Dumbbell size={40} color={colors.muted} />
              <Text
                className="text-sm text-gray-400 dark:text-gray-500"
                style={{ marginTop: 8 }}
              >
                No cover image
              </Text>
            </View>
          )}
        </View>

        <View className="px-4">
          {/* ── Workout title & description ── */}
          <Text className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            {workout.name}
          </Text>
          {workout.description ? (
            <Text className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
              {workout.description}
            </Text>
          ) : null}

          {/* ── Meta badges ── */}
          <View className="flex-row flex-wrap gap-2 mb-5">
            <View
              className={cn(
                "px-3 py-1.5 rounded-full",
                isDark ? "bg-dark-surface" : "bg-light-surface",
              )}
            >
              <Text
                className="text-xs font-bold uppercase tracking-wide"
                style={{ color: difficultyColor(workout.difficulty) }}
              >
                {workout.difficulty}
              </Text>
            </View>
            <View
              className={cn(
                "px-3 py-1.5 rounded-full flex-row items-center gap-1",
                isDark ? "bg-dark-surface" : "bg-light-surface",
              )}
            >
              <Clock3 size={12} color={colors.muted} />
              <Text className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                {workout.estimated_duration_minutes} min
              </Text>
            </View>
            <View
              className={cn(
                "px-3 py-1.5 rounded-full flex-row items-center gap-1",
                isDark ? "bg-dark-surface" : "bg-light-surface",
              )}
            >
              <Dumbbell size={12} color={colors.muted} />
              <Text className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                {totalExerciseCount} exercises
              </Text>
            </View>
            {workout.tags?.slice(0, 2).map((tag) => (
              <View
                key={tag}
                className={cn(
                  "px-3 py-1.5 rounded-full",
                  isDark ? "bg-dark-surface" : "bg-light-surface",
                )}
              >
                <Text className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  {tag}
                </Text>
              </View>
            ))}

            {/* Active / Inactive badge */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: workout.is_active
                  ? "rgba(5,150,105,0.15)"
                  : isDark
                    ? "rgba(255,255,255,0.07)"
                    : "rgba(0,0,0,0.05)",
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: workout.is_active ? "#059669" : "#64748b",
                }}
              />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: workout.is_active
                    ? "#059669"
                    : isDark
                      ? "#9ca3af"
                      : "#6b7280",
                }}
              >
                {workout.is_active ? "Active" : "Inactive"}
              </Text>
            </View>

            {/* Public / Private badge */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: workout.is_public
                  ? "rgba(2,132,199,0.15)"
                  : isDark
                    ? "rgba(255,255,255,0.07)"
                    : "rgba(0,0,0,0.05)",
              }}
            >
              {workout.is_public ? (
                <Globe size={11} color="#0284c7" />
              ) : (
                <Lock size={11} color={isDark ? "#9ca3af" : "#6b7280"} />
              )}
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: workout.is_public
                    ? "#0284c7"
                    : isDark
                      ? "#9ca3af"
                      : "#6b7280",
                }}
              >
                {workout.is_public ? "Public" : "Private"}
              </Text>
            </View>

            {/* Location badge */}
            {workout.location ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.07)"
                    : "rgba(0,0,0,0.05)",
                }}
              >
                <MapPin size={11} color={isDark ? "#9ca3af" : "#6b7280"} />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: isDark ? "#9ca3af" : "#6b7280",
                  }}
                >
                  {workout.location}
                </Text>
              </View>
            ) : null}
          </View>

          {/* ── Sections: Warmup / Workout / Cooldown ── */}
          <Text className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Exercise Plan
          </Text>

          <View className="gap-3 mb-6">
            {sections.map((section) => {
              const sectionTheme = isDark
                ? (SECTION_COLORS_DARK[section.type] ??
                  SECTION_COLORS_DARK.round)
                : (SECTION_COLORS[section.type] ?? SECTION_COLORS.round);
              const sectionLabel =
                section.type === "warmup"
                  ? "WARMUP"
                  : section.type === "cooldown"
                    ? "COOLDOWN"
                    : section.label.toUpperCase();

              return (
                <View key={section.key} className="mb-1">
                  <View
                    className="self-start rounded-full px-3 py-1 border mb-2"
                    style={{
                      backgroundColor: sectionTheme.bg,
                      borderColor: sectionTheme.border,
                    }}
                  >
                    <Text
                      className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: sectionTheme.label }}
                    >
                      {sectionLabel}
                    </Text>
                  </View>

                  {section.rows.length === 0 ? (
                    <View className="rounded-2xl px-4 py-3 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border">
                      <Text className="text-sm text-gray-400 dark:text-gray-500 italic">
                        No exercises in this section
                      </Text>
                    </View>
                  ) : (
                    section.rows.map((row, rowIndex) => {
                      if (row.type === "rest_group") {
                        return (
                          <View
                            key={`${section.key}-rest-${rowIndex}`}
                            className="flex-row items-center gap-2 py-2"
                          >
                            <View className="flex-1 h-px bg-light-border dark:bg-dark-border" />
                            <Text className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400">
                              {`${row.label} ${row.rest_seconds}s`}
                            </Text>
                            <View className="flex-1 h-px bg-light-border dark:bg-dark-border" />
                          </View>
                        );
                      }

                      const official =
                        catalogLookup[row.exercise_id] ??
                        catalogLookup[normalizeExerciseKey(row.exercise_id)] ??
                        catalogLookup[normalizeExerciseKey(row.name)];
                      const thumb = official?.remote_image_urls?.[0] ?? null;
                      const isSuperset = (row.superset_pair?.length ?? 0) === 2;
                      const prescriptionText =
                        row.execution_mode === "time"
                          ? `${row.exercise_seconds ?? 30}s`
                          : (row.reps ?? "-");

                      return (
                        <Pressable
                          key={`${section.key}-${row.exercise_id}-${rowIndex}`}
                          onPress={() => openInspect(row.exercise_id)}
                          className="rounded-2xl border px-3 py-3 mb-2 bg-light-card dark:bg-dark-card border-light-border dark:border-dark-border"
                        >
                          <View className="flex-row items-start gap-3">
                            <View
                              className="h-12 w-12 rounded-xl overflow-hidden items-center justify-center"
                              style={{
                                backgroundColor: isDark ? "#2a2d3a" : "#e2e8f0",
                              }}
                            >
                              {thumb ? (
                                <Image
                                  source={{ uri: thumb }}
                                  className="h-full w-full"
                                  resizeMode="cover"
                                />
                              ) : (
                                <Dumbbell size={16} color={colors.muted} />
                              )}
                            </View>

                            <View className="flex-1">
                              {isSuperset ? (
                                <>
                                  <View className="self-start rounded-full px-2 py-0.5 mb-1 bg-cyan-100 dark:bg-cyan-900/35">
                                    <Text className="text-[10px] font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
                                      Superset
                                    </Text>
                                  </View>
                                  <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                    {row.superset_pair?.[0]?.name ?? row.name}
                                  </Text>
                                  <Text className="text-sm text-gray-500 dark:text-gray-400 py-0.5">
                                    ⇄
                                  </Text>
                                  <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                    {row.superset_pair?.[1]?.name ?? row.name}
                                  </Text>
                                </>
                              ) : (
                                <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                  {row.name}
                                </Text>
                              )}

                              <Text className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                                {isSuperset
                                  ? `${row.rounds ?? row.sets} rounds × ${prescriptionText}${row.execution_mode === "reps" ? " reps each" : " each"}`
                                  : `${row.sets} sets × ${prescriptionText}${row.weight_kg ? ` • ${row.weight_kg} kg` : ""}`}
                              </Text>

                              {row.rest_seconds ? (
                                <Text className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                                  {`Rest ${row.rest_seconds}s between sets`}
                                </Text>
                              ) : null}

                              <View className="flex-row flex-wrap gap-1 mt-2">
                                {(row.primary_muscles ?? [])
                                  .slice(0, 2)
                                  .map((muscle) => (
                                    <View
                                      key={`${row.exercise_id}-${muscle}`}
                                      className="px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700"
                                    >
                                      <Text className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">
                                        {muscle.replace(/_/g, " ")}
                                      </Text>
                                    </View>
                                  ))}
                              </View>
                            </View>
                          </View>
                        </Pressable>
                      );
                    })
                  )}
                </View>
              );
            })}
          </View>

          {/* ── Muscle overview ── */}
          {(workout.target_muscles ?? []).length > 0 && (
            <View
              className={cn(
                "rounded-2xl border p-3 overflow-hidden",
                isDark
                  ? "bg-dark-card border-dark-border"
                  : "bg-light-card border-light-border",
              )}
            >
              <MuscleMap
                primaryMuscles={workout.target_muscles ?? []}
                secondaryMuscles={[]}
                title="Target muscle groups"
                subtitle="Front and back balanced view"
                bodySize={280}
                scale={0.95}
                className="border-0 bg-transparent p-0"
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Fixed top bar ── */}
      <View
        className="absolute left-0 right-0 px-4 flex-row items-center justify-between"
        style={{
          top: 0,
          paddingTop: insets.top + 6,
          height: headerHeight,
          backgroundColor: isDark
            ? "rgba(12,16,24,0.88)"
            : "rgba(248,250,252,0.88)",
          borderBottomWidth: 1,
          borderBottomColor: isDark
            ? "rgba(255,255,255,0.08)"
            : "rgba(15,23,42,0.06)",
        }}
      >
        <Pressable
          onPress={() => router.back()}
          className={cn(
            "h-11 w-11 rounded-2xl border items-center justify-center",
            isDark
              ? "bg-dark-surface border-dark-border"
              : "bg-light-surface border-light-border",
          )}
        >
          <ArrowLeft size={20} color={isDark ? "#f3f4f6" : "#0f172a"} />
        </Pressable>
        <Pressable
          onPress={openSheet}
          className={cn(
            "h-11 w-11 rounded-2xl border items-center justify-center",
            isDark
              ? "bg-dark-surface border-dark-border"
              : "bg-light-surface border-light-border",
          )}
        >
          <MoreHorizontal size={20} color={isDark ? "#f3f4f6" : "#0f172a"} />
        </Pressable>
      </View>

      {/* ── Bottom action bar ── */}
      <View
        className={cn(
          "absolute left-0 right-0 border-t px-4 pt-3",
          isDark
            ? "bg-dark-surface border-dark-border"
            : "bg-light-surface border-light-border",
        )}
        style={{ bottom: 0, paddingBottom: insets.bottom + 80 }}
      >
        {hasPausedSession ? (
          <View className="flex-row gap-2">
            <Button
              className="flex-1"
              variant="secondary"
              size="lg"
              onPress={() => router.push(`/workouts/${id}/run`)}
            >
              Continue
            </Button>
            <Button
              className="flex-1"
              size="lg"
              onPress={() => void handleStartWorkout()}
            >
              <View className="flex-row items-center justify-center gap-2">
                <Play size={16} color="#ffffff" />
                <Text className="text-white font-semibold">Start new</Text>
              </View>
            </Button>
          </View>
        ) : (
          <Button
            className="w-full"
            size="lg"
            onPress={() => void handleStartWorkout()}
          >
            <View className="flex-row items-center justify-center gap-2">
              <Play size={16} color="#ffffff" />
              <Text className="text-white font-semibold">Start Workout</Text>
            </View>
          </Button>
        )}
      </View>

      {/* ── Options action sheet ── */}
      {menuVisible ? (
        <RNModal
          visible
          transparent
          animationType="none"
          onRequestClose={() => closeSheet()}
        >
          {/* Backdrop */}
          <Animated.View
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
            <Pressable style={{ flex: 1 }} onPress={() => closeSheet()} />
          </Animated.View>

          {/* Sheet */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              justifyContent: "flex-end",
            }}
            pointerEvents="box-none"
          >
            <Animated.View
              style={{
                transform: [{ translateY: sheetTranslateY }],
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                overflow: "hidden",
                backgroundColor: isDark ? "#1c1f27" : "#ffffff",
                paddingBottom: insets.bottom + 8,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: isDark ? 0.4 : 0.1,
                shadowRadius: 16,
                elevation: 12,
              }}
            >
              {/* Drag handle */}
              <View className="items-center pt-3 pb-1">
                <View
                  style={{
                    width: 36,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: isDark ? "#374151" : "#d1d5db",
                  }}
                />
              </View>

              {/* Workout name */}
              <View
                className="px-5 py-3 border-b"
                style={{ borderBottomColor: isDark ? "#1f2937" : "#f3f4f6" }}
              >
                <Text
                  className="text-base font-bold text-gray-900 dark:text-gray-100"
                  numberOfLines={1}
                >
                  {workout?.name}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {workout?.estimated_duration_minutes} min ·{" "}
                  {totalExerciseCount} exercises
                </Text>
              </View>

              {confirmDelete ? (
                /* ── Delete confirmation panel ── */
                <View className="px-5 pt-4 pb-2">
                  <View
                    style={{
                      borderRadius: 16,
                      backgroundColor: isDark
                        ? "rgba(239,68,68,0.1)"
                        : "rgba(239,68,68,0.06)",
                      borderWidth: 1,
                      borderColor: isDark
                        ? "rgba(239,68,68,0.3)"
                        : "rgba(239,68,68,0.2)",
                      padding: 16,
                      marginBottom: 16,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 8,
                      }}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: isDark
                            ? "rgba(239,68,68,0.2)"
                            : "rgba(239,68,68,0.12)",
                        }}
                      >
                        <Trash2 size={18} color="#ef4444" />
                      </View>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "700",
                          color: "#ef4444",
                        }}
                      >
                        Delete workout?
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 13,
                        lineHeight: 18,
                        color: isDark ? "#9ca3af" : "#6b7280",
                      }}
                    >
                      <Text
                        style={{
                          fontWeight: "600",
                          color: isDark ? "#d1d5db" : "#374151",
                        }}
                      >
                        {'"'}
                        {workout?.name}
                        {'"'}
                      </Text>{" "}
                      will be permanently deleted. This cannot be undone.
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Pressable
                      onPress={() => setConfirmDelete(false)}
                      style={{
                        flex: 1,
                        paddingVertical: 14,
                        borderRadius: 14,
                        alignItems: "center",
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.05)",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "600",
                          color: isDark ? "#9ca3af" : "#6b7280",
                        }}
                      >
                        Cancel
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={
                        actionLoading
                          ? undefined
                          : () => void handleDeleteExecute()
                      }
                      style={{
                        flex: 1,
                        paddingVertical: 14,
                        borderRadius: 14,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#ef4444",
                        opacity: actionLoading ? 0.6 : 1,
                      }}
                    >
                      {actionLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: "700",
                            color: "#fff",
                          }}
                        >
                          Delete
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              ) : (
                <>
                  {/* ── Actions list ── */}
                  {[
                    {
                      icon: <Edit3 size={18} color={colors.primary} />,
                      label: "Edit workout",
                      onPress: handleEdit,
                      destructive: false,
                    },
                    {
                      icon: <Copy size={18} color={colors.primary} />,
                      label: "Duplicate",
                      onPress: () => void handleDuplicate(),
                      destructive: false,
                    },
                    {
                      icon: workout?.is_active ? (
                        <X size={18} color={colors.muted} />
                      ) : (
                        <Check size={18} color="#059669" />
                      ),
                      label: workout?.is_active
                        ? "Deactivate"
                        : "Set as active",
                      onPress: () => void handleToggleActive(),
                      destructive: false,
                    },
                    {
                      icon: workout?.is_public ? (
                        <Lock size={18} color={colors.muted} />
                      ) : (
                        <Globe size={18} color="#0284c7" />
                      ),
                      label: workout?.is_public
                        ? "Make private"
                        : "Make public",
                      onPress: () => void handleTogglePublic(),
                      destructive: false,
                    },
                    {
                      icon: <Trash2 size={18} color="#ef4444" />,
                      label: "Delete workout",
                      onPress: handleDeleteConfirm,
                      destructive: true,
                    },
                  ].map((action, idx, arr) => (
                    <Pressable
                      key={action.label}
                      onPress={actionLoading ? undefined : action.onPress}
                      className={cn(
                        "flex-row items-center gap-4 px-5 py-4",
                        idx !== arr.length - 1
                          ? isDark
                            ? "border-b border-gray-800"
                            : "border-b border-gray-100"
                          : "",
                      )}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: action.destructive
                            ? isDark
                              ? "rgba(239,68,68,0.15)"
                              : "rgba(239,68,68,0.08)"
                            : isDark
                              ? "rgba(255,255,255,0.06)"
                              : "rgba(0,0,0,0.04)",
                        }}
                      >
                        {action.icon}
                      </View>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "500",
                          color: action.destructive
                            ? "#ef4444"
                            : isDark
                              ? "#f3f4f6"
                              : "#111827",
                        }}
                      >
                        {action.label}
                      </Text>
                    </Pressable>
                  ))}

                  {/* Cancel */}
                  <Pressable
                    onPress={() => closeSheet()}
                    className="mx-5 mt-2 mb-1 rounded-2xl py-4 items-center"
                    style={{
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.04)",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: isDark ? "#9ca3af" : "#6b7280",
                      }}
                    >
                      Cancel
                    </Text>
                  </Pressable>
                </>
              )}
            </Animated.View>
          </View>
        </RNModal>
      ) : null}

      {/* ── Exercise Inspect Modal ── */}
      {inspectId && inspectExercise ? (
        <ExerciseInspectModal
          visible
          exerciseId={inspectId}
          exerciseName={inspectExercise.name}
          sets={inspectExercise.sets}
          prescription={inspectExercise.prescription}
          official={inspectOfficial}
          onClose={closeInspect}
        />
      ) : null}
    </View>
  );
}
