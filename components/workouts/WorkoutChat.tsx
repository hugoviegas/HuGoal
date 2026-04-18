import { useEffect, useMemo, useRef } from "react";
import { Animated, FlatList, Pressable, Text, View } from "react-native";
import { Maximize2, Minimize2, Sparkles, X } from "lucide-react-native";
import { format } from "date-fns";

import {
  ChatInputBar,
  type AudioRecordedPayload,
} from "@/components/nutrition/ChatInputBar";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { TypingIndicator } from "@/components/shared/TypingIndicator";
import type { WorkoutSessionContext } from "@/lib/workouts/workout-session-context";
import type { WorkoutChatMessage } from "@/stores/workout.store";
import type { WorkoutChatAttachment } from "./WorkoutChatInputBar";

// SHARED BOTTOM BAR STYLE — sync across: home, workouts, nutrition, community

export interface WorkoutChatProps {
  messages: WorkoutChatMessage[];
  isLoading: boolean;
  onSendText: (
    text: string,
    attachments?: WorkoutChatAttachment[],
  ) => Promise<void>;
  onAudioRecorded: (payload: AudioRecordedPayload) => void;
  onImageSelected: (uri: string) => void;
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
  isFullscreen?: boolean;
  onEnterFullscreen?: () => void;
  onExitFullscreen?: () => void;
  onInputFocus?: () => void;
}

export function WorkoutChat({
  messages,
  isLoading,
  onSendText,
  onAudioRecorded,
  onImageSelected,
  sessionContext,
  expanded,
  onTogglePanel,
  panelContentOpacity,
  composerBottomOffset,
  disabled,
  disabledReason,
  isViewingToday: _isViewingToday,
  sessionTargetId: _sessionTargetId,
  startActionLabel: _startActionLabel,
  isFullscreen,
  onEnterFullscreen,
  onExitFullscreen,
  onInputFocus,
}: WorkoutChatProps) {
  const colors = useThemeStore((s) => s.colors);
  const userInitial =
    useAuthStore((s) => s.user?.displayName?.trim()?.[0])?.toUpperCase() ?? "U";

  const listRef = useRef<FlatList<WorkoutChatMessage> | null>(null);

  const loadingKey = useMemo(
    () => `typing-${messages.length}`,
    [messages.length],
  );

  useEffect(() => {
    if (!messages.length) return;
    listRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Pressable
        onPress={isFullscreen ? onExitFullscreen : onTogglePanel}
        style={{
          alignItems: "center",
          paddingTop: 6,
          paddingBottom: expanded ? 6 : 4,
        }}
        accessibilityRole="button"
        accessibilityLabel={
          isFullscreen
            ? "Exit fullscreen"
            : expanded
              ? "Collapse workout chat"
              : "Expand workout chat"
        }
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
              <Text
                style={[typography.smallMedium, { color: colors.foreground }]}
              >
                Workout Coach
              </Text>
              {sessionContext?.template_name ? (
                <Text
                  style={[
                    typography.caption,
                    { color: colors.mutedForeground },
                  ]}
                  numberOfLines={1}
                >
                  {sessionContext.template_name}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={isFullscreen ? onExitFullscreen : onEnterFullscreen}
              hitSlop={12}
              accessibilityLabel={
                isFullscreen ? "Exit fullscreen chat" : "Fullscreen chat"
              }
              style={{ padding: 4 }}
            >
              {isFullscreen ? (
                <Minimize2 size={18} color={colors.mutedForeground} />
              ) : (
                <Maximize2 size={18} color={colors.mutedForeground} />
              )}
            </Pressable>
            <Pressable
              onPress={() => {
                if (isFullscreen) {
                  onExitFullscreen?.();
                }
                onTogglePanel();
              }}
              hitSlop={12}
              accessibilityLabel="Close workout chat"
              style={{ padding: 4 }}
            >
              <X size={18} color={colors.mutedForeground} />
            </Pressable>
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
              <Text
                style={[
                  typography.small,
                  { color: colors.mutedForeground, textAlign: "center" },
                ]}
              >
                Ask me to adjust today&apos;s workout, substitute exercises, or
                create a new template.
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
              const isUser =
                item.type === "user_text" || item.type === "user_file";
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
                      <Text
                        style={[
                          typography.caption,
                          { color: colors.primaryForeground },
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

      <Animated.View style={{ paddingBottom: composerBottomOffset }}>
        <ChatInputBar
          onSendText={(text) => {
            void onSendText(text);
          }}
          onAudioRecorded={onAudioRecorded}
          onImageSelected={onImageSelected}
          disabled={disabled || !sessionContext}
          placeholder={
            disabled
              ? (disabledReason ?? (!sessionContext ? "No workout loaded" : ""))
              : "Ask your coach..."
          }
          onInputFocus={onInputFocus}
        />
      </Animated.View>
    </View>
  );
}
