import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  Keyboard,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Sparkles, Mic } from "lucide-react-native";
import { format } from "date-fns";

import { ChatInputBar } from "@/components/nutrition/ChatInputBar";
import type { AudioRecordedPayload } from "@/components/nutrition/ChatInputBar";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import type { NutritionChatItem } from "@/lib/ai/nutritionChatAI";
import type { ChatMessage } from "@/stores/nutrition.store";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";

interface NutritionChatProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendText: (text: string) => void;
  onAudioRecorded: (payload: AudioRecordedPayload) => void;
  onImageSelected: (uri: string) => void;
  pendingItems: NutritionChatItem[];
  onChangePendingItem: (
    index: number,
    patch: Partial<NutritionChatItem>,
  ) => void;
  onSaveAll: () => void;
  savingAll: boolean;
  disabled?: boolean;
  disabledReason?: string;
  editableTranscript?: {
    messageId: string;
    value: string;
  } | null;
  onChangeEditableTranscript?: (value: string) => void;
  onSubmitEditableTranscript?: () => void | Promise<void>;
  submittingTranscript?: boolean;
  expanded: boolean;
  onTogglePanel: () => void;
  panelContentOpacity: Animated.AnimatedInterpolation<number>;
  composerBottomOffset: Animated.Value;
}

interface UseNutritionChatPanelParams {
  insetsBottom: number;
  windowHeight: number;
}

interface UseNutritionChatPanelResult {
  COLLAPSED_H: number;
  EXPANDED_H: number;
  panelHeight: Animated.Value;
  keyboardOffset: Animated.Value;
  composerBottomPadding: Animated.Value;
  panelExpanded: boolean;
  backdropOpacity: Animated.AnimatedInterpolation<number>;
  panelContentOpacity: Animated.AnimatedInterpolation<number>;
  panelPanHandlers: ReturnType<typeof PanResponder.create>["panHandlers"];
  openPanel: () => void;
  closePanel: () => void;
}

