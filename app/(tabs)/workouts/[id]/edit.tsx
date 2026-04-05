import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CirclePlus, Save, X } from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useToastStore } from "@/stores/toast.store";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import {
  getWorkoutTemplate,
  updateWorkoutTemplate,
} from "@/lib/firestore/workouts";
import { useHideMainTabBar } from "@/hooks/useHideMainTabBar";

interface EditableExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  muscleGroups: string[];
  weight?: string;
}

// Mock data
const MOCK_WORKOUT_EDIT = {
  id: "1",
  name: "Full Body Strength",
  description:
    "A comprehensive full-body workout focusing on compound movements and strength building.",
  difficulty: "intermediate",
  exercises: [
    {
      id: "ex1",
      name: "Push-ups",
      sets: 3,
      reps: "10-12",
      muscleGroups: ["Chest", "Shoulders", "Triceps"],
    },
    {
      id: "ex2",
      name: "Squats",
      sets: 3,
      reps: "15-20",
      muscleGroups: ["Quads", "Glutes", "Hamstrings"],
    },
  ],
};

const MOCK_EXERCISES = [
  { id: "1", name: "Push-ups", muscles: ["Chest", "Shoulders", "Triceps"] },
  { id: "2", name: "Squats", muscles: ["Quads", "Glutes", "Hamstrings"] },
  { id: "3", name: "Deadlifts", muscles: ["Back", "Hamstrings", "Glutes"] },
  { id: "4", name: "Bench Press", muscles: ["Chest", "Shoulders", "Triceps"] },
  { id: "5", name: "Pull-ups", muscles: ["Back", "Biceps", "Shoulders"] },
  { id: "6", name: "Rows", muscles: ["Back", "Biceps"] },
];

