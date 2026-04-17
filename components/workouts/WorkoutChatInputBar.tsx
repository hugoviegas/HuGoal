import { useCallback, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { ArrowUp, Paperclip } from "lucide-react-native";

import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";

export interface WorkoutChatAttachment {
  localUri: string;
  name: string;
  mimeType: string;
}

export interface WorkoutChatInputBarProps {
  onSendText: (text: string, attachments?: WorkoutChatAttachment[]) => Promise<void>;
  onFileAttached?: (file: WorkoutChatAttachment) => void;
  disabled?: boolean;
  disabledReason?: string;
}

const SLASH_COMMANDS = [
  { command: "/change-workout-time", description: "Shorten or lengthen today's session" },
  { command: "/substitute-exercise", description: "Replace an exercise with an alternative" },
  { command: "/change-difficulty", description: "Make today easier or harder" },
  { command: "/change-location", description: "Switch equipment/location for today" },
  { command: "/create-workout", description: "Build a new workout template" },
  { command: "/reset-today", description: "Reset today's adaptations" },
];

export function WorkoutChatInputBar({
  onSendText,
  onFileAttached,
  disabled,
  disabledReason,
}: WorkoutChatInputBarProps) {
  const colors = useThemeStore((s) => s.colors);
  const isDark = useThemeStore((s) => s.isDark);
  const showToast = useToastStore((s) => s.show);

  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const sendButtonScale = useRef(new Animated.Value(1)).current;

  const filteredCommands =
    slashMenuOpen && inputValue.startsWith("/")
      ? SLASH_COMMANDS.filter((c) =>
          c.command.startsWith(inputValue.toLowerCase()),
        )
      : [];

  const handleChangeText = useCallback((text: string) => {
    setInputValue(text);
    setSlashMenuOpen(text.startsWith("/"));
  }, []);

  const handleSelectCommand = useCallback((command: string) => {
    setInputValue(command + " ");
    setSlashMenuOpen(false);
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || sending || disabled) return;

    setSlashMenuOpen(false);
    setSending(true);

    Animated.sequence([
      Animated.timing(sendButtonScale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.spring(sendButtonScale, { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 200 }),
    ]).start();

    try {
      await onSendText(text);
      setInputValue("");
    } finally {
      setSending(false);
    }
  }, [disabled, inputValue, onSendText, sendButtonScale, sending]);

  const handlePaperclip = useCallback(() => {
    if (!onFileAttached) {
      showToast("File picker coming soon", "info");
      return;
    }
    showToast("File picker coming soon", "info");
  }, [onFileAttached, showToast]);

  const canSend = inputValue.trim().length > 0 && !sending && !disabled;

  return (
    <View>
      {filteredCommands.length > 0 ? (
        <View
          style={{
            marginHorizontal: spacing.sm,
            marginBottom: 6,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            backgroundColor: colors.surface,
            overflow: "hidden",
          }}
        >
          <FlatList
            data={filteredCommands}
            keyExtractor={(item) => item.command}
            keyboardShouldPersistTaps="always"
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <Pressable
                onPress={() => handleSelectCommand(item.command)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: colors.cardBorder,
                }}
              >
                <Text
                  style={{
                    ...typography.smallMedium,
                    color: colors.primary,
                    minWidth: 160,
                  }}
                >
                  {item.command}
                </Text>
                <Text
                  style={{ ...typography.caption, color: colors.mutedForeground, flex: 1 }}
                  numberOfLines={1}
                >
                  {item.description}
                </Text>
              </Pressable>
            )}
          />
        </View>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: spacing.sm,
          paddingTop: spacing.xs,
          paddingBottom: spacing.sm,
        }}
      >
        <Pressable
          onPress={handlePaperclip}
          accessibilityRole="button"
          accessibilityLabel="Attach file"
          style={{
            width: 40,
            height: 40,
            borderRadius: 13,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isDark ? "#1f2937" : "#f3f4f6",
          }}
        >
          <Paperclip size={18} color={colors.mutedForeground} />
        </Pressable>

        <TextInput
          ref={inputRef}
          value={inputValue}
          onChangeText={handleChangeText}
          placeholder={disabled ? (disabledReason ?? "No workout loaded") : "Ask your coach…"}
          placeholderTextColor={colors.mutedForeground}
          editable={!disabled}
          multiline
          maxLength={1000}
          numberOfLines={1}
          style={{
            flex: 1,
            maxHeight: 92,
            minHeight: 40,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 10,
            color: colors.foreground,
            backgroundColor: isDark ? "#1f2937" : "#f3f4f6",
            ...typography.small,
          }}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={() => void handleSend()}
        />

        <Animated.View style={{ transform: [{ scale: sendButtonScale }] }}>
          <Pressable
            onPress={() => void handleSend()}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            style={{
              width: 40,
              height: 40,
              borderRadius: 13,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: canSend ? colors.primary : (isDark ? "#1f2937" : "#f3f4f6"),
            }}
          >
            <ArrowUp
              size={18}
              color={canSend ? colors.primaryForeground : colors.mutedForeground}
            />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}
