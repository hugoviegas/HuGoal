import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Maximize2,
  Minimize2,
  Users,
  Dumbbell,
  Utensils,
  House,
  X,
  History,
  Plus,
  Cloud,
} from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { ChatInputBar } from "@/components/nutrition/ChatInputBar";
import { MessageRenderer } from "@/components/chat/MessageRenderer";
import { ChatHistoryDrawer } from "@/components/chat/ChatHistoryDrawer";
import { TypingIndicator } from "@/components/shared/TypingIndicator";
import {
  FLOATING_TAB_BAR_BOTTOM_OFFSET,
  FLOATING_TAB_BAR_MIN_HEIGHT,
} from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { sendMessage } from "@/lib/chat/chatService";
import { createNutritionLog } from "@/lib/firestore/nutrition";
import { computeMacros } from "@/lib/ai/nutritionChatAI";
import {
  createWorkoutTemplate,
  getWorkoutTemplate,
  updateWorkoutTemplate,
  type WorkoutTemplateRecord,
} from "@/lib/firestore/workouts";
import { generateId } from "@/lib/utils";
import type { NutritionItem, MealType } from "@/types";
import {
  useChatStore,
  type ChatContext,
  type ChatState,
} from "@/stores/chat.store";
import { useAuthStore } from "@/stores/auth.store";
import { useNavigationStore } from "@/stores/navigation.store";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import { useWorkoutStore } from "@/stores/workout.store";

type ContextMeta = {
  label: string;
  icon: ComponentType<{ size?: number; color?: string }>;
};

const CONTEXT_META: Record<ChatContext, ContextMeta> = {
  home: { label: "Home Coach", icon: House },
  workouts: { label: "Workouts Coach", icon: Dumbbell },
  nutrition: { label: "Nutrition Coach", icon: Utensils },
  community: { label: "Community Coach", icon: Users },
};

function resolveTargetHeight(
  panelState: ChatState,
  viewportHeight: number,
  insetsTop: number,
): number {
  if (panelState === "collapsed") {
    return 52;
  }

  if (panelState === "expanded") {
    return Math.max(320, Math.round(viewportHeight * 0.5));
  }

  if (panelState === "fullscreen") {
    return Math.max(420, viewportHeight - insetsTop - 8);
  }

  return 52;
}

