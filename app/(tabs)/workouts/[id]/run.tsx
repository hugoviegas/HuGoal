import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  SafeAreaView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Checkbox } from "@/components/ui/Checkbox";
import { cn } from "@/lib/utils";
import { useHideMainTabBar } from "@/hooks/useHideMainTabBar";

interface WorkoutExerciseSet {
  id: string;
  setNumber: number;
  reps: string;
  weight?: string;
  completed: boolean;
  actualReps?: number;
  actualWeight?: string;
  completedAt?: Date;
}

interface RunningExercise {
  id: string;
  name: string;
  setsPlan: WorkoutExerciseSet[];
  muscleGroups: string[];
  instructions?: string;
}

// Mock data - replace with Firestore fetch
const MOCK_WORKOUT = {
  id: "1",
  name: "Full Body Strength",
  exercises: [
    {
      id: "ex1",
      name: "Push-ups",
      setsPlan: [
        { id: "s1", setNumber: 1, reps: "10-12", completed: false },
        { id: "s2", setNumber: 2, reps: "8-10", completed: false },
        { id: "s3", setNumber: 3, reps: "6-8", completed: false },
      ],
      muscleGroups: ["Chest", "Shoulders", "Triceps"],
      instructions:
        "Keep your body straight, lower until chest near ground, push back up.",
    },
    {
      id: "ex2",
      name: "Squats",
      setsPlan: [
        { id: "s4", setNumber: 1, reps: "15-20", completed: false },
        { id: "s5", setNumber: 2, reps: "12-15", completed: false },
        { id: "s6", setNumber: 3, reps: "10-12", completed: false },
      ],
      muscleGroups: ["Quads", "Glutes", "Hamstrings"],
      instructions:
        "Feet shoulder-width, lower hips back and down, keep chest up.",
    },
    {
      id: "ex3",
      name: "Rows",
      setsPlan: [
        { id: "s7", setNumber: 1, reps: "10-12", completed: false },
        { id: "s8", setNumber: 2, reps: "8-10", completed: false },
      ],
      muscleGroups: ["Back", "Biceps"],
      instructions: "Pull elbows back, squeeze shoulder blades together.",
    },
  ],
};

type RunningTab = "current" | "upcoming" | "completed";

