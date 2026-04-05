import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CirclePlus, Dumbbell, Save, Sparkles, X } from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useToastStore } from "@/stores/toast.store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ProgressFormIndicator } from "@/components/ui/ProgressFormIndicator";
import { cn } from "@/lib/utils";
import { createWorkoutTemplate } from "@/lib/firestore/workouts";
import { useHideMainTabBar } from "@/hooks/useHideMainTabBar";

type WorkflowType = "manual" | "ai";
type CreateStep = "workflow" | "details" | "exercises" | "preview";

interface WorkoutDraft {
  name: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  workflowType: WorkflowType;
  exercises: {
    id: string;
    name: string;
    sets: number;
    reps: string;
    muscleGroups: string[];
  }[];
  tags: string[];
}

const DIFFICULTIES = [
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
];

const MOCK_EXERCISES = [
  { id: "1", name: "Push-ups", muscles: ["Chest", "Shoulders", "Triceps"] },
  { id: "2", name: "Squats", muscles: ["Quads", "Glutes", "Hamstrings"] },
  { id: "3", name: "Deadlifts", muscles: ["Back", "Hamstrings", "Glutes"] },
  { id: "4", name: "Bench Press", muscles: ["Chest", "Shoulders", "Triceps"] },
  { id: "5", name: "Pull-ups", muscles: ["Back", "Biceps", "Shoulders"] },
  { id: "6", name: "Rows", muscles: ["Back", "Biceps"] },
  { id: "7", name: "Planks", muscles: ["Core", "Shoulders"] },
  { id: "8", name: "Burpees", muscles: ["Full Body", "Cardio"] },
];