export default function EditWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isDark, colors } = useThemeStore();
  const user = useAuthStore((s) => s.user);
  const { show: showToast } = useToastStore();
  useHideMainTabBar();

  const [name, setName] = useState(MOCK_WORKOUT_EDIT.name);
  const [description, setDescription] = useState(MOCK_WORKOUT_EDIT.description);
  const [difficulty, setDifficulty] = useState(MOCK_WORKOUT_EDIT.difficulty);
  const [exercises, setExercises] = useState<EditableExercise[]>(
    MOCK_WORKOUT_EDIT.exercises,
  );
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [editingExerciseIdx, setEditingExerciseIdx] = useState<number | null>(
    null,
  );
  const [editingSets, setEditingSets] = useState("");
  const [editingReps, setEditingReps] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      const workoutRecord = await getWorkoutTemplate(String(id));
      if (!mounted || !workoutRecord) {
        return;
      }

      setName(workoutRecord.name);
      setDescription(workoutRecord.description ?? "");
      setDifficulty(workoutRecord.difficulty);
      setExercises(
        workoutRecord.exercises.map((exercise) => ({
          id: exercise.id,
          name: exercise.name,
          sets: exercise.sets,
          reps: exercise.reps,
          muscleGroups: exercise.muscleGroups,
        })),
      );
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  const DIFFICULTIES = [
    { label: "Beginner", value: "beginner" },
    { label: "Intermediate", value: "intermediate" },
    { label: "Advanced", value: "advanced" },
  ];

  const handleRemoveExercise = (idx: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
    showToast("Exercise removed", "success");
  };

  const handleEditExercise = (idx: number) => {
    setEditingExerciseIdx(idx);
    setEditingSets(String(exercises[idx].sets));
    setEditingReps(exercises[idx].reps);
  };

  const handleSaveExerciseEdit = () => {
    if (editingExerciseIdx === null) return;

    const setsNum = parseInt(editingSets);
    if (isNaN(setsNum) || setsNum < 1) {
      showToast("Invalid sets number", "error");
      return;
    }

    if (!editingReps.trim()) {
      showToast("Invalid reps format", "error");
      return;
    }

    setExercises((prev) =>
      prev.map((ex, idx) =>
        idx === editingExerciseIdx
          ? { ...ex, sets: setsNum, reps: editingReps }
          : ex,
      ),
    );

    setEditingExerciseIdx(null);
    showToast("Exercise updated", "success");
  };

  const handleAddExercise = (exercise: (typeof MOCK_EXERCISES)[0]) => {
    const newExercise: EditableExercise = {
      id: exercise.id,
      name: exercise.name,
      sets: 3,
      reps: "10-12",
      muscleGroups: exercise.muscles,
    };

    setExercises((prev) => [...prev, newExercise]);
    setShowExerciseModal(false);
    showToast(`Added ${exercise.name}`, "success");
  };

  const handleSaveChanges = async () => {
    if (!name.trim()) {
      showToast("Workout name is required", "error");
      return;
    }

    if (exercises.length === 0) {
      showToast("Add at least one exercise", "error");
      return;
    }

    try {
      if (!user?.uid) {
        throw new Error("You must be signed in to save workouts");
      }

      await updateWorkoutTemplate(String(id), {
        name: name.trim(),
        description: description.trim() || undefined,
        difficulty: difficulty as "beginner" | "intermediate" | "advanced",
        is_ai_generated: false,
        exercises: exercises.map((exercise) => ({
          id: exercise.id,
          name: exercise.name,
          sets: exercise.sets,
          reps: exercise.reps,
          muscleGroups: exercise.muscleGroups,
        })),
        estimated_duration_minutes: Math.max(10, exercises.length * 8),
        tags: [],
      });

      showToast({
        title: "Workout updated",
        message: `${name.trim()} was saved successfully.`,
        type: "success",
      });
      router.back();
    } catch {
      showToast("Failed to save changes", "error");
    }
  };

  return (
    <View className={cn("flex-1", isDark ? "bg-dark-bg" : "bg-light-bg")}>
      <ScrollView className="flex-1 p-4">
        <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Edit Workout
        </Text>

        {/* Name Input */}
        <Input
          label="Workout Name"
          value={name}
          onChangeText={setName}
          containerClassName="mb-4"
        />

        {/* Description Input */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Description
          </Text>
          <TextInput
            multiline
            numberOfLines={4}
            placeholder="Add notes about this workout..."
            value={description}
            onChangeText={setDescription}
            className={cn(
              "rounded-lg p-3 text-base border",
              isDark
                ? "bg-dark-surface border-dark-border text-gray-100"
                : "bg-light-surface border-light-border text-gray-900",
            )}
            textAlignVertical="top"
          />
        </View>

        {/* Difficulty Selection */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Difficulty
          </Text>
          <View className="flex-row gap-2">
            {DIFFICULTIES.map((d) => (
              <Badge
                key={d.value}
                onPress={() => setDifficulty(d.value)}
                className="flex-1 items-center"
                textClassName="text-center"
                variant={difficulty === d.value ? "primary" : "default"}
              >
                {d.label}
              </Badge>
            ))}
          </View>
        </View>

        {/* Exercises Section */}
        <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
          Exercises ({exercises.length})
        </Text>

        {exercises.map((exercise, idx) => (
          <Pressable
            key={exercise.id}
            onPress={() => handleEditExercise(idx)}
            className={cn(
              "p-3 rounded-lg mb-2 border",
              isDark
                ? "bg-dark-surface border-dark-border"
                : "bg-light-surface border-light-border",
            )}
          >
            <View className="flex-row justify-between items-start mb-2">
              <Text className="font-semibold text-gray-900 dark:text-gray-100 flex-1">
                {idx + 1}. {exercise.name}
              </Text>
              <Pressable
                onPress={() => handleRemoveExercise(idx)}
                className="p-1"
              >
                <X size={16} color={colors.muted} />
              </Pressable>
            </View>

            <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {exercise.sets} sets × {exercise.reps} reps
            </Text>

            <View className="flex-row gap-1 flex-wrap">
              {exercise.muscleGroups.map((muscle) => (
                <Badge key={muscle} variant="secondary" size="sm">
                  {muscle}
                </Badge>
              ))}
            </View>
          </Pressable>
        ))}

        {/* Add Exercise Button */}
        <Pressable
          onPress={() => setShowExerciseModal(true)}
          className={cn(
            "flex-row items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed mb-6",
            isDark ? "border-dark-border" : "border-light-border",
          )}
        >
          <CirclePlus size={18} color={colors.primary} />
          <Text className="font-semibold text-cyan-600 dark:text-cyan-400">
            Add Exercise
          </Text>
        </Pressable>
      </ScrollView>

      {/* Action Buttons */}
      <View
        className={cn(
          "p-4 border-t gap-2",
          isDark
            ? "bg-dark-surface border-dark-border"
            : "bg-light-surface border-light-border",
        )}
      >
        <Button onPress={handleSaveChanges} size="lg" className="w-full">
          <View className="flex-row items-center justify-center gap-2">
            <Save size={16} color="#ffffff" />
            <Text className="text-white font-semibold">Save Changes</Text>
          </View>
        </Button>
        <Button
          onPress={() => router.back()}
          variant="secondary"
          size="lg"
          className="w-full"
        >
          Cancel
        </Button>
      </View>

      {/* Edit Exercise Modal */}
      {editingExerciseIdx !== null && (
        <Modal
          visible={editingExerciseIdx !== null}
          onClose={() => setEditingExerciseIdx(null)}
        >
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Edit {exercises[editingExerciseIdx]?.name}
          </Text>
          <View className="p-4 gap-4">
            <View>
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Sets
              </Text>
              <TextInput
                keyboardType="number-pad"
                placeholder="3"
                value={editingSets}
                onChangeText={setEditingSets}
                className={cn(
                  "rounded-lg p-3 border",
                  isDark
                    ? "bg-dark-surface border-dark-border text-gray-100"
                    : "bg-light-surface border-light-border text-gray-900",
                )}
              />
            </View>

            <View>
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Reps
              </Text>
              <TextInput
                placeholder="e.g., 10-12"
                value={editingReps}
                onChangeText={setEditingReps}
                className={cn(
                  "rounded-lg p-3 border",
                  isDark
                    ? "bg-dark-surface border-dark-border text-gray-100"
                    : "bg-light-surface border-light-border text-gray-900",
                )}
              />
            </View>

            <View className="gap-2">
              <Button
                onPress={handleSaveExerciseEdit}
                size="md"
                className="w-full"
              >
                Save
              </Button>
              <Button
                onPress={() => setEditingExerciseIdx(null)}
                variant="secondary"
                size="md"
                className="w-full"
              >
                Cancel
              </Button>
            </View>
          </View>
        </Modal>
      )}

      {/* Add Exercise Modal */}
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