export default function RunWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useThemeStore();
  const { show: showToast } = useToastStore();
  useHideMainTabBar();
  const tabBarClearance = insets.bottom + 76;

  const [activeTab, setActiveTab] = useState<RunningTab>("current");
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [exercises, setExercises] = useState<RunningExercise[]>(
    MOCK_WORKOUT.exercises,
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [totalReps, setTotalReps] = useState(0);
  const [totalSets, setTotalSets] = useState(0);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // Calculate totals
  useEffect(() => {
    const totalSetsCount = exercises.reduce(
      (sum, ex) => sum + ex.setsPlan.length,
      0,
    );
    const completedSets = exercises.reduce(
      (sum, ex) => sum + ex.setsPlan.filter((s) => s.completed).length,
      0,
    );
    setTotalSets(totalSetsCount);
    setTotalReps(completedSets);
  }, [exercises]);

  const currentExercise = exercises[currentExerciseIndex];
  const isFinalExercise = currentExerciseIndex === exercises.length - 1;

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSetComplete = (exerciseIndex: number, setIndex: number) => {
    setExercises((prev) =>
      prev.map((ex, exIdx) =>
        exIdx === exerciseIndex
          ? {
              ...ex,
              setsPlan: ex.setsPlan.map((set, setIdx) =>
                setIdx === setIndex
                  ? {
                      ...set,
                      completed: !set.completed,
                      completedAt: new Date(),
                    }
                  : set,
              ),
            }
          : ex,
      ),
    );

    if (!exercises[exerciseIndex].setsPlan[setIndex].completed) {
      showToast(`Set ${setIndex + 1} completed`, "success");
    }
  };

  const handleNextExercise = () => {
    if (!isFinalExercise) {
      setCurrentExerciseIndex((prev) => prev + 1);
    } else {
      Alert.alert("Workout Complete", "Great job! View your summary?", [
        {
          text: "View Summary",
          onPress: () => {
            // Navigate to summary screen
            router.push(`/workouts/${id}/summary`);
          },
        },
        {
          text: "Save & Exit",
          onPress: () => {
            // Save to Firestore and navigate back
            showToast("Workout saved!", "success");
            router.back();
          },
        },
      ]);
    }
  };

  const handlePreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex((prev) => prev - 1);
    }
  };

  const completedExercises = exercises.filter((ex) =>
    ex.setsPlan.every((set) => set.completed),
  ).length;

  const progressPercent = Math.round((totalReps / totalSets) * 100 || 0);

  // Current Exercise Tab
  if (activeTab === "current") {
    return (
      <SafeAreaView
        className={cn("flex-1", isDark ? "bg-dark-bg" : "bg-light-bg")}
      >
        <ScrollView className="flex-1 p-4">
          {/* Header with Timer */}
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                {currentExerciseIndex + 1} of {exercises.length}
              </Text>
              <Text className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {formatTime(elapsedSeconds)}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                Progress
              </Text>
              <Text className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                {progressPercent}%
              </Text>
            </View>
          </View>

          {/* Exercise Card */}
          <View
            className={cn(
              "p-4 rounded-lg mb-6 border",
              isDark
                ? "bg-dark-surface border-dark-border"
                : "bg-light-surface border-light-border",
            )}
          >
            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {currentExercise.name}
            </Text>

            <View className="flex-row gap-2 mb-4">
              {currentExercise.muscleGroups.map((muscle, idx) => (
                <Badge key={idx} variant="secondary" size="sm">
                  {muscle}
                </Badge>
              ))}
            </View>

            {currentExercise.instructions && (
              <View
                className={cn(
                  "p-3 rounded border-l-4",
                  isDark
                    ? "bg-dark-bg border-cyan-600"
                    : "bg-light-bg border-cyan-600",
                )}
              >
                <Text className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Technique
                </Text>
                <Text className="text-sm text-gray-900 dark:text-gray-100">
                  {currentExercise.instructions}
                </Text>
              </View>
            )}
          </View>

          {/* Sets Checklist */}
          <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
            Sets
          </Text>
          {currentExercise.setsPlan.map((set, idx) => (
            <Pressable
              key={set.id}
              onPress={() => handleSetComplete(currentExerciseIndex, idx)}
              className={cn(
                "flex-row items-center p-3 rounded-lg mb-2 border",
                isDark
                  ? "bg-dark-surface border-dark-border"
                  : "bg-light-surface border-light-border",
                set.completed && (isDark ? "bg-green-900/20" : "bg-green-50"),
              )}
            >
              <Checkbox
                checked={set.completed}
                onCheckedChange={() =>
                  handleSetComplete(currentExerciseIndex, idx)
                }
                size="md"
                className="mr-3"
              />
              <View className="flex-1">
                <Text className="font-semibold text-gray-900 dark:text-gray-100">
                  Set {set.setNumber}
                </Text>
                <Text
                  className={cn(
                    "text-sm",
                    set.completed
                      ? "text-green-600 dark:text-green-400 line-through"
                      : "text-gray-600 dark:text-gray-400",
                  )}
                >
                  {set.reps} reps
                  {set.weight && ` • ${set.weight}`}
                </Text>
              </View>
              {set.completed && <Check size={16} color="#22c55e" />}
            </Pressable>
          ))}
        </ScrollView>

        {/* Controls */}
        <View
          className={cn(
            "p-4 border-t gap-2",
            isDark
              ? "bg-dark-surface border-dark-border"
              : "bg-light-surface border-light-border",
          )}
          style={{ paddingBottom: tabBarClearance }}
        >
          <View className="flex-row gap-2">
            <Button
              onPress={handlePreviousExercise}
              variant="secondary"
              size="md"
              disabled={currentExerciseIndex === 0}
              className="flex-1"
            >
              <View className="flex-row items-center justify-center gap-1">
                <ChevronLeft size={14} color={colors.foreground} />
                <Text className="text-gray-900 dark:text-gray-100">
                  Previous
                </Text>
              </View>
            </Button>
            <Button
              onPress={() => setIsRunning(!isRunning)}
              size="md"
              className="flex-1"
            >
              <View className="flex-row items-center justify-center gap-1">
                {isRunning ? (
                  <Pause size={14} color="#ffffff" />
                ) : (
                  <Play size={14} color="#ffffff" />
                )}
                <Text className="text-white">
                  {isRunning ? "Pause" : "Start"}
                </Text>
              </View>
            </Button>
            <Button onPress={handleNextExercise} size="md" className="flex-1">
              {isFinalExercise ? (
                "Finish"
              ) : (
                <View className="flex-row items-center justify-center gap-1">
                  <Text className="text-white">Next</Text>
                  <ChevronRight size={14} color="#ffffff" />
                </View>
              )}
            </Button>
          </View>
          <Button
            onPress={() => router.back()}
            variant="secondary"
            size="md"
            className="w-full"
          >
            Quit
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // Upcoming Exercises Tab
  if (activeTab === "upcoming") {
    return (
      <SafeAreaView
        className={cn("flex-1", isDark ? "bg-dark-bg" : "bg-light-bg")}
      >
        <ScrollView className="flex-1 p-4">
          <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Upcoming
          </Text>

          {exercises.slice(currentExerciseIndex + 1).map((exercise, idx) => (
            <Pressable
              key={exercise.id}
              onPress={() =>
                setCurrentExerciseIndex(currentExerciseIndex + idx + 1)
              }
              className={cn(
                "p-3 rounded-lg mb-3 border",
                isDark
                  ? "bg-dark-surface border-dark-border"
                  : "bg-light-surface border-light-border",
              )}
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {exercise.name}
                  </Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {exercise.setsPlan.length} sets
                  </Text>
                  <View className="flex-row gap-1 mt-2">
                    {exercise.muscleGroups.map((muscle, midx) => (
                      <Badge key={midx} variant="secondary" size="sm">
                        {muscle}
                      </Badge>
                    ))}
                  </View>
                </View>
                <ChevronRight size={18} color={colors.muted} />
              </View>
            </Pressable>
          ))}
        </ScrollView>

        <View
          className="p-4 border-t border-light-border dark:border-dark-border"
          style={{ paddingBottom: tabBarClearance }}
        >
          <Pressable onPress={() => setActiveTab("current")} className="py-3">
            <Text className="text-center font-semibold text-cyan-600 dark:text-cyan-400">
              Back to Current
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Completed Exercises Tab
  return (
    <SafeAreaView
      className={cn("flex-1", isDark ? "bg-dark-bg" : "bg-light-bg")}
    >
      <ScrollView className="flex-1 p-4">
        <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Completed
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {completedExercises} of {exercises.length} exercises
        </Text>

        {exercises.slice(0, currentExerciseIndex).map((exercise) => {
          const allSetsCompleted = exercise.setsPlan.every(
            (set) => set.completed,
          );
          return (
            <View
              key={exercise.id}
              className={cn(
                "p-3 rounded-lg mb-3 border",
                isDark
                  ? "bg-dark-surface border-dark-border"
                  : "bg-light-surface border-light-border",
              )}
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {exercise.name}
                  </Text>
                  <Text
                    className={cn(
                      "text-sm mt-1",
                      allSetsCompleted
                        ? "text-green-600 dark:text-green-400"
                        : "text-gray-600 dark:text-gray-400",
                    )}
                  >
                    {exercise.setsPlan.filter((s) => s.completed).length} /
                    {exercise.setsPlan.length} sets
                  </Text>
                </View>
                {allSetsCompleted && <Check size={16} color="#22c55e" />}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View
        className="p-4 border-t border-light-border dark:border-dark-border"
        style={{ paddingBottom: tabBarClearance }}
      >
        <Pressable onPress={() => setActiveTab("current")} className="py-3">
          <Text className="text-center font-semibold text-cyan-600 dark:text-cyan-400">
            Back to Current
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