export default function CreateWorkoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useThemeStore();
  const user = useAuthStore((s) => s.user);
  const { show: showToast } = useToastStore();
  useHideMainTabBar();
  const tabBarClearance = insets.bottom + 76;

  const [step, setStep] = useState<CreateStep>("workflow");
  const [workflowType, setWorkflowType] = useState<WorkflowType>("manual");
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [draft, setDraft] = useState<WorkoutDraft>({
    name: "",
    description: "",
    difficulty: "intermediate",
    workflowType: "manual",
    exercises: [],
    tags: [],
  });

  const handleWorkflowSelect = (type: WorkflowType) => {
    setWorkflowType(type);
    setDraft((prev) => ({ ...prev, workflowType: type }));
    setStep("details");
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
      const mockExercises = MOCK_EXERCISES.slice(0, 5).map((ex, i) => ({
        id: ex.id,
        name: ex.name,
        sets: 3 + Math.floor(Math.random() * 2),
        reps: `${8 + Math.floor(Math.random() * 5)}-${12 + Math.floor(Math.random() * 5)}`,
        muscleGroups: ex.muscles,
      }));

      setDraft((prev) => ({
        ...prev,
        exercises: mockExercises,
        tags: ["AI-Generated", draft.difficulty],
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

  const handleAddExercise = (exercise: (typeof MOCK_EXERCISES)[0]) => {
    const newExercise = {
      id: exercise.id,
      name: exercise.name,
      sets: 3,
      reps: "10-12",
      muscleGroups: exercise.muscles,
    };
    setDraft((prev) => ({
      ...prev,
      exercises: [...prev.exercises, newExercise],
    }));
    setShowExerciseModal(false);
    showToast(`Added ${exercise.name}`, "success");
  };

  const handleRemoveExercise = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index),
    }));
  };

  const handleSaveDraft = async () => {
    if (!draft.name.trim()) {
      showToast("Workout name is required", "error");
      return;
    }

    if (draft.exercises.length === 0) {
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
        exercises: draft.exercises.map((exercise) => ({
          id: exercise.id,
          name: exercise.name,
          sets: exercise.sets,
          reps: exercise.reps,
          muscleGroups: exercise.muscleGroups,
        })),
        estimated_duration_minutes: Math.max(10, draft.exercises.length * 8),
        tags: draft.tags,
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
        <ScrollView className="flex-1 p-4">
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
          <Button
            onPress={() => router.back()}
            variant="secondary"
            size="lg"
            className="w-full"
          >
            Cancel
          </Button>
        </View>
      </View>
    );
  }

  // AI Prompt Step
  if (step === "details") {
    return (
      <View className={cn("flex-1", isDark ? "bg-dark-bg" : "bg-light-bg")}>
        <ScrollView className="flex-1 p-4">
          <ProgressFormIndicator
            current={2}
            total={4}
            labels={["Workflow", "Details", "Exercises", "Preview"]}
            className="mb-6"
          />

          <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Generate Your Workout
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
                    setDraft((prev) => ({
                      ...prev,
                      difficulty: d.value as WorkoutDraft["difficulty"],
                    }))
                  }
                  className="flex-1 items-center"
                  textClassName="text-center"
                  variant={draft.difficulty === d.value ? "primary" : "default"}
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
          className="p-4 gap-2 border-t border-light-border dark:border-dark-border"
          style={{ paddingBottom: tabBarClearance }}
        >
          {workflowType === "ai" ? (
            <Button
              onPress={handleGenerateAI}
              size="lg"
              className="w-full"
              disabled={isLoadingAI || !draft.name.trim()}
            >
              {isLoadingAI ? (
                <View className="flex-row items-center gap-2 justify-center">
                  <ActivityIndicator size="small" color="#fff" />
                  <Text className="text-white">Generating...</Text>
                </View>
              ) : (
                "Generate Workout"
              )}
            </Button>
          ) : (
            <Button
              onPress={handleContinueToExercises}
              size="lg"
              className="w-full"
            >
              Continue
            </Button>
          )}
          <Button
            onPress={() => setStep("workflow")}
            variant="secondary"
            size="lg"
            className="w-full"
            disabled={isLoadingAI}
          >
            Back
          </Button>
        </View>
      </View>
    );
  }

  // Exercise Selection Step
  if (step === "exercises") {
    const estimatedDuration = draft.exercises.reduce((total) => total + 3, 0);

    return (
      <View className={cn("flex-1", isDark ? "bg-dark-bg" : "bg-light-bg")}>
        <ScrollView className="flex-1 p-4">
          <ProgressFormIndicator
            current={3}
            total={4}
            labels={["Workflow", "Details", "Exercises", "Preview"]}
            className="mb-6"
          />

          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Select Exercises
            </Text>
            <Badge variant="secondary">{draft.exercises.length} selected</Badge>
          </View>

          {/* Exercises List */}
          <View
            className={cn(
              "rounded-lg border p-3 mb-4",
              isDark
                ? "bg-dark-surface border-dark-border"
                : "bg-light-surface border-light-border",
            )}
          >
            {draft.exercises.length === 0 ? (
              <Text className="text-center text-gray-500 py-4">
                No exercises yet. Add one to get started.
              </Text>
            ) : (
              draft.exercises.map((exercise, index) => (
                <View
                  key={index}
                  className={cn(
                    "flex-row justify-between items-center p-3 border-b",
                    index === draft.exercises.length - 1
                      ? ""
                      : "border-light-border dark:border-dark-border",
                  )}
                >
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-900 dark:text-gray-100">
                      {exercise.name}
                    </Text>
                    <Text className="text-xs text-gray-600 dark:text-gray-400">
                      {exercise.sets} sets × {exercise.reps} reps
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleRemoveExercise(index)}
                    className="p-2"
                  >
                    <X size={16} color={colors.muted} />
                  </Pressable>
                </View>
              ))
            )}
          </View>

          {/* Add Exercise Button */}
          <Pressable
            onPress={() => setShowExerciseModal(true)}
            className={cn(
              "flex-row items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed mb-4",
              isDark ? "border-dark-border" : "border-light-border",
            )}
          >
            <CirclePlus size={18} color={colors.primary} />
            <Text className="font-semibold text-cyan-600 dark:text-cyan-400">
              Add Exercise
            </Text>
          </Pressable>

          {/* Info */}
          <View
            className={cn(
              "p-3 rounded-lg",
              isDark ? "bg-dark-surface" : "bg-light-surface",
            )}
          >
            <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Estimated Duration: {estimatedDuration} min
            </Text>
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              Based on ~3 minutes per exercise
            </Text>
          </View>
        </ScrollView>

        <View
          className="p-4 gap-2 border-t border-light-border dark:border-dark-border"
          style={{ paddingBottom: tabBarClearance }}
        >
          <Button
            onPress={() => setStep("preview")}
            size="lg"
            className="w-full"
            disabled={draft.exercises.length === 0}
          >
            Review Workout
          </Button>
          <Button
            onPress={() => setStep("details")}
            variant="secondary"
            size="lg"
            className="w-full"
          >
            Back
          </Button>
        </View>

        {/* Exercise Selection Modal */}
        <Modal
          visible={showExerciseModal}
          onClose={() => setShowExerciseModal(false)}
        >
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Select Exercise
          </Text>
          <ScrollView style={{ maxHeight: 384 }}>
            {MOCK_EXERCISES.map((exercise) => (
              <Pressable
                key={exercise.id}
                onPress={() => handleAddExercise(exercise)}
                className={cn(
                  "p-3 border-b",
                  isDark
                    ? "bg-dark-surface border-dark-border"
                    : "bg-light-surface border-light-border",
                )}
              >
                <View className="flex-row justify-between items-start">
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-900 dark:text-gray-100">
                      {exercise.name}
                    </Text>
                    <Text className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {exercise.muscles.join(", ")}
                    </Text>
                  </View>
                  <CirclePlus size={16} color={colors.primary} />
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </Modal>
      </View>
    );
  }

  // Preview Step
  return (
    <View className={cn("flex-1", isDark ? "bg-dark-bg" : "bg-light-bg")}>
      <ScrollView className="flex-1 p-4">
        <ProgressFormIndicator
          current={4}
          total={4}
          labels={["Workflow", "Details", "Exercises", "Preview"]}
          className="mb-6"
        />

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
              {draft.exercises.length} exercises
            </Text>
          </View>
        </View>

        {/* Exercises Summary */}
        <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
          Exercises
        </Text>
        {draft.exercises.map((exercise, index) => (
          <View
            key={index}
            className={cn(
              "p-3 rounded-lg mb-2",
              isDark ? "bg-dark-surface" : "bg-light-surface",
            )}
          >
            <Text className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {index + 1}. {exercise.name}
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              {exercise.sets} sets × {exercise.reps} reps
            </Text>
          </View>
        ))}
      </ScrollView>

      <View
        className="p-4 gap-2 border-t border-light-border dark:border-dark-border"
        style={{ paddingBottom: tabBarClearance }}
      >
        <Button onPress={handleSaveDraft} size="lg" className="w-full">
          <View className="flex-row items-center justify-center gap-2">
            <Save size={16} color="#ffffff" />
            <Text className="text-white font-semibold">Save Workout</Text>
          </View>
        </Button>
        <Button
          onPress={() => setStep("exercises")}
          variant="secondary"
          size="lg"
          className="w-full"
        >
          Edit
        </Button>
      </View>
    </View>
  );
}
