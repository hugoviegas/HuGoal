import React, { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import {
  Compass,
  FileText,
  Flame,
  History,
  PencilLine,
} from "lucide-react-native";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import { Tabs, TabContent } from "@/components/ui/Tabs";
import { WorkoutCard } from "@/components/workouts/WorkoutCard";
import { Button } from "@/components/ui/Button";
import { FloatingActionMenu } from "@/components/ui/FloatingActionMenu";
import type { WorkoutTemplate } from "@/types";
import { listWorkoutTemplates } from "@/lib/firestore/workouts";

/**
 * Workouts Index - Main workouts screen with tabs (Saved, Recent, Drafts)
 *
 * States:
 * - Loading: Fetching from Firestore
 * - Empty: No workouts in selected tab
 * - Error: Failed to fetch
 * - Success: Display workouts
 */
export default function WorkoutsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.show);
  const colors = useThemeStore((s) => s.colors);

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedWorkouts, setSavedWorkouts] = useState<WorkoutTemplate[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutTemplate[]>([]);
  const [draftWorkouts, setDraftWorkouts] = useState<WorkoutTemplate[]>([]);
  const [activeTab, setActiveTab] = useState("saved");

  const loadWorkouts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.uid) {
        setSavedWorkouts([]);
        setRecentWorkouts([]);
        setDraftWorkouts([]);
        return;
      }

      const templates = await listWorkoutTemplates(user.uid);

      setSavedWorkouts(templates as unknown as WorkoutTemplate[]);
      setRecentWorkouts(templates.slice(0, 3) as unknown as WorkoutTemplate[]);
      setDraftWorkouts([]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load workouts";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, user]);

  useEffect(() => {
    loadWorkouts();
  }, [loadWorkouts, user]);

  const handleCreateNew = () => {
    router.push("/workouts/create");
  };

  const handleSelectWorkout = (workoutId: string) => {
    router.push(`/workouts/${workoutId}`);
  };

  const handleEditWorkout = (workoutId: string) => {
    router.push(`/workouts/${workoutId}/edit`);
  };

  const tabs = [
    { id: "saved", label: "Saved" },
    { id: "recent", label: "Recent" },
    { id: "drafts", label: "Drafts" },
  ];

  const renderWorkoutCard = (item: WorkoutTemplate) => (
    <WorkoutCard
      template={item}
      key={item.id}
      onPress={() => handleSelectWorkout(item.id)}
      onMenuPress={() => handleEditWorkout(item.id)}
      className="mb-3"
      showDifficulty
    />
  );

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center gap-4 px-6">
      {activeTab === "drafts" ? (
        <FileText size={48} color={colors.muted} />
      ) : (
        <Flame size={48} color={colors.muted} />
      )}
      <Text className="text-lg font-semibold text-gray-700 dark:text-gray-300 text-center">
        {activeTab === "drafts"
          ? "No draft workouts"
          : activeTab === "recent"
            ? "No recent workouts"
            : "No saved workouts yet"}
      </Text>
      <Text className="text-sm text-gray-600 dark:text-gray-400 text-center">
        {activeTab === "saved"
          ? "Create a new workout to get started"
          : "Your workouts will appear here"}
      </Text>
      <Button onPress={handleCreateNew} size="md" className="mt-2">
        Create Workout
      </Button>
    </View>
  );

  const getListData = () => {
    switch (activeTab) {
      case "recent":
        return recentWorkouts;
      case "drafts":
        return draftWorkouts;
      default:
        return savedWorkouts;
    }
  };

  const data = getListData();

  return (
    <View className="flex-1 bg-light-surface dark:bg-dark-surface">
      {/* Header */}
      <View className="bg-light-card dark:bg-dark-card px-6 pt-4 pb-3 gap-3">
        <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Workouts
        </Text>
      </View>

      {/* Tabs */}
      <View className="px-4 pt-3">
        <Tabs
          items={tabs}
          defaultValue="saved"
          onValueChange={setActiveTab}
          variant="line"
          size="md"
          contentClassName="mt-4 pb-4"
        >
          <TabContent value="saved">
            {loading ? (
              <View className="flex-1 justify-center items-center py-12">
                <ActivityIndicator size="large" color="#06b6d4" />
              </View>
            ) : error ? (
              <View className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 gap-2">
                <Text className="font-semibold text-red-700 dark:text-red-300">
                  Error
                </Text>
                <Text className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </Text>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={loadWorkouts}
                  className="mt-2"
                >
                  Retry
                </Button>
              </View>
            ) : data.length === 0 ? (
              renderEmptyState()
            ) : (
              <FlatList
                data={data}
                renderItem={({ item }) => renderWorkoutCard(item)}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                contentContainerStyle={{ gap: 12 }}
              />
            )}
          </TabContent>

          <TabContent value="recent">
            {data.length === 0 ? (
              renderEmptyState()
            ) : (
              <FlatList
                data={data}
                renderItem={({ item }) => renderWorkoutCard(item)}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                contentContainerStyle={{ gap: 12 }}
              />
            )}
          </TabContent>

          <TabContent value="drafts">
            {data.length === 0 ? (
              renderEmptyState()
            ) : (
              <FlatList
                data={data}
                renderItem={({ item }) => renderWorkoutCard(item)}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                contentContainerStyle={{ gap: 12 }}
              />
            )}
          </TabContent>
        </Tabs>
      </View>

      <FloatingActionMenu
        options={[
          {
            label: "Create Workout",
            icon: <PencilLine size={16} color="#ffffff" />,
            onPress: handleCreateNew,
          },
          {
            label: "Explore Exercises",
            icon: <Compass size={16} color="#ffffff" />,
            onPress: () => router.push("/workouts/explore"),
          },
          {
            label: "View History",
            icon: <History size={16} color="#ffffff" />,
            onPress: () => router.push("/workouts/history"),
          },
        ]}
      />
    </View>
  );
}
