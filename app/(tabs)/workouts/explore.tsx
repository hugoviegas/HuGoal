import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, Pressable, TextInput, FlatList } from "react-native";
import {
  ChevronDown,
  ChevronUp,
  Search,
  SearchX,
  X,
} from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import { useAuthStore } from "@/stores/auth.store";
import { Tabs, TabContent } from "@/components/ui/Tabs";
import { ExerciseCard } from "@/components/workouts/ExerciseCard";
import { MuscleMap } from "@/components/workouts/MuscleMap";
import { Spinner } from "@/components/ui/Spinner";
import type { Exercise } from "@/types";
import {
  buildMuscleTabs,
  getExerciseCatalog,
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
  const profile = useAuthStore((s) => s.profile);

  // State
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null,
  );
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [expandedLevels, setExpandedLevels] = useState<Record<string, boolean>>(
    {
      beginner: true,
      intermediate: true,
      advanced: true,
    },
  );
  const [tabs, setTabs] = useState<{ id: string; label: string }[]>([
    { id: "all", label: "All" },
  ]);

  const muscleGender = profile?.sex === "female" ? "female" : "male";

  const loadExercises = useCallback(async () => {
    try {
      setLoading(true);
      const catalog = await getExerciseCatalog();
      setExercises(catalog.exercises);
      setTabs(buildMuscleTabs(catalog.exercises));
      setSelectedExercise(
        (previous) => previous ?? catalog.exercises[0] ?? null,
      );
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

    // Keep exercise list deterministic and easier to scan
    const sorted = [...result].sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
    );

    setFilteredExercises(sorted);
  }, [activeTab, exercises, searchText]);

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

  const sections = useMemo(() => {
    const grouped: Record<string, Exercise[]> = {
      beginner: [],
      intermediate: [],
      advanced: [],
      other: [],
    };

    for (const exercise of filteredExercises) {
      if (exercise.difficulty === "beginner") {
        grouped.beginner.push(exercise);
      } else if (exercise.difficulty === "intermediate") {
        grouped.intermediate.push(exercise);
      } else if (exercise.difficulty === "advanced") {
        grouped.advanced.push(exercise);
      } else {
        grouped.other.push(exercise);
      }
    }

    return [
      { id: "beginner", label: "Beginner", data: grouped.beginner },
      { id: "intermediate", label: "Intermediate", data: grouped.intermediate },
      { id: "advanced", label: "Advanced", data: grouped.advanced },
      { id: "other", label: "Other", data: grouped.other },
    ].filter((section) => section.data.length > 0);
  }, [filteredExercises]);

  const toggleSection = (id: string) => {
    setExpandedLevels((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <View className="flex-1 bg-light-surface dark:bg-dark-surface">
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
              contentClassName="pt-3 pb-2"
            >
              {tabs.map((tab) => (
                <TabContent key={tab.id} value={tab.id}>
                  {filteredExercises.length === 0 ? (
                    renderEmptyState()
                  ) : (
                    <View className="flex-1" style={{ minHeight: 0 }}>
                      <View className="px-1 pb-2">
                        <View className="flex-row items-center gap-2">
                          <Pressable
                            onPress={() => {
                              setIsSearchOpen((prev) => !prev);
                              if (isSearchOpen) {
                                setSearchText("");
                              }
                            }}
                            className="h-10 w-10 items-center justify-center rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card"
                          >
                            <Search size={18} color={colors.muted} />
                          </Pressable>

                          {isSearchOpen ? (
                            <View className="flex-1 flex-row items-center gap-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card px-3 h-10">
                              <TextInput
                                placeholder="Search exercises..."
                                placeholderTextColor={
                                  isDark ? "#9ca3af" : "#9ca3af"
                                }
                                value={searchText}
                                onChangeText={setSearchText}
                                className="flex-1 text-sm text-gray-900 dark:text-gray-100"
                              />
                              {searchText ? (
                                <Pressable onPress={() => setSearchText("")}>
                                  <X size={16} color={colors.muted} />
                                </Pressable>
                              ) : null}
                            </View>
                          ) : null}
                        </View>
                      </View>

                      <FlatList
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{
                          paddingHorizontal: 16,
                          paddingBottom: 24,
                        }}
                        ListHeaderComponent={
                          selectedExercise ? (
                            <View className="mb-2">
                              <MuscleMap
                                primaryMuscles={
                                  selectedExercise.primary_muscles
                                }
                                secondaryMuscles={
                                  selectedExercise.secondary_muscles
                                }
                                gender={muscleGender}
                                scale={0.8}
                              />
                            </View>
                          ) : null
                        }
                        data={sections}
                        keyExtractor={(section) => section.id}
                        renderItem={({ item: section }) => (
                          <View className="mb-2">
                            <Pressable
                              onPress={() => toggleSection(section.id)}
                              className="flex-row items-center justify-between rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card px-3 py-2"
                            >
                              <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {section.label} ({section.data.length})
                              </Text>
                              {expandedLevels[section.id] ? (
                                <ChevronUp size={16} color={colors.muted} />
                              ) : (
                                <ChevronDown size={16} color={colors.muted} />
                              )}
                            </Pressable>

                            {expandedLevels[section.id] ? (
                              <View className="pt-2">
                                {section.data.map((exercise) => (
                                  <ExerciseCard
                                    key={exercise.id}
                                    exercise={exercise}
                                    onPress={() =>
                                      handleSelectExercise(exercise)
                                    }
                                    onAddPress={() =>
                                      handleAddExercise(exercise)
                                    }
                                    variant="list"
                                    className="mb-3"
                                  />
                                ))}
                              </View>
                            ) : null}
                          </View>
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
