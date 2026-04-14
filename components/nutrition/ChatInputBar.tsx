import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { ArrowUp, Mic, MicOff, Paperclip, Play, Send, Square, X } from "lucide-react-native";

import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";

export interface ChatInputBarProps {
  onSendText: (text: string) => void;
  onAudioRecorded: (uri: string) => void;
  onImageSelected: (uri: string) => void;
  disabled?: boolean;
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
}: ChatInputBarProps) {
  const colors = useThemeStore((s) => s.colors);
  const showToast = useToastStore((s) => s.show);

  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [inputBarHeight, setInputBarHeight] = useState(64);
  const [isSlideCancelCue, setIsSlideCancelCue] = useState(false);

  const recordedUriRef = useRef<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasCancelledRef = useRef(false);
  const releasedByPanRef = useRef(false);

  const modeAnim = useRef(new Animated.Value(0)).current;
  const recordButtonPulseAnim = useRef(new Animated.Value(0)).current;
  const redDotAnim = useRef(new Animated.Value(0)).current;
  const indicatorSlideAnim = useRef(new Animated.Value(40)).current;
  const indicatorTranslateXAnim = useRef(new Animated.Value(0)).current;

  const isSendMode = text.trim().length > 0;

  useEffect(() => {
    if (isRecording || isPreview) {
      return;
    }

    Animated.spring(modeAnim, {
      toValue: isSendMode ? 1 : 0,
      useNativeDriver: true,
      damping: 15,
      stiffness: 200,
    }).start();
  }, [isPreview, isRecording, isSendMode, modeAnim]);

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
    const visible = isRecording || isPreview;
    Animated.spring(indicatorSlideAnim, {
      toValue: visible ? 0 : 40,
      useNativeDriver: true,
      damping: 14,
      stiffness: 180,
    }).start();
  }, [indicatorSlideAnim, isPreview, isRecording]);

  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (soundRef.current) {
        void soundRef.current.unloadAsync();
      }
      if (recordingRef.current) {
        void recordingRef.current.stopAndUnloadAsync();
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
  }, [indicatorTranslateXAnim, stopDurationTimer]);

  const deleteRecordedFile = useCallback(async () => {
    const uri = recordedUriRef.current;
    if (!uri) {
      return;
    }

    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
      // Best effort cleanup
    }
  }, []);

  const stopAndStoreRecording = useCallback(async (): Promise<string | null> => {
    const recording = recordingRef.current;
    if (!recording) {
      return null;
    }

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    recordingRef.current = null;

    if (!uri) {
      return null;
    }

    recordedUriRef.current = uri;
    return uri;
  }, []);

  const cancelRecording = useCallback(async () => {
    const recording = recordingRef.current;
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch {
        // Ignore
      }
    }

    recordingRef.current = null;
    await deleteRecordedFile();
    recordedUriRef.current = null;
    setIsPreview(false);
    resetRecordingUi();
  }, [deleteRecordedFile, resetRecordingUi]);

  const handleStartRecording = useCallback(async () => {
    if (disabled || isSendMode || isRecording || isPreview) {
      return;
    }

    const micPermission = await Audio.requestPermissionsAsync();
    if (!micPermission.granted) {
      showToast("Permissao de microfone necessaria", "error");
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();

      recordingRef.current = recording;
      recordedUriRef.current = null;
      setDurationSec(0);
      setIsRecording(true);
      setIsPreview(false);
      setIsSlideCancelCue(false);
      startDurationTimer();
    } catch {
      resetRecordingUi();
      showToast("Nao foi possivel iniciar a gravacao", "error");
    }
  }, [disabled, isPreview, isRecording, isSendMode, resetRecordingUi, showToast, startDurationTimer]);

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
      const uri = await stopAndStoreRecording();
      resetRecordingUi();

      if (!uri) {
        showToast("Nao foi possivel salvar o audio", "error");
        return;
      }

      setIsPreview(true);
    } catch {
      await cancelRecording();
      showToast("Nao foi possivel finalizar a gravacao", "error");
    }
  }, [cancelRecording, isRecording, resetRecordingUi, stopAndStoreRecording, showToast]);

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
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
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

  const handlePreviewPlayToggle = useCallback(async () => {
    const uri = recordedUriRef.current;
    if (!uri) {
      return;
    }

    if (isPlaying && soundRef.current) {
      await soundRef.current.stopAsync();
      setIsPlaying(false);
      return;
    }

    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }

    const playback = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true },
      (status) => {
        if (!status.isLoaded) {
          return;
        }

        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      },
    );

    soundRef.current = playback.sound;
    setIsPlaying(true);
  }, [isPlaying]);

  const handleDiscardPreview = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }

    setIsPlaying(false);
    setIsPreview(false);
    await deleteRecordedFile();
    recordedUriRef.current = null;
    setDurationSec(0);
  }, [deleteRecordedFile]);

  const handleSendPreview = useCallback(() => {
    const uri = recordedUriRef.current;
    if (!uri) {
      return;
    }

    onAudioRecorded(uri);
    setIsPreview(false);
    setIsPlaying(false);
    recordedUriRef.current = null;
    setDurationSec(0);
  }, [onAudioRecorded]);

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
        pointerEvents={isRecording || isPreview ? "auto" : "none"}
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
          opacity: isRecording || isPreview ? 1 : 0,
          zIndex: 5,
        }}
      >
        {isRecording ? (
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
                { color: isSlideCancelCue ? colors.destructive : colors.mutedForeground },
              ]}
            >
              {isSlideCancelCue ? "Soltar para cancelar" : "← Desliza para cancelar"}
            </Text>
          </Animated.View>
        ) : isPreview ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <Pressable
              onPress={() => void handlePreviewPlayToggle()}
              disabled={disabled}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: colors.cardBorder,
                backgroundColor: colors.background,
                opacity: disabled ? 0.6 : 1,
              }}
            >
              {isPlaying ? (
                <Square size={15} color={colors.foreground} />
              ) : (
                <Play size={15} color={colors.foreground} />
              )}
            </Pressable>

            <Text style={[typography.small, { color: colors.foreground, flex: 1 }]}>
              Audio gravado — {formatDuration(durationSec)}
            </Text>

            <Pressable
              onPress={() => void handleDiscardPreview()}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: colors.cardBorder,
                backgroundColor: colors.background,
              }}
            >
              <X size={16} color={colors.foreground} />
            </Pressable>

            <Pressable
              onPress={handleSendPreview}
              style={{
                height: 34,
                borderRadius: 17,
                paddingHorizontal: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.primary,
                flexDirection: "row",
                gap: 6,
              }}
            >
              <Send size={14} color={colors.primaryForeground} />
              <Text style={[typography.caption, { color: colors.primaryForeground }]}>Enviar</Text>
            </Pressable>
          </View>
        ) : null}
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
          disabled={disabled || isPicking}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            opacity: disabled || isPicking ? 0.6 : 1,
          }}
        >
          <Paperclip size={20} color={colors.foreground} />
        </Pressable>

        <TextInput
          value={text}
          onChangeText={setText}
          editable={!disabled && !isRecording}
          placeholder="O que comeste?"
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
                onPressOut={() => {
                  void handleStopRecording();
                }}
                style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
                disabled={disabled}
              >
                <MicOff size={20} color={colors.primaryForeground} />
              </Pressable>
            </>
          ) : (
            <Pressable
              onPressIn={() => {
                void handleStartRecording();
              }}
              onPressOut={() => {
                if (!isSendMode) {
                  void handleStopRecording();
                }
              }}
              onPress={() => {
                if (isSendMode) {
                  handleSendTextPress();
                }
              }}
              disabled={disabled || isPreview}
              style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
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

// TEST:
// - Permission denied flow for mic -> toast appears, no crash
// - Permission denied for image picker -> toast appears
// - Type text -> button switches to Send (ArrowUp), spring animation visible
// - Clear text -> button switches back to Mic, spring animation visible
// - Hold mic -> recording starts, indicator bar slides up, duration counter ticks
// - Drag left > 120px -> recording cancels silently, bar slides down, no callback fired
// - Release mic normally -> indicator switches to preview state (play/discard/send)
// - Play button in preview -> audio plays back
// - Discard in preview -> resets, no callback
// - Send in preview -> onAudioRecorded fires with valid URI
// - Attach button -> image picker opens, selection calls onImageSelected
// - disabled=true -> all interactions blocked
