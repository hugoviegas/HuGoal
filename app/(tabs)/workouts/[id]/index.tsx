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
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  Dumbbell,
  Edit3,
  Flame,
  Globe,
  Lock,
  MapPin,
  MoreHorizontal,
  Play,
  Timer,
  Trash2,
  X,
} from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { MuscleMap } from "@/components/workouts/MuscleMap";
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

function formatEquipment(equipment: string[] | undefined): string {
  if (!equipment || equipment.length === 0) return "No equipment";
  return equipment
    .map((item) => item.replace(/_/g, " "))
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(", ");
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

interface NormalizedExercise {
  id: string;
  name: string;
  sets: number;
  prescription: string;
  muscleGroups: string[];
}

interface NormalizedSection {
  key: string;
  label: string;
  type: "warmup" | "round" | "cooldown";
  exercises: NormalizedExercise[];
}

function normalizeSections(record: WorkoutTemplateRecord): NormalizedSection[] {
  // If the workout has structured sections, use them
  if (record.sections && record.sections.length > 0) {
    return record.sections.map((section) => ({
      key: section.id,
      label: section.name,
      type: section.type,
      exercises: section.blocks
        .filter((b) => b.type === "exercise" && b.exercise_id)
        .sort((a, b) => a.order - b.order)
        .map((b) => ({
          id: b.exercise_id!,
          name: b.name ?? b.exercise_id!,
          sets: 1,
          prescription: formatBlockPrescription(b),
          muscleGroups: b.primary_muscles ?? [],
        })),
    }));
  }

  // Fallback: artificially split flat exercises list
  const exs = record.exercises;
  const total = exs.length;
  if (total === 0) {
    return [
      { key: "warmup", label: "Warmup", type: "warmup", exercises: [] },
      { key: "workout", label: "Workout", type: "round", exercises: [] },
      { key: "cooldown", label: "Cooldown", type: "cooldown", exercises: [] },
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

  const toEntry = (e: WorkoutTemplateExerciseRecord) => ({
    id: e.id,
    name: e.name,
    sets: e.sets,
    prescription: e.reps,
    muscleGroups: e.muscleGroups,
  });

  return [
    {
      key: "warmup",
      label: "Warmup",
      type: "warmup",
      exercises: warmup.map(toEntry),
    },
    {
      key: "workout",
      label: "Workout",
      type: "round",
      exercises: main.map(toEntry),
    },
    {
      key: "cooldown",
      label: "Cooldown",
      type: "cooldown",
      exercises: cooldown.map(toEntry),
    },
  ];
}

const SECTION_COLORS: Record<
  string,
  { bg: string; border: string; label: string }
> = {
  warmup: { bg: "#fef9c3", border: "#fde047", label: "#a16207" },
  round: { bg: "#dbeafe", border: "#93c5fd", label: "#1d4ed8" },
  cooldown: { bg: "#dcfce7", border: "#86efac", label: "#15803d" },
};

const SECTION_COLORS_DARK: Record<
  string,
  { bg: string; border: string; label: string }
> = {
  warmup: { bg: "#422006", border: "#78350f", label: "#fde68a" },
  round: { bg: "#1e3a5f", border: "#1e40af", label: "#93c5fd" },
  cooldown: { bg: "#14532d", border: "#166534", label: "#86efac" },
};

// ─── Exercise Inspect Modal ───────────────────────────────────────────────────

interface ExerciseInspectModalProps {
  exerciseId: string | null;
  exerciseName: string;
  sets: number;
  prescription: string;
  official: OfficialExerciseRecord | null;
  isDark: boolean;
  colors: {
    muted: string;
    primary: string;
    foreground: string;
  };
  onClose: () => void;
}

function ExerciseInspectModal({
  exerciseId,
  exerciseName,
  sets,
  prescription,
  official,
  isDark,
  colors,
  onClose,
}: ExerciseInspectModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [nextImageIndex, setNextImageIndex] = useState<number | null>(null);
  const [pauseImageLoop, setPauseImageLoop] = useState(false);
  const imageFade = useRef(new Animated.Value(0)).current;

  const exerciseImages = useMemo(
    () => (official?.remote_image_urls ?? []).filter(Boolean),
    [official?.remote_image_urls],
  );

  const currentImageUri =
    exerciseImages.length > 0 ? exerciseImages[currentImageIndex] : null;
  const nextImageUri =
    nextImageIndex !== null ? exerciseImages[nextImageIndex] : null;

  const musclePrimary = official?.primary_muscles?.length
    ? official.primary_muscles
    : [];
  const muscleSecondary = official?.secondary_muscles ?? [];

  const howToSteps = official?.instructions?.length
    ? official.instructions
    : (official?.instructions_en ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

  useEffect(() => {
    setCurrentImageIndex(0);
    setNextImageIndex(null);
    setPauseImageLoop(false);
    imageFade.setValue(0);
  }, [imageFade, exerciseId]);

  useEffect(() => {
    if (exerciseImages.length < 2 || pauseImageLoop || nextImageIndex !== null)
      return;

    const timerId = setTimeout(() => {
      const nextIndex = (currentImageIndex + 1) % exerciseImages.length;
      setNextImageIndex(nextIndex);
      Animated.timing(imageFade, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }).start(() => {
        setCurrentImageIndex(nextIndex);
        setNextImageIndex(null);
        imageFade.setValue(0);
      });
    }, 2000);

    return () => {
      clearTimeout(timerId);
      imageFade.stopAnimation();
    };
  }, [
    currentImageIndex,
    exerciseImages.length,
    imageFade,
    nextImageIndex,
    pauseImageLoop,
  ]);

  return (
    <View
      className={cn(
        "flex-1 rounded-t-3xl overflow-hidden",
        isDark ? "bg-dark-bg" : "bg-light-bg",
      )}
    >
      {/* Close bar */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
        <Text
          className="text-xl font-bold text-gray-900 dark:text-gray-100 flex-1"
          numberOfLines={1}
        >
          {exerciseName}
        </Text>
        <Pressable
          onPress={onClose}
          className={cn(
            "h-9 w-9 rounded-full items-center justify-center",
            isDark ? "bg-dark-surface" : "bg-light-surface",
          )}
        >
          <X size={18} color={colors.muted} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Image */}
        <Pressable
          className="mx-4 rounded-2xl overflow-hidden bg-black/15 mb-4"
          style={{ aspectRatio: 16 / 9 }}
          onPress={() => {
            if (exerciseImages.length > 1) setPauseImageLoop((p) => !p);
          }}
        >
          {currentImageUri ? (
            <>
              <Image
                source={{ uri: currentImageUri }}
                className="h-full w-full"
                resizeMode="cover"
              />
              {nextImageUri ? (
                <Animated.Image
                  source={{ uri: nextImageUri }}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    opacity: imageFade,
                  }}
                  resizeMode="cover"
                />
              ) : null}
            </>
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Dumbbell size={32} color={colors.muted} />
            </View>
          )}
          {exerciseImages.length > 1 && (
            <View
              style={{
                position: "absolute",
                right: 10,
                bottom: 10,
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 5,
                backgroundColor: "rgba(15,23,42,0.58)",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>
                {pauseImageLoop ? "Paused" : "Tap to pause"}
              </Text>
            </View>
          )}
        </Pressable>

        <View className="px-4">
          {/* Stats row */}
          <View
            className={cn(
              "rounded-2xl border p-4 mb-4 flex-row justify-between",
              isDark
                ? "bg-dark-card border-dark-border"
                : "bg-light-card border-light-border",
            )}
          >
            <View className="items-center gap-1">
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                Sets
              </Text>
              <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {sets}
              </Text>
            </View>
            <View className="items-center gap-1">
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                Prescription
              </Text>
              <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {prescription || "-"}
              </Text>
            </View>
            <View className="items-center gap-1">
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                Equipment
              </Text>
              <Text
                className="text-sm font-semibold text-gray-800 dark:text-gray-200"
                numberOfLines={1}
              >
                {formatEquipment(official?.equipment)}
              </Text>
            </View>
          </View>

          {/* Muscle map */}
          {(musclePrimary.length > 0 || muscleSecondary.length > 0) && (
            <MuscleMap
              primaryMuscles={musclePrimary}
              secondaryMuscles={muscleSecondary}
              title="Targeted muscle areas"
              subtitle="Front and back activation"
              bodySize={280}
            />
          )}

          {/* How to */}
          <View className="mt-5 mb-2">
            <Text className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              How to perform
            </Text>
          </View>
          {howToSteps.length > 0 ? (
            <View
              className={cn(
                "rounded-2xl border p-4 gap-3",
                isDark
                  ? "bg-dark-card border-dark-border"
                  : "bg-light-card border-light-border",
              )}
            >
              {howToSteps.map((step, index) => (
                <View
                  key={`step-${index}`}
                  className="flex-row items-start gap-2"
                >
                  <Text className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {index + 1}.
                  </Text>
                  <Text className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              Instructions not available for this exercise yet.
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

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

  // Section collapse state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    warmup: true,
    round: true,
    cooldown: true,
  });

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
    () => sections.reduce((acc, s) => acc + s.exercises.length, 0),
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

  return (
    <View className={cn("flex-1", isDark ? "bg-dark-bg" : "bg-light-bg")}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarClearance + 40 }}
      >
        {/* ── Header row ── */}
        <View
          style={{ paddingTop: insets.top + 6 }}
          className="px-4 mb-3 flex-row items-center justify-between"
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

        <View className="px-4">
          {/* ── Workout cover image ── */}
          <View
            className="rounded-3xl overflow-hidden mb-4"
            style={{
              aspectRatio: 16 / 9,
              backgroundColor: isDark ? "#22252f" : "#f1f5f9",
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
              const isOpen = openSections[section.type] !== false;

              return (
                <View
                  key={section.key}
                  style={{
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: sectionTheme.border,
                    overflow: "hidden",
                  }}
                >
                  {/* Section header */}
                  <Pressable
                    onPress={() =>
                      setOpenSections((prev) => ({
                        ...prev,
                        [section.type]: !isOpen,
                      }))
                    }
                    style={{ backgroundColor: sectionTheme.bg }}
                    className="flex-row items-center justify-between px-4 py-3"
                  >
                    <View className="flex-row items-center gap-2">
                      {section.type === "warmup" && (
                        <Flame size={16} color={sectionTheme.label} />
                      )}
                      {section.type === "round" && (
                        <Dumbbell size={16} color={sectionTheme.label} />
                      )}
                      {section.type === "cooldown" && (
                        <Timer size={16} color={sectionTheme.label} />
                      )}
                      <Text
                        className="text-sm font-bold uppercase tracking-wider"
                        style={{ color: sectionTheme.label }}
                      >
                        {section.label}
                      </Text>
                      <Text
                        className="text-xs font-medium"
                        style={{ color: sectionTheme.label, opacity: 0.7 }}
                      >
                        {section.exercises.length > 0
                          ? `${section.exercises.length} exercise${section.exercises.length > 1 ? "s" : ""}`
                          : "Empty"}
                      </Text>
                    </View>
                    {isOpen ? (
                      <ChevronDown size={18} color={sectionTheme.label} />
                    ) : (
                      <ChevronRight size={18} color={sectionTheme.label} />
                    )}
                  </Pressable>

                  {/* Exercise rows */}
                  {isOpen && (
                    <View
                      className={cn(isDark ? "bg-dark-card" : "bg-light-card")}
                    >
                      {section.exercises.length === 0 ? (
                        <View className="px-4 py-3">
                          <Text className="text-sm text-gray-400 dark:text-gray-500 italic">
                            No exercises in this section
                          </Text>
                        </View>
                      ) : (
                        section.exercises.map((exercise, index) => {
                          const official =
                            catalogLookup[exercise.id] ??
                            catalogLookup[normalizeExerciseKey(exercise.id)] ??
                            catalogLookup[normalizeExerciseKey(exercise.name)];
                          const thumb =
                            official?.remote_image_urls?.[0] ?? null;
                          const isLast = index === section.exercises.length - 1;

                          return (
                            <Pressable
                              key={`${exercise.id}-${index}`}
                              onPress={() => openInspect(exercise.id)}
                              className={cn(
                                "flex-row items-center gap-3 px-3 py-3",
                                !isLast &&
                                  (isDark
                                    ? "border-b border-dark-border"
                                    : "border-b border-light-border"),
                              )}
                            >
                              {/* Thumbnail */}
                              <View
                                className="h-12 w-12 rounded-xl overflow-hidden"
                                style={{
                                  backgroundColor: isDark
                                    ? "#2a2d3a"
                                    : "#e2e8f0",
                                }}
                              >
                                {thumb ? (
                                  <Image
                                    source={{ uri: thumb }}
                                    className="h-full w-full"
                                    resizeMode="cover"
                                  />
                                ) : (
                                  <View className="h-full w-full items-center justify-center">
                                    <Dumbbell size={16} color={colors.muted} />
                                  </View>
                                )}
                              </View>

                              {/* Info */}
                              <View className="flex-1">
                                <Text
                                  className="text-sm font-semibold text-gray-900 dark:text-gray-100"
                                  numberOfLines={1}
                                >
                                  {exercise.name}
                                </Text>
                                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  {exercise.sets > 1
                                    ? `${exercise.sets} sets × ${exercise.prescription || "-"}`
                                    : exercise.prescription
                                      ? exercise.prescription
                                      : "—"}
                                </Text>
                              </View>

                              {/* Chevron hint */}
                              <ChevronRight size={16} color={colors.muted} />
                            </Pressable>
                          );
                        })
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* ── Muscle overview ── */}
          {(workout.target_muscles ?? []).length > 0 && (
            <MuscleMap
              primaryMuscles={workout.target_muscles ?? []}
              secondaryMuscles={[]}
              title="Target muscle groups"
              subtitle="Aggregated from all exercises"
              bodySize={280}
            />
          )}
        </View>
      </ScrollView>

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
      <RNModal
        visible={!!inspectId}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeInspect}
      >
        {inspectId && inspectExercise ? (
          <ExerciseInspectModal
            exerciseId={inspectId}
            exerciseName={inspectExercise.name}
            sets={inspectExercise.sets}
            prescription={inspectExercise.prescription}
            official={inspectOfficial}
            isDark={isDark}
            colors={colors}
            onClose={closeInspect}
          />
        ) : null}
      </RNModal>
    </View>
  );
}
