import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as Haptics from "expo-haptics";
import {
  BackHandler,
  View,
  FlatList,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  ArrowDown,
  ArrowUp,
  Dumbbell,
  ChevronDown,
  ChevronUp,
  GripVertical,
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
import { MuscleMap } from "@/components/workouts/MuscleMap";
import { ProgressFormIndicator } from "@/components/ui/ProgressFormIndicator";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import {
  createWorkoutTemplate,
  getWorkoutTemplate,
  updateWorkoutTemplate,
} from "@/lib/firestore/workouts";
import { uploadWorkoutCoverImage } from "@/lib/workouts/media-upload";
import { useHideMainTabBar } from "@/hooks/useHideMainTabBar";
import type { Difficulty, EquipmentType } from "@/types";
import DraggableFlatList from "react-native-draggable-flatlist";

import { muscleKeyToLabel } from "@/lib/workouts/exercise-catalog";
import {
  loadExerciseCache,
  type CachedLibraryExercise,
} from "@/lib/workouts/exercise-cache";
import {
  buildExerciseFilterGroups,
  exerciseMatchesFilter,
  type ExerciseFilterKey,
} from "@/lib/workouts/exercise-filters";
type WorkflowType = "manual" | "ai";
type CreateStep = "workflow" | "details" | "exercises" | "preview";
type BuilderSectionType = "warmup" | "round" | "cooldown";
type ExerciseExecutionMode = "reps" | "time";

interface BuilderExerciseItem {
  id: string;
  type: "exercise";
  exerciseId: string;
  name: string;
  muscleGroups: string[];
  equipment: EquipmentType;
  difficulty: Difficulty;
  hasWeight: boolean;
  imageUrl: string;
  executionMode: ExerciseExecutionMode;
  reps: string;
  exerciseSeconds?: number;
  prepSeconds?: number;
  weightKg?: number;
  notes?: string;
}

interface BuilderRestItem {
  id: string;
  type: "rest";
  durationSeconds: number;
  notes?: string;
}

type BuilderItem = BuilderExerciseItem | BuilderRestItem;

interface BuilderTarget {
  section: BuilderSectionType;
  roundId?: string;
}

interface WorkoutRound {
  id: string;
  name: string;
  items: BuilderItem[];
}

interface WorkoutDraft {
  name: string;
  description: string;
  cover_image_url?: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  workflowType: WorkflowType;
  warmupEnabled: boolean;
  warmupItems: BuilderItem[];
  rounds: WorkoutRound[];
  cooldownEnabled: boolean;
  cooldownItems: BuilderItem[];
  tags: string[];
  isActive: boolean;
  isPublic: boolean;
  location: string;
  cover_image_asset?: {
    uri: string;
    width: number;
    height: number;
  };
}

const DIFFICULTIES = [
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
];

const LOCATIONS = ["Home", "Gym", "Outdoor", "Hotel", "Other"] as const;

const STEP_LABELS = ["Workflow", "Details", "Exercises", "Preview"];

const GENERIC_EXERCISE_IMAGE =
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80";

type LibraryExercise = CachedLibraryExercise;

function getExercisePreviewImages(exercise: LibraryExercise): string[] {
  return (exercise.remote_image_urls ?? [])
    .filter((url): url is string => Boolean(url))
    .slice(0, 2);
}

function getExercisePrimaryImage(exercise: LibraryExercise): string {
  return getExercisePreviewImages(exercise)[0] ?? GENERIC_EXERCISE_IMAGE;
}

function getWorkoutCoverImageUri(draft: WorkoutDraft): string | undefined {
  return draft.cover_image_asset?.uri ?? draft.cover_image_url;
}

interface ReviewExerciseLine {
  id: string;
  name: string;
  prescription: string;
  hasWeight: boolean;
  weightKg?: number;
  sectionLabel: string;
}

function getExercisePrescription(item: BuilderExerciseItem): string {
  if (item.executionMode === "time") {
    const workSeconds = Math.max(1, Number(item.exerciseSeconds ?? 30));
    const prepSeconds = Math.max(0, Number(item.prepSeconds ?? 0));
    return prepSeconds > 0
      ? `${workSeconds}s + prep ${prepSeconds}s`
      : `${workSeconds}s`;
  }

  return item.reps;
}

function getExerciseDurationSeconds(item: BuilderExerciseItem): number {
  if (item.executionMode === "time") {
    return (
      Math.max(1, Number(item.exerciseSeconds ?? 30)) +
      Math.max(0, Number(item.prepSeconds ?? 0))
    );
  }

  return 40;
}

function createRound(name: string): WorkoutRound {
  return {
    id: `round-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    items: [],
  };
}

export default function CreateWorkoutScreen() {
  const params = useLocalSearchParams<{ mode?: string; templateId?: string }>();
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
  const [isHydratingEdit, setIsHydratingEdit] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [pickerTarget, setPickerTarget] = useState<BuilderTarget | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [showSaveDraftConfirm, setShowSaveDraftConfirm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [sectionExpanded, setSectionExpanded] = useState({
    warmup: true,
    workouts: true,
    cooldown: false,
  });
  const [collapsedRounds, setCollapsedRounds] = useState<
    Record<string, boolean>
  >({});
  const [isRoundDragging, setIsRoundDragging] = useState(false);
  const [selectedExerciseFilters, setSelectedExerciseFilters] = useState<
    ExerciseFilterKey[]
  >([]);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [exerciseLibrary, setExerciseLibrary] = useState<
    LibraryExercise[] | null
  >(null);
  const [loadingExerciseLibrary, setLoadingExerciseLibrary] = useState(false);
  const [selectedExercisePreview, setSelectedExercisePreview] =
    useState<LibraryExercise | null>(null);
  const [
    selectedExercisePreviewImageIndex,
    setSelectedExercisePreviewImageIndex,
  ] = useState(0);
  const [draft, setDraft] = useState<WorkoutDraft>({
    name: "",
    description: "",
    cover_image_url: undefined,
    difficulty: "intermediate",
    workflowType: "manual",
    warmupEnabled: false,
    warmupItems: [],
    rounds: [createRound("Round 1")],
    cooldownEnabled: false,
    cooldownItems: [],
    tags: [],
    isActive: false,
    isPublic: false,
    location: "",
  });

  const editingTemplateId =
    params.mode === "edit" && typeof params.templateId === "string"
      ? params.templateId
      : null;

  const totalSelectedExercises = useMemo(() => {
    const countExercises = (items: BuilderItem[]) =>
      items.filter((item) => item.type === "exercise").length;

    const roundsCount = draft.rounds.reduce(
      (sum, round) => sum + countExercises(round.items ?? []),
      0,
    );

    return (
      roundsCount +
      (draft.warmupEnabled ? countExercises(draft.warmupItems) : 0) +
      (draft.cooldownEnabled ? countExercises(draft.cooldownItems) : 0)
    );
  }, [
    draft.cooldownEnabled,
    draft.cooldownItems,
    draft.rounds,
    draft.warmupEnabled,
    draft.warmupItems,
  ]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoadingExerciseLibrary(true);
        const exercises = await loadExerciseCache();

        if (!mounted) {
          return;
        }

        setExerciseLibrary(exercises);
      } catch (error) {
        console.error("[createWorkout] failed to load exercise cache", error);
        if (!mounted) {
          return;
        }
        showToast("Failed to load exercise catalog", "error");
      } finally {
        if (mounted) {
          setLoadingExerciseLibrary(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [showToast]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!editingTemplateId) {
        return;
      }

      try {
        setIsHydratingEdit(true);
        const template = await getWorkoutTemplate(editingTemplateId);

        if (!mounted) {
          return;
        }

        if (!template) {
          showToast("Workout not found", "error");
          router.replace("/workouts");
          return;
        }

        const mapExerciseBlockToItem = (block: {
          id: string;
          exercise_id?: string;
          name?: string;
          reps?: string;
          execution_mode?: "reps" | "time";
          exercise_seconds?: number;
          prep_seconds?: number;
          duration_seconds?: number;
          weight_kg?: number;
          notes?: string;
          primary_muscles?: string[];
        }): BuilderExerciseItem => {
          const executionMode =
            block.execution_mode ??
            ((block.exercise_seconds ?? block.duration_seconds ?? 0) > 0
              ? "time"
              : "reps");
          const exerciseSeconds =
            block.exercise_seconds ?? block.duration_seconds ?? 30;

          return {
            id: block.id,
            type: "exercise",
            exerciseId: block.exercise_id ?? block.id,
            name: block.name ?? block.exercise_id ?? "Exercise",
            muscleGroups: block.primary_muscles ?? [],
            equipment: "none",
            difficulty: template.difficulty,
            hasWeight:
              executionMode === "reps" &&
              Number.isFinite(block.weight_kg) &&
              (block.weight_kg ?? 0) > 0,
            imageUrl: GENERIC_EXERCISE_IMAGE,
            executionMode,
            reps:
              block.reps ??
              (executionMode === "time"
                ? `${Math.max(1, exerciseSeconds)}s`
                : "10-12"),
            exerciseSeconds: Math.max(1, exerciseSeconds),
            prepSeconds: Math.max(0, block.prep_seconds ?? 0),
            weightKg: block.weight_kg,
            notes: block.notes,
          };
        };

        const mapRestBlockToItem = (block: {
          id: string;
          rest_seconds?: number;
          duration_seconds?: number;
          notes?: string;
        }): BuilderRestItem => ({
          id: block.id,
          type: "rest",
          durationSeconds: Math.max(
            0,
            block.rest_seconds ?? block.duration_seconds ?? 30,
          ),
          notes: block.notes,
        });

        const sections = (template.sections ?? [])
          .slice()
          .sort((a, b) => a.order - b.order);
        const warmupSection = sections.find(
          (section) => section.type === "warmup",
        );
        const cooldownSection = sections.find(
          (section) => section.type === "cooldown",
        );
        const roundSections = sections.filter(
          (section) => section.type === "round",
        );

        const warmupItems = (warmupSection?.blocks ?? [])
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((block) =>
            block.type === "rest"
              ? mapRestBlockToItem(block)
              : mapExerciseBlockToItem(block),
          );

        const cooldownItems = (cooldownSection?.blocks ?? [])
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((block) =>
            block.type === "rest"
              ? mapRestBlockToItem(block)
              : mapExerciseBlockToItem(block),
          );

        const roundsFromSections: WorkoutRound[] = roundSections.map(
          (section) => ({
            id: section.id,
            name: section.name,
            items: section.blocks
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((block) =>
                block.type === "rest"
                  ? mapRestBlockToItem(block)
                  : mapExerciseBlockToItem(block),
              ),
          }),
        );

        const roundsFromFlat: WorkoutRound[] = template.exercises.length
          ? [
              {
                ...createRound("Round 1"),
                items: template.exercises.map((exercise) => {
                  const repsText = exercise.reps ?? "10-12";
                  const timedMatch = repsText.trim().match(/^(\d+)\s*s$/i);
                  const timedSeconds = timedMatch ? Number(timedMatch[1]) : 30;
                  const executionMode: ExerciseExecutionMode = timedMatch
                    ? "time"
                    : "reps";

                  return {
                    id: `selected-${exercise.id}-${Math.random().toString(36).slice(2, 6)}`,
                    type: "exercise",
                    exerciseId: exercise.id,
                    name: exercise.name,
                    muscleGroups: exercise.muscleGroups ?? [],
                    equipment: "none",
                    difficulty: template.difficulty,
                    hasWeight: false,
                    imageUrl: GENERIC_EXERCISE_IMAGE,
                    executionMode,
                    reps: executionMode === "time" ? "10-12" : repsText,
                    exerciseSeconds: Math.max(1, timedSeconds),
                    prepSeconds: 0,
                    notes: "",
                  } satisfies BuilderExerciseItem;
                }),
              },
            ]
          : [];

        const hydratedRounds =
          roundsFromSections.length > 0
            ? roundsFromSections
            : roundsFromFlat.length > 0
              ? roundsFromFlat
              : [createRound("Round 1")];

        setWorkflowType(template.is_ai_generated ? "ai" : "manual");
        setSelectedDifficulty(template.difficulty);
        setAiPrompt(template.source_prompt ?? "");
        setStep("details");
        setDraft((prev) => ({
          ...prev,
          name: template.name,
          description: template.description ?? "",
          cover_image_url: template.cover_image_url,
          difficulty: template.difficulty,
          workflowType: template.is_ai_generated ? "ai" : "manual",
          warmupEnabled: warmupItems.length > 0,
          warmupItems,
          rounds: hydratedRounds,
          cooldownEnabled: cooldownItems.length > 0,
          cooldownItems,
          tags: template.tags ?? [],
          isActive: template.is_active ?? false,
          isPublic: template.is_public ?? false,
          location: template.location ?? "",
        }));
      } catch (error) {
        console.error("[createWorkout] failed to hydrate edit template", error);
        if (mounted) {
          showToast("Could not load workout for editing", "error");
          router.replace("/workouts");
        }
      } finally {
        if (mounted) {
          setIsHydratingEdit(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [editingTemplateId, router, showToast]);

  const estimatedDuration = useMemo(() => {
    const sectionDuration = (items: BuilderItem[]) =>
      items.reduce((sum, item) => {
        if (item.type === "rest") {
          return sum + item.durationSeconds;
        }
        return sum + getExerciseDurationSeconds(item);
      }, 0);

    return (
      draft.rounds.reduce(
        (total, round) => total + sectionDuration(round.items ?? []),
        0,
      ) +
      (draft.warmupEnabled ? sectionDuration(draft.warmupItems) : 0) +
      (draft.cooldownEnabled ? sectionDuration(draft.cooldownItems) : 0)
    );
  }, [
    draft.cooldownEnabled,
    draft.cooldownItems,
    draft.rounds,
    draft.warmupEnabled,
    draft.warmupItems,
  ]);

  const exerciseFilterGroups = useMemo(
    () => buildExerciseFilterGroups(exerciseLibrary ?? []),
    [exerciseLibrary],
  );

  const activeExerciseFilterLabel = useMemo(() => {
    if (selectedExerciseFilters.length === 0) return "All exercises";
    if (selectedExerciseFilters.length === 1) {
      const key = selectedExerciseFilters[0];
      for (const group of exerciseFilterGroups) {
        const match = group.options.find((option) => option.key === key);
        if (match) return match.label;
      }
      return "Filtered";
    }
    return `${selectedExerciseFilters.length} filters`;
  }, [selectedExerciseFilters, exerciseFilterGroups]);

  const groupedExercises = useMemo(() => {
    if (!exerciseLibrary) return {};

    const filtered = exerciseLibrary.filter((exercise) => {
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
      const matchesFilter =
        selectedExerciseFilters.length === 0
          ? true
          : selectedExerciseFilters.some((key) =>
              exerciseMatchesFilter(exercise, key),
            );

      return matchesSearch && matchesFilter;
    });

    return filtered.reduce<Record<string, typeof filtered>>((acc, exercise) => {
      const key = exercise.primary_muscles[0] ?? "other";
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(exercise);
      return acc;
    }, {});
  }, [selectedExerciseFilters, exerciseLibrary, exerciseSearch]);

  const flattenedFilteredExercises = useMemo(() => {
    return Object.entries(groupedExercises).flatMap(([group, items]) =>
      items.map((item) => ({ ...item, group })),
    );
  }, [groupedExercises]);

  const selectedExercisePreviewImages = useMemo(
    () =>
      selectedExercisePreview
        ? getExercisePreviewImages(selectedExercisePreview)
        : [],
    [selectedExercisePreview],
  );

  useEffect(() => {
    setSelectedExercisePreviewImageIndex(0);

    if (!selectedExercisePreview || selectedExercisePreviewImages.length <= 1) {
      return;
    }

    const interval = setInterval(() => {
      setSelectedExercisePreviewImageIndex(
        (current) => (current + 1) % selectedExercisePreviewImages.length,
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [selectedExercisePreview, selectedExercisePreviewImages.length]);

  const reviewExerciseLines = useMemo(() => {
    const lines: ReviewExerciseLine[] = [];

    if (draft.warmupEnabled) {
      for (const item of draft.warmupItems) {
        if (item.type !== "exercise") continue;
        lines.push({
          id: item.id,
          name: item.name,
          prescription: getExercisePrescription(item),
          hasWeight: item.hasWeight,
          weightKg: item.weightKg,
          sectionLabel: "Warmup",
        });
      }
    }

    for (const round of draft.rounds) {
      for (const item of round.items ?? []) {
        if (item.type !== "exercise") continue;
        lines.push({
          id: item.id,
          name: item.name,
          prescription: getExercisePrescription(item),
          hasWeight: item.hasWeight,
          weightKg: item.weightKg,
          sectionLabel: round.name,
        });
      }
    }

    if (draft.cooldownEnabled) {
      for (const item of draft.cooldownItems) {
        if (item.type !== "exercise") continue;
        lines.push({
          id: item.id,
          name: item.name,
          prescription: getExercisePrescription(item),
          hasWeight: item.hasWeight,
          weightKg: item.weightKg,
          sectionLabel: "Cooldown",
        });
      }
    }

    return lines;
  }, [
    draft.cooldownEnabled,
    draft.cooldownItems,
    draft.rounds,
    draft.warmupEnabled,
    draft.warmupItems,
  ]);

  const workedMuscles = useMemo(() => {
    const muscles = new Set<string>();

    const appendExerciseMuscles = (items: BuilderItem[]) => {
      for (const item of items) {
        if (item.type !== "exercise") continue;
        for (const muscle of item.muscleGroups ?? []) {
          if (muscle) muscles.add(muscle);
        }
      }
    };

    if (draft.warmupEnabled) appendExerciseMuscles(draft.warmupItems);
    for (const round of draft.rounds) {
      appendExerciseMuscles(round.items ?? []);
    }
    if (draft.cooldownEnabled) appendExerciseMuscles(draft.cooldownItems);

    return Array.from(muscles);
  }, [
    draft.cooldownEnabled,
    draft.cooldownItems,
    draft.rounds,
    draft.warmupEnabled,
    draft.warmupItems,
  ]);

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

  const handlePickCoverImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [16, 9],
        base64: true,
        quality: 1,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        setDraft((prev) => ({
          ...prev,
          cover_image_asset: {
            uri: asset.uri,
            width: asset.width,
            height: asset.height,
          },
        }));
        showToast("Cover image cropped and saved", "success");
      }
    } catch (error) {
      console.error("[handlePickCoverImage] Error picking image", error);
      showToast("Failed to pick image", "error");
    }
  };

  const handleRemoveCoverImage = () => {
    setDraft((prev) => ({
      ...prev,
      cover_image_asset: undefined,
      cover_image_url: undefined,
    }));
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
      if (!exerciseLibrary || exerciseLibrary.length === 0) {
        showToast(
          "Exercise catalog is still loading. Try again in a moment.",
          "error",
        );
        return;
      }

      const generatedExercises: BuilderExerciseItem[] = exerciseLibrary
        .slice(0, 5)
        .map((exercise) => ({
          id: `selected-${exercise.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: "exercise",
          exerciseId: exercise.id,
          name: exercise.name,
          muscleGroups: exercise.primary_muscles,
          equipment: exercise.equipment_label,
          difficulty: exercise.difficulty,
          hasWeight: exercise.has_weight,
          imageUrl: GENERIC_EXERCISE_IMAGE,
          executionMode: "reps",
          reps: `${8 + Math.floor(Math.random() * 4)}-${12 + Math.floor(Math.random() * 4)}`,
          exerciseSeconds: 30,
          prepSeconds: 3,
          weightKg: exercise.has_weight ? 20 : undefined,
        }));

      setDraft((prev) => ({
        ...prev,
        rounds: [
          {
            ...createRound("Round 1"),
            items: generatedExercises,
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

  const openPickerForTarget = (target: BuilderTarget) => {
    setPickerTarget(target);
  };

  const closePicker = () => {
    setPickerTarget(null);
    setSelectedExercisePreview(null);
  };

  const handleAddExercise = (
    target: BuilderTarget,
    exercise: LibraryExercise,
  ) => {
    const selectedExercise: BuilderExerciseItem = {
      id: `selected-${exercise.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: "exercise",
      exerciseId: exercise.id,
      name: exercise.name,
      muscleGroups: exercise.primary_muscles,
      equipment: exercise.equipment_label,
      difficulty: exercise.difficulty,
      hasWeight: exercise.has_weight,
      imageUrl: getExercisePrimaryImage(exercise),
      executionMode: "reps",
      reps: "10-12",
      exerciseSeconds: 30,
      prepSeconds: 3,
      weightKg: exercise.has_weight ? 20 : undefined,
      notes: "",
    };

    setDraft((prev) => {
      if (target.section === "warmup") {
        return {
          ...prev,
          warmupItems: [...prev.warmupItems, selectedExercise],
        };
      }

      if (target.section === "cooldown") {
        return {
          ...prev,
          cooldownItems: [...prev.cooldownItems, selectedExercise],
        };
      }

      return {
        ...prev,
        rounds: prev.rounds.map((round) =>
          round.id === target.roundId
            ? { ...round, items: [...(round.items ?? []), selectedExercise] }
            : round,
        ),
      };
    });

    closePicker();
    showToast(`Added ${exercise.name}`, "success");
    setExerciseSearch("");
    setSelectedExercisePreview(null);
  };

  const handleOpenExercisePreview = (exercise: LibraryExercise) => {
    setSelectedExercisePreview(exercise);
  };

  const handleAddRound = () => {
    setDraft((prev) => ({
      ...prev,
      rounds: [...prev.rounds, createRound(`Round ${prev.rounds.length + 1}`)],
    }));
  };

  const toggleRoundCollapsed = (roundId: string) => {
    setCollapsedRounds((prev) => ({ ...prev, [roundId]: !prev[roundId] }));
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

  const handleReorderRounds = (rounds: WorkoutRound[]) => {
    setDraft((prev) => ({
      ...prev,
      rounds,
    }));
  };

  const handleReorderItems = (target: BuilderTarget, items: BuilderItem[]) => {
    updateItemsForTarget(target, () => items);
  };

  const updateRound = (roundId: string, patch: Pick<WorkoutRound, "name">) => {
    setDraft((prev) => ({
      ...prev,
      rounds: prev.rounds.map((round) =>
        round.id === roundId ? { ...round, ...patch } : round,
      ),
    }));
  };

  const updateItemsForTarget = (
    target: BuilderTarget,
    updater: (items: BuilderItem[]) => BuilderItem[],
  ) => {
    setDraft((prev) => {
      if (target.section === "warmup") {
        return { ...prev, warmupItems: updater(prev.warmupItems) };
      }

      if (target.section === "cooldown") {
        return { ...prev, cooldownItems: updater(prev.cooldownItems) };
      }

      return {
        ...prev,
        rounds: prev.rounds.map((round) =>
          round.id === target.roundId
            ? { ...round, items: updater(round.items ?? []) }
            : round,
        ),
      };
    });
  };

  const handleAddRest = (target: BuilderTarget) => {
    const restItem: BuilderRestItem = {
      id: `rest-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: "rest",
      durationSeconds: 30,
      notes: "",
    };

    updateItemsForTarget(target, (items) => [...items, restItem]);
  };

  const updateBuilderItem = (
    target: BuilderTarget,
    itemId: string,
    patch: Partial<BuilderExerciseItem> | Partial<BuilderRestItem>,
  ) => {
    updateItemsForTarget(target, (items) =>
      items.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        if (item.type === "rest") {
          return { ...item, ...(patch as Partial<BuilderRestItem>) };
        }

        return { ...item, ...(patch as Partial<BuilderExerciseItem>) };
      }),
    );
  };

  const handleRemoveItem = (target: BuilderTarget, itemId: string) => {
    updateItemsForTarget(target, (items) =>
      items.filter((item) => item.id !== itemId),
    );
  };

  const handleDuplicateItem = (target: BuilderTarget, itemId: string) => {
    updateItemsForTarget(target, (items) => {
      const index = items.findIndex((item) => item.id === itemId);
      if (index < 0) {
        return items;
      }

      const item = items[index];
      const duplicate: BuilderItem =
        item.type === "rest"
          ? {
              ...item,
              id: `rest-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            }
          : {
              ...item,
              id: `selected-${item.exerciseId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            };

      const nextItems = [...items];
      nextItems.push(duplicate);
      return nextItems;
    });
  };

  const handleMoveItem = (
    target: BuilderTarget,
    itemIndex: number,
    direction: -1 | 1,
  ) => {
    updateItemsForTarget(target, (items) => {
      const nextIndex = itemIndex + direction;
      if (nextIndex < 0 || nextIndex >= items.length) {
        return items;
      }

      const nextItems = [...items];
      [nextItems[itemIndex], nextItems[nextIndex]] = [
        nextItems[nextIndex],
        nextItems[itemIndex],
      ];
      return nextItems;
    });
  };

  const flattenExercisesForSave = () => {
    const extractExercises = (items: BuilderItem[]) =>
      items
        .filter((item): item is BuilderExerciseItem => item.type === "exercise")
        .map((exercise) => ({
          id: exercise.exerciseId,
          name: exercise.name,
          sets: 1,
          reps:
            exercise.executionMode === "time"
              ? `${Math.max(1, exercise.exerciseSeconds ?? 30)}s`
              : exercise.reps,
          muscleGroups: exercise.muscleGroups,
        }));

    return [
      ...extractExercises(draft.warmupItems),
      ...draft.rounds.flatMap((round) => extractExercises(round.items ?? [])),
      ...extractExercises(draft.cooldownItems),
    ];
  };

  const buildSectionsForSave = () => {
    const mapItemsToBlocks = (items: BuilderItem[]) =>
      items.map((item, index) => {
        if (item.type === "rest") {
          return {
            id: item.id,
            type: "rest" as const,
            order: index + 1,
            rest_seconds: item.durationSeconds,
            notes: item.notes,
          };
        }

        return {
          id: item.id,
          type: "exercise" as const,
          order: index + 1,
          exercise_id: item.exerciseId,
          name: item.name,
          reps: item.reps,
          execution_mode: item.executionMode,
          exercise_seconds:
            item.executionMode === "time"
              ? Math.max(1, item.exerciseSeconds ?? 30)
              : undefined,
          prep_seconds:
            item.executionMode === "time"
              ? Math.max(0, item.prepSeconds ?? 0)
              : undefined,
          weight_kg: item.weightKg,
          duration_seconds:
            item.executionMode === "time"
              ? Math.max(1, item.exerciseSeconds ?? 30)
              : undefined,
          notes: item.notes,
          primary_muscles: item.muscleGroups,
          secondary_muscles: [],
        };
      });

    const sections: {
      id: string;
      type: "warmup" | "round" | "cooldown";
      name: string;
      order: number;
      blocks: ReturnType<typeof mapItemsToBlocks>;
    }[] = [];

    let order = 1;
    if (draft.warmupEnabled) {
      sections.push({
        id: "warmup",
        type: "warmup",
        name: "Warmup",
        order,
        blocks: mapItemsToBlocks(draft.warmupItems),
      });
      order += 1;
    }

    for (const round of draft.rounds) {
      sections.push({
        id: round.id,
        type: "round",
        name: round.name,
        order,
        blocks: mapItemsToBlocks(round.items ?? []),
      });
      order += 1;
    }

    if (draft.cooldownEnabled) {
      sections.push({
        id: "cooldown",
        type: "cooldown",
        name: "Cooldown",
        order,
        blocks: mapItemsToBlocks(draft.cooldownItems),
      });
    }

    return sections;
  };

  const navigateAwayFromCreate = useCallback(() => {
    if (typeof router.canGoBack === "function" && router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/workouts");
  }, [router]);

  const isDraftConfirmStep = step === "exercises" || step === "preview";

  const handleRequestClose = useCallback(() => {
    if (isDraftConfirmStep) {
      setShowSaveDraftConfirm(true);
      return;
    }
    navigateAwayFromCreate();
  }, [isDraftConfirmStep, navigateAwayFromCreate]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        handleRequestClose();
        return true;
      },
    );

    return () => subscription.remove();
  }, [handleRequestClose]);

  const saveWorkout = async (mode: "draft" | "final") => {
    if (!draft.name.trim()) {
      showToast("Workout name is required", "error");
      return;
    }

    const flatExercises = flattenExercisesForSave();
    const sections = buildSectionsForSave();
    if (flatExercises.length === 0) {
      showToast("Add at least one exercise", "error");
      return;
    }

    const hasEmptyRound = draft.rounds.some(
      (round) => !(round.items ?? []).some((item) => item.type === "exercise"),
    );
    if (hasEmptyRound) {
      showToast("Each round must have at least one exercise", "error");
      return;
    }

    try {
      if (!user?.uid) {
        throw new Error("You must be signed in to save workouts");
      }

      let coverImageUrl: string | undefined;
      if (draft.cover_image_url) {
        coverImageUrl = draft.cover_image_url;
      }
      if (draft.cover_image_asset) {
        const uploadedCoverImage = await uploadWorkoutCoverImage(
          user.uid,
          `workout-${Date.now()}`,
          draft.cover_image_asset,
        );
        coverImageUrl = uploadedCoverImage.imageUrl;
      }

      const payload = {
        name: draft.name.trim(),
        description: draft.description.trim() || undefined,
        cover_image_url: coverImageUrl,
        difficulty: draft.difficulty,
        is_ai_generated: draft.workflowType === "ai",
        is_active: mode === "final" ? true : false,
        is_public: mode === "draft" ? false : draft.isPublic,
        location: draft.location || undefined,
        source_prompt:
          workflowType === "ai" ? aiPrompt.trim() || undefined : undefined,
        exercises: flatExercises,
        sections,
        estimated_duration_minutes: Math.max(
          10,
          Math.ceil(estimatedDuration / 60),
        ),
        tags: [...draft.tags],
      };

      if (editingTemplateId) {
        await updateWorkoutTemplate(editingTemplateId, payload);
        showToast({
          title: mode === "draft" ? "Draft updated" : "Workout updated",
          message:
            mode === "draft"
              ? `${draft.name.trim()} was updated as private draft.`
              : `${draft.name.trim()} was updated successfully.`,
          type: "success",
        });
        router.replace(`/workouts/${editingTemplateId}`);
        return;
      }

      const savedWorkout = await createWorkoutTemplate(user.uid, payload);

      showToast({
        title: mode === "draft" ? "Draft saved" : "Workout saved",
        message:
          mode === "draft"
            ? `${savedWorkout.name} was saved as private draft.`
            : `${savedWorkout.name} was saved to your workouts.`,
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

  const handleSaveDraft = async () => {
    await saveWorkout("draft");
  };

  const handleSaveFinalWorkout = async () => {
    await saveWorkout("final");
  };

  // Helper: Render header with close button
  const renderHeader = (title: string) => (
    <View className="flex-row items-center justify-between px-4 pt-3 pb-2 border-b border-light-border dark:border-dark-border">
      <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
        {title}
      </Text>
      <Pressable
        onPress={handleRequestClose}
        className="h-8 w-8 rounded-full items-center justify-center active:opacity-70"
      >
        <X size={20} color={colors.foreground} />
      </Pressable>
    </View>
  );

  const renderBuilderItem = (
    target: BuilderTarget,
    item: BuilderItem,
    itemIndex: number,
    totalItems: number,
    drag?: () => void,
    isActive = false,
  ) => (
    <View
      className={cn(
        "pb-3 mb-3 border-b border-light-border dark:border-dark-border",
        isActive ? "opacity-80" : "opacity-100",
      )}
    >
      <View className="flex-row items-start justify-between gap-2">
        <Pressable
          onLongPress={() => {
            void Haptics.selectionAsync();
            drag?.();
          }}
          delayLongPress={170}
          className="flex-row items-center gap-3 flex-1 pr-1"
        >
          {item.type === "exercise" ? (
            <Image
              source={{ uri: item.imageUrl || GENERIC_EXERCISE_IMAGE }}
              style={{ width: 42, height: 42, borderRadius: 10 }}
              resizeMode="cover"
            />
          ) : (
            <View className="h-[42px] w-[42px] rounded-full items-center justify-center bg-amber-100 dark:bg-amber-900/30">
              <Text className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                Rest
              </Text>
            </View>
          )}

          <View className="flex-1">
            <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {item.type === "exercise"
                ? item.name
                : `Rest ${item.durationSeconds}s`}
            </Text>
            <Text className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              {item.type === "exercise"
                ? `${getExercisePrescription(item)}${item.hasWeight ? ` • ${item.weightKg ?? 0}kg` : ""}`
                : "Recovery block"}
            </Text>
          </View>
        </Pressable>

        <View className="flex-row items-center gap-0.5">
          <View className="h-8 w-8 items-center justify-center">
            <GripVertical size={14} color={colors.muted} />
          </View>
          <Pressable
            onPress={() => handleMoveItem(target, itemIndex, -1)}
            disabled={itemIndex === 0}
            className="h-8 w-8 items-center justify-center"
          >
            <ArrowUp
              size={14}
              color={itemIndex === 0 ? colors.cardBorder : colors.foreground}
            />
          </Pressable>
          <Pressable
            onPress={() => handleMoveItem(target, itemIndex, 1)}
            disabled={itemIndex === totalItems - 1}
            className="h-8 w-8 items-center justify-center"
          >
            <ArrowDown
              size={14}
              color={
                itemIndex === totalItems - 1
                  ? colors.cardBorder
                  : colors.foreground
              }
            />
          </Pressable>
          <Pressable
            onPress={() =>
              setEditingItemId((prev) => (prev === item.id ? null : item.id))
            }
            className="h-8 w-8 items-center justify-center"
          >
            <Text className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">
              Edit
            </Text>
          </Pressable>
        </View>
      </View>

      {editingItemId === item.id ? (
        <View className="mt-3 gap-2">
          {item.type === "exercise" ? (
            <>
              {!item.hasWeight ? (
                <View className="flex-row gap-2">
                  <Badge
                    variant={
                      item.executionMode === "reps" ? "primary" : "secondary"
                    }
                    size="sm"
                    onPress={() =>
                      updateBuilderItem(target, item.id, {
                        executionMode: "reps",
                      })
                    }
                  >
                    Reps
                  </Badge>
                  <Badge
                    variant={
                      item.executionMode === "time" ? "primary" : "secondary"
                    }
                    size="sm"
                    onPress={() =>
                      updateBuilderItem(target, item.id, {
                        executionMode: "time",
                        exerciseSeconds: item.exerciseSeconds ?? 30,
                        prepSeconds: item.prepSeconds ?? 3,
                      })
                    }
                  >
                    Time
                  </Badge>
                </View>
              ) : null}

              {item.executionMode === "time" && !item.hasWeight ? (
                <View className="flex-row gap-2">
                  <Input
                    label="Execution (seconds)"
                    keyboardType="number-pad"
                    value={String(item.exerciseSeconds ?? 30)}
                    onChangeText={(text) =>
                      updateBuilderItem(target, item.id, {
                        exerciseSeconds: Math.max(1, Number(text || "0") || 0),
                      })
                    }
                    containerClassName="flex-1"
                  />
                  <Input
                    label="Prep (seconds)"
                    keyboardType="number-pad"
                    value={String(item.prepSeconds ?? 3)}
                    onChangeText={(text) =>
                      updateBuilderItem(target, item.id, {
                        prepSeconds: Math.max(0, Number(text || "0") || 0),
                      })
                    }
                    containerClassName="flex-1"
                  />
                </View>
              ) : (
                <View className="flex-row gap-2">
                  <Input
                    label="Reps"
                    value={item.reps}
                    onChangeText={(text) =>
                      updateBuilderItem(target, item.id, { reps: text })
                    }
                    containerClassName="flex-1"
                  />
                  {item.hasWeight ? (
                    <Input
                      label="Weight (kg)"
                      keyboardType="decimal-pad"
                      value={String(item.weightKg ?? 0)}
                      onChangeText={(text) =>
                        updateBuilderItem(target, item.id, {
                          weightKg: Number(text || "0") || 0,
                        })
                      }
                      containerClassName="flex-1"
                    />
                  ) : null}
                </View>
              )}
            </>
          ) : (
            <Input
              label="Rest Duration (seconds)"
              keyboardType="number-pad"
              value={String(item.durationSeconds)}
              onChangeText={(text) =>
                updateBuilderItem(target, item.id, {
                  durationSeconds: Number(text || "0") || 0,
                })
              }
              containerClassName="mb-0"
            />
          )}

          <Input
            label="Notes"
            value={item.notes ?? ""}
            onChangeText={(text) =>
              updateBuilderItem(target, item.id, { notes: text })
            }
          />

          <View className="flex-row gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onPress={() => handleDuplicateItem(target, item.id)}
            >
              Duplicate
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onPress={() => handleRemoveItem(target, item.id)}
            >
              Delete
            </Button>
          </View>
        </View>
      ) : null}
    </View>
  );

  const renderBuilderItemsList = (
    target: BuilderTarget,
    items: BuilderItem[],
  ) => (
    <DraggableFlatList
      data={items}
      keyExtractor={(item) => item.id}
      onDragBegin={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      onDragEnd={({ data }) => {
        handleReorderItems(target, data);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }}
      scrollEnabled={false}
      activationDistance={8}
      renderItem={({ item, getIndex, drag, isActive }) => {
        const itemIndex = getIndex() ?? 0;
        return renderBuilderItem(
          target,
          item,
          itemIndex,
          items.length,
          drag,
          isActive,
        );
      }}
    />
  );

  if (isHydratingEdit) {
    return (
      <View
        className={cn(
          "flex-1 items-center justify-center",
          isDark ? "bg-dark-bg" : "bg-light-bg",
        )}
      >
        <Spinner size="lg" color={colors.primary} />
        <Text className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Loading workout data...
        </Text>
      </View>
    );
  }

  // Workflow Selection Step
  if (step === "workflow") {
    return (
      <View className={cn("flex-1", isDark ? "bg-dark-bg" : "bg-light-bg")}>
        {renderHeader("Create Workout")}
        <ScrollView
          className="flex-1 p-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: tabBarClearance + 16 }}
        >
          <Text className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Choose how to build your workout
          </Text>

          {/* Manual Workflow */}
          <Pressable
            onPress={() => handleWorkflowSelect("manual")}
            className={cn(
              "p-6 rounded-2xl mb-4 border-2 active:opacity-70",
              workflowType === "manual"
                ? "border-cyan-500 dark:border-cyan-500"
                : "",
              isDark
                ? "bg-dark-surface border-dark-border"
                : "bg-light-surface border-light-border",
            )}
          >
            <View className="flex-row items-start gap-4">
              <Dumbbell size={32} color={colors.primary} />
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Build Manually
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Browse and select exercises from our library
                </Text>
              </View>
            </View>
          </Pressable>

          {/* AI Workflow */}
          <Pressable
            onPress={() => handleWorkflowSelect("ai")}
            className={cn(
              "p-6 rounded-2xl border-2 active:opacity-70",
              workflowType === "ai"
                ? "border-cyan-500 dark:border-cyan-500"
                : "",
              isDark
                ? "bg-dark-surface border-dark-border"
                : "bg-light-surface border-light-border",
            )}
          >
            <View className="flex-row items-start gap-4">
              <Sparkles size={32} color={colors.primary} />
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Generate with AI
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400 mt-2">
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
        {renderHeader(
          workflowType === "ai" ? "Generate Your Workout" : "Workout Details",
        )}
        <ScrollView
          className="flex-1 p-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: tabBarClearance + 16 }}
        >
          <View
            className={cn(
              "px-1 mb-4",
              isDark ? "border-dark-border" : "border-light-border",
            )}
          >
            <Text className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-700 dark:text-cyan-300 mb-3">
              Workout Details
            </Text>

            <View className="mb-5 pb-4 border-b border-light-border dark:border-dark-border">
              {getWorkoutCoverImageUri(draft) ? (
                <View className="gap-3">
                  <View className="rounded-3xl overflow-hidden border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg">
                    <Image
                      source={{
                        uri: getWorkoutCoverImageUri(draft),
                      }}
                      className="w-full h-44"
                      resizeMode="cover"
                    />
                  </View>
                  <View className="flex-row gap-2">
                    <Button variant="secondary" onPress={handlePickCoverImage}>
                      Crop / replace
                    </Button>
                    <Button
                      variant="secondary"
                      onPress={handleRemoveCoverImage}
                    >
                      Remove
                    </Button>
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={handlePickCoverImage}
                  className={cn(
                    "rounded-3xl border-2 border-dashed p-4 min-h-[164px] items-center justify-center",
                    isDark
                      ? "bg-dark-bg border-dark-border"
                      : "bg-light-bg border-light-border",
                  )}
                >
                  <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 text-center">
                    Add workout image
                  </Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
                    Crop it before saving. This image will be uploaded when you
                    save the workout.
                  </Text>
                </Pressable>
              )}
            </View>

            <Input
              label="Workout Name"
              placeholder="e.g., Summer Shred"
              value={draft.name}
              onChangeText={(text) =>
                setDraft((prev) => ({ ...prev, name: text }))
              }
              containerClassName="mb-5"
              className="rounded-2xl px-5 py-4 text-base font-semibold min-h-[60px]"
            />

            <View className="mb-5 pb-4 border-b border-light-border dark:border-dark-border">
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
                    className="flex-1 items-center py-3 rounded-full"
                    textClassName="text-center text-sm font-semibold"
                    variant={
                      selectedDifficulty === d.value ? "primary" : "default"
                    }
                  >
                    {d.label}
                  </Badge>
                ))}
              </View>
            </View>

            <View className="mb-5 pb-4 border-b border-light-border dark:border-dark-border">
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Location
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {LOCATIONS.map((loc) => (
                  <Badge
                    key={loc}
                    onPress={() =>
                      setDraft((prev) => ({
                        ...prev,
                        location: prev.location === loc ? "" : loc,
                      }))
                    }
                    variant={draft.location === loc ? "primary" : "default"}
                  >
                    {loc}
                  </Badge>
                ))}
              </View>
            </View>

            <View className="mb-5 pb-4 border-b border-light-border dark:border-dark-border">
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Status
              </Text>
              <View className="flex-row gap-2">
                <Badge
                  onPress={() =>
                    setDraft((prev) => ({ ...prev, isActive: false }))
                  }
                  className="flex-1 items-center"
                  textClassName="text-center"
                  variant={!draft.isActive ? "primary" : "default"}
                >
                  Inactive
                </Badge>
                <Badge
                  onPress={() =>
                    setDraft((prev) => ({ ...prev, isActive: true }))
                  }
                  className="flex-1 items-center"
                  textClassName="text-center"
                  variant={draft.isActive ? "primary" : "default"}
                >
                  Active
                </Badge>
              </View>
            </View>

            <View>
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Visibility
              </Text>
              <View className="flex-row gap-2">
                <Badge
                  onPress={() =>
                    setDraft((prev) => ({ ...prev, isPublic: false }))
                  }
                  className="flex-1 items-center"
                  textClassName="text-center"
                  variant={!draft.isPublic ? "primary" : "default"}
                >
                  Private
                </Badge>
                <Badge
                  onPress={() =>
                    setDraft((prev) => ({ ...prev, isPublic: true }))
                  }
                  className="flex-1 items-center"
                  textClassName="text-center"
                  variant={draft.isPublic ? "primary" : "default"}
                >
                  Public
                </Badge>
              </View>
            </View>
          </View>

          {workflowType === "ai" ? (
            <View
              className={cn(
                "mb-4",
                isDark ? "border-dark-border" : "border-light-border",
              )}
            >
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
                  "rounded-2xl border-2 px-5 py-4 text-base leading-6 min-h-[140px]",
                  isDark
                    ? "bg-dark-bg border-dark-border text-gray-100"
                    : "bg-light-bg border-light-border text-gray-900",
                )}
                textAlignVertical="top"
              />
            </View>
          ) : (
            <View
              className={cn(
                "mb-4",
                isDark ? "border-dark-border" : "border-light-border",
              )}
            >
              <Input
                label="Description (optional)"
                placeholder="E.g., Strength-focused upper body session"
                value={draft.description}
                onChangeText={(text) =>
                  setDraft((prev) => ({ ...prev, description: text }))
                }
                containerClassName="mb-0"
                className="rounded-2xl px-5 py-4 text-base leading-6 min-h-[120px]"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
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
              workflowType === "ai"
                ? handleGenerateAI
                : handleContinueToExercises
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
    if (pickerTarget) {
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
              {pickerTarget.section === "round"
                ? draft.rounds.find(
                    (round) => round.id === pickerTarget.roundId,
                  )?.name
                : pickerTarget.section === "warmup"
                  ? "Warmup"
                  : "Cooldown"}
            </Text>

            <View className="flex-row items-center gap-2 rounded-2xl border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface px-4 py-3 mb-3">
              <Search size={16} color={colors.muted} />
              <TextInput
                value={exerciseSearch}
                onChangeText={setExerciseSearch}
                placeholder="Search by name, muscle or alias"
                placeholderTextColor={colors.muted}
                className="flex-1 text-gray-900 dark:text-gray-100"
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
              />
              {exerciseSearch ? (
                <Pressable onPress={() => setExerciseSearch("")}>
                  <X size={16} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>

            <View className="mb-3 rounded-3xl border border-cyan-200/70 dark:border-cyan-900/40 bg-cyan-50/70 dark:bg-cyan-950/20 px-4 py-4 shadow-sm shadow-cyan-500/10 overflow-hidden">
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-1 pr-2">
                  <Text className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-700 dark:text-cyan-300">
                    Exercise Finder
                  </Text>
                  <Text className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Search, then expand the filter panel if you need a specific
                    intent or gear.
                  </Text>
                </View>
                <Pressable
                  onPress={() => setIsFilterPanelOpen((prev) => !prev)}
                  className="flex-row items-center gap-2 rounded-full border border-cyan-200/70 dark:border-cyan-900/40 bg-white/90 dark:bg-black/20 px-4 py-2"
                >
                  <Text className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
                    Filters
                  </Text>
                  {isFilterPanelOpen ? (
                    <ChevronUp size={14} color={colors.primary} />
                  ) : (
                    <ChevronDown size={14} color={colors.primary} />
                  )}
                </Pressable>
              </View>

              <View className="mt-3 flex-row items-center justify-between gap-2">
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                >
                  <View className="flex-row gap-2 pr-2">
                    <Badge
                      variant={
                        selectedExerciseFilters.length === 0
                          ? "primary"
                          : "secondary"
                      }
                      size="sm"
                      onPress={() => setSelectedExerciseFilters([])}
                    >
                      {`All • ${exerciseLibrary?.length ?? 0}`}
                    </Badge>
                    {selectedExerciseFilters.length > 0 ? (
                      <Badge
                        variant="primary"
                        size="sm"
                        onPress={() => setSelectedExerciseFilters([])}
                      >
                        {activeExerciseFilterLabel}
                      </Badge>
                    ) : null}
                  </View>
                </ScrollView>

                {selectedExerciseFilters.length > 0 ? (
                  <Pressable
                    onPress={() => setSelectedExerciseFilters([])}
                    className="rounded-full px-3 py-1.5 bg-white/90 dark:bg-black/20 border border-cyan-200/70 dark:border-cyan-900/40"
                  >
                    <Text className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                      Reset
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {isFilterPanelOpen ? (
                <View className="mt-4">
                  {exerciseFilterGroups.map((group) => (
                    <View key={group.title} className="mb-3 last:mb-0">
                      <View className="flex-row items-center justify-between mb-2">
                        <View>
                          <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {group.title}
                          </Text>
                          <Text className="text-xs text-gray-600 dark:text-gray-400">
                            {group.description}
                          </Text>
                        </View>
                        <Text className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">
                          {group.options.length} options
                        </Text>
                      </View>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        showsVerticalScrollIndicator={false}
                      >
                        <View className="flex-row gap-2">
                          {group.options.map((option) => {
                            const isSelected = selectedExerciseFilters.includes(
                              option.key,
                            );
                            return (
                              <Badge
                                key={option.key}
                                variant={isSelected ? "primary" : "secondary"}
                                size="sm"
                                onPress={() =>
                                  setSelectedExerciseFilters((prev) =>
                                    prev.includes(option.key)
                                      ? prev.filter((k) => k !== option.key)
                                      : [...prev, option.key],
                                  )
                                }
                              >
                                {`${option.label} • ${option.count}`}
                              </Badge>
                            );
                          })}
                        </View>
                      </ScrollView>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </View>

          {loadingExerciseLibrary ? (
            <View className="flex-1 items-center justify-center">
              <Spinner size="lg" color={colors.primary} />
              <Text className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                Loading official exercise catalog...
              </Text>
            </View>
          ) : flattenedFilteredExercises.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                No exercises found
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1 text-center">
                Try another search or remove filters.
              </Text>
            </View>
          ) : (
            <FlatList
              data={flattenedFilteredExercises}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => {
                const nextItem = flattenedFilteredExercises[index + 1];
                const showGroupHeader =
                  !nextItem || item.group !== nextItem.group;
                return (
                  <View>
                    <ExerciseCard
                      exercise={item}
                      variant="list"
                      showImage
                      imageUrl={getExercisePrimaryImage(item)}
                      onAddPress={() => handleAddExercise(pickerTarget, item)}
                      onPress={() => handleOpenExercisePreview(item)}
                    />
                    <Text className="text-xs text-gray-600 dark:text-gray-400 mt-1 px-1 mb-3">
                      {item.short_description}
                    </Text>
                    {showGroupHeader &&
                    index < flattenedFilteredExercises.length - 1 ? (
                      <Text className="text-sm font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300 mb-2 mt-1">
                        {muscleKeyToLabel(
                          flattenedFilteredExercises[index + 1].group,
                        )}
                      </Text>
                    ) : null}
                  </View>
                );
              }}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              updateCellsBatchingPeriod={50}
              initialNumToRender={15}
              windowSize={10}
              contentContainerStyle={{
                paddingBottom: scrollPaddingBottom + 24,
                paddingHorizontal: 16,
                paddingTop: 12,
              }}
            />
          )}
          <View className="px-4 py-3 border-t border-light-border dark:border-dark-border">
            <Button variant="secondary" onPress={closePicker}>
              Back To Round Builder
            </Button>
          </View>

          <Modal
            visible={Boolean(selectedExercisePreview)}
            onClose={() => setSelectedExercisePreview(null)}
          >
            {selectedExercisePreview
              ? (() => {
                  const previewInstructions =
                    selectedExercisePreview.instructions_pt ??
                    selectedExercisePreview.instructions_en ??
                    selectedExercisePreview.instructions
                      ?.slice(0, 3)
                      .join("\n\n") ??
                    "This exercise is available in the official catalog with full metadata and media.";

                  return (
                    <View className="w-full gap-4">
                      <View className="flex-row items-start justify-between gap-3">
                        <View className="flex-1 pr-2">
                          <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            {selectedExercisePreview.name}
                          </Text>
                          <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {selectedExercisePreview.short_description}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => setSelectedExercisePreview(null)}
                          className="h-9 w-9 items-center justify-center rounded-full bg-light-surface dark:bg-dark-surface"
                        >
                          <X size={16} color={colors.muted} />
                        </Pressable>
                      </View>

                      <View>
                        {selectedExercisePreviewImages.length > 0 ? (
                          <Image
                            key={
                              selectedExercisePreviewImages[
                                selectedExercisePreviewImageIndex
                              ]
                            }
                            source={{
                              uri: selectedExercisePreviewImages[
                                selectedExercisePreviewImageIndex
                              ],
                            }}
                            className="w-full h-56 rounded-2xl bg-gray-200 dark:bg-gray-700"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="w-full h-56 items-center justify-center rounded-2xl bg-light-surface dark:bg-dark-surface">
                            <Text className="text-sm text-gray-500 dark:text-gray-400">
                              No image available
                            </Text>
                          </View>
                        )}
                      </View>

                      <View className="flex-row flex-wrap gap-2">
                        <Badge variant="primary" size="sm">
                          {selectedExercisePreview.difficulty}
                        </Badge>
                        <Badge variant="secondary" size="sm">
                          {selectedExercisePreview.equipment_label}
                        </Badge>
                        {selectedExercisePreview.primary_muscles
                          .slice(0, 3)
                          .map((muscle) => (
                            <Badge key={muscle} variant="secondary" size="sm">
                              {muscleKeyToLabel(muscle)}
                            </Badge>
                          ))}
                      </View>

                      <ScrollView
                        className="max-h-40"
                        showsVerticalScrollIndicator={false}
                      >
                        <Text className="text-sm text-gray-700 dark:text-gray-300 leading-6">
                          {previewInstructions}
                        </Text>
                      </ScrollView>

                      <View className="pt-2 border-t border-light-border dark:border-dark-border gap-3">
                        <Button
                          onPress={() =>
                            pickerTarget &&
                            handleAddExercise(
                              pickerTarget,
                              selectedExercisePreview,
                            )
                          }
                        >
                          Add exercise
                        </Button>
                        <Button
                          variant="secondary"
                          onPress={() => setSelectedExercisePreview(null)}
                        >
                          Close
                        </Button>
                      </View>
                    </View>
                  );
                })()
              : null}
          </Modal>
        </View>
      );
    }

    return (
      <View className={cn("flex-1", isDark ? "bg-dark-bg" : "bg-light-bg")}>
        {renderHeader("Build Rounds")}
        <ScrollView
          className="flex-1 p-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: scrollPaddingBottom }}
        >
          <View className="mb-5 pb-4 border-b border-light-border dark:border-dark-border">
            <Text className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-700 dark:text-cyan-300 mb-3">
              Builder Overview
            </Text>
            <View className="flex-row items-center">
              <View className="flex-1">
                <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {draft.rounds.length}
                </Text>
                <Text className="text-xs text-gray-600 dark:text-gray-400">
                  Rounds
                </Text>
              </View>
              <View className="h-8 w-px bg-light-border dark:bg-dark-border" />
              <View className="flex-1 items-center">
                <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {totalSelectedExercises}
                </Text>
                <Text className="text-xs text-gray-600 dark:text-gray-400">
                  Exercises
                </Text>
              </View>
              <View className="h-8 w-px bg-light-border dark:bg-dark-border" />
              <View className="flex-1 items-end">
                <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {Math.max(1, Math.ceil(estimatedDuration / 60))}m
                </Text>
                <Text className="text-xs text-gray-600 dark:text-gray-400">
                  Est. Time
                </Text>
              </View>
            </View>
          </View>

          <View className="mb-5 pb-4 border-b border-light-border dark:border-dark-border">
            <View className="flex-row items-center justify-between mb-3">
              <Pressable
                onPress={() =>
                  setSectionExpanded((prev) => ({
                    ...prev,
                    warmup: !prev.warmup,
                  }))
                }
                className="flex-row items-center gap-2"
              >
                <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Warmup
                </Text>
                {sectionExpanded.warmup ? (
                  <ChevronUp size={16} color={colors.muted} />
                ) : (
                  <ChevronDown size={16} color={colors.muted} />
                )}
              </Pressable>
              <Badge
                variant={draft.warmupEnabled ? "primary" : "default"}
                onPress={() =>
                  setDraft((prev) => ({
                    ...prev,
                    warmupEnabled: !prev.warmupEnabled,
                    warmupItems: !prev.warmupEnabled ? prev.warmupItems : [],
                  }))
                }
              >
                {draft.warmupEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </View>

            {sectionExpanded.warmup ? (
              <>
                {!draft.warmupEnabled ? (
                  <Text className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Warmup is disabled.
                  </Text>
                ) : draft.warmupItems.length === 0 ? (
                  <Text className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    No warmup items yet.
                  </Text>
                ) : (
                  renderBuilderItemsList(
                    { section: "warmup" },
                    draft.warmupItems,
                  )
                )}
                <View className="flex-row gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    disabled={!draft.warmupEnabled}
                    onPress={() => openPickerForTarget({ section: "warmup" })}
                  >
                    Add Exercise
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    disabled={!draft.warmupEnabled}
                    onPress={() => handleAddRest({ section: "warmup" })}
                  >
                    Add Rest
                  </Button>
                </View>
              </>
            ) : null}
          </View>

          <View className="mb-5 pb-4 border-b border-light-border dark:border-dark-border">
            <Pressable
              onPress={() =>
                setSectionExpanded((prev) => ({
                  ...prev,
                  workouts: !prev.workouts,
                }))
              }
              className="flex-row items-center justify-between mb-3"
            >
              <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Workouts
              </Text>
              {sectionExpanded.workouts ? (
                <ChevronUp size={16} color={colors.muted} />
              ) : (
                <ChevronDown size={16} color={colors.muted} />
              )}
            </Pressable>
            <Text className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Hold the row to drag exercises. Hold the grip icon to drag rounds.
            </Text>

            {sectionExpanded.workouts ? (
              <>
                {isRoundDragging ? (
                  <Text className="text-xs text-cyan-700 dark:text-cyan-300 mb-2">
                    Dragging round...
                  </Text>
                ) : null}

                <DraggableFlatList
                  data={draft.rounds}
                  keyExtractor={(round) => round.id}
                  onDragBegin={() => {
                    setIsRoundDragging(true);
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  onDragEnd={({ data }) => {
                    setIsRoundDragging(false);
                    handleReorderRounds(data);
                    void Haptics.impactAsync(
                      Haptics.ImpactFeedbackStyle.Medium,
                    );
                  }}
                  scrollEnabled={false}
                  activationDistance={8}
                  renderItem={({ item: round, getIndex, drag, isActive }) => {
                    const roundIndex = getIndex() ?? 0;
                    const roundItems = round.items ?? [];
                    const isCollapsed = collapsedRounds[round.id] ?? false;

                    return (
                      <View
                        className={cn(
                          "mb-4 pb-3 border-b border-light-border dark:border-dark-border",
                          isActive ? "opacity-80" : "opacity-100",
                        )}
                      >
                        <View className="flex-row items-center justify-between gap-2 mb-2">
                          <Pressable
                            onLongPress={drag}
                            delayLongPress={180}
                            className="flex-1 flex-row items-center gap-2"
                          >
                            <GripVertical size={15} color={colors.muted} />
                            <Text className="text-xs uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">
                              Round {roundIndex + 1}
                            </Text>
                          </Pressable>
                          <View className="flex-row items-center gap-1">
                            <Pressable
                              onPress={() => handleMoveRound(roundIndex, -1)}
                              disabled={roundIndex === 0}
                              className="h-8 w-8 items-center justify-center"
                            >
                              <ArrowUp
                                size={14}
                                color={
                                  roundIndex === 0
                                    ? colors.cardBorder
                                    : colors.foreground
                                }
                              />
                            </Pressable>
                            <Pressable
                              onPress={() => handleMoveRound(roundIndex, 1)}
                              disabled={roundIndex === draft.rounds.length - 1}
                              className="h-8 w-8 items-center justify-center"
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
                              onPress={() => toggleRoundCollapsed(round.id)}
                              className="h-8 w-8 items-center justify-center"
                            >
                              {isCollapsed ? (
                                <ChevronDown
                                  size={14}
                                  color={colors.foreground}
                                />
                              ) : (
                                <ChevronUp
                                  size={14}
                                  color={colors.foreground}
                                />
                              )}
                            </Pressable>
                            <Pressable
                              onPress={() => handleRemoveRound(round.id)}
                              disabled={draft.rounds.length <= 1}
                              className="h-8 w-8 items-center justify-center"
                            >
                              <X
                                size={14}
                                color={
                                  draft.rounds.length <= 1
                                    ? colors.cardBorder
                                    : "#ef4444"
                                }
                              />
                            </Pressable>
                          </View>
                        </View>

                        <Input
                          value={round.name}
                          onChangeText={(text) =>
                            updateRound(round.id, { name: text })
                          }
                          placeholder={`Round ${roundIndex + 1}`}
                          containerClassName="mb-2"
                        />

                        {!isCollapsed ? (
                          <>
                            {roundItems.length === 0 ? (
                              <Text className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                                No items in this round.
                              </Text>
                            ) : (
                              <View className="pl-4 ml-2 border-l-2 border-cyan-200 dark:border-cyan-900/40">
                                {renderBuilderItemsList(
                                  { section: "round", roundId: round.id },
                                  roundItems,
                                )}
                              </View>
                            )}

                            <View className="flex-row gap-2">
                              <Button
                                variant="secondary"
                                className="flex-1"
                                onPress={() =>
                                  openPickerForTarget({
                                    section: "round",
                                    roundId: round.id,
                                  })
                                }
                              >
                                Add Exercise
                              </Button>
                              <Button
                                variant="secondary"
                                className="flex-1"
                                onPress={() =>
                                  handleAddRest({
                                    section: "round",
                                    roundId: round.id,
                                  })
                                }
                              >
                                Add Rest
                              </Button>
                            </View>
                          </>
                        ) : null}
                      </View>
                    );
                  }}
                />

                <Button variant="secondary" onPress={handleAddRound}>
                  Add Another Round
                </Button>
              </>
            ) : null}
          </View>

          <View className="mb-5 pb-4 border-b border-light-border dark:border-dark-border">
            <View className="flex-row items-center justify-between mb-3">
              <Pressable
                onPress={() =>
                  setSectionExpanded((prev) => ({
                    ...prev,
                    cooldown: !prev.cooldown,
                  }))
                }
                className="flex-row items-center gap-2"
              >
                <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Cooldown
                </Text>
                {sectionExpanded.cooldown ? (
                  <ChevronUp size={16} color={colors.muted} />
                ) : (
                  <ChevronDown size={16} color={colors.muted} />
                )}
              </Pressable>
              <Badge
                variant={draft.cooldownEnabled ? "primary" : "default"}
                onPress={() =>
                  setDraft((prev) => ({
                    ...prev,
                    cooldownEnabled: !prev.cooldownEnabled,
                    cooldownItems: !prev.cooldownEnabled
                      ? prev.cooldownItems
                      : [],
                  }))
                }
              >
                {draft.cooldownEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </View>

            {sectionExpanded.cooldown ? (
              <>
                {!draft.cooldownEnabled ? (
                  <Text className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Cooldown is disabled.
                  </Text>
                ) : draft.cooldownItems.length === 0 ? (
                  <Text className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    No cooldown items yet.
                  </Text>
                ) : (
                  renderBuilderItemsList(
                    { section: "cooldown" },
                    draft.cooldownItems,
                  )
                )}
                <View className="flex-row gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    disabled={!draft.cooldownEnabled}
                    onPress={() => openPickerForTarget({ section: "cooldown" })}
                  >
                    Add Exercise
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    disabled={!draft.cooldownEnabled}
                    onPress={() => handleAddRest({ section: "cooldown" })}
                  >
                    Add Rest
                  </Button>
                </View>
              </>
            ) : null}
          </View>

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
              Includes exercise time plus every rest block across sections.
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
                navigateAwayFromCreate();
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
  const reviewCoverImageUri =
    getWorkoutCoverImageUri(draft) ?? GENERIC_EXERCISE_IMAGE;

  return (
    <View className={cn("flex-1", isDark ? "bg-dark-bg" : "bg-light-bg")}>
      {renderHeader("Review Workout")}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scrollPaddingBottom }}
      >
        <Image
          source={{ uri: reviewCoverImageUri }}
          className="w-full h-56"
          resizeMode="cover"
        />

        <View className="px-4 pt-4 pb-5 border-b border-light-border dark:border-dark-border">
          <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {draft.name.trim() || "Untitled workout"}
          </Text>
          {draft.description?.trim() ? (
            <Text className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-6">
              {draft.description.trim()}
            </Text>
          ) : null}

          <View className="flex-row flex-wrap gap-2 mt-3">
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
            <Badge variant="secondary">{`${totalSelectedExercises} exercises`}</Badge>
            <Badge variant="secondary">{`${Math.max(1, Math.ceil(estimatedDuration / 60))} min`}</Badge>
          </View>
        </View>

        <View className="px-4 py-5 border-b border-light-border dark:border-dark-border">
          <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
            Exercises summary
          </Text>
          {reviewExerciseLines.length === 0 ? (
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              No exercises selected.
            </Text>
          ) : (
            reviewExerciseLines.map((exercise, index) => (
              <View
                key={exercise.id}
                className="py-2 border-b border-light-border dark:border-dark-border"
              >
                <View className="flex-1 pr-3">
                  <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {`${index + 1}. ${exercise.name}`}
                  </Text>
                  <Text className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    {`${exercise.sectionLabel} • ${exercise.prescription}`}
                    {exercise.hasWeight ? ` • ${exercise.weightKg ?? 0}kg` : ""}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View className="px-4 py-5">
          <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
            Muscles worked
          </Text>
          <MuscleMap
            primaryMuscles={workedMuscles}
            secondaryMuscles={[]}
            title=""
            subtitle="Combined from all exercises in this workout"
            bodySize={280}
            scale={1.03}
          />
          {workedMuscles.length > 0 ? (
            <View className="flex-row flex-wrap gap-2 mt-3">
              {workedMuscles.map((muscle) => (
                <Badge key={muscle} variant="secondary" size="sm">
                  {muscleKeyToLabel(muscle)}
                </Badge>
              ))}
            </View>
          ) : null}
        </View>
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
          onContinue={handleSaveFinalWorkout}
          finishLabel="Save Workout"
        />
      </View>
    </View>
  );
}
