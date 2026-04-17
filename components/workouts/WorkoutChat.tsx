import { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Bot, Lock, Play, Sparkles } from "lucide-react-native";
import { format } from "date-fns";

import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import type { WorkoutSessionContext } from "@/lib/workouts/workout-session-context";
import type { WorkoutChatMessage } from "@/stores/workout.store";
import {
  WorkoutChatInputBar,
  type WorkoutChatAttachment,
} from "./WorkoutChatInputBar";

// SHARED BOTTOM BAR STYLE — sync across: home, workouts, nutrition, community

export interface WorkoutChatProps {
  messages: WorkoutChatMessage[];
  isLoading: boolean;
  onSendText: (text: string, attachments?: WorkoutChatAttachment[]) => Promise<void>;
  onFileAttached?: (file: WorkoutChatAttachment) => void;
  sessionContext: WorkoutSessionContext | null;
  expanded: boolean;
  onTogglePanel: () => void;
  panelContentOpacity: Animated.AnimatedInterpolation<number>;
  composerBottomOffset: Animated.Value;
  disabled?: boolean;
  disabledReason?: string;
  isViewingToday: boolean;
  sessionTargetId: string | null;
  startActionLabel: string;
}

function TypingIndicator() {
  const colors = useThemeStore((s) => s.colors);
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ]),
      );

    const a1 = pulse(dot1, 0);
    const a2 = pulse(dot2, 150);
    const a3 = pulse(dot3, 300);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        backgroundColor: colors.background,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        alignSelf: "flex-start",
      }}
    >
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.mutedForeground,
            opacity: dot,
          }}
        />
      ))}
    </View>
  );
}

export function WorkoutChat({
  messages,
  isLoading,
  onSendText,
  onFileAttached,
  sessionContext,
  expanded,
  onTogglePanel,
  panelContentOpacity,
  composerBottomOffset,
  disabled,
  disabledReason,
  isViewingToday,
  sessionTargetId,
  startActionLabel,
}: WorkoutChatProps) {
  const router = useRouter();
  const colors = useThemeStore((s) => s.colors);
  const userInitial =
    useAuthStore((s) => s.user?.displayName?.trim()?.[0])?.toUpperCase() ?? "U";

  const listRef = useRef<FlatList<WorkoutChatMessage> | null>(null);

  useEffect(() => {
    if (!messages.length) return;
    listRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  const handleStartPress = useCallback(() => {
    if (!isViewingToday || !sessionTargetId) return;
    router.push(`/workouts/${sessionTargetId}/run`);
  }, [isViewingToday, router, sessionTargetId]);

  const canStart = isViewingToday && Boolean(sessionTargetId);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Pressable
        onPress={onTogglePanel}
        style={{
          alignItems: "center",
          paddingTop: 8,
          paddingBottom: expanded ? 6 : 0,
        }}
        accessibilityRole="button"
        accessibilityLabel={expanded ? "Collapse workout chat" : "Expand workout chat"}
      >
        <View
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.muted,
          }}
        />
      </Pressable>

      {!expanded ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: spacing.sm,
            paddingBottom: 2,
            gap: 6,
          }}
        >
          <Bot size={13} color={colors.primary} />
          <Text
            style={{ ...typography.caption, color: colors.mutedForeground }}
            numberOfLines={1}
          >
            {sessionContext?.template_name
              ? `Coach · ${sessionContext.template_name}`
              : "Workout Coach"}
          </Text>
        </View>
      ) : null}

      {expanded ? (
        <Animated.View style={{ flex: 1, opacity: panelContentOpacity }}>
          <View
            style={{
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              borderBottomWidth: 1,
              borderBottomColor: colors.cardBorder,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Sparkles size={16} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.smallMedium, { color: colors.foreground }]}>
                Workout Coach
              </Text>
              {sessionContext?.template_name ? (
                <Text
                  style={[typography.caption, { color: colors.mutedForeground }]}
                  numberOfLines={1}
                >
                  {sessionContext.template_name}
                </Text>
              ) : null}
            </View>
          </View>

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
              <Text style={[typography.small, { color: colors.mutedForeground, textAlign: "center" }]}>
                Ask me to adjust today&apos;s workout, substitute exercises, or create a new template.
              </Text>
            }
            ListFooterComponent={isLoading ? <TypingIndicator /> : null}
            renderItem={({ item }) => {
              const isUser = item.type === "user_text" || item.type === "user_file";
              const messageTime = format(new Date(item.createdAt), "HH:mm");

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
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: `${colors.primary}22`,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Sparkles size={14} color={colors.primary} />
                    </View>
                  ) : null}

                  <View
                    style={{
                      maxWidth: "84%",
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.xs,
                      borderRadius: 12,
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
                      {item.text ?? ""}
                    </Text>
                    <Text
                      style={[
                        typography.caption,
                        {
                          marginTop: 4,
                          color: isUser
                            ? `${colors.primaryForeground}b3`
                            : colors.mutedForeground,
                        },
                      ]}
                    >
                      {messageTime}
                    </Text>
                  </View>

                  {isUser ? (
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: colors.primary,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={[typography.caption, { color: colors.primaryForeground }]}>
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

      <Animated.View style={{ paddingBottom: composerBottomOffset }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
          }}
        >
          <View style={{ flex: 1 }}>
            <WorkoutChatInputBar
              onSendText={onSendText}
              onFileAttached={onFileAttached}
              disabled={disabled || !sessionContext}
              disabledReason={disabledReason ?? (!sessionContext ? "No workout loaded" : undefined)}
            />
          </View>

          <Pressable
            onPress={handleStartPress}
            disabled={!canStart}
            accessibilityRole="button"
            accessibilityLabel={canStart ? `${startActionLabel} workout` : "Workout start is only available for today"}
            style={{
              minHeight: 40,
              paddingHorizontal: 12,
              marginRight: spacing.sm,
              marginBottom: spacing.sm,
              borderRadius: 13,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 5,
              backgroundColor: canStart ? colors.primary : (colors.card),
              borderWidth: 1,
              borderColor: canStart ? colors.primary : colors.cardBorder,
              opacity: canStart ? 1 : 0.6,
            }}
          >
            {canStart ? (
              <Play size={13} color={colors.primaryForeground} />
            ) : (
              <Lock size={13} color={colors.mutedForeground} />
            )}
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: canStart ? colors.primaryForeground : colors.mutedForeground,
              }}
            >
              {canStart ? startActionLabel : "Today only"}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}
