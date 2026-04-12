import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Modal as RNModal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Check,
  Clock3,
  Compass,
  Copy,
  Dumbbell,
  Edit3,
  FileText,
  Heart,
  MoreHorizontal,
  Plus,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react-native";
import {
  listWorkoutTemplates,
  deleteWorkoutTemplate,
  duplicateWorkoutTemplate,
  updateWorkoutTemplate,
  listPublicWorkoutTemplates,
  type WorkoutTemplateRecord,
  type WorkoutDifficulty,
} from "@/lib/firestore/workouts";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

// ─── Types ────────────────────────────────────────────────────────────────────

type LibraryTab = "my" | "discover" | "drafts";
type MyFilter = "all" | "active" | "inactive";

// ─── Difficulty theme ─────────────────────────────────────────────────────────

const DIFFICULTY_CONFIG: Record<
  WorkoutDifficulty,
  { color: string; bg: string; label: string }
> = {
  beginner: { color: "#059669", bg: "rgba(5,150,105,0.15)", label: "Beginner" },
  intermediate: {
    color: "#0284c7",
    bg: "rgba(2,132,199,0.15)",
    label: "Intermediate",
  },
  advanced: { color: "#dc2626", bg: "rgba(220,38,38,0.15)", label: "Advanced" },
};

// ─── Workout card ─────────────────────────────────────────────────────────────

interface WorkoutCardProps {
  workout: WorkoutTemplateRecord;
  onPress: () => void;
  onMenuPress: () => void;
  discoverMode?: boolean;
}

