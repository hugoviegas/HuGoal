import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWindowDimensions } from "react-native";
import { Maximize2, Minimize2, Send, Sparkles, X } from "lucide-react-native";
import { format } from "date-fns";

import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { radius } from "@/constants/radius";
import {
  FLOATING_TAB_BAR_CLEARANCE,
} from "@/constants/layout";
import { useAuthStore } from "@/stores/auth.store";
import { useNavigationStore } from "@/stores/navigation.store";
import { useThemeStore } from "@/stores/theme.store";
import { TypingIndicator } from "@/components/shared/TypingIndicator";
import { sendHomeChatMessage, type HomeChatHistoryItem } from "@/lib/ai/homeChatAI";
import {
  getHomeChatUsed,
  getRemainingMessages,
  HOME_COACH_DAILY_LIMIT,
  incrementHomeChatUsed,
} from "@/lib/home-coach-limit";
import { getResolvedApiKey } from "@/lib/api-key-store";

interface HomeChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
}

interface HomeCoachProps {
  isFullscreen?: boolean;
  onEnterFullscreen?: () => void;
  onExitFullscreen?: () => void;
}

// SHARED BOTTOM BAR STYLE — sync across: home, workouts, nutrition, community
export function HomeCoach({
  isFullscreen,
  onEnterFullscreen,
  onExitFullscreen,
}: HomeCoachProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const colors = useThemeStore((s) => s.colors);
  const isDark = useThemeStore((s) => s.isDark);
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const setNavbarVisible = useNavigationStore((s) => s.setNavbarVisible);

  // Match the same height formula as useWorkoutChatPanel / useNutritionChatPanel.
  // COLLAPSED_H must clear the floating tab bar so the input bar is visible.
  const COLLAPSED_H = insets.bottom + FLOATING_TAB_BAR_CLEARANCE + 60;
  const EXPAND_CONTENT_H = Math.min(440, Math.max(320, windowHeight * 0.5));
  const EXPANDED_H = COLLAPSED_H + EXPAND_CONTENT_H;

  // composerBottomPad starts above the floating tab bar clearance so
  // the input row appears above the tab bar pill in collapsed state.
  const COMPOSER_BASE_PAD = insets.bottom + FLOATING_TAB_BAR_CLEARANCE;

  const panelHeight = useRef(new Animated.Value(COLLAPSED_H)).current;
  const composerBottomPad = useRef(new Animated.Value(COMPOSER_BASE_PAD)).current;
  const [panelExpanded, setPanelExpanded] = useState(false);
  const panelExpandedRef = useRef(false);

  const [messages, setMessages] = useState<HomeChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [usedToday, setUsedToday] = useState(0);
  const [hasProvider, setHasProvider] = useState(true);
  const listRef = useRef<FlatList<HomeChatMessage>>(null);

  const remaining = getRemainingMessages(usedToday);
  const canSend = remaining > 0 && !isLoading && input.trim().length > 0 && hasProvider;
  const userInitial = user?.displayName?.trim()?.[0]?.toUpperCase() ?? "U";

  useEffect(() => {
    if (!user?.uid) return;
    getHomeChatUsed(user.uid).then(setUsedToday);
  }, [user?.uid]);

  useEffect(() => {
    getResolvedApiKey("gemini")
      .then((r) => setHasProvider(!!r.key))
      .catch(() => setHasProvider(false));
  }, []);

  // Hide tab bar and fill screen height when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      setNavbarVisible(false);
      panelHeight.setValue(windowHeight);
      composerBottomPad.setValue(insets.bottom + 8);
      panelExpandedRef.current = true;
      setPanelExpanded(true);
      return () => {
        setNavbarVisible(true);
        panelHeight.setValue(COLLAPSED_H);
        composerBottomPad.setValue(COMPOSER_BASE_PAD);
        panelExpandedRef.current = false;
        setPanelExpanded(false);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullscreen]);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        const kh = e.endCoordinates?.height ?? 0;
        Animated.timing(composerBottomPad, {
          toValue: kh + 8,
          duration: Platform.OS === "ios" ? (e.duration ?? 250) : 220,
          useNativeDriver: false,
        }).start();
        if (!panelExpandedRef.current) openPanel();
      },
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        Animated.timing(composerBottomPad, {
          toValue: COMPOSER_BASE_PAD,
          duration: 200,
          useNativeDriver: false,
        }).start();
      },
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, [COMPOSER_BASE_PAD, composerBottomPad]);

  const openPanel = useCallback(() => {
    panelExpandedRef.current = true;
    setPanelExpanded(true);
    Animated.spring(panelHeight, {
      toValue: EXPANDED_H,
      useNativeDriver: false,
      bounciness: 4,
      speed: 12,
    }).start();
  }, [EXPANDED_H, panelHeight]);

  const closePanel = useCallback(() => {
    panelExpandedRef.current = false;
    setPanelExpanded(false);
    Keyboard.dismiss();
    Animated.spring(panelHeight, {
      toValue: COLLAPSED_H,
      useNativeDriver: false,
      bounciness: 4,
      speed: 12,
    }).start();
  }, [COLLAPSED_H, panelHeight]);

  const togglePanel = useCallback(() => {
    if (panelExpandedRef.current) closePanel();
    else openPanel();
  }, [openPanel, closePanel]);

  const panelContentOpacity = panelHeight.interpolate({
    inputRange: [COLLAPSED_H, COLLAPSED_H + EXPAND_CONTENT_H * 0.4, EXPANDED_H],
    outputRange: [0, 0, 1],
    extrapolate: "clamp",
  });

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || !canSend || !user?.uid) return;

    const userMsg: HomeChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const used = await incrementHomeChatUsed(user.uid);
    setUsedToday(used);

    const history: HomeChatHistoryItem[] = messages.map((m) => ({
      role: m.role,
      text: m.text,
    }));

    try {
      const reply = await sendHomeChatMessage({
        preferredProvider: profile?.preferred_ai_provider ?? "gemini",
        userMessage: text,
        profile,
        history,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "assistant",
          text: reply,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          text: "Sorry, could not process that. Check your AI provider in Settings.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, canSend, user?.uid, messages, profile]);

  const loadingKey = useMemo(() => `typing-${messages.length}`, [messages.length]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: panelHeight,
        backgroundColor: colors.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderTopWidth: 1,
        borderTopColor: colors.cardBorder,
        overflow: "hidden",
        // Android elevation so the panel renders above the floating tab bar
        elevation: 10,
        // iOS shadow for the top edge
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: isDark ? 0.3 : 0.07,
        shadowRadius: 8,
      }}
    >
      {/* Drag handle / header row */}
      <Pressable
        onPress={isFullscreen ? onExitFullscreen : togglePanel}
        style={{
          alignItems: "center",
          paddingTop: 8,
          paddingBottom: 4,
        }}
        accessibilityRole="button"
        accessibilityLabel={
          isFullscreen
            ? "Exit fullscreen coach"
            : panelExpanded
            ? "Collapse coach"
            : "Expand coach"
        }
      >
        <View
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.muted,
          }}
        />
      </Pressable>

      {/* Expanded header */}
      {panelExpanded ? (
        <Animated.View style={{ opacity: panelContentOpacity }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: spacing.md,
              paddingBottom: spacing.xs,
              gap: spacing.xs,
              borderBottomWidth: 1,
              borderBottomColor: colors.cardBorder,
            }}
          >
            <Sparkles size={15} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.smallMedium, { color: colors.foreground }]}>
                Coach
              </Text>
              <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                {remaining}/{HOME_COACH_DAILY_LIMIT} messages today
              </Text>
            </View>
            <Pressable
              onPress={isFullscreen ? onExitFullscreen : onEnterFullscreen}
              hitSlop={12}
              style={{ padding: 4 }}
              accessibilityLabel={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 size={17} color={colors.mutedForeground} />
              ) : (
                <Maximize2 size={17} color={colors.mutedForeground} />
              )}
            </Pressable>
            <Pressable
              onPress={closePanel}
              hitSlop={12}
              style={{ padding: 4 }}
              accessibilityLabel="Close coach"
            >
              <X size={17} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </Animated.View>
      ) : null}

      {/* Messages list */}
      {panelExpanded ? (
        <Animated.View style={{ flex: 1, opacity: panelContentOpacity }}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: spacing.sm,
              paddingTop: spacing.sm,
              paddingBottom: spacing.xs,
              gap: spacing.xs,
              flexGrow: 1,
              justifyContent: messages.length === 0 ? "center" : "flex-start",
            }}
            ListEmptyComponent={
              <Text
                style={[
                  typography.small,
                  { color: colors.mutedForeground, textAlign: "center" },
                ]}
              >
                {hasProvider
                  ? "Ask me about workouts, nutrition, or your goals."
                  : "Set up an AI provider key in Settings to enable the coach."}
              </Text>
            }
            ListFooterComponent={
              isLoading ? (
                <View key={loadingKey} style={{ marginTop: spacing.xs }}>
                  <TypingIndicator />
                </View>
              ) : null
            }
            renderItem={({ item }) => {
              const isUser = item.role === "user";
              return (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-end",
                    alignSelf: isUser ? "flex-end" : "flex-start",
                    gap: spacing.xs,
                    maxWidth: "94%",
                  }}
                >
                  {!isUser ? (
                    <View
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        backgroundColor: `${colors.primary}22`,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Sparkles size={13} color={colors.primary} />
                    </View>
                  ) : null}

                  <View
                    style={{
                      maxWidth: "84%",
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.xs,
                      borderRadius: radius.lg,
                      borderWidth: 1,
                      borderColor: isUser ? colors.primary : colors.cardBorder,
                      backgroundColor: isUser ? colors.primary : colors.background,
                    }}
                  >
                    <Text
                      style={{
                        ...typography.small,
                        color: isUser ? colors.primaryForeground : colors.foreground,
                      }}
                    >
                      {item.text}
                    </Text>
                    <Text
                      style={[
                        typography.caption,
                        {
                          marginTop: 2,
                          color: isUser
                            ? `${colors.primaryForeground}b3`
                            : colors.mutedForeground,
                        },
                      ]}
                    >
                      {format(new Date(item.createdAt), "HH:mm")}
                    </Text>
                  </View>

                  {isUser ? (
                    <View
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        backgroundColor: colors.primary,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={[
                          typography.caption,
                          { color: colors.primaryForeground, fontWeight: "700" },
                        ]}
                      >
                        {userInitial}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            }}
          />
        </Animated.View>
      ) : null}

      {/* Composer — paddingBottom lifts the input above the floating tab bar */}
      <Animated.View style={{ paddingBottom: composerBottomPad }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.xs,
            paddingHorizontal: spacing.sm,
            paddingTop: spacing.xs,
          }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={
              remaining === 0
                ? "Daily limit reached"
                : !hasProvider
                ? "No AI provider configured"
                : "Ask your coach..."
            }
            placeholderTextColor={colors.mutedForeground}
            editable={remaining > 0 && hasProvider}
            onFocus={() => {
              if (!panelExpandedRef.current) openPanel();
            }}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            style={{
              flex: 1,
              height: 40,
              borderRadius: radius.lg,
              paddingHorizontal: spacing.sm,
              backgroundColor: colors.surface,
              color: colors.foreground,
              fontSize: 14,
              borderWidth: 1,
              borderColor: colors.cardBorder,
            }}
            accessibilityLabel="Coach message input"
          />
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.lg,
              backgroundColor: canSend ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor: canSend ? colors.primary : colors.cardBorder,
              alignItems: "center",
              justifyContent: "center",
              opacity: canSend ? 1 : 0.5,
            }}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <Send
              size={16}
              color={canSend ? colors.primaryForeground : colors.mutedForeground}
            />
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}
