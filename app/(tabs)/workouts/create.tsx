import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowDown,
  ArrowUp,
  CirclePlus,
  Dumbbell,
  Funnel,
  Search,
  Sparkles,
  X,
} from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useToastStore } from "@/stores/toast.store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ExerciseCard } from "@/components/workouts/ExerciseCard";
import { ProgressFormIndicator } from "@/components/ui/ProgressFormIndicator";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { createWorkoutTemplate } from "@/lib/firestore/workouts";
import { useHideMainTabBar } from "@/hooks/useHideMainTabBar";
import type { Difficulty, EquipmentType, Exercise } from "@/types";

type WorkflowType = "manual" | "ai";
type CreateStep = "workflow" | "details" | "exercises" | "preview";

interface RoundExerciseConfig {
  id: string;
  exerciseId: string;
  name: string;
  muscleGroups: string[];
  equipment: EquipmentType;
  difficulty: Difficulty;
  hasWeight: boolean;
  imageUrl: string;
  sets: number;
  reps: string;
  weightKg?: number;
  restSeconds: number;
  notes?: string;
}

interface WorkoutRound {
  id: string;
  name: string;
  restAfterSeconds: number | null;
  exercises: RoundExerciseConfig[];
}

interface WorkoutDraft {
  name: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  workflowType: WorkflowType;
  rounds: WorkoutRound[];
  tags: string[];
}

const DIFFICULTIES = [
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
];

const STEP_LABELS = ["Workflow", "Details", "Exercises", "Preview"];

const GENERIC_EXERCISE_IMAGE =
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80";

const EXERCISE_LIBRARY: (Exercise & {
  has_weight: boolean;
  equipment_label: EquipmentType;
  short_description: string;
})[] = [
  {
    id: "pushups",
    name: "Push-ups",
    name_en: "Push-ups",
    primary_muscles: ["chest", "triceps"],
    secondary_muscles: ["shoulders"],
    equipment: ["bodyweight"],
    equipment_label: "bodyweight",
    difficulty: "beginner",
    video_youtube_ids: [],
    aliases: ["press-up"],
    has_weight: false,
    short_description: "Classic upper body movement with controlled tempo.",
  },
  {
    id: "barbell-squat",
    name: "Barbell Squat",
    name_en: "Barbell Squat",
    primary_muscles: ["quadriceps", "glutes"],
    secondary_muscles: ["hamstrings"],
    equipment: ["barbell"],
    equipment_label: "barbell",
    difficulty: "intermediate",
    video_youtube_ids: [],
    aliases: ["back squat"],
    has_weight: true,
    short_description: "Compound leg movement focused on lower body strength.",
  },
  {
    id: "deadlift",
    name: "Deadlift",
    name_en: "Deadlift",
    primary_muscles: ["hamstrings", "glutes"],
    secondary_muscles: ["back"],
    equipment: ["barbell"],
    equipment_label: "barbell",
    difficulty: "advanced",
    video_youtube_ids: [],
    aliases: ["conventional deadlift"],
    has_weight: true,
    short_description:
      "Posterior chain builder for power and total-body strength.",
  },
  {
    id: "dumbbell-row",
    name: "Dumbbell Row",
    name_en: "Dumbbell Row",
    primary_muscles: ["back"],
    secondary_muscles: ["biceps"],
    equipment: ["dumbbell"],
    equipment_label: "dumbbell",
    difficulty: "beginner",
    video_youtube_ids: [],
    aliases: ["one arm row"],
    has_weight: true,
    short_description:
      "Unilateral pulling pattern for back and scapular control.",
  },
  {
    id: "bench-press",
    name: "Bench Press",
    name_en: "Bench Press",
    primary_muscles: ["chest"],
    secondary_muscles: ["triceps", "shoulders"],
    equipment: ["barbell"],
    equipment_label: "barbell",
    difficulty: "intermediate",
    video_youtube_ids: [],
    aliases: ["barbell bench"],
    has_weight: true,
    short_description:
      "Pressing benchmark for upper body strength progression.",
  },
  {
    id: "plank",
    name: "Plank",
    name_en: "Plank",
    primary_muscles: ["core"],
    secondary_muscles: ["shoulders"],
    equipment: ["bodyweight"],
    equipment_label: "bodyweight",
    difficulty: "beginner",
    video_youtube_ids: [],
    aliases: ["front plank"],
    has_weight: false,
    short_description: "Isometric core stability drill with posture control.",
  },
  {
    id: "kettlebell-swing",
    name: "Kettlebell Swing",
    name_en: "Kettlebell Swing",
    primary_muscles: ["glutes", "hamstrings"],
    secondary_muscles: ["core"],
    equipment: ["kettlebell"],
    equipment_label: "kettlebell",
    difficulty: "intermediate",
    video_youtube_ids: [],
    aliases: ["swing"],
    has_weight: true,
    short_description:
      "Explosive hip hinge movement for conditioning and power.",
  },
  {
    id: "jump-rope",
    name: "Jump Rope",
    name_en: "Jump Rope",
    primary_muscles: ["calves", "cardio"],
    secondary_muscles: ["shoulders"],
    equipment: ["none"],
    equipment_label: "none",
    difficulty: "beginner",
    video_youtube_ids: [],
    aliases: ["rope skip"],
    has_weight: false,
    short_description: "Cardio finisher with cadence and coordination focus.",
  },
];

