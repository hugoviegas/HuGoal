import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import * as ImagePicker from "expo-image-picker";
import { ArrowUp, Mic, Paperclip, Square } from "lucide-react-native";

import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import {
  cancelNutritionAudioRecording,
  isNativeSpeechRecognitionAvailable,
  startNutritionAudioRecording,
  stopNutritionAudioRecordingAndTranscribe,
  transcribeNutritionAudioFromFile,
} from "@/lib/ai/speechToText";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";

export interface AudioRecordedPayload {
  uri: string;
  transcript?: string;
}

export interface ChatInputBarProps {
  onSendText: (text: string) => void;
  onAudioRecorded: (payload: AudioRecordedPayload) => void;
  onImageSelected: (uri: string) => void;
  disabled?: boolean;
  placeholder?: string;
  onInputFocus?: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function ChatInputBar({
  onSendText,
  onAudioRecorded,
  onImageSelected,
  disabled = false,
  placeholder = "O que comeste?",
  onInputFocus,
}: ChatInputBarProps) {
  const colors = useThemeStore((s) => s.colors);
  const showToast = useToastStore((s) => s.show);

  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [inputBarHeight, setInputBarHeight] = useState(64);
  const [isSlideCancelCue, setIsSlideCancelCue] = useState(false);
  const [nativeSpeechSessionStarted, setNativeSpeechSessionStarted] =
    useState(false);

  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const hasCancelledRef = useRef(false);
  const releasedByPanRef = useRef(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const modeAnim = useRef(new Animated.Value(0)).current;
  const recordButtonPulseAnim = useRef(new Animated.Value(0)).current;
  const redDotAnim = useRef(new Animated.Value(0)).current;
  const indicatorSlideAnim = useRef(new Animated.Value(40)).current;
  const indicatorTranslateXAnim = useRef(new Animated.Value(0)).current;

  const isSendMode = text.trim().length > 0;
  // Keep prop in API for compatibility with existing callers.
  void onAudioRecorded;

  useEffect(() => {
    if (isRecording) {
      return;
    }

    Animated.spring(modeAnim, {
      toValue: isSendMode ? 1 : 0,
      useNativeDriver: true,
      damping: 15,
      stiffness: 200,
    }).start();
  }, [isRecording, isSendMode, modeAnim]);

  useEffect(() => {
    if (!isRecording) {
      recordButtonPulseAnim.stopAnimation();
      recordButtonPulseAnim.setValue(0);
      redDotAnim.stopAnimation();
      redDotAnim.setValue(0);
      return;
    }

    const pulseLoop = Animated.loop(
      Animated.timing(recordButtonPulseAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
    );

    const dotLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(redDotAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(redDotAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );

    pulseLoop.start();
    dotLoop.start();

    return () => {
      pulseLoop.stop();
      dotLoop.stop();
    };
  }, [isRecording, recordButtonPulseAnim, redDotAnim]);

  useEffect(() => {
    Animated.spring(indicatorSlideAnim, {
      toValue: isRecording ? 0 : 40,
      useNativeDriver: true,
      damping: 14,
      stiffness: 180,
    }).start();
  }, [indicatorSlideAnim, isRecording]);

  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (!durationIntervalRef.current) {
      return;
    }

    clearInterval(durationIntervalRef.current);
    durationIntervalRef.current = null;
  }, []);

  const startDurationTimer = useCallback(() => {
    stopDurationTimer();
    durationIntervalRef.current = setInterval(() => {
      setDurationSec((current) => current + 1);
    }, 1000);
  }, [stopDurationTimer]);

  const resetRecordingUi = useCallback(() => {
    setIsRecording(false);
    setIsSlideCancelCue(false);
    setDurationSec(0);
    stopDurationTimer();
    indicatorTranslateXAnim.setValue(0);
    hasCancelledRef.current = false;
    releasedByPanRef.current = false;
    setNativeSpeechSessionStarted(false);
  }, [indicatorTranslateXAnim, stopDurationTimer]);

  const cancelRecording = useCallback(async () => {
    try {
      await cancelNutritionAudioRecording();
    } catch {
      // Best-effort cancellation.
    }

    try {
      await audioRecorder.stop();
    } catch {
      // Ignore.
    }

    resetRecordingUi();
  }, [audioRecorder, resetRecordingUi]);

  const appendTranscriptToInput = useCallback((transcript: string) => {
    setText((current) => {
      if (!current.trim()) {
        return transcript;
      }

      const spacer = current.endsWith("\n") ? "" : "\n";
      return `${current}${spacer}${transcript}`;
    });
  }, []);

  const handleStartRecording = useCallback(async () => {
    if (disabled || isSendMode || isRecording) {
      return;
    }

    const micPermission = await requestRecordingPermissionsAsync();
    if (!micPermission.granted) {
      showToast("Permissao de microfone necessaria", "error");
      return;
    }

    try {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      if (isNativeSpeechRecognitionAvailable()) {
        try {
          await startNutritionAudioRecording();
          setNativeSpeechSessionStarted(true);
        } catch {
          // Native speech module can be unavailable in some builds.
          setNativeSpeechSessionStarted(false);
        }
      } else {
        setNativeSpeechSessionStarted(false);
      }

      setDurationSec(0);
      setIsRecording(true);
      setIsSlideCancelCue(false);
      startDurationTimer();
    } catch {
      resetRecordingUi();
      showToast("Nao foi possivel iniciar a gravacao", "error");
    }
  }, [
    audioRecorder,
    disabled,
    isRecording,
    isSendMode,
    resetRecordingUi,
    showToast,
    startDurationTimer,
  ]);

  const handleStopRecording = useCallback(async () => {
    if (!isRecording) {
      return;
    }

    if (releasedByPanRef.current || hasCancelledRef.current) {
      releasedByPanRef.current = false;
      hasCancelledRef.current = false;
      return;
    }

    try {
      try {
        await audioRecorder.stop();
      } catch {
        // Stop is best effort.
      }

      let uri = audioRecorder.uri ?? null;
      let transcript = "";

      if (nativeSpeechSessionStarted) {
        try {
          const transcription =
            await stopNutritionAudioRecordingAndTranscribe();
          transcript = transcription.text.trim();
          uri = uri ?? transcription.localUri ?? null;
        } catch {
          // Fallback to file-based cloud transcription.
        }
      }

      if (!transcript && uri) {
        try {
          transcript = (await transcribeNutritionAudioFromFile(uri)).trim();
        } catch {
          // Error handled below.
        }
      }

      resetRecordingUi();

      if (!transcript) {
        showToast("Não foi possível transcrever o áudio", "error");
        return;
      }

      appendTranscriptToInput(transcript);
    } catch {
      await cancelRecording();
      showToast("Não foi possível transcrever o áudio", "error");
    }
  }, [
    appendTranscriptToInput,
    audioRecorder,
    cancelRecording,
    isRecording,
    nativeSpeechSessionStarted,
    resetRecordingUi,
    showToast,
  ]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          isRecording && Math.abs(gestureState.dx) > 6,
        onPanResponderMove: (_, gestureState) => {
          if (!isRecording) {
            return;
          }

          const dx = Math.min(0, gestureState.dx);
          indicatorTranslateXAnim.setValue(dx * 0.4);
          setIsSlideCancelCue(dx < -60);

          if (dx < -120 && !hasCancelledRef.current) {
            hasCancelledRef.current = true;
            releasedByPanRef.current = true;
            void cancelRecording();
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (!isRecording) {
            return;
          }

          const dx = gestureState.dx;
          if (dx < -80) {
            hasCancelledRef.current = true;
            releasedByPanRef.current = true;
            void cancelRecording();
            return;
          }

          releasedByPanRef.current = false;
          Animated.spring(indicatorTranslateXAnim, {
            toValue: 0,
            useNativeDriver: true,
            damping: 15,
            stiffness: 180,
          }).start();
          setIsSlideCancelCue(false);
        },
      }),
    [cancelRecording, indicatorTranslateXAnim, isRecording],
  );

  const handleSendTextPress = useCallback(() => {
    if (disabled) {
      return;
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    onSendText(trimmed);
    setText("");
  }, [disabled, onSendText, text]);

  const handleAttachImage = useCallback(async () => {
    if (disabled || isPicking) {
      return;
    }

    setIsPicking(true);

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showToast("Permissao da galeria necessaria", "error");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const uri = result.assets[0]?.uri;
      if (!uri) {
        showToast("Nao foi possivel selecionar a imagem", "error");
        return;
      }

      onImageSelected(uri);
    } finally {
      setIsPicking(false);
    }
  }, [disabled, isPicking, onImageSelected, showToast]);

  const sendOpacity = modeAnim;
  const sendScale = modeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });
  const micOpacity = modeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const micScale = modeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.6],
  });

  const ringScale = recordButtonPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.6],
  });
  const ringOpacity = recordButtonPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const dotScale = redDotAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.2],
  });

  const indicatorOpacity = indicatorTranslateXAnim.interpolate({
    inputRange: [-100, 0],
    outputRange: [0.4, 1],
  });

  return (
    <View>
      <Animated.View
        pointerEvents={isRecording ? "auto" : "none"}
        style={{
          position: "absolute",
          left: 12,
          right: 12,
          bottom: inputBarHeight,
          backgroundColor: colors.card,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          paddingHorizontal: 16,
          paddingVertical: 10,
          transform: [{ translateY: indicatorSlideAnim }],
          opacity: isRecording ? 1 : 0,
          zIndex: 5,
        }}
      >
        <Animated.View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.xs,
            transform: [{ translateX: indicatorTranslateXAnim }],
            opacity: indicatorOpacity,
          }}
        >
          <Animated.View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: "#ef4444",
              transform: [{ scale: dotScale }],
            }}
          />
          <Text style={[typography.smallMedium, { color: colors.foreground }]}>
            A gravar... {formatDuration(durationSec)}
          </Text>
          <Text
            style={[
              typography.caption,
              {
                color: isSlideCancelCue
                  ? colors.destructive
                  : colors.mutedForeground,
              },
            ]}
          >
            {isSlideCancelCue
              ? "Soltar para cancelar"
              : "← Desliza para cancelar"}
          </Text>
        </Animated.View>
      </Animated.View>

      <View
        onLayout={(event) => {
          setInputBarHeight(event.nativeEvent.layout.height);
        }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginHorizontal: spacing.sm,
          marginTop: spacing.xs,
          marginBottom: spacing.xs,
          paddingHorizontal: spacing.xs,
          paddingVertical: 6,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          borderRadius: 26,
          gap: spacing.xs,
        }}
      >
        <Pressable
          onPress={() => void handleAttachImage()}
          disabled={disabled || isPicking || isRecording}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            opacity: disabled || isPicking || isRecording ? 0.6 : 1,
          }}
        >
          <Paperclip size={20} color={colors.foreground} />
        </Pressable>

        <TextInput
          value={text}
          onChangeText={setText}
          onFocus={onInputFocus}
          editable={!disabled && !isRecording}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          multiline
          numberOfLines={1}
          maxLength={1000}
          style={{
            flex: 1,
            maxHeight: 92,
            minHeight: 40,
            borderRadius: 20,
            backgroundColor: "transparent",
            paddingHorizontal: 8,
            paddingVertical: 8,
            fontSize: 15,
            color: colors.foreground,
            textAlignVertical: "center",
          }}
        />

        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor:
              isRecording && isSlideCancelCue ? colors.muted : colors.primary,
            alignItems: "center",
            justifyContent: "center",
            overflow: "visible",
          }}
          {...(isRecording ? panResponder.panHandlers : {})}
        >
          {isRecording ? (
            <>
              <Animated.View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: colors.primary,
                  transform: [{ scale: ringScale }],
                  opacity: ringOpacity,
                }}
              />
              <Pressable
                onPress={() => {
                  void handleStopRecording();
                }}
                style={{
                  width: 40,
                  height: 40,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                disabled={disabled}
              >
                <Square size={18} color={colors.primaryForeground} />
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={() => {
                if (isSendMode) {
                  handleSendTextPress();
                  return;
                }

                void handleStartRecording();
              }}
              disabled={disabled}
              style={{
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Animated.View
                style={{
                  position: "absolute",
                  opacity: sendOpacity,
                  transform: [{ scale: sendScale }],
                }}
              >
                <ArrowUp size={20} color={colors.primaryForeground} />
              </Animated.View>

              <Animated.View
                style={{
                  position: "absolute",
                  opacity: micOpacity,
                  transform: [{ scale: micScale }],
                }}
              >
                <Mic size={20} color={colors.primaryForeground} />
              </Animated.View>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