function WorkoutCard({
  workout,
  onPress,
  onMenuPress,
  discoverMode = false,
}: WorkoutCardProps) {
  const { isDark, colors } = useThemeStore();
  const diff = DIFFICULTY_CONFIG[workout.difficulty] ?? DIFFICULTY_CONFIG.intermediate;

  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "rounded-2xl overflow-hidden mb-3",
        isDark ? "bg-dark-surface" : "bg-light-card",
      )}
      style={{
        boxShadow: isDark
          ? "0px 2px 12px rgba(0,0,0,0.3)"
          : "0px 2px 12px rgba(0,0,0,0.07)",
      }}
    >
      {/* ── Image banner ── */}
      <View style={{ height: 148 }}>
        {workout.cover_image_url ? (
          <Image
            source={{ uri: workout.cover_image_url }}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: diff.bg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Dumbbell size={36} color={diff.color} strokeWidth={1.5} />
          </View>
        )}

        {/* Dark overlay for readability */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 64,
            backgroundColor: "rgba(0,0,0,0.38)",
          }}
        />

        {/* Active / draft badge — top left */}
        <View style={{ position: "absolute", top: 10, left: 10 }}>
          {workout.is_draft ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 20,
                backgroundColor: "rgba(202,138,4,0.85)",
              }}
            >
              <FileText size={11} color="#fff" />
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}>
                Draft
              </Text>
            </View>
          ) : (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 20,
                backgroundColor: workout.is_active
                  ? "rgba(5,150,105,0.85)"
                  : "rgba(100,116,139,0.7)",
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: "#fff",
                }}
              />
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}>
                {workout.is_active ? "Active" : "Inactive"}
              </Text>
            </View>
          )}
        </View>

        {/* Action button — top right */}
        <View style={{ position: "absolute", top: 10, right: 10 }}>
          {discoverMode ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onMenuPress();
              }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "rgba(255,255,255,0.15)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Heart size={15} color="#fff" />
            </Pressable>
          ) : (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onMenuPress();
              }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "rgba(0,0,0,0.45)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MoreHorizontal size={15} color="#fff" />
            </Pressable>
          )}
        </View>

        {/* Difficulty badge — bottom left of image */}
        <View
          style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 12,
            backgroundColor: "rgba(0,0,0,0.55)",
          }}
        >
          <View
            style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: diff.color }}
          />
          <Text style={{ fontSize: 11, fontWeight: "600", color: "#fff" }}>
            {diff.label}
          </Text>
        </View>

        {/* AI badge — bottom right of image */}
        {workout.is_ai_generated && (
          <View
            style={{
              position: "absolute",
              bottom: 10,
              right: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 12,
              backgroundColor: "rgba(124,58,237,0.7)",
            }}
          >
            <Sparkles size={10} color="#fff" />
            <Text style={{ fontSize: 11, fontWeight: "600", color: "#fff" }}>AI</Text>
          </View>
        )}
      </View>

      {/* ── Details ── */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 }}>
        <Text
          className="text-base font-bold text-gray-900 dark:text-gray-100"
          numberOfLines={1}
        >
          {workout.name}
        </Text>

        {workout.description ? (
          <Text
            className="text-sm text-gray-500 dark:text-gray-400 mt-0.5"
            numberOfLines={1}
          >
            {workout.description}
          </Text>
        ) : null}

        {/* Stats row */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Clock3 size={13} color={colors.muted} />
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              {workout.estimated_duration_minutes} min
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Dumbbell size={13} color={colors.muted} />
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              {workout.exercises.length} exercises
            </Text>
          </View>
          {discoverMode && workout.like_count ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Heart size={12} color={colors.muted} />
              <Text className="text-xs text-gray-600 dark:text-gray-400">
                {workout.like_count}
              </Text>
            </View>
          ) : null}
          {discoverMode && workout.saved_by_count ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Users size={12} color={colors.muted} />
              <Text className="text-xs text-gray-600 dark:text-gray-400">
                {workout.saved_by_count}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Tags */}
        {workout.tags && workout.tags.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {workout.tags.slice(0, 3).map((tag) => (
              <View
                key={tag}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderRadius: 12,
                  backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                }}
              >
                <Text className="text-[11px] text-gray-500 dark:text-gray-400">
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action?: { label: string; onPress: () => void };
}

function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View className="mb-4 opacity-40">{icon}</View>
      <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 text-center">
        {title}
      </Text>
      <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
        {subtitle}
      </Text>
      {action ? (
        <Button className="mt-5" onPress={action.onPress}>
          {action.label}
        </Button>
      ) : null}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function WorkoutLibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const { isDark, colors } = useThemeStore();
  const showToast = useToastStore((state) => state.show);

  // Tab & filter
  const [activeTab, setActiveTab] = useState<LibraryTab>("my");
  const [filter, setFilter] = useState<MyFilter>("all");

  // Data
  const [myWorkouts, setMyWorkouts] = useState<WorkoutTemplateRecord[]>([]);
  const [publicWorkouts, setPublicWorkouts] = useState<WorkoutTemplateRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Action sheet
  const [menuTarget, setMenuTarget] = useState<WorkoutTemplateRecord | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;

  // ── Data loaders ──────────────────────────────────────────────────────────

  const loadMyWorkouts = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const templates = await listWorkoutTemplates(user.uid);
      setMyWorkouts(templates);
    } catch {
      showToast("Could not load workouts", "error");
    } finally {
      setLoading(false);
    }
  }, [user?.uid, showToast]);

  const loadPublicWorkouts = useCallback(async () => {
    setLoading(true);
    try {
      const templates = await listPublicWorkoutTemplates();
      setPublicWorkouts(templates);
    } catch {
      // Index may not exist yet — show empty state gracefully
      setPublicWorkouts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "discover") {
      void loadPublicWorkouts();
    } else {
      void loadMyWorkouts();
    }
  }, [activeTab, loadMyWorkouts, loadPublicWorkouts]);

  // ── Derived lists ─────────────────────────────────────────────────────────

  const filteredMyWorkouts = useMemo(() => {
    const base = myWorkouts.filter((w) => !w.is_draft);
    if (filter === "active") return base.filter((w) => w.is_active);
    if (filter === "inactive") return base.filter((w) => !w.is_active);
    return base;
  }, [myWorkouts, filter]);

  const draftWorkouts = useMemo(
    () => myWorkouts.filter((w) => w.is_draft),
    [myWorkouts],
  );

  const activeCount = useMemo(
    () => myWorkouts.filter((w) => !w.is_draft && w.is_active).length,
    [myWorkouts],
  );

  // ── Action sheet ──────────────────────────────────────────────────────────

  const openSheet = (workout: WorkoutTemplateRecord) => {
    setMenuTarget(workout);
    setSheetVisible(true);
    Animated.spring(sheetAnim, {
      toValue: 1,
      useNativeDriver: true,
      bounciness: 1,
      speed: 14,
    }).start();
  };

  const closeSheet = (callback?: () => void) => {
    Animated.spring(sheetAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 16,
    }).start(() => {
      setSheetVisible(false);
      setMenuTarget(null);
      callback?.();
    });
  };

  const handleEdit = () => {
    if (!menuTarget) return;
    const id = menuTarget.id;
    closeSheet(() => router.push(`/workouts/${id}/edit`));
  };

  const handleDuplicate = async () => {
    if (!menuTarget || !user?.uid) return;
    setActionLoading(true);
    try {
      await duplicateWorkoutTemplate(user.uid, menuTarget.id);
      showToast("Workout duplicated successfully", "success");
      closeSheet();
      void loadMyWorkouts();
    } catch {
      showToast("Could not duplicate workout", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!menuTarget) return;
    const next = !menuTarget.is_active;
    setActionLoading(true);
    try {
      await updateWorkoutTemplate(menuTarget.id, { is_active: next });
      showToast(
        next ? "Workout activated" : "Workout deactivated",
        "success",
      );
      closeSheet();
      void loadMyWorkouts();
    } catch {
      showToast("Could not update workout", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = () => {
    if (!menuTarget) return;
    const name = menuTarget.name;
    const id = menuTarget.id;

    Alert.alert(
      "Delete workout?",
      `"${name}" will be permanently deleted. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              await deleteWorkoutTemplate(id);
              showToast("Workout deleted", "success");
              closeSheet();
              void loadMyWorkouts();
            } catch {
              showToast("Could not delete workout", "error");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleSaveToLibrary = async (workout: WorkoutTemplateRecord) => {
    if (!user?.uid) return;
    try {
      await duplicateWorkoutTemplate(user.uid, workout.id);
      showToast("Saved to your library!", "success");
    } catch {
      showToast("Could not save workout", "error");
    }
  };

  // ── Sheet animation values ─────────────────────────────────────────────────

  const backdropOpacity = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.55],
  });

  const sheetTranslateY = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [420, 0],
  });

  // ── Tab items ─────────────────────────────────────────────────────────────

  const tabs: { id: LibraryTab; label: string; count?: number }[] = [
    {
      id: "my",
      label: "My Workouts",
      count: myWorkouts.filter((w) => !w.is_draft).length || undefined,
    },
    { id: "discover", label: "Discover" },
    {
      id: "drafts",
      label: "Drafts",
      count: draftWorkouts.length || undefined,
    },
  ];

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderContent = () => {
    if (loading) {
      return (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator color={colors.primary} size="large" />
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-3">
            Loading workouts…
          </Text>
        </View>
      );
    }

    if (activeTab === "my") {
      return filteredMyWorkouts.length === 0 ? (
        <EmptyState
          icon={<Dumbbell size={52} color={colors.muted} />}
          title={
            filter !== "all"
              ? `No ${filter} workouts`
              : "No workouts yet"
          }
          subtitle={
            filter !== "all"
              ? "Try a different filter or create a new workout."
              : "Create your first workout template to get started."
          }
          action={
            filter === "all"
              ? {
                  label: "Create workout",
                  onPress: () => router.push("/workouts/create"),
                }
              : { label: "Show all", onPress: () => setFilter("all") }
          }
        />
      ) : (
        <FlatList
          data={filteredMyWorkouts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WorkoutCard
              workout={item}
              onPress={() => router.push(`/workouts/${item.id}`)}
              onMenuPress={() => openSheet(item)}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: 4,
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 100,
          }}
        />
      );
    }

    if (activeTab === "discover") {
      return publicWorkouts.length === 0 ? (
        <EmptyState
          icon={<Compass size={52} color={colors.muted} />}
          title="No public workouts yet"
          subtitle="Public workouts shared by the community will appear here."
        />
      ) : (
        <FlatList
          data={publicWorkouts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WorkoutCard
              workout={item}
              onPress={() => router.push(`/workouts/${item.id}`)}
              onMenuPress={() => handleSaveToLibrary(item)}
              discoverMode
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: 4,
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 100,
          }}
        />
      );
    }

    // Drafts tab
    return draftWorkouts.length === 0 ? (
      <EmptyState
        icon={<FileText size={52} color={colors.muted} />}
        title="No drafts saved"
        subtitle="Workouts you save as draft while creating will appear here."
        action={{
          label: "Create workout",
          onPress: () => router.push("/workouts/create"),
        }}
      />
    ) : (
      <FlatList
        data={draftWorkouts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <WorkoutCard
            workout={item}
            onPress={() => router.push(`/workouts/${item.id}/edit`)}
            onMenuPress={() => openSheet(item)}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 4,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 100,
        }}
      />
    );
  };

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      {/* ── Header ── */}
      <View
        className={cn(
          "border-b",
          isDark
            ? "bg-dark-surface border-dark-border"
            : "bg-light-surface border-light-border",
        )}
        style={{ paddingTop: insets.top + 4, paddingBottom: 0 }}
      >
        {/* Title row */}
        <View className="flex-row items-center justify-between px-4 pb-3">
          <Pressable
            onPress={() => router.back()}
            className="h-9 w-9 rounded-xl items-center justify-center"
            style={{
              backgroundColor: isDark
                ? "rgba(255,255,255,0.07)"
                : "rgba(0,0,0,0.05)",
            }}
          >
            <ArrowLeft size={18} color={isDark ? "#d1d5db" : "#334155"} />
          </Pressable>

          <View className="items-center">
            <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
              My Workouts
            </Text>
            {activeCount > 0 ? (
              <Text className="text-[11px] text-primary-500 font-medium -mt-0.5">
                {activeCount} active
              </Text>
            ) : null}
          </View>

          <Pressable
            onPress={() => router.push("/workouts/create")}
            className="h-9 w-9 rounded-xl items-center justify-center bg-primary-600"
          >
            <Plus size={18} color="#fff" />
          </Pressable>
        </View>

        {/* ── Tab bar ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 12,
            gap: 8,
            flexDirection: "row",
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: isActive
                    ? colors.primary
                    : isDark
                      ? "rgba(255,255,255,0.07)"
                      : "rgba(0,0,0,0.05)",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: isActive ? "#fff" : isDark ? "#9ca3af" : "#6b7280",
                  }}
                >
                  {tab.label}
                </Text>
                {tab.count !== undefined ? (
                  <View
                    style={{
                      minWidth: 20,
                      height: 20,
                      borderRadius: 10,
                      paddingHorizontal: 5,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isActive
                        ? "rgba(255,255,255,0.25)"
                        : colors.primary,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: "#fff",
                      }}
                    >
                      {tab.count}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Filter chips (My tab only) ── */}
        {activeTab === "my" ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 12,
              gap: 6,
              flexDirection: "row",
            }}
          >
            {(["all", "active", "inactive"] as MyFilter[]).map((f) => {
              const isSelected = filter === f;
              return (
                <Pressable
                  key={f}
                  onPress={() => setFilter(f)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: isSelected
                      ? colors.primary
                      : isDark
                        ? "#374151"
                        : "#e5e7eb",
                    backgroundColor: isSelected
                      ? isDark
                        ? "rgba(14,165,176,0.15)"
                        : "rgba(14,165,176,0.08)"
                      : "transparent",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "500",
                      color: isSelected
                        ? colors.primary
                        : isDark
                          ? "#9ca3af"
                          : "#6b7280",
                    }}
                  >
                    {f === "all"
                      ? "All"
                      : f === "active"
                        ? "Active"
                        : "Inactive"}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>

      {/* ── Content ── */}
      <View className="flex-1">{renderContent()}</View>

      {/* ── Action sheet ── */}
      {sheetVisible ? (
        <RNModal
          visible
          transparent
          animationType="none"
          onRequestClose={() => closeSheet()}
        >
          {/* Backdrop */}
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "#000",
              opacity: backdropOpacity,
            }}
          >
            <Pressable style={{ flex: 1 }} onPress={() => closeSheet()} />
          </Animated.View>

          {/* Sheet */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              justifyContent: "flex-end",
            }}
            pointerEvents="box-none"
          >
            <Animated.View
              style={{
                transform: [{ translateY: sheetTranslateY }],
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                overflow: "hidden",
                backgroundColor: isDark ? "#1c1f27" : "#ffffff",
                paddingBottom: insets.bottom + 8,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: isDark ? 0.4 : 0.1,
                shadowRadius: 16,
                elevation: 12,
              }}
            >
              {/* Drag handle */}
              <View className="items-center pt-3 pb-1">
                <View
                  style={{
                    width: 36,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: isDark ? "#374151" : "#d1d5db",
                  }}
                />
              </View>

              {/* Workout name */}
              <View
                className="px-5 py-3 border-b"
                style={{
                  borderBottomColor: isDark ? "#1f2937" : "#f3f4f6",
                }}
              >
                <Text
                  className="text-base font-bold text-gray-900 dark:text-gray-100"
                  numberOfLines={1}
                >
                  {menuTarget?.name}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {menuTarget?.estimated_duration_minutes} min ·{" "}
                  {menuTarget?.exercises.length} exercises
                </Text>
              </View>

              {/* Actions */}
              {[
                {
                  icon: <Edit3 size={18} color={colors.primary} />,
                  label: "Edit workout",
                  onPress: handleEdit,
                  hidden: false,
                },
                {
                  icon: <Copy size={18} color={colors.primary} />,
                  label: "Duplicate",
                  onPress: () => void handleDuplicate(),
                  hidden: false,
                },
                {
                  icon: menuTarget?.is_active ? (
                    <X size={18} color={colors.muted} />
                  ) : (
                    <Check size={18} color="#059669" />
                  ),
                  label: menuTarget?.is_active
                    ? "Deactivate"
                    : "Set as active",
                  onPress: () => void handleToggleActive(),
                  hidden: !!menuTarget?.is_draft,
                },
                {
                  icon: <Trash2 size={18} color="#ef4444" />,
                  label: "Delete workout",
                  onPress: handleDeleteConfirm,
                  destructive: true,
                  hidden: false,
                },
              ]
                .filter((a) => !a.hidden)
                .map((action, idx, arr) => (
                  <Pressable
                    key={action.label}
                    onPress={actionLoading ? undefined : action.onPress}
                    className={cn(
                      "flex-row items-center gap-4 px-5 py-4",
                      idx !== arr.length - 1
                        ? isDark
                          ? "border-b border-gray-800"
                          : "border-b border-gray-100"
                        : "",
                    )}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: action.destructive
                          ? isDark
                            ? "rgba(239,68,68,0.15)"
                            : "rgba(239,68,68,0.08)"
                          : isDark
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.04)",
                      }}
                    >
                      {action.icon}
                    </View>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "500",
                        color: action.destructive
                          ? "#ef4444"
                          : isDark
                            ? "#f3f4f6"
                            : "#111827",
                      }}
                    >
                      {action.label}
                    </Text>
                    {actionLoading ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.muted}
                        style={{ marginLeft: "auto" }}
                      />
                    ) : null}
                  </Pressable>
                ))}

              {/* Cancel */}
              <Pressable
                onPress={() => closeSheet()}
                className="mx-5 mt-2 mb-1 rounded-2xl py-4 items-center"
                style={{
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)",
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: isDark ? "#9ca3af" : "#6b7280",
                  }}
                >
                  Cancel
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </RNModal>
      ) : null}
    </View>
  );
}