export function useNutritionChatPanel({
  insetsBottom,
  windowHeight,
}: UseNutritionChatPanelParams): UseNutritionChatPanelResult {
  const COLLAPSED_H = insetsBottom + 160;
  const EXPAND_CONTENT_H = Math.min(420, Math.max(300, windowHeight * 0.48));
  const EXPANDED_H = COLLAPSED_H + EXPAND_CONTENT_H;

  const panelHeight = useRef(new Animated.Value(COLLAPSED_H)).current;
  const keyboardOffset = useRef(new Animated.Value(0)).current;
  const composerBottomPadding = useRef(new Animated.Value(80)).current;
  const [panelExpanded, setPanelExpanded] = useState(false);
  const panelExpandedRef = useRef(false);
  const panelBaseHRef = useRef(COLLAPSED_H);

  useEffect(() => {
    const nextHeight = panelExpandedRef.current ? EXPANDED_H : COLLAPSED_H;
    panelHeight.setValue(nextHeight);
  }, [COLLAPSED_H, EXPANDED_H, panelHeight]);

  // Listen to keyboard show/hide events
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        const keyboardHeight = event.endCoordinates?.height ?? 0;
        const nextOffset = Math.max(0, keyboardHeight - insetsBottom);

        Animated.timing(keyboardOffset, {
          toValue: nextOffset,
          duration: Platform.OS === "ios" ? (event.duration ?? 250) : 220,
          useNativeDriver: false,
        }).start();

        // Reduce composer bottom padding when keyboard opens
        Animated.timing(composerBottomPadding, {
          toValue: insetsBottom + 10,
          duration: Platform.OS === "ios" ? (event.duration ?? 250) : 220,
          useNativeDriver: false,
        }).start();

        // Open panel when keyboard shows (if not already expanded)
        if (!panelExpandedRef.current) {
          panelExpandedRef.current = true;
          setPanelExpanded(true);
          Animated.spring(panelHeight, {
            toValue: EXPANDED_H,
            useNativeDriver: false,
            bounciness: 4,
            speed: 12,
          }).start();
        }
      },
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        Animated.timing(keyboardOffset, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start();

        // Restore original composer bottom padding when keyboard closes
        Animated.timing(composerBottomPadding, {
          toValue: 80,
          duration: 200,
          useNativeDriver: false,
        }).start();
      },
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [EXPANDED_H, insetsBottom, composerBottomPadding, keyboardOffset, panelHeight]);

  const backdropOpacity = panelHeight.interpolate({
    inputRange: [COLLAPSED_H, EXPANDED_H],
    outputRange: [0, 0.5],
    extrapolate: "clamp",
  });

  const panelContentOpacity = panelHeight.interpolate({
    inputRange: [
      COLLAPSED_H,
      COLLAPSED_H + EXPAND_CONTENT_H * 0.25,
      COLLAPSED_H + EXPAND_CONTENT_H * 0.65,
    ],
    outputRange: [0, 0, 1],
    extrapolate: "clamp",
  });

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
    Animated.spring(panelHeight, {
      toValue: COLLAPSED_H,
      useNativeDriver: false,
      bounciness: 4,
      speed: 12,
    }).start();
  }, [COLLAPSED_H, panelHeight]);

  const panelPanResponder = useMemo(() => {
    const CH = COLLAPSED_H;
    const EH = EXPANDED_H;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderGrant: () => {
        panelBaseHRef.current = panelExpandedRef.current ? EH : CH;
      },
      onPanResponderMove: (_, g) => {
        const newH = Math.max(CH, Math.min(EH, panelBaseHRef.current - g.dy));
        panelHeight.setValue(newH);
      },
      onPanResponderRelease: (_, g) => {
        const THRESHOLD = (EH - CH) * 0.3;
        let willExpand: boolean;

        if (panelExpandedRef.current) {
          willExpand = g.dy < THRESHOLD;
          if (g.vy > 0.5) {
            willExpand = false;
          }
        } else {
          willExpand = -g.dy > THRESHOLD;
          if (g.vy < -0.5) {
            willExpand = true;
          }
        }

        panelExpandedRef.current = willExpand;
        setPanelExpanded(willExpand);
        Animated.spring(panelHeight, {
          toValue: willExpand ? EH : CH,
          useNativeDriver: false,
          bounciness: 4,
          speed: 12,
        }).start();
      },
    });
  }, [COLLAPSED_H, EXPANDED_H, panelHeight]);

  return {
    COLLAPSED_H,
    EXPANDED_H,
    panelHeight,
    keyboardOffset,
    composerBottomPadding,
    panelExpanded,
    backdropOpacity,
    panelContentOpacity,
    panelPanHandlers: panelPanResponder.panHandlers,
    openPanel,
    closePanel,
  };
}

// MODIFIED: AI typing indicator for loading state.
function TypingIndicator() {
  const colors = useThemeStore((s) => s.colors);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dotAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    const loops = dotAnims.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 150),
          Animated.timing(anim, {
            toValue: -6,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ),
    );

    loops.forEach((loop) => loop.start());

    return () => {
      loops.forEach((loop) => loop.stop());
    };
  }, [dotAnims, fadeAnim]);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        flexDirection: "row",
        alignItems: "flex-end",
        gap: spacing.xs,
      }}
    >
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

      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 18,
          borderBottomLeftRadius: 4,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
        }}
      >
        {dotAnims.map((anim, idx) => (
          <Animated.View
            key={`typing-dot-${idx}`}
            style={{
              width: 7,
              height: 7,
              borderRadius: 3.5,
              backgroundColor: colors.mutedForeground,
              transform: [{ translateY: anim }],
            }}
          />
        ))}
      </View>
    </Animated.View>
  );
}

function toNumber(value: string, fallback: number): number {
  const parsed = Number(value.replace(",", "."));
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }
  return fallback;
}

function isUserMessage(type: ChatMessage["type"]): boolean {
  return (
    type === "user_text" ||
    type === "user_audio_transcript" ||
    type === "user_image"
  );
}

