import { useCallback, useRef } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Camera, Mic, SendHorizonal, Square } from "lucide-react-native";

import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { useThemeStore } from "@/stores/theme.store";

interface ChatInputProps {
  value: string;
  onChangeValue: (value: string) => void;
  onSendText: () => void;
  sending: boolean;
  recording: boolean;
  disabled?: boolean;
  onStartRecording?: () => void | Promise<void>;
  onStopRecording?: () => void | Promise<void>;
  onPressCamera?: () => void;
}

export function ChatInput({
  value,
  onChangeValue,
  onSendText,
  sending,
  recording,
  disabled = false,
  onStartRecording,
  onStopRecording,
  onPressCamera,
}: ChatInputProps) {
  const colors = useThemeStore((s) => s.colors);
  const holdStartedRef = useRef(false);

  const canSend = !disabled && !sending && value.trim().length > 0;
  const canRecord = !disabled && !sending;

  const handleMicPressIn = useCallback(() => {
    if (!canRecord || !onStartRecording || holdStartedRef.current) {
      return;
    }

    holdStartedRef.current = true;
    void onStartRecording();
  }, [canRecord, onStartRecording]);

  const handleMicPressOut = useCallback(() => {
    if (!holdStartedRef.current) {
      return;
    }

    holdStartedRef.current = false;
    if (!onStopRecording) {
      return;
    }

    void onStopRecording();
  }, [onStopRecording]);

  return (
    <View
      style={{
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderTopWidth: 1,
        borderTopColor: colors.cardBorder,
        gap: spacing.xs,
      }}
    >
      {recording ? (
        <Text style={[typography.caption, { color: colors.primary }]}>
          Recording... keep holding and release to transcribe.
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.xs,
        }}
      >
        <Pressable
          onPress={onPressCamera}
          disabled={disabled || !onPressCamera}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: colors.cardBorder,
            backgroundColor: colors.background,
            opacity: disabled || !onPressCamera ? 0.5 : 1,
          }}
          accessibilityRole="button"
          accessibilityLabel="Open camera"
        >
          <Camera size={17} color={colors.foreground} />
        </Pressable>

        <TextInput
          value={value}
          onChangeText={onChangeValue}
          placeholder="Example: pao com ovo e cafe com leite"
          placeholderTextColor={colors.mutedForeground}
          editable={!disabled && !sending}
          style={{
            flex: 1,
            minHeight: 42,
            borderRadius: 11,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            backgroundColor: colors.background,
            paddingHorizontal: 12,
            color: colors.foreground,
          }}
          returnKeyType="send"
          onSubmitEditing={() => {
            if (canSend) {
              onSendText();
            }
          }}
        />

        <Pressable
          onPressIn={handleMicPressIn}
          onPressOut={handleMicPressOut}
          disabled={!canRecord || !onStartRecording || !onStopRecording}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: recording ? colors.destructive : colors.secondary,
            opacity: canRecord ? 1 : 0.5,
          }}
          accessibilityRole="button"
          accessibilityLabel="Hold to record audio"
        >
          {recording ? (
            <Square size={14} color={colors.primaryForeground} />
          ) : (
            <Mic size={17} color={colors.secondaryForeground} />
          )}
        </Pressable>

        <Pressable
          onPress={onSendText}
          disabled={!canSend}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.primary,
            opacity: canSend ? 1 : 0.5,
          }}
          accessibilityRole="button"
          accessibilityLabel="Send text message"
        >
          <SendHorizonal size={17} color={colors.primaryForeground} />
        </Pressable>
      </View>
    </View>
  );
}