function GlobalChatOverlayComponent() {
  const insets = useSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const navbarVisible = useNavigationStore((state) => state.navbarVisible);
  const showToast = useToastStore((state) => state.show);
  const userId = useAuthStore((state) => state.user?.uid);

  const chatState = useChatStore((state) => state.state);
  const activeContext = useChatStore((state) => state.activeContext);
  const history = useChatStore((state) => state.history);
  const isSyncingToCloud = useChatStore((state) => state.isSyncingToCloud);
  const initSession = useChatStore((state) => state.initSession);
  const activateSession = useChatStore((state) => state.activateSession);
  const deleteSessionById = useChatStore((state) => state.deleteSessionById);
  const startNewChat = useChatStore((state) => state.startNewChat);
  const loadMemories = useChatStore((state) => state.loadMemories);
  const refreshContextFromCloud = useChatStore(
    (state) => state.refreshContextFromCloud,
  );
  const setState = useChatStore((state) => state.setState);
  const appendMessage = useChatStore((state) => state.appendMessage);
  const upsertTextMessage = useChatStore((state) => state.upsertTextMessage);
  const updateMessageStatus = useChatStore(
    (state) => state.updateMessageStatus,
  );
  const updateReviewItem = useChatStore((state) => state.updateReviewItem);

  const [sending, setSending] = useState(false);
  const [historyDrawerVisible, setHistoryDrawerVisible] = useState(false);
  const [submittingReviewMessageId, setSubmittingReviewMessageId] = useState<
    string | null
  >(null);

  const panelHeight = useSharedValue(
    resolveTargetHeight(chatState, viewportHeight, insets.top),
  );
  const panelOpacity = useSharedValue(chatState === "hidden" ? 0 : 1);
  const panelScale = useSharedValue(chatState === "hidden" ? 0.85 : 1);
  const panelTranslateY = useSharedValue(chatState === "hidden" ? 320 : 0);
  const backdropOpacity = useSharedValue(0);
  const navTranslateY = useSharedValue(navbarVisible ? 0 : 120);

  const contextMeta = CONTEXT_META[activeContext];
  const messages = history[activeContext];

  const collapsedOrHidden = chatState === "collapsed" || chatState === "hidden";
  const isExpandedOrFullscreen =
    chatState === "expanded" || chatState === "fullscreen";
  const panelBottom =
    chatState === "fullscreen"
      ? insets.bottom + 4
      : insets.bottom +
        FLOATING_TAB_BAR_BOTTOM_OFFSET +
        FLOATING_TAB_BAR_MIN_HEIGHT +
        24;

  useEffect(() => {
    panelHeight.value = withSpring(
      resolveTargetHeight(chatState, viewportHeight, insets.top),
      {
        damping: 18,
        stiffness: 170,
        mass: 0.8,
      },
    );

    panelOpacity.value = withTiming(chatState === "hidden" ? 0 : 1, {
      duration: 250,
    });

    panelScale.value = withTiming(chatState === "hidden" ? 0.85 : 1, {
      duration: 300,
    });

    panelTranslateY.value = withSpring(chatState === "hidden" ? 320 : 0, {
      damping: 16,
      stiffness: 150,
      mass: 0.9,
    });

    backdropOpacity.value = withTiming(isExpandedOrFullscreen ? 0.5 : 0, {
      duration: 220,
    });
  }, [
    backdropOpacity,
    chatState,
    insets.top,
    isExpandedOrFullscreen,
    panelHeight,
    panelOpacity,
    panelScale,
    panelTranslateY,
    viewportHeight,
  ]);

  useEffect(() => {
    navTranslateY.value = withTiming(navbarVisible ? 0 : 120, {
      duration: 300,
    });

    if (!navbarVisible && chatState !== "hidden") {
      setState("collapsed");
    }
  }, [chatState, navTranslateY, navbarVisible, setState]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    void initSession(activeContext);
    void loadMemories();
  }, [activeContext, initSession, loadMemories, userId]);

  // REMOVED: Auto-expansion on keyboard show was causing unwanted drawer opens.
  // The input focus handler in ChatInputBar now handles expansion when needed.

  const animatedPanelStyle = useAnimatedStyle(() => ({
    height: panelHeight.value,
    opacity: panelOpacity.value,
    transform: [
      { translateY: panelTranslateY.value + navTranslateY.value },
      { scale: panelScale.value },
    ],
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const containerPointerEvents =
    chatState === "hidden" || !navbarVisible ? "none" : "box-none";
  const ContextIcon = contextMeta.icon;

  const resolveMealType = (): MealType => {
    const hour = new Date().getHours();
    if (hour < 11) return "breakfast";
    if (hour < 15) return "lunch";
    if (hour < 18) return "snack";
    return "dinner";
  };

  const appendAssistantText = useCallback(
    (text: string) => {
      appendMessage(activeContext, {
        id: generateId(),
        role: "assistant",
        type: "text",
        text,
        createdAt: new Date().toISOString(),
      });
    },
    [activeContext, appendMessage],
  );

  const handleStartNewChat = useCallback(async () => {
    try {
      await startNewChat(activeContext);
      setHistoryDrawerVisible(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not start a new chat";
      showToast(message, "error");
    }
  }, [activeContext, showToast, startNewChat]);

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      try {
        await deleteSessionById(activeContext, sessionId);
        await refreshContextFromCloud(activeContext);
        showToast("Chat deleted", "success");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not delete chat";
        showToast(message, "error");
        throw error;
      }
    },
    [activeContext, deleteSessionById, refreshContextFromCloud, showToast],
  );

  const handleUpdateNutritionReviewItem = useCallback(
    (
      messageId: string,
      itemId: string,
      patch: Partial<import("@/lib/ai/nutritionChatAI").NutritionReviewItem>,
    ) => {
      updateReviewItem(activeContext, messageId, itemId, patch);
    },
    [activeContext, updateReviewItem],
  );

  const handleCancelNutritionReview = useCallback(
    (messageId: string) => {
      updateMessageStatus(activeContext, messageId, "cancelled");
    },
    [activeContext, updateMessageStatus],
  );

  const handleConfirmNutritionReview = useCallback(
    async (messageId: string) => {
      if (!userId) {
        throw new Error("Missing user session");
      }

      const currentMessage = history[activeContext].find(
        (message) =>
          message.id === messageId && message.type === "nutrition_review",
      );

      if (!currentMessage || currentMessage.type !== "nutrition_review") {
        throw new Error("Nutrition review message not found");
      }

      setSubmittingReviewMessageId(messageId);
      try {
        const items = currentMessage.items.map((item) => {
          const selectedCandidate =
            item.candidates[item.selectedCandidateIndex] ?? item.candidates[0];
          const macros = computeMacros(
            selectedCandidate.per100g,
            item.weight_g,
          );

          return {
            food_name: selectedCandidate.name,
            serving_size_g: Math.max(1, item.weight_g),
            calories: macros.calories,
            protein_g: macros.protein_g,
            carbs_g: macros.carbs_g,
            fat_g: macros.fat_g,
            source: "ai_generated",
            notes: `${selectedCandidate.name} (${item.weight_g}g)`,
          } satisfies NutritionItem;
        });

        await createNutritionLog(userId, {
          meal_type: resolveMealType(),
          items,
          notes: "Saved from nutrition review chat",
        });

        updateMessageStatus(activeContext, messageId, "confirmed");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to save nutrition review";
        showToast(message, "error");
      } finally {
        setSubmittingReviewMessageId(null);
      }
    },
    [activeContext, history, showToast, updateMessageStatus, userId],
  );

  const sendTextMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();

      if (!trimmed || sending) {
        return;
      }

      const userMessage = {
        id: generateId(),
        role: "user" as const,
        type: "text" as const,
        text: trimmed,
        createdAt: new Date().toISOString(),
      };

      appendMessage(activeContext, userMessage);
      setSending(true);

      try {
        const contextHistory = [...messages, userMessage];
        const streamingMessageId = generateId();
        let streamedText = "";
        const response = await sendMessage(
          activeContext,
          trimmed,
          contextHistory,
          {
            userId,
            enableStreaming: true,
            onAssistantToken: (token) => {
              streamedText += token;
              upsertTextMessage(
                activeContext,
                streamingMessageId,
                "assistant",
                streamedText,
              );
            },
          },
        );

        if (response.kind === "text") {
          if (streamedText.trim().length > 0) {
            upsertTextMessage(
              activeContext,
              streamingMessageId,
              "assistant",
              response.text,
            );
            return;
          }
          appendAssistantText(response.text);
          return;
        }

        if (response.kind === "nutrition_review") {
          appendMessage(activeContext, {
            id: generateId(),
            role: "assistant",
            type: "nutrition_review",
            status: "pending",
            items: response.items,
            createdAt: new Date().toISOString(),
          });
          return;
        }

        if (response.kind === "workout") {
          let template: WorkoutTemplateRecord | null = null;
          const workoutStore = useWorkoutStore.getState();

          if (response.action === "create_workout" && response.newTemplate) {
            if (!userId) {
              throw new Error("Missing user session");
            }

            template = await createWorkoutTemplate(userId, {
              name: response.newTemplate.name ?? "New Workout",
              description: response.newTemplate.description,
              cover_image_url: response.newTemplate.cover_image_url,
              difficulty: response.newTemplate.difficulty ?? "intermediate",
              is_ai_generated: true,
              source_prompt: response.newTemplate.source_prompt,
              exercises: response.newTemplate.exercises ?? [],
              sections: response.newTemplate.sections,
              target_muscles: response.newTemplate.target_muscles,
              is_active: true,
              is_public: false,
              is_draft: false,
              location: response.newTemplate.location,
              estimated_duration_minutes:
                response.newTemplate.estimated_duration_minutes ?? 45,
              tags: response.newTemplate.tags ?? [],
            });
          }

          if (response.action === "patch_workout" && response.patch) {
            const templateId =
              workoutStore.todayWorkout?.id ?? workoutStore.templateId;
            if (!templateId) {
              throw new Error("No workout template available to patch");
            }

            await updateWorkoutTemplate(templateId, response.patch);
            template = await getWorkoutTemplate(templateId);
          }

          if (!template) {
            appendAssistantText(response.text);
            return;
          }

          useWorkoutStore.getState().setTodayWorkout(template);
          appendMessage(activeContext, {
            id: generateId(),
            role: "assistant",
            type: "workout_card",
            payload: template,
            createdAt: new Date().toISOString(),
          });
          if (response.text) {
            appendAssistantText(response.text);
          }
          return;
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Could not send message";
        appendAssistantText(message);
        showToast(message, "error");
      } finally {
        setSending(false);
      }
    },
    [
      activeContext,
      appendAssistantText,
      appendMessage,
      messages,
      sending,
      showToast,
      upsertTextMessage,
      userId,
    ],
  );

  const emptyStateText = useMemo(() => {
    if (activeContext === "workouts") {
      return "Ask for workout adjustments or a new training idea.";
    }

    if (activeContext === "nutrition") {
      return "Describe your meal and I will estimate calories and macros.";
    }

    if (activeContext === "community") {
      return "Ask for social motivation and coaching tips.";
    }

    return "Ask anything about workouts, nutrition, and routine.";
  }, [activeContext]);

  return (
    <View
      pointerEvents={containerPointerEvents}
      style={{ position: "absolute", inset: 0, zIndex: 40 }}
    >
      <Animated.View
        pointerEvents={isExpandedOrFullscreen ? "auto" : "none"}
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#000",
          },
          animatedBackdropStyle,
        ]}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={() => setState("collapsed")}
          accessibilityRole="button"
          accessibilityLabel="Minimize chat"
        />
      </Animated.View>

      <Animated.View
        style={[
          {
            position: "absolute",
            left: 12,
            right: 12,
            bottom: panelBottom,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            backgroundColor:
              Platform.OS === "android" ? colors.card : colors.surface,
            overflow: "hidden",
            elevation: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: isDark ? 0.34 : 0.16,
            shadowRadius: 18,
          },
          animatedPanelStyle,
        ]}
      >
        <Pressable
          disabled={chatState !== "collapsed"}
          onPress={() => {
            if (chatState === "collapsed") {
              setState("expanded");
            }
          }}
          style={{
            minHeight: 52,
            paddingHorizontal: spacing.sm,
            borderBottomWidth: collapsedOrHidden ? 0 : 1,
            borderBottomColor: colors.cardBorder,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: `${colors.primary}22`,
            }}
          >
            <ContextIcon size={14} color={colors.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={[typography.smallMedium, { color: colors.foreground }]}
            >
              {contextMeta.label}
            </Text>
            <Text
              style={[typography.caption, { color: colors.mutedForeground }]}
            >
              {messages.length} messages
            </Text>
          </View>

          {isSyncingToCloud ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                marginRight: 6,
              }}
            >
              <Cloud size={14} color={colors.primary} />
              <Text
                style={[
                  typography.caption,
                  { color: colors.primary, fontSize: 11 },
                ]}
              >
                syncing
              </Text>
            </View>
          ) : null}

          {chatState === "collapsed" ? (
            <Pressable
              onPress={() => setState("hidden")}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Hide chat"
              style={{ padding: 4 }}
            >
              <X size={18} color={colors.mutedForeground} />
            </Pressable>
          ) : (
            <>
              <Pressable
                onPress={() => setHistoryDrawerVisible((value) => !value)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Open chat history"
                style={{ padding: 4 }}
              >
                <History size={18} color={colors.mutedForeground} />
              </Pressable>

              <Pressable
                onPress={handleStartNewChat}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Start new chat"
                style={{ padding: 4 }}
              >
                <Plus size={18} color={colors.mutedForeground} />
              </Pressable>

              <Pressable
                onPress={() => setState("collapsed")}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Minimize chat"
                style={{
                  width: 26,
                  height: 26,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    width: 16,
                    height: 2,
                    borderRadius: 1,
                    backgroundColor: colors.mutedForeground,
                  }}
                />
              </Pressable>

              <Pressable
                onPress={() =>
                  setState(
                    chatState === "fullscreen" ? "expanded" : "fullscreen",
                  )
                }
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={
                  chatState === "fullscreen"
                    ? "Exit fullscreen chat"
                    : "Fullscreen chat"
                }
                style={{ padding: 4 }}
              >
                {chatState === "fullscreen" ? (
                  <Minimize2 size={18} color={colors.mutedForeground} />
                ) : (
                  <Maximize2 size={18} color={colors.mutedForeground} />
                )}
              </Pressable>

              <Pressable
                onPress={() => setState("hidden")}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Hide chat"
                style={{ padding: 4 }}
              >
                <X size={18} color={colors.mutedForeground} />
              </Pressable>
            </>
          )}
        </Pressable>

        {chatState !== "collapsed" && chatState !== "hidden" ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={
              Platform.OS === "ios" ? insets.bottom + 100 : 0
            }
            style={{ flex: 1 }}
          >
            <FlatList
              data={messages}
              keyExtractor={(item) => item.id}
              removeClippedSubviews={Platform.OS === "android"}
              maxToRenderPerBatch={10}
              windowSize={5}
              initialNumToRender={8}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                gap: spacing.xs,
                paddingHorizontal: spacing.sm,
                paddingTop: spacing.sm,
                paddingBottom: spacing.xs,
                flexGrow: 1,
                justifyContent: messages.length > 0 ? "flex-start" : "center",
              }}
              ListEmptyComponent={
                <Text
                  style={[
                    typography.small,
                    { color: colors.mutedForeground, textAlign: "center" },
                  ]}
                >
                  {emptyStateText}
                </Text>
              }
              ListFooterComponent={
                sending ? (
                  <View style={{ marginTop: spacing.xs }}>
                    <TypingIndicator />
                  </View>
                ) : null
              }
              renderItem={({ item }) => (
                <MessageRenderer
                  message={item}
                  onConfirmNutritionReview={handleConfirmNutritionReview}
                  onCancelNutritionReview={handleCancelNutritionReview}
                  onUpdateNutritionReviewItem={handleUpdateNutritionReviewItem}
                  isReviewSubmitting={submittingReviewMessageId === item.id}
                />
              )}
            />

            <View style={{ paddingBottom: insets.bottom + 8 }}>
              <ChatInputBar
                onSendText={(text) => {
                  void sendTextMessage(text);
                }}
                onAudioRecorded={() => {}}
                onImageSelected={() => {}}
                onInputFocus={() => {
                  setState("expanded");
                }}
                disabled={sending}
                placeholder="Message your coach"
              />
            </View>
          </KeyboardAvoidingView>
        ) : null}
      </Animated.View>

      <ChatHistoryDrawer
        visible={historyDrawerVisible}
        uid={userId}
        context={activeContext}
        onClose={() => setHistoryDrawerVisible(false)}
        onLoadSession={async (sessionId) => {
          await activateSession(activeContext, sessionId);
        }}
        onNewChat={handleStartNewChat}
        onDeleteSession={handleDeleteSession}
        onRefreshContext={async () => {
          await refreshContextFromCloud(activeContext);
        }}
      />
    </View>
  );
}

export const GlobalChatOverlay = memo(GlobalChatOverlayComponent);
GlobalChatOverlay.displayName = "GlobalChatOverlay";

export default GlobalChatOverlay;