export function NutritionChat({
  messages,
  isLoading,
  onSendText,
  onAudioRecorded,
  onImageSelected,
  pendingItems,
  onChangePendingItem,
  onSaveAll,
  savingAll,
  disabled = false,
  disabledReason,
  editableTranscript,
  onChangeEditableTranscript,
  onSubmitEditableTranscript,
  submittingTranscript = false,
  expanded,
  onTogglePanel,
  panelContentOpacity,
  composerBottomOffset,
}: NutritionChatProps) {
  const colors = useThemeStore((s) => s.colors);
  const userInitial =
    useAuthStore((s) => s.user?.displayName?.trim()?.[0])?.toUpperCase() ?? "U";
  const listRef = useRef<FlatList<ChatMessage> | null>(null);

  useEffect(() => {
    if (!messages.length && !isLoading) return;
    listRef.current?.scrollToEnd({ animated: true });
  }, [isLoading, messages.length]);

  const loadingKey = useMemo(
    () => `typing-${messages.length}`,
    [messages.length],
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
      }}
    >
      <Pressable
        onPress={onTogglePanel}
        style={{
          alignItems: "center",
          paddingTop: 6,
          paddingBottom: expanded ? 6 : 4,
        }}
        accessibilityRole="button"
        accessibilityLabel={
          expanded ? "Collapse nutrition chat" : "Expand nutrition chat"
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
        <Animated.View
          style={{
            flex: 1,
            opacity: panelContentOpacity,
          }}
        >
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
            <Text
              style={[typography.smallMedium, { color: colors.foreground }]}
            >
              Nutrition Coach Chat
            </Text>
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
                style={[typography.small, { color: colors.mutedForeground }]}
              >
                Describe what you ate and I will estimate calories and macros.
              </Text>
            }
            renderItem={({ item }) => {
              const isEditableTranscript =
                item.type === "user_audio_transcript" &&
                editableTranscript?.messageId === item.id;

              if (isEditableTranscript) {
                return (
                  <View
                    style={{
                      alignSelf: "flex-end",
                      width: "92%",
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.primary,
                      backgroundColor: colors.background,
                      padding: spacing.xs,
                      gap: spacing.xs,
                    }}
                  >
                    <Text
                      style={[
                        typography.caption,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Audio transcript (editable)
                    </Text>

                    <TextInput
                      value={editableTranscript.value}
                      onChangeText={onChangeEditableTranscript}
                      placeholder="Edit transcript before analyzing"
                      placeholderTextColor={colors.mutedForeground}
                      style={{
                        minHeight: 42,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: colors.cardBorder,
                        paddingHorizontal: 10,
                        color: colors.foreground,
                        backgroundColor: colors.card,
                      }}
                    />

                    <Pressable
                      onPress={() => {
                        if (onSubmitEditableTranscript) {
                          void onSubmitEditableTranscript();
                        }
                      }}
                      disabled={submittingTranscript}
                      style={{
                        minHeight: 38,
                        borderRadius: 10,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: colors.primary,
                        opacity: submittingTranscript ? 0.6 : 1,
                      }}
                    >
                      <Text
                        style={[
                          typography.smallMedium,
                          { color: colors.primaryForeground },
                        ]}
                      >
                        {submittingTranscript
                          ? "Analyzing..."
                          : "Analyze transcript"}
                      </Text>
                    </Pressable>
                  </View>
                );
              }

              const userMessage = isUserMessage(item.type);
              const assistantMessage = !userMessage;
              const imagePayload =
                item.type === "user_image" && item.payload
                  ? (
                      item.payload as {
                        image?: {
                          localUri?: string;
                          downloadUrl?: string;
                        };
                      }
                    ).image
                  : undefined;
              const imageUri =
                imagePayload?.downloadUrl ?? imagePayload?.localUri;

              const messageTime = format(new Date(item.createdAt), "HH:mm");

              const audioTranscriptLabel =
                item.type === "user_audio_transcript" ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      marginBottom: 2,
                    }}
                  >
                    <Mic
                      size={12}
                      color={
                        userMessage
                          ? colors.primaryForeground
                          : colors.mutedForeground
                      }
                    />
                    <Text
                      style={[
                        typography.caption,
                        {
                          color: userMessage
                            ? `${colors.primaryForeground}cc`
                            : colors.mutedForeground,
                        },
                      ]}
                    >
                      Audio ·
                    </Text>
                  </View>
                ) : null;

              return (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-end",
                    alignSelf: userMessage ? "flex-end" : "flex-start",
                    gap: spacing.xs,
                    maxWidth: "94%",
                  }}
                >
                  {assistantMessage ? (
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
                      borderColor: userMessage
                        ? colors.primary
                        : colors.cardBorder,
                      backgroundColor: userMessage
                        ? colors.primary
                        : colors.background,
                    }}
                  >
                    {audioTranscriptLabel}

                    <Text
                      style={{
                        ...typography.small,
                        color: userMessage
                          ? colors.primaryForeground
                          : colors.foreground,
                      }}
                    >
                      {item.text ?? "Message"}
                    </Text>

                    {imageUri ? (
                      <Image
                        source={{ uri: imageUri }}
                        resizeMode="cover"
                        style={{
                          marginTop: spacing.xs,
                          width: 180,
                          height: 120,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: userMessage
                            ? colors.primaryForeground + "30"
                            : colors.cardBorder,
                        }}
                      />
                    ) : null}

                    {/* MODIFIED: timestamps below each message bubble. */}
                    <Text
                      style={[
                        typography.caption,
                        {
                          marginTop: 4,
                          color: userMessage
                            ? `${colors.primaryForeground}b3`
                            : colors.mutedForeground,
                        },
                      ]}
                    >
                      {messageTime}
                    </Text>
                  </View>

                  {userMessage ? (
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
            ListFooterComponent={
              // MODIFIED: typing indicator rendered inline at the end of the list.
              isLoading ? (
                <View key={loadingKey} style={{ marginTop: spacing.xs }}>
                  <TypingIndicator />
                </View>
              ) : null
            }
          />

          {pendingItems.length > 0 ? (
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: colors.cardBorder,
                paddingHorizontal: spacing.sm,
                paddingTop: spacing.xs,
                gap: spacing.xs,
              }}
            >
              <Text
                style={[typography.smallMedium, { color: colors.foreground }]}
              >
                Review and edit detected foods
              </Text>

              <ScrollView
                style={{ maxHeight: 200 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                  gap: spacing.xs,
                  paddingBottom: spacing.xs,
                }}
              >
                {pendingItems.map((item, index) => (
                  <View
                    key={`${item.name}-${index}`}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.cardBorder,
                      borderRadius: 12,
                      backgroundColor: colors.background,
                      padding: spacing.xs,
                      gap: spacing.xs,
                    }}
                  >
                    <View style={{ flexDirection: "row", gap: spacing.xs }}>
                      <TextInput
                        value={item.name}
                        onChangeText={(text) =>
                          onChangePendingItem(index, { name: text })
                        }
                        placeholder="Food"
                        placeholderTextColor={colors.mutedForeground}
                        style={{
                          flex: 1,
                          minHeight: 38,
                          borderWidth: 1,
                          borderColor: colors.cardBorder,
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          color: colors.foreground,
                        }}
                      />

                      <TextInput
                        value={String(item.quantity)}
                        onChangeText={(text) =>
                          onChangePendingItem(index, {
                            quantity: toNumber(text, item.quantity),
                          })
                        }
                        keyboardType="numeric"
                        placeholder="Qty"
                        placeholderTextColor={colors.mutedForeground}
                        style={{
                          width: 62,
                          minHeight: 38,
                          borderWidth: 1,
                          borderColor: colors.cardBorder,
                          borderRadius: 8,
                          paddingHorizontal: 8,
                          color: colors.foreground,
                        }}
                      />

                      <TextInput
                        value={item.unit}
                        onChangeText={(text) =>
                          onChangePendingItem(index, { unit: text })
                        }
                        placeholder="Unit"
                        placeholderTextColor={colors.mutedForeground}
                        style={{
                          width: 70,
                          minHeight: 38,
                          borderWidth: 1,
                          borderColor: colors.cardBorder,
                          borderRadius: 8,
                          paddingHorizontal: 8,
                          color: colors.foreground,
                        }}
                      />
                    </View>

                    <View style={{ flexDirection: "row", gap: spacing.xs }}>
                      <TextInput
                        value={String(item.calories)}
                        onChangeText={(text) =>
                          onChangePendingItem(index, {
                            calories: toNumber(text, item.calories),
                          })
                        }
                        keyboardType="numeric"
                        placeholder="Kcal"
                        placeholderTextColor={colors.mutedForeground}
                        style={{
                          flex: 1,
                          minHeight: 36,
                          borderWidth: 1,
                          borderColor: colors.cardBorder,
                          borderRadius: 8,
                          paddingHorizontal: 8,
                          color: colors.foreground,
                        }}
                      />

                      <TextInput
                        value={String(item.protein_g)}
                        onChangeText={(text) =>
                          onChangePendingItem(index, {
                            protein_g: toNumber(text, item.protein_g),
                          })
                        }
                        keyboardType="numeric"
                        placeholder="P"
                        placeholderTextColor={colors.mutedForeground}
                        style={{
                          flex: 1,
                          minHeight: 36,
                          borderWidth: 1,
                          borderColor: colors.cardBorder,
                          borderRadius: 8,
                          paddingHorizontal: 8,
                          color: colors.foreground,
                        }}
                      />

                      <TextInput
                        value={String(item.carbs_g)}
                        onChangeText={(text) =>
                          onChangePendingItem(index, {
                            carbs_g: toNumber(text, item.carbs_g),
                          })
                        }
                        keyboardType="numeric"
                        placeholder="C"
                        placeholderTextColor={colors.mutedForeground}
                        style={{
                          flex: 1,
                          minHeight: 36,
                          borderWidth: 1,
                          borderColor: colors.cardBorder,
                          borderRadius: 8,
                          paddingHorizontal: 8,
                          color: colors.foreground,
                        }}
                      />

                      <TextInput
                        value={String(item.fat_g)}
                        onChangeText={(text) =>
                          onChangePendingItem(index, {
                            fat_g: toNumber(text, item.fat_g),
                          })
                        }
                        keyboardType="numeric"
                        placeholder="F"
                        placeholderTextColor={colors.mutedForeground}
                        style={{
                          flex: 1,
                          minHeight: 36,
                          borderWidth: 1,
                          borderColor: colors.cardBorder,
                          borderRadius: 8,
                          paddingHorizontal: 8,
                          color: colors.foreground,
                        }}
                      />
                    </View>
                  </View>
                ))}
              </ScrollView>

              <Pressable
                onPress={onSaveAll}
                disabled={disabled || savingAll || pendingItems.length === 0}
                style={{
                  minHeight: 42,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.primary,
                  opacity:
                    disabled || savingAll || pendingItems.length === 0
                      ? 0.5
                      : 1,
                }}
              >
                <Text
                  style={[
                    typography.smallMedium,
                    { color: colors.primaryForeground },
                  ]}
                >
                  {savingAll ? "Saving..." : "Save all items"}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {disabled ? (
            <View
              style={{
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                borderTopWidth: 1,
                borderTopColor: colors.cardBorder,
              }}
            >
              <Text
                style={[typography.caption, { color: colors.mutedForeground }]}
              >
                {disabledReason ?? "Chat is available only for today."}
              </Text>
            </View>
          ) : null}
        </Animated.View>
      ) : null}

      {/* MODIFIED: replaced old ChatInput with WhatsApp-style ChatInputBar. */}
      <Animated.View style={{ paddingBottom: composerBottomOffset }}>
        <ChatInputBar
          onSendText={onSendText}
          onAudioRecorded={onAudioRecorded}
          onImageSelected={onImageSelected}
          disabled={disabled}
        />
      </Animated.View>
    </View>
  );
}

// TEST:
// - Send message -> typing indicator appears below last user message
// - Indicator dots animate with staggered bounce
// - AI response arrives -> indicator is replaced by message bubble
// - AI bubbles have Sparkles avatar on left
// - User bubbles have initial avatar on right
// - Timestamps visible below each bubble
// - Audio transcript messages show Mic icon prefix
// - scrollToEnd fires when typing indicator appears
