import React, { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, Pressable, TextInput } from "react-native";
import { Search, SearchX, X } from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import { Tabs, TabContent } from "@/components/ui/Tabs";
import { ExerciseCard } from "@/components/workouts/ExerciseCard";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import type { Exercise } from "@/types";

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

  const loadExercises = useCallback(async () => {
    try {
      setLoading(true);

      // TODO: Fetch from Firestore exercises collection
      // For now, using mock data
      const mockExercises: Exercise[] = [
        {
          id: "barbell-squat",
          name: "Barbell Back Squat",
          name_en: "Barbell Back Squat",
          primary_muscles: ["quadriceps", "glutes"],
          secondary_muscles: ["hamstrings", "lower_back"],
          equipment: ["barbell"],
          difficulty: "intermediate",
          video_youtube_ids: [],
          aliases: ["back squat", "squat"],
        },
        {
          id: "bench-press",
          name: "Barbell Bench Press",
          name_en: "Barbell Bench Press",
          primary_muscles: ["chest", "triceps"],
          secondary_muscles: ["shoulders"],
          equipment: ["barbell"],
          difficulty: "intermediate",
          video_youtube_ids: [],
          aliases: ["bench press"],
        },
        {
          id: "deadlift",
          name: "Deadlift",
          name_en: "Deadlift",
          primary_muscles: ["glutes", "hamstrings"],
          secondary_muscles: ["back", "quads"],
          equipment: ["barbell"],
          difficulty: "advanced",
          video_youtube_ids: [],
          aliases: ["conventional deadlift"],
        },
        {
          id: "pushup",
          name: "Push-up",
          name_en: "Push-up",
          primary_muscles: ["chest", "triceps"],
          secondary_muscles: ["shoulders"],
          equipment: ["bodyweight"],
          difficulty: "beginner",
          video_youtube_ids: [],
          aliases: ["pushup", "press-up"],
        },
      ];

      setExercises(mockExercises);
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

  const handleAddExercise = (exercise: Exercise) => {
    showToast(`Added ${exercise.name} to workout`, "success");
    // TODO: Dispatch to workout store or parent
  };

  const handleSelectExercise = (exercise: Exercise) => {
    showToast(`Viewing ${exercise.name}`, "info");
    // TODO: Navigate to exercise detail
  };

  const muscleGroups = [
    "all",
    "chest",
    "back",
    "shoulders",
    "biceps",
    "triceps",
    "forearms",
    "quadriceps",
    "hamstrings",
    "glutes",
    "calves",
  ];

  const tabs = muscleGroups.map((muscle) => ({
    id: muscle,
    label: muscle.charAt(0).toUpperCase() + muscle.slice(1),
  }));

  const renderExerciseCard = (item: Exercise) => (
    <ExerciseCard
      key={item.id}
      exercise={item}
      onPress={() => handleSelectExercise(item)}
      onAddPress={() => handleAddExercise(item)}
      variant="list"
      className="mb-3"
    />
  );

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
        <View className="flex-1">
          {/* Muscle Tabs */}
          <View className="px-4 pt-2">
            <Tabs
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
                    <FlatList
                      data={filteredExercises}
                      renderItem={({ item }) => renderExerciseCard(item)}
                      keyExtractor={(item) => item.id}
                      scrollEnabled={false}
                      contentContainerStyle={{ gap: 12 }}
                    />
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