const EQUIPMENT_FILTERS: ("all" | EquipmentType)[] = [
  "all",
  "bodyweight",
  "barbell",
  "dumbbell",
  "kettlebell",
  "none",
];

const DIFFICULTY_FILTERS: ("all" | Difficulty)[] = [
  "all",
  "beginner",
  "intermediate",
  "advanced",
];

function createRound(name: string): WorkoutRound {
  return {
    id: `round-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    restAfterSeconds: 90,
    exercises: [],
  };
}

export default function CreateWorkoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useThemeStore();
  const user = useAuthStore((s) => s.user);
  const { show: showToast } = useToastStore();
  useHideMainTabBar();
  const tabBarClearance = insets.bottom + 16;
  const scrollPaddingBottom = 16;

  const [step, setStep] = useState<CreateStep>("workflow");
  const [workflowType, setWorkflowType] = useState<WorkflowType>("manual");
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<WorkoutDraft["difficulty"]>("intermediate");
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [pickerRoundId, setPickerRoundId] = useState<string | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [showSaveDraftConfirm, setShowSaveDraftConfirm] = useState(false);
  const [equipmentFilter, setEquipmentFilter] = useState<"all" | EquipmentType>(
    "all",
  );
  const [difficultyFilter, setDifficultyFilter] = useState<"all" | Difficulty>(
    "all",
  );
  const [draft, setDraft] = useState<WorkoutDraft>({
    name: "",
    description: "",
    difficulty: "intermediate",
    workflowType: "manual",
    rounds: [createRound("Round 1")],
    tags: [],
  });

  const totalSelectedExercises = draft.rounds.reduce(
    (sum, round) => sum + round.exercises.length,
    0,
  );

  const estimatedDuration = useMemo(() => {
    return draft.rounds.reduce((total, round) => {
      const exercisesTime = round.exercises.reduce((exerciseTotal, ex) => {
        const repsWorkSeconds = ex.sets * 40;
        const restBetweenSets = Math.max(0, ex.sets - 1) * ex.restSeconds;
        return exerciseTotal + repsWorkSeconds + restBetweenSets;
      }, 0);

      const roundRest = round.restAfterSeconds ?? 0;
      return total + exercisesTime + roundRest;
    }, 0);
  }, [draft.rounds]);

  const groupedExercises = useMemo(() => {
    const filtered = EXERCISE_LIBRARY.filter((exercise) => {
      const searchable = [
        exercise.name,
        exercise.short_description,
        ...exercise.primary_muscles,
        ...exercise.aliases,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !exerciseSearch || searchable.includes(exerciseSearch.toLowerCase());
      const matchesEquipment =
        equipmentFilter === "all" ||
        exercise.equipment.includes(equipmentFilter as EquipmentType);
      const matchesDifficulty =
        difficultyFilter === "all" || exercise.difficulty === difficultyFilter;

      return matchesSearch && matchesEquipment && matchesDifficulty;
    });

    return filtered.reduce<Record<string, typeof filtered>>((acc, exercise) => {
      const key = exercise.primary_muscles[0] ?? "other";
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(exercise);
      return acc;
    }, {});
  }, [difficultyFilter, equipmentFilter, exerciseSearch]);

  const handleWorkflowSelect = (type: WorkflowType) => {
    setWorkflowType(type);
    setDraft((prev) => ({ ...prev, workflowType: type }));
  };

  const handleContinueFromWorkflow = () => {
    setStep("details");
  };

  const handleDifficultySelect = (difficulty: WorkoutDraft["difficulty"]) => {
    setSelectedDifficulty(difficulty);
    setDraft((prev) => ({ ...prev, difficulty }));
  };

  const handleContinueToExercises = () => {
    if (!draft.name.trim()) {
      showToast("Workout name is required", "error");
      return;
    }
    setStep("exercises");
  };

  const handleGenerateAI = async () => {
    if (!draft.name.trim()) {
      showToast("Please enter a workout name", "error");
      return;
    }

    if (!aiPrompt.trim()) {
      showToast("Please describe your desired workout", "error");
      return;
    }

    setIsLoadingAI(true);
    try {
      // Simulate AI generation
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mock AI response - replace with real Gemini API call later
      const generatedExercises: RoundExerciseConfig[] = EXERCISE_LIBRARY.slice(
        0,
        5,
      ).map((exercise) => ({
        id: `selected-${exercise.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        exerciseId: exercise.id,
        name: exercise.name,
        muscleGroups: exercise.primary_muscles,
        equipment: exercise.equipment_label,
        difficulty: exercise.difficulty,
        hasWeight: exercise.has_weight,
        imageUrl: GENERIC_EXERCISE_IMAGE,
        sets: 3 + Math.floor(Math.random() * 2),
        reps: `${8 + Math.floor(Math.random() * 4)}-${12 + Math.floor(Math.random() * 4)}`,
        weightKg: exercise.has_weight ? 20 : undefined,
        restSeconds: 60,
      }));

      setDraft((prev) => ({
        ...prev,
        rounds: [
          {
            ...createRound("Round 1"),
            exercises: generatedExercises,
          },
        ],
        tags: ["AI-Generated", prev.difficulty],
      }));

      showToast(
        "Workout generated! Review and customize exercises.",
        "success",
      );

      setStep("exercises");
    } catch {
      showToast("Failed to generate workout. Try again.", "error");
    } finally {
      setIsLoadingAI(false);
    }
  };

  const openPickerForRound = (roundId: string) => {
    setPickerRoundId(roundId);
  };

  const closePicker = () => {
    setPickerRoundId(null);
  };

  const handleAddExercise = (
    roundId: string,
    exercise: (typeof EXERCISE_LIBRARY)[number],
  ) => {
    const selectedExercise: RoundExerciseConfig = {
      id: `selected-${exercise.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      exerciseId: exercise.id,
      name: exercise.name,
      muscleGroups: exercise.primary_muscles,
      equipment: exercise.equipment_label,
      difficulty: exercise.difficulty,
      hasWeight: exercise.has_weight,
      imageUrl: GENERIC_EXERCISE_IMAGE,
      sets: 3,
      reps: "10-12",
      weightKg: exercise.has_weight ? 20 : undefined,
      restSeconds: 60,
      notes: "",
    };

    setDraft((prev) => ({
      ...prev,
      rounds: prev.rounds.map((round) =>
        round.id === roundId
          ? { ...round, exercises: [...round.exercises, selectedExercise] }
          : round,
      ),
    }));
    showToast(
      `Added ${exercise.name} to ${draft.rounds.find((r) => r.id === roundId)?.name ?? "round"}`,
      "success",
    );
    // Clear search so the picker doesn't keep the last typed query selected
    setExerciseSearch("");
  };

  const handleAddRound = () => {
    setDraft((prev) => ({
      ...prev,
      rounds: [...prev.rounds, createRound(`Round ${prev.rounds.length + 1}`)],
    }));
  };

  const handleRemoveRound = (roundId: string) => {
    setDraft((prev) => {
      if (prev.rounds.length <= 1) {
        return prev;
      }

      const updatedRounds = prev.rounds.filter((round) => round.id !== roundId);
      return {
        ...prev,
        rounds: updatedRounds.map((round, index) => ({
          ...round,
          name: round.name || `Round ${index + 1}`,
        })),
      };
    });
  };

  const handleMoveRound = (roundIndex: number, direction: -1 | 1) => {
    setDraft((prev) => {
      const nextIndex = roundIndex + direction;
      if (nextIndex < 0 || nextIndex >= prev.rounds.length) {
        return prev;
      }

      const rounds = [...prev.rounds];
      [rounds[roundIndex], rounds[nextIndex]] = [
        rounds[nextIndex],
        rounds[roundIndex],
      ];

      return { ...prev, rounds };
    });
  };

  const updateRound = (roundId: string, patch: Partial<WorkoutRound>) => {
    setDraft((prev) => ({
      ...prev,
      rounds: prev.rounds.map((round) =>
        round.id === roundId ? { ...round, ...patch } : round,
      ),
    }));
  };

  const updateRoundExercise = (
    roundId: string,
    exerciseId: string,
    patch: Partial<RoundExerciseConfig>,
  ) => {
    setDraft((prev) => ({
      ...prev,
      rounds: prev.rounds.map((round) =>
        round.id === roundId
          ? {
              ...round,
              exercises: round.exercises.map((exercise) =>
                exercise.id === exerciseId
                  ? { ...exercise, ...patch }
                  : exercise,
              ),
            }
          : round,
      ),
    }));
  };

  const handleRemoveExercise = (roundId: string, exerciseId: string) => {
    setDraft((prev) => ({
      ...prev,
      rounds: prev.rounds.map((round) =>
        round.id === roundId
          ? {
              ...round,
              exercises: round.exercises.filter(
                (exercise) => exercise.id !== exerciseId,
              ),
            }
          : round,
      ),
    }));
  };

  const handleMoveExercise = (
    roundId: string,
    exerciseIndex: number,
    direction: -1 | 1,
  ) => {
    setDraft((prev) => ({
      ...prev,
      rounds: prev.rounds.map((round) => {
        if (round.id !== roundId) {
          return round;
        }

        const nextIndex = exerciseIndex + direction;
        if (nextIndex < 0 || nextIndex >= round.exercises.length) {
          return round;
        }

        const exercises = [...round.exercises];
        [exercises[exerciseIndex], exercises[nextIndex]] = [
          exercises[nextIndex],
          exercises[exerciseIndex],
        ];
        return { ...round, exercises };
      }),
    }));
  };

  const flattenExercisesForSave = () => {
    return draft.rounds.flatMap((round) =>
      round.exercises.map((exercise) => ({
        id: exercise.exerciseId,
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        muscleGroups: exercise.muscleGroups,
      })),
    );
  };

  const handleSaveDraft = async () => {
    if (!draft.name.trim()) {
      showToast("Workout name is required", "error");
      return;
    }

    const flatExercises = flattenExercisesForSave();
    if (flatExercises.length === 0) {
      showToast("Add at least one exercise", "error");
      return;
    }

    try {
      if (!user?.uid) {
        throw new Error("You must be signed in to save workouts");
      }

      const savedWorkout = await createWorkoutTemplate(user.uid, {
        name: draft.name.trim(),
        description: draft.description.trim() || undefined,
        difficulty: draft.difficulty,
        is_ai_generated: draft.workflowType === "ai",
        source_prompt:
          workflowType === "ai" ? aiPrompt.trim() || undefined : undefined,
        exercises: flatExercises,
        estimated_duration_minutes: Math.max(
          10,
          Math.ceil(estimatedDuration / 60),
        ),
        tags: [...draft.tags, `${draft.rounds.length} rounds`],
      });

      showToast({
        title: "Workout saved",
        message: `${savedWorkout.name} was saved to your workouts.`,
        type: "success",
      });
      router.replace(`/workouts/${savedWorkout.id}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save workout";
      console.error("[createWorkout] save failed", error);
      showToast({
        title: "Failed to save workout",
        message,
        type: "error",
      });
    }
  };

  // Workflow Selection Step
  if (step === "workflow") {
    return (
      <View className={cn("flex-1", isDark ? "bg-dark-bg" : "bg-light-bg")}>
        <ScrollView
          className="flex-1 p-4"
          contentContainerStyle={{ paddingBottom: tabBarClearance + 16 }}
        >
          <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Create Workout
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Choose how to build your workout
          </Text>

          {/* Manual Workflow */}
          <Pressable
            onPress={() => handleWorkflowSelect("manual")}
            className={cn(
              "p-4 rounded-lg mb-3 border-2 active:opacity-70",
              workflowType === "manual"
                ? "border-cyan-500 dark:border-cyan-500"
                : "",
              isDark
                ? "bg-dark-surface border-dark-border"
                : "bg-light-surface border-light-border",
            )}
          >
            <View className="flex-row items-start gap-3">
              <Dumbbell size={28} color={colors.primary} />
              <View className="flex-1">
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Build Manually
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Browse and select exercises from our library
                </Text>
              </View>
            </View>
          </Pressable>

          {/* AI Workflow */}
          <Pressable
            onPress={() => handleWorkflowSelect("ai")}
            className={cn(
              "p-4 rounded-lg border-2 active:opacity-70",
              workflowType === "ai"
                ? "border-cyan-500 dark:border-cyan-500"
                : "",
              isDark
                ? "bg-dark-surface border-dark-border"
                : "bg-light-surface border-light-border",
            )}
          >
            <View className="flex-row items-start gap-3">
              <Sparkles size={28} color={colors.primary} />
              <View className="flex-1">
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Generate with AI
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Describe your goal and let AI create a custom plan
                </Text>
              </View>
            </View>
          </Pressable>
        </ScrollView>

        <View
          className="p-4 border-t border-light-border dark:border-dark-border"
          style={{ paddingBottom: tabBarClearance }}
        >
          <ProgressFormIndicator
            current={1}
            total={4}
            labels={STEP_LABELS}
            showActions
            hideBackOnFirstStep={false}
            onBack={() => router.back()}
            onContinue={handleContinueFromWorkflow}
          />
        </View>
      </View>
    );
  }

  // AI Prompt Step
  if (step === "details") {
    return (
      <View className={cn("flex-1", isDark ? "bg-dark-bg" : "bg-light-bg")}>
        <ScrollView
          className="flex-1 p-4"
          contentContainerStyle={{ paddingBottom: tabBarClearance + 16 }}
        >
          <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            {workflowType === "ai"
              ? "Generate Your Workout"
              : "Workout Details"}
          </Text>

          <Input
            label="Workout Name"
            placeholder="e.g., Summer Shred"
            value={draft.name}
            onChangeText={(text) =>
              setDraft((prev) => ({ ...prev, name: text }))
            }
            containerClassName="mb-4"
          />

          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Goal Difficulty
            </Text>
            <View className="flex-row gap-2">
              {DIFFICULTIES.map((d) => (
                <Badge
                  key={d.value}
                  onPress={() =>
                    handleDifficultySelect(
                      d.value as WorkoutDraft["difficulty"],
                    )
                  }
                  className="flex-1 items-center"
                  textClassName="text-center"
                  variant={
                    selectedDifficulty === d.value ? "primary" : "default"
                  }
                >
                  {d.label}
                </Badge>
              ))}
            </View>
          </View>

          {workflowType === "ai" ? (
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Describe Your Workout
              </Text>
              <TextInput
                multiline
                numberOfLines={5}
                placeholder="E.g., Full body strength with dumbbells in 30 minutes"
                value={aiPrompt}
                onChangeText={setAiPrompt}
                className={cn(
                  "rounded-lg p-3 text-base border",
                  isDark
                    ? "bg-dark-surface border-dark-border text-gray-100"
                    : "bg-light-surface border-light-border text-gray-900",
                )}
                textAlignVertical="top"
              />
            </View>
          ) : (
            <Input
              label="Description (optional)"
              placeholder="E.g., Strength-focused upper body session"
              value={draft.description}
              onChangeText={(text) =>
                setDraft((prev) => ({ ...prev, description: text }))
              }
              containerClassName="mb-4"
            />
          )}
        </ScrollView>

        <View
          className="p-4 border-t border-light-border dark:border-dark-border"
          style={{ paddingBottom: tabBarClearance }}
        >
          <ProgressFormIndicator
            current={2}
            total={4}
            labels={STEP_LABELS}
            showActions
            onBack={() => setStep("workflow")}
            onContinue={
              workflowType === "ai" ? handleGenerateAI : handleContinueToExercises
            }
            continueLabel={
              workflowType === "ai"
                ? isLoadingAI
                  ? "Generating..."
                  : "Generate Workout"
                : "Continue"
            }
            disableBack={isLoadingAI}
            disableContinue={
              workflowType === "ai" ? isLoadingAI || !draft.name.trim() : false
            }
          />
        </View>
      </View>
    );
  }

  // Exercise Selection Step
  if (step === "exercises") {
    if (pickerRoundId) {
      return (
        <View className={cn("flex-1", isDark ? "bg-dark-bg" : "bg-light-bg")}>
          <View className="px-4 pt-4 pb-3 border-b border-light-border dark:border-dark-border">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Add Exercises
              </Text>
              <Pressable
                onPress={closePicker}
                className="h-9 w-9 rounded-full items-center justify-center bg-light-surface dark:bg-dark-surface"
              >
                <X size={18} color={colors.muted} />
              </Pressable>
            </View>

            <Text className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {draft.rounds.find((round) => round.id === pickerRoundId)?.name}
            </Text>

            <View className="flex-row items-center gap-2 rounded-xl border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface px-3 py-2.5 mb-2">
              <Search size={16} color={colors.muted} />
              <TextInput
                value={exerciseSearch}
                onChangeText={setExerciseSearch}
                placeholder="Search by name, muscle or alias"
                placeholderTextColor={colors.muted}
                className="flex-1 text-gray-900 dark:text-gray-100"
              />
              {exerciseSearch ? (
                <Pressable onPress={() => setExerciseSearch("")}>
                  <X size={16} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>

            <View className="flex-row items-center gap-2 mb-2">
              <Funnel size={14} color={colors.muted} />
              <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                Difficulty
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-3"
            >
              <View className="flex-row gap-2">
                {DIFFICULTY_FILTERS.map((filter) => (
                  <Badge
                    key={filter}
                    variant={
                      difficultyFilter === filter ? "primary" : "secondary"
                    }
                    size="sm"
                    onPress={() => setDifficultyFilter(filter)}
                  >
                    {filter === "all"
                      ? "All"
                      : filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Badge>
                ))}
              </View>
            </ScrollView>

            <View className="flex-row items-center gap-2 mb-2">
              <Dumbbell size={14} color={colors.muted} />
              <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                Equipment
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {EQUIPMENT_FILTERS.map((filter) => (
                  <Badge
                    key={filter}
                    variant={
                      equipmentFilter === filter ? "primary" : "secondary"
                    }
                    size="sm"
                    onPress={() => setEquipmentFilter(filter)}
                  >
                    {filter === "all"
                      ? "All"
                      : filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Badge>
                ))}
              </View>
            </ScrollView>
          </View>

          <ScrollView
            className="flex-1 px-4 pt-3"
            contentContainerStyle={{ paddingBottom: scrollPaddingBottom + 24 }}
          >
            {Object.entries(groupedExercises).length === 0 ? (
              <View className="py-12 items-center">
                <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  No exercises found
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1 text-center">
                  Try another search or remove filters.
                </Text>
              </View>
            ) : (
              Object.entries(groupedExercises).map(([group, items]) => (
                <View key={group} className="mb-5">
                  <Text className="text-sm font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300 mb-2">
                    {group}
                  </Text>

                  {items.map((exercise) => (
                    <View key={exercise.id} className="mb-3">
                      <ExerciseCard
                        exercise={exercise}
                        variant="list"
                        showImage
                        imageUrl={GENERIC_EXERCISE_IMAGE}
                        onAddPress={() =>
                          handleAddExercise(pickerRoundId, exercise)
                        }
                        onPress={() =>
                          handleAddExercise(pickerRoundId, exercise)
                        }
                      />
                      <Text className="text-xs text-gray-600 dark:text-gray-400 mt-1 px-1">
                        {exercise.short_description}
                      </Text>
                    </View>
                  ))}
                </View>
              ))
            )}
          </ScrollView>

          <View className="px-4 py-3 border-t border-light-border dark:border-dark-border">
            <Button variant="secondary" onPress={closePicker}>
              Back To Round Builder
            </Button>
          </View>
        </View>
      );
    }

    return (
      <View className={cn("flex-1", isDark ? "bg-dark-bg" : "bg-light-bg")}>
        <ScrollView
          className="flex-1 p-4"
          contentContainerStyle={{ paddingBottom: scrollPaddingBottom }}
        >
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Build Rounds
            </Text>
            <Pressable
              onPress={() => setShowSaveDraftConfirm(true)}
              className="h-9 w-9 rounded-full items-center justify-center bg-light-surface dark:bg-dark-surface"
            >
              <X size={18} color={colors.muted} />
            </Pressable>
          </View>

          {draft.rounds.map((round, roundIndex) => (
            <View
              key={round.id}
              className={cn(
                "rounded-2xl border p-4 mb-4",
                isDark
                  ? "bg-dark-surface border-dark-border"
                  : "bg-light-surface border-light-border",
              )}
            >
              <View className="flex-row items-center justify-between mb-3">
                <Input
                  value={round.name}
                  onChangeText={(text) => updateRound(round.id, { name: text })}
                  placeholder={`Round ${roundIndex + 1}`}
                  containerClassName="flex-1"
                />
                <View className="flex-row ml-2 gap-1">
                  <Pressable
                    className="h-9 w-9 items-center justify-center rounded-lg bg-light-bg dark:bg-dark-bg"
                    onPress={() => handleMoveRound(roundIndex, -1)}
                    disabled={roundIndex === 0}
                  >
                    <ArrowUp
                      size={14}
                      color={
                        roundIndex === 0 ? colors.cardBorder : colors.foreground
                      }
                    />
                  </Pressable>
                  <Pressable
                    className="h-9 w-9 items-center justify-center rounded-lg bg-light-bg dark:bg-dark-bg"
                    onPress={() => handleMoveRound(roundIndex, 1)}
                    disabled={roundIndex === draft.rounds.length - 1}
                  >
                    <ArrowDown
                      size={14}
                      color={
                        roundIndex === draft.rounds.length - 1
                          ? colors.cardBorder
                          : colors.foreground
                      }
                    />
                  </Pressable>
                  <Pressable
                    className="h-9 w-9 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/20"
                    onPress={() => handleRemoveRound(round.id)}
                    disabled={draft.rounds.length <= 1}
                  >
                    <X
                      size={14}
                      color={
                        draft.rounds.length <= 1 ? colors.cardBorder : "#ef4444"
                      }
                    />
                  </Pressable>
                </View>
              </View>

              {round.exercises.length === 0 ? (
                <Text className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  No exercises in this round yet.
                </Text>
              ) : (
                round.exercises.map((exercise, exerciseIndex) => (
                  <View
                    key={exercise.id}
                    className={cn(
                      "rounded-xl border p-3 mb-3",
                      isDark
                        ? "bg-dark-bg border-dark-border"
                        : "bg-light-bg border-light-border",
                    )}
                  >
                    <View className="flex-row items-start justify-between mb-2">
                      <View className="flex-1 pr-2">
                        <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                          {exerciseIndex + 1}. {exercise.name}
                        </Text>
                        <Text className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 capitalize">
                          {exercise.muscleGroups.slice(0, 2).join(", ")} •{" "}
                          {exercise.equipment}
                        </Text>
                      </View>
                      <View className="flex-row gap-1">
                        <Pressable
                          onPress={() =>
                            handleMoveExercise(round.id, exerciseIndex, -1)
                          }
                          disabled={exerciseIndex === 0}
                          className="h-8 w-8 items-center justify-center rounded-md bg-light-surface dark:bg-dark-surface"
                        >
                          <ArrowUp
                            size={13}
                            color={
                              exerciseIndex === 0
                                ? colors.cardBorder
                                : colors.foreground
                            }
                          />
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            handleMoveExercise(round.id, exerciseIndex, 1)
                          }
                          disabled={
                            exerciseIndex === round.exercises.length - 1
                          }
                          className="h-8 w-8 items-center justify-center rounded-md bg-light-surface dark:bg-dark-surface"
                        >
                          <ArrowDown
                            size={13}
                            color={
                              exerciseIndex === round.exercises.length - 1
                                ? colors.cardBorder
                                : colors.foreground
                            }
                          />
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            handleRemoveExercise(round.id, exercise.id)
                          }
                          className="h-8 w-8 items-center justify-center rounded-md bg-red-100 dark:bg-red-900/20"
                        >
                          <X size={13} color="#ef4444" />
                        </Pressable>
                      </View>
                    </View>

                    <View className="flex-row gap-2 mb-2">
                      <Input
                        label="Sets"
                        keyboardType="number-pad"
                        value={String(exercise.sets)}
                        onChangeText={(text) =>
                          updateRoundExercise(round.id, exercise.id, {
                            sets: Number(text || "0") || 1,
                          })
                        }
                        containerClassName="flex-1"
                      />
                      <Input
                        label="Reps"
                        value={exercise.reps}
                        onChangeText={(text) =>
                          updateRoundExercise(round.id, exercise.id, {
                            reps: text,
                          })
                        }
                        containerClassName="flex-1"
                      />
                    </View>

                    <View className="flex-row gap-2 mb-2">
                      {exercise.hasWeight ? (
                        <Input
                          label="Weight (kg)"
                          keyboardType="decimal-pad"
                          value={String(exercise.weightKg ?? 0)}
                          onChangeText={(text) =>
                            updateRoundExercise(round.id, exercise.id, {
                              weightKg: Number(text || "0") || 0,
                            })
                          }
                          containerClassName="flex-1"
                        />
                      ) : (
                        <View className="flex-1">
                          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Weight
                          </Text>
                          <View className="rounded-xl border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface px-4 py-3">
                            <Text className="text-sm text-gray-500 dark:text-gray-400">
                              Not applicable
                            </Text>
                          </View>
                        </View>
                      )}

                      <Input
                        label="Rest between sets (s)"
                        keyboardType="number-pad"
                        value={String(exercise.restSeconds)}
                        onChangeText={(text) =>
                          updateRoundExercise(round.id, exercise.id, {
                            restSeconds: Number(text || "0") || 0,
                          })
                        }
                        containerClassName="flex-1"
                      />
                    </View>

                    <Input
                      label="Notes (optional)"
                      value={exercise.notes ?? ""}
                      onChangeText={(text) =>
                        updateRoundExercise(round.id, exercise.id, {
                          notes: text,
                        })
                      }
                    />
                  </View>
                ))
              )}

              <Pressable
                onPress={() => openPickerForRound(round.id)}
                className="flex-row items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-cyan-400/60"
              >
                <CirclePlus size={17} color={colors.primary} />
                <Text className="font-semibold text-cyan-600 dark:text-cyan-400">
                  Add Exercise To {round.name}
                </Text>
              </Pressable>

              <View className="mt-3">
                <Input
                  label="Rest after this round (seconds)"
                  keyboardType="number-pad"
                  value={String(round.restAfterSeconds ?? 0)}
                  onChangeText={(text) =>
                    updateRound(round.id, {
                      restAfterSeconds: Number(text || "0") || 0,
                    })
                  }
                />
                <Pressable
                  onPress={() =>
                    updateRound(round.id, { restAfterSeconds: null })
                  }
                  className="self-start mt-2"
                >
                  <Text className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                    No rest after this round
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}

          <Pressable
            onPress={handleAddRound}
            className={cn(
              "flex-row items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed mb-4",
              "border-cyan-400/60",
            )}
          >
            <CirclePlus size={18} color={colors.primary} />
            <Text className="font-semibold text-cyan-600 dark:text-cyan-400">
              Add Another Round
            </Text>
          </Pressable>

          <View
            className={cn(
              "p-3 rounded-lg",
              isDark ? "bg-dark-surface" : "bg-light-surface",
            )}
          >
            <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Estimated Duration:{" "}
              {Math.max(1, Math.ceil(estimatedDuration / 60))} min
            </Text>
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              Includes sets, rests between sets and rest between rounds.
            </Text>
          </View>
        </ScrollView>

        {/* Save draft confirm modal */}
        <Modal
          visible={showSaveDraftConfirm}
          onClose={() => setShowSaveDraftConfirm(false)}
        >
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Save draft?
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            Do you want to save this workout as a draft before exiting?
          </Text>
          <View className="flex-row justify-end gap-2 mt-4">
            <Button
              onPress={() => {
                setShowSaveDraftConfirm(false);
                void handleSaveDraft();
              }}
            >
              Save Draft
            </Button>
            <Button
              variant="secondary"
              onPress={() => {
                setShowSaveDraftConfirm(false);
                router.back();
              }}
            >
              Discard
            </Button>
          </View>
        </Modal>

        <View
          className="p-4 border-t border-light-border dark:border-dark-border"
          style={{ paddingBottom: tabBarClearance }}
        >
          <ProgressFormIndicator
            current={3}
            total={4}
            labels={STEP_LABELS}
            showActions
            onBack={() => setStep("details")}
            onContinue={() => setStep("preview")}
            continueLabel="Review Workout"
            disableContinue={totalSelectedExercises === 0}
          />
        </View>
      </View>
    );
  }

  // Preview Step
  return (
    <View className={cn("flex-1", isDark ? "bg-dark-bg" : "bg-light-bg")}>
      <ScrollView
        className="flex-1 p-4"
        contentContainerStyle={{ paddingBottom: scrollPaddingBottom }}
      >
        <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          {draft.name}
        </Text>

        {/* Details Card */}
        <View
          className={cn(
            "p-4 rounded-lg border mb-4",
            isDark
              ? "bg-dark-surface border-dark-border"
              : "bg-light-surface border-light-border",
          )}
        >
          <View className="mb-3">
            <Text className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Difficulty
            </Text>
            <Badge
              variant={
                draft.difficulty === "beginner"
                  ? "success"
                  : draft.difficulty === "intermediate"
                    ? "secondary"
                    : "destructive"
              }
            >
              {DIFFICULTIES.find((d) => d.value === draft.difficulty)?.label}
            </Badge>
          </View>

          <View>
            <Text className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Exercises
            </Text>
            <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {totalSelectedExercises} exercises in {draft.rounds.length} rounds
            </Text>
          </View>
        </View>

        {/* Exercises Summary */}
        <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
          Round Plan
        </Text>
        {draft.rounds.map((round, roundIndex) => (
          <View
            key={round.id}
            className={cn(
              "p-3 rounded-lg mb-3 border",
              isDark
                ? "bg-dark-surface border-dark-border"
                : "bg-light-surface border-light-border",
            )}
          >
            <Text className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {roundIndex + 1}. {round.name}
            </Text>

            {round.exercises.map((exercise, exerciseIndex) => (
              <Text
                key={exercise.id}
                className="text-sm text-gray-600 dark:text-gray-400 mb-1"
              >
                {exerciseIndex + 1}) {exercise.name} • {exercise.sets} x{" "}
                {exercise.reps}
                {exercise.hasWeight ? ` • ${exercise.weightKg ?? 0}kg` : ""}
              </Text>
            ))}

            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Rest after round: {round.restAfterSeconds ?? 0}s
            </Text>
          </View>
        ))}
      </ScrollView>

      <View
        className="p-4 border-t border-light-border dark:border-dark-border"
        style={{ paddingBottom: tabBarClearance }}
      >
        <ProgressFormIndicator
          current={4}
          total={4}
          labels={STEP_LABELS}
          showActions
          onBack={() => setStep("exercises")}
          onContinue={handleSaveDraft}
          finishLabel="Save Workout"
        />
      </View>
    </View>
  );
}
