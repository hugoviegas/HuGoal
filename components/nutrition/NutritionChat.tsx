import { useEffect, useRef } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Sparkles } from "lucide-react-native";

import { ChatInput } from "@/components/nutrition/ChatInput";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import type { NutritionChatItem } from "@/lib/ai/nutritionChatAI";
import type { ChatMessage } from "@/stores/nutrition.store";
import { useThemeStore } from "@/stores/theme.store";

interface NutritionChatProps {
  messages: ChatMessage[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
  pendingItems: NutritionChatItem[];
  onChangePendingItem: (
    index: number,
    patch: Partial<NutritionChatItem>,
  ) => void;
  onSaveAll: () => void;
  savingAll: boolean;
  disabled?: boolean;
  disabledReason?: string;
  recordingAudio?: boolean;
  onStartRecording?: () => void | Promise<void>;
  onStopRecording?: () => void | Promise<void>;
  onPressCamera?: () => void;
  editableTranscript?: {
    messageId: string;
    value: string;
  } | null;
  onChangeEditableTranscript?: (value: string) => void;
  onSubmitEditableTranscript?: () => void | Promise<void>;
  submittingTranscript?: boolean;
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
  inputValue,
  onInputChange,
  onSend,
  sending,
  pendingItems,
  onChangePendingItem,
  onSaveAll,
  savingAll,
  disabled = false,
  disabledReason,
  recordingAudio = false,
  onStartRecording,
  onStopRecording,
  onPressCamera,
  editableTranscript,
  onChangeEditableTranscript,
  onSubmitEditableTranscript,
  submittingTranscript = false,
}: NutritionChatProps) {
  const colors = useThemeStore((s) => s.colors);
  const listRef = useRef<FlatList<ChatMessage> | null>(null);

  useEffect(() => {
    if (!messages.length) return;
    listRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        borderRadius: 16,
        backgroundColor: colors.card,
        overflow: "hidden",
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
        <Text style={[typography.smallMedium, { color: colors.foreground }]}>
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
          <Text style={[typography.small, { color: colors.mutedForeground }]}>
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
                  style={[typography.caption, { color: colors.mutedForeground }]}
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
                    {submittingTranscript ? "Analyzing..." : "Analyze transcript"}
                  </Text>
                </Pressable>
              </View>
            );
          }

          const userMessage = isUserMessage(item.type);

          return (
            <View
              style={{
                alignSelf: userMessage ? "flex-end" : "flex-start",
                maxWidth: "88%",
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: userMessage ? colors.primary : colors.cardBorder,
                backgroundColor: userMessage
                  ? colors.primary
                  : colors.background,
              }}
            >
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
            </View>
          );
        }}
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
          <Text style={[typography.smallMedium, { color: colors.foreground }]}>
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
                disabled || savingAll || pendingItems.length === 0 ? 0.5 : 1,
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
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>
            {disabledReason ?? "Chat is available only for today."}
          </Text>
        </View>
      ) : null}

      <ChatInput
        value={inputValue}
        onChangeValue={onInputChange}
        onSendText={onSend}
        sending={sending || submittingTranscript}
        recording={recordingAudio}
        disabled={disabled}
        onStartRecording={onStartRecording}
        onStopRecording={onStopRecording}
        onPressCamera={onPressCamera}
      />
    </KeyboardAvoidingView>
  );
}
