import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, TextInput, FlatList } from "react-native";
import { Search, SearchX, X } from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import { Tabs, TabContent } from "@/components/ui/Tabs";
import { ExerciseCard } from "@/components/workouts/ExerciseCard";
import { MuscleMap } from "@/components/workouts/MuscleMap";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import type { Exercise } from "@/types";
import {
  buildMuscleTabs,
  getExerciseCatalog,
  muscleKeyToLabel,
} from "@/lib/workouts/exercise-catalog";

/**
 * Exercise Library - Browse and search exercises
 *
 * States:
 * - Loading: Fetching exercise database
 * - Search: Filtered by text
 * - Filter: By muscle, equipment, difficulty
 * - Empty: No results
 */
export default function ExploreScreen() {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = useThemeStore((s) => s.colors);
  const showToast = useToastStore((s) => s.show);

  // State
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null,
  );
  const [tabs, setTabs] = useState<{ id: string; label: string }[]>([
    { id: "all", label: "All" },
  ]);

  const loadExercises = useCallback(async () => {
    try {
      setLoading(true);
      const catalog = await getExerciseCatalog();
      setExercises(catalog.exercises);
      setTabs(buildMuscleTabs(catalog.exercises));
      setSelectedExercise(
        (previous) => previous ?? catalog.exercises[0] ?? null,
      );

      if (catalog.source === "bundled") {
        showToast(
          "Using bundled exercise catalog while Firestore sync is unavailable.",
          "info",
        );
      }
    } catch {
      const message = "Failed to load exercises";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const filterExercises = useCallback(() => {
    let result = exercises;

    // Search filter
    if (searchText) {
      result = result.filter(
        (ex) =>
          ex.name.toLowerCase().includes(searchText.toLowerCase()) ||
          ex.aliases.join(",").toLowerCase().includes(searchText.toLowerCase()),
      );
    }

    // Tab filter by muscle
    if (activeTab !== "all") {
      result = result.filter(
        (ex) =>
          ex.primary_muscles.includes(activeTab) ||
          ex.secondary_muscles.includes(activeTab),
      );
    }

    // Difficulty filter
    if (selectedFilter && selectedFilter.startsWith("difficulty-")) {
      const difficulty = selectedFilter.replace("difficulty-", "");
      result = result.filter((ex) => ex.difficulty === difficulty);
    }

    setFilteredExercises(result);
  }, [activeTab, exercises, searchText, selectedFilter]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  useEffect(() => {
    filterExercises();
  }, [filterExercises]);

  useEffect(() => {
    if (filteredExercises.length === 0) {
      setSelectedExercise(null);
      return;
    }

    if (!selectedExercise) {
      setSelectedExercise(filteredExercises[0]);
      return;
    }

    const exists = filteredExercises.some(
      (item) => item.id === selectedExercise.id,
    );
    if (!exists) {
      setSelectedExercise(filteredExercises[0]);
    }
  }, [filteredExercises, selectedExercise]);

  const handleAddExercise = (exercise: Exercise) => {
    showToast(`Added ${exercise.name} to workout`, "success");
    // TODO: Dispatch to workout store or parent
  };

  const handleSelectExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise);
  };

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center gap-3 px-6">
      <SearchX size={48} color={colors.muted} />
      <Text className="text-lg font-semibold text-gray-700 dark:text-gray-300 text-center">
        No exercises found
      </Text>
      <Text className="text-sm text-gray-600 dark:text-gray-400 text-center">
        Try different filters or search terms
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-light-surface dark:bg-dark-surface">
      {/* Header */}
      <View className="bg-light-card dark:bg-dark-card px-6 pt-4 pb-3 gap-3">
        <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Exercise Library
        </Text>
      </View>

      {/* Search Bar */}
      <View className="px-4 pt-3 pb-2">
        <View className="flex-row items-center gap-2 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg px-3 py-3">
          <Search size={18} color={colors.muted} />
          <TextInput
            placeholder="Search exercises..."
            placeholderTextColor={isDark ? "#9ca3af" : "#9ca3af"}
            value={searchText}
            onChangeText={setSearchText}
            className="flex-1 text-base text-gray-900 dark:text-gray-100"
          />
          {searchText && (
            <Pressable onPress={() => setSearchText("")} className="p-2">
              <X size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Difficulty Filter */}
      <View className="px-4 pb-2 flex-row gap-2">
        <Badge
          variant={selectedFilter === null ? "primary" : "secondary"}
          size="sm"
          onPress={() => setSelectedFilter(null)}
        >
          All
        </Badge>
        <Badge
          variant={
            selectedFilter === "difficulty-beginner" ? "success" : "secondary"
          }
          size="sm"
          onPress={() => setSelectedFilter("difficulty-beginner")}
        >
          Beginner
        </Badge>
        <Badge
          variant={
            selectedFilter === "difficulty-intermediate"
              ? "warning"
              : "secondary"
          }
          size="sm"
          onPress={() => setSelectedFilter("difficulty-intermediate")}
        >
          Intermediate
        </Badge>
        <Badge
          variant={
            selectedFilter === "difficulty-advanced"
              ? "destructive"
              : "secondary"
          }
          size="sm"
          onPress={() => setSelectedFilter("difficulty-advanced")}
        >
          Advanced
        </Badge>
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <Spinner size="lg" color="#06b6d4" />
        </View>
      ) : (
        <View className="flex-1" style={{ minHeight: 0 }}>
          {/* Muscle Tabs */}
          <View className="flex-1 px-4 pt-2" style={{ minHeight: 0 }}>
            <Tabs
              className="flex-1"
              items={tabs}
              defaultValue="all"
              onValueChange={setActiveTab}
              variant="line"
              size="sm"
              contentClassName="mt-4 pb-4"
            >
              {tabs.map((tab) => (
                <TabContent key={tab.id} value={tab.id}>
                  {filteredExercises.length === 0 ? (
                    renderEmptyState()
                  ) : (
                    <View className="flex-1" style={{ minHeight: 0 }}>
                      <FlatList
                        data={filteredExercises}
                        keyExtractor={(item) => item.id}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{
                          paddingHorizontal: 16,
                          paddingBottom: 24,
                        }}
                        ListHeaderComponent={
                          selectedExercise ? (
                            <View className="mb-3">
                              <MuscleMap
                                primaryMuscles={
                                  selectedExercise.primary_muscles
                                }
                                secondaryMuscles={
                                  selectedExercise.secondary_muscles
                                }
                                title={selectedExercise.name}
                                subtitle={`Primary: ${selectedExercise.primary_muscles
                                  .map((muscle) => muscleKeyToLabel(muscle))
                                  .join(", ")}`}
                              />
                            </View>
                          ) : null
                        }
                        renderItem={({ item }) => (
                          <ExerciseCard
                            exercise={item}
                            onPress={() => handleSelectExercise(item)}
                            onAddPress={() => handleAddExercise(item)}
                            variant="list"
                            className="mb-3"
                          />
                        )}
                      />
                    </View>
                  )}
                </TabContent>
              ))}
            </Tabs>
          </View>
        </View>
      )}
    </View>
  );
}
