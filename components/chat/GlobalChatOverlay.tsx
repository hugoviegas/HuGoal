import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  FlatList,
  Keyboard,
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
} from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { ChatInputBar } from "@/components/nutrition/ChatInputBar";
import { TypingIndicator } from "@/components/shared/TypingIndicator";
import {
  FLOATING_TAB_BAR_BOTTOM_OFFSET,
  FLOATING_TAB_BAR_MIN_HEIGHT,
} from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { sendMessage } from "@/lib/chat/chatService";
import { generateId } from "@/lib/utils";
import {
  useChatStore,
  type ChatContext,
  type ChatState,
} from "@/stores/chat.store";
import { useNavigationStore } from "@/stores/navigation.store";
import { useThemeStore } from "@/stores/theme.store";

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

export function GlobalChatOverlay() {
  const insets = useSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const navbarVisible = useNavigationStore((state) => state.navbarVisible);

  const chatState = useChatStore((state) => state.state);
  const activeContext = useChatStore((state) => state.activeContext);
  const history = useChatStore((state) => state.history);
  const setState = useChatStore((state) => state.setState);
  const appendMessage = useChatStore((state) => state.appendMessage);

  const [sending, setSending] = useState(false);

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
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const subscription = Keyboard.addListener(showEvent, () => {
      if (chatState === "hidden" || chatState === "collapsed") {
        setState("expanded");
      }
    });

    return () => {
      subscription.remove();
    };
  }, [chatState, setState]);

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

  const sendTextMessage = async (text: string) => {
    const trimmed = text.trim();

    if (!trimmed || sending) {
      return;
    }

    const userMessage = {
      id: generateId(),
      role: "user" as const,
      text: trimmed,
      createdAt: new Date().toISOString(),
    };

    appendMessage(activeContext, userMessage);
    setSending(true);

    try {
      const contextHistory = [...messages, userMessage];
      const response = await sendMessage(
        activeContext,
        trimmed,
        contextHistory,
      );

      appendMessage(activeContext, {
        id: generateId(),
        role: "assistant",
        text: response.text,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not send message";
      appendMessage(activeContext, {
        id: generateId(),
        role: "assistant",
        text: message,
        createdAt: new Date().toISOString(),
      });
    } finally {
      setSending(false);
    }
  };

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

          {chatState === "collapsed" ? (
            <Pressable
              onPress={() => setState("expanded")}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Expand chat"
              style={{ padding: 4 }}
            >
              <Maximize2 size={18} color={colors.mutedForeground} />
            </Pressable>
          ) : (
            <>
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
          <View style={{ flex: 1 }}>
            <FlatList
              data={messages}
              keyExtractor={(item) => item.id}
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
              renderItem={({ item }) => {
                const isUser = item.role === "user";

                return (
                  <View
                    style={{
                      maxWidth: "88%",
                      alignSelf: isUser ? "flex-end" : "flex-start",
                      borderRadius: 12,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.xs,
                      borderWidth: 1,
                      borderColor: isUser ? colors.primary : colors.cardBorder,
                      backgroundColor: isUser
                        ? colors.primary
                        : colors.background,
                    }}
                  >
                    <Text
                      style={{
                        ...typography.small,
                        color: isUser
                          ? colors.primaryForeground
                          : colors.foreground,
                      }}
                    >
                      {item.text}
                    </Text>
                  </View>
                );
              }}
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
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

export default GlobalChatOverlay;
