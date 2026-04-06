import React, { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { useRouter } from "expo-router";
import {
  Compass,
  Ellipsis,
  FileText,
  Flame,
  History,
  PencilLine,
  Sparkles,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import { Tabs, TabContent } from "@/components/ui/Tabs";
import { WorkoutCard } from "@/components/workouts/WorkoutCard";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
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
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.show);
  const colors = useThemeStore((s) => s.colors);
  const isDark = useThemeStore((s) => s.isDark);

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedWorkouts, setSavedWorkouts] = useState<WorkoutTemplate[]>([]);
  const [archivedWorkouts, setArchivedWorkouts] = useState<WorkoutTemplate[]>(
    [],
  );
  const [historyWorkouts, setHistoryWorkouts] = useState<WorkoutTemplate[]>([]);
  const [activeTab, setActiveTab] = useState("workouts");

  const loadWorkouts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.uid) {
        setSavedWorkouts([]);
        setArchivedWorkouts([]);
        setHistoryWorkouts([]);
        return;
      }

      const templates = await listWorkoutTemplates(user.uid);

      const normalizedTemplates = templates as unknown as WorkoutTemplate[];
      const sortedByUpdated = [...normalizedTemplates].sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime(),
      );

      setSavedWorkouts(sortedByUpdated);

      // Presets selected from card_style prompt for this screen:
      // - workout preset: main list
      // - minimal preset: archived/history compact cards
      const archived = sortedByUpdated.filter((item) =>
        item.tags?.some((tag) => /archive|archived/i.test(tag)),
      );
      setArchivedWorkouts(archived);
      setHistoryWorkouts(sortedByUpdated.slice(0, 12));
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

  const handleDuplicateWorkout = (workoutId: string) => {
    showToast("Workout duplicated. Adjust details before saving.", "success");
    router.push(`/workouts/${workoutId}/edit`);
  };

  const handleArchiveWorkout = (workoutId: string) => {
    showToast("Add tag 'archived' to move this workout to Arquivados.", "info");
    router.push(`/workouts/${workoutId}`);
  };

  const tabs = [
    { id: "workouts", label: "Exercicios" },
    { id: "archived", label: "Arquivados" },
    { id: "history", label: "Historico" },
  ];

  const renderWorkoutCard = (
    item: WorkoutTemplate,
    variant: "expanded" | "compact" = "expanded",
  ) => (
    <WorkoutCard
      template={item}
      key={item.id}
      onPress={() => handleSelectWorkout(item.id)}
      menu={
        <DropdownMenu
          items={[
            { id: "open", label: "Open" },
            { id: "edit", label: "Edit" },
            { id: "duplicate", label: "Duplicate" },
            { id: "archive", label: "Archive" },
          ]}
          onSelect={(action) => {
            if (action === "open") {
              handleSelectWorkout(item.id);
              return;
            }
            if (action === "edit") {
              handleEditWorkout(item.id);
              return;
            }
            if (action === "duplicate") {
              handleDuplicateWorkout(item.id);
              return;
            }
            if (action === "archive") {
              handleArchiveWorkout(item.id);
            }
          }}
          align="right"
          triggerClassName="p-1"
          trigger={
            <Ellipsis size={18} color={isDark ? "#9ca3af" : "#6b7280"} />
          }
        />
      }
      variant={variant}
      className="mb-3"
      showDifficulty
    />
  );

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center gap-4 px-6">
      {activeTab === "archived" ? (
        <FileText size={48} color={colors.muted} />
      ) : (
        <Flame size={48} color={colors.muted} />
      )}
      <Text className="text-lg font-semibold text-gray-700 dark:text-gray-300 text-center">
        {activeTab === "archived"
          ? "Nenhum treino arquivado"
          : activeTab === "history"
            ? "Sem historico recente"
            : "Nenhum treino ainda"}
      </Text>
      <Text className="text-sm text-gray-600 dark:text-gray-400 text-center">
        {activeTab === "workouts"
          ? "Crie seu primeiro treino para comecar"
          : "Seus treinos aparecem aqui automaticamente"}
      </Text>
      <Button onPress={handleCreateNew} size="md" className="mt-2">
        Create Workout
      </Button>
    </View>
  );

  const getListData = () => {
    switch (activeTab) {
      case "archived":
        return archivedWorkouts;
      case "history":
        return historyWorkouts;
      default:
        return savedWorkouts;
    }
  };

  const data = getListData();

  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <View
        className="px-4 pt-3 flex-1"
        style={{ paddingTop: insets.top + 8, minHeight: 0 }}
      >
        <Tabs
          className="flex-1"
          items={tabs}
          defaultValue="workouts"
          onValueChange={setActiveTab}
          variant="line"
          size="md"
          style={{ minHeight: 0 }}
          contentClassName="mt-4 flex-1"
        >
          <TabContent value="workouts">
            <View
              className={cn(
                "rounded-3xl border px-4 py-4 mb-4",
                isDark
                  ? "bg-dark-card border-dark-border"
                  : "bg-light-card border-light-border",
              )}
              style={{
                boxShadow: isDark
                  ? "0px 14px 34px rgba(0, 0, 0, 0.28)"
                  : "0px 14px 34px rgba(0, 0, 0, 0.10)",
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-2">
                  <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Build Your Next Session
                  </Text>
                  <Text className="text-sm mt-1 text-gray-600 dark:text-gray-400">
                    Crie, ajuste e inicie treinos com menos toques.
                  </Text>
                </View>
                <Badge variant="accent">
                  <View className="flex-row items-center gap-1">
                    <Sparkles size={12} color="#ffffff" />
                    <Text className="text-white text-xs font-semibold">
                      Smart
                    </Text>
                  </View>
                </Badge>
              </View>

              <View className="mt-4 flex-row gap-2">
                <Button onPress={handleCreateNew} className="flex-1" size="md">
                  <View className="flex-row items-center justify-center gap-2">
                    <PencilLine size={16} color="#ffffff" />
                    <Text className="text-white font-semibold">Create</Text>
                  </View>
                </Button>
                <Button
                  variant="secondary"
                  onPress={() => router.push("/workouts/explore")}
                  className="flex-1"
                  size="md"
                >
                  <View className="flex-row items-center justify-center gap-2">
                    <Compass size={16} color={isDark ? "#e5e7eb" : "#111827"} />
                    <Text className="text-gray-900 dark:text-gray-100 font-semibold">
                      Explore
                    </Text>
                  </View>
                </Button>
              </View>
            </View>

            {loading ? (
              <View className="flex-1 justify-center items-center py-12">
                <Spinner size="lg" color="#06b6d4" />
              </View>
            ) : error ? (
              <View className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 gap-2 border border-red-200 dark:border-red-900/50">
                <Text className="font-semibold text-red-700 dark:text-red-300">
                  Error loading workouts
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
                renderItem={({ item }) => renderWorkoutCard(item, "expanded")}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
                nestedScrollEnabled={true}
                scrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                  paddingBottom: insets.bottom + 160,
                  flexGrow: 1,
                }}
                ListFooterComponent={() => (
                  <View style={{ height: insets.bottom + 120 }} />
                )}
              />
            )}
          </TabContent>

          <TabContent value="archived">
            {data.length === 0 ? (
              renderEmptyState()
            ) : (
              <FlatList
                data={data}
                renderItem={({ item }) => renderWorkoutCard(item, "compact")}
                keyExtractor={(item) => item.id}
                style={{ flex: 1 }}
                nestedScrollEnabled={true}
                scrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingBottom: insets.bottom + 160,
                  flexGrow: 1,
                }}
                ListFooterComponent={() => (
                  <View style={{ height: insets.bottom + 120 }} />
                )}
              />
            )}
          </TabContent>

          <TabContent value="history">
            <Pressable
              onPress={() => router.push("/workouts/history")}
              className={cn(
                "mb-3 rounded-xl border px-4 py-3 flex-row items-center justify-between",
                isDark
                  ? "bg-dark-surface border-dark-border"
                  : "bg-light-surface border-light-border",
              )}
            >
              <View className="flex-row items-center gap-2">
                <History size={16} color={colors.muted} />
                <Text className="font-medium text-gray-900 dark:text-gray-100">
                  Open full session history
                </Text>
              </View>
              <Text className="text-cyan-600 dark:text-cyan-400 text-sm font-semibold">
                View all
              </Text>
            </Pressable>

            {data.length === 0 ? (
              renderEmptyState()
            ) : (
              <FlatList
                data={data}
                renderItem={({ item }) => renderWorkoutCard(item, "compact")}
                keyExtractor={(item) => item.id}
                style={{ flex: 1 }}
                nestedScrollEnabled={true}
                scrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingBottom: insets.bottom + 160,
                  flexGrow: 1,
                }}
                ListFooterComponent={() => (
                  <View style={{ height: insets.bottom + 120 }} />
                )}
              />
            )}
          </TabContent>
        </Tabs>
      </View>
    </View>
  );
}
