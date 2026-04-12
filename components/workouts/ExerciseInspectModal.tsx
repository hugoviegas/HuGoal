import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  Modal as RNModal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Dumbbell, X } from "lucide-react-native";
import type { OfficialExerciseRecord } from "@/lib/workouts/generated/official-exercises";
import { useThemeStore } from "@/stores/theme.store";
import { cn } from "@/lib/utils";
import { MuscleMap } from "@/components/workouts/MuscleMap";

interface ExerciseInspectModalProps {
  visible: boolean;
  onClose: () => void;
  exerciseId: string | null;
  exerciseName: string;
  sets: number;
  prescription: string;
  official: OfficialExerciseRecord | null;
}

function formatEquipment(equipment: string[] | undefined): string {
  if (!equipment || equipment.length === 0) return "No equipment";
  return equipment
    .map((item) => item.replace(/_/g, " "))
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(", ");
}

export function ExerciseInspectModal({
  visible,
  onClose,
  exerciseId,
  exerciseName,
  sets,
  prescription,
  official,
}: ExerciseInspectModalProps) {
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useThemeStore();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [nextImageIndex, setNextImageIndex] = useState<number | null>(null);
  const [pauseImageLoop, setPauseImageLoop] = useState(false);
  const imageFade = useRef(new Animated.Value(0)).current;

  const exerciseImages = useMemo(
    () => (official?.remote_image_urls ?? []).filter(Boolean),
    [official?.remote_image_urls],
  );

  const currentImageUri =
    exerciseImages.length > 0 ? exerciseImages[currentImageIndex] : null;
  const nextImageUri =
    nextImageIndex !== null ? exerciseImages[nextImageIndex] : null;

  const musclePrimary = official?.primary_muscles?.length
    ? official.primary_muscles
    : [];
  const muscleSecondary = official?.secondary_muscles ?? [];

  const howToSteps = official?.instructions?.length
    ? official.instructions
    : (official?.instructions_en ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

  useEffect(() => {
    setCurrentImageIndex(0);
    setNextImageIndex(null);
    setPauseImageLoop(false);
    imageFade.setValue(0);
  }, [imageFade, exerciseId]);

  useEffect(() => {
    if (!visible) return;
    if (exerciseImages.length < 2 || pauseImageLoop || nextImageIndex !== null)
      return;

    const timerId = setTimeout(() => {
      const nextIndex = (currentImageIndex + 1) % exerciseImages.length;
      setNextImageIndex(nextIndex);
      Animated.timing(imageFade, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }).start(() => {
        setCurrentImageIndex(nextIndex);
        setNextImageIndex(null);
        imageFade.setValue(0);
      });
    }, 2200);

    return () => {
      clearTimeout(timerId);
      imageFade.stopAnimation();
    };
  }, [
    currentImageIndex,
    exerciseImages.length,
    imageFade,
    nextImageIndex,
    pauseImageLoop,
    visible,
  ]);

  return (
    <RNModal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className={cn("flex-1", isDark ? "bg-dark-bg" : "bg-light-bg")}>
        <View
          style={{
            paddingTop: insets.top + 8,
            paddingHorizontal: 16,
            paddingBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0",
            backgroundColor: isDark ? "#10131b" : "#f8fafc",
          }}
          className="flex-row items-center justify-between"
        >
          <Text
            className="text-lg font-bold text-gray-900 dark:text-gray-100 flex-1 pr-3"
            numberOfLines={1}
          >
            {exerciseName}
          </Text>
          <Pressable
            onPress={onClose}
            className={cn(
              "h-10 w-10 rounded-full items-center justify-center border",
              isDark
                ? "bg-dark-surface border-dark-border"
                : "bg-light-surface border-light-border",
            )}
          >
            <X size={18} color={colors.muted} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 36,
          }}
        >
          <Pressable
            className="rounded-3xl overflow-hidden mb-4"
            style={{
              aspectRatio: 16 / 9,
              backgroundColor: isDark ? "#1f2430" : "#e2e8f0",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: isDark ? 0.36 : 0.12,
              shadowRadius: 14,
              elevation: 8,
            }}
            onPress={() => {
              if (exerciseImages.length > 1) setPauseImageLoop((prev) => !prev);
            }}
          >
            {currentImageUri ? (
              <>
                <Image
                  source={{ uri: currentImageUri }}
                  className="h-full w-full"
                  resizeMode="cover"
                />
                {nextImageUri ? (
                  <Animated.Image
                    source={{ uri: nextImageUri }}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      opacity: imageFade,
                    }}
                    resizeMode="cover"
                  />
                ) : null}
              </>
            ) : (
              <View className="h-full w-full items-center justify-center">
                <Dumbbell size={34} color={colors.muted} />
              </View>
            )}

            {exerciseImages.length > 1 ? (
              <View
                style={{
                  position: "absolute",
                  right: 12,
                  bottom: 12,
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  backgroundColor: "rgba(15,23,42,0.62)",
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}
                >
                  {pauseImageLoop ? "Paused" : "Tap to pause"}
                </Text>
              </View>
            ) : null}
          </Pressable>

          <View className="flex-row gap-2 mb-4">
            {[
              { label: "Sets", value: String(sets) },
              { label: "Prescription", value: prescription || "-" },
              {
                label: "Equipment",
                value: formatEquipment(official?.equipment),
              },
            ].map((item) => (
              <View
                key={item.label}
                className={cn(
                  "flex-1 rounded-2xl border px-3 py-3",
                  isDark
                    ? "bg-dark-card border-dark-border"
                    : "bg-light-card border-light-border",
                )}
              >
                <Text className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                  {item.label}
                </Text>
                <Text
                  className="text-sm font-semibold text-gray-900 dark:text-gray-100"
                  numberOfLines={1}
                >
                  {item.value}
                </Text>
              </View>
            ))}
          </View>

          {(musclePrimary.length > 0 || muscleSecondary.length > 0) && (
            <View className="mb-4">
              <MuscleMap
                primaryMuscles={musclePrimary}
                secondaryMuscles={muscleSecondary}
                title="Targeted muscle areas"
                subtitle="Front and back activation"
                bodySize={280}
              />
            </View>
          )}

          <Text className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            How to perform
          </Text>

          {howToSteps.length > 0 ? (
            <View
              className={cn(
                "rounded-2xl border p-4 gap-3",
                isDark
                  ? "bg-dark-card border-dark-border"
                  : "bg-light-card border-light-border",
              )}
            >
              {howToSteps.map((step, index) => (
                <View
                  key={`step-${index}`}
                  className="flex-row items-start gap-2"
                >
                  <Text className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {index + 1}.
                  </Text>
                  <Text className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View
              className={cn(
                "rounded-2xl border p-4",
                isDark
                  ? "bg-dark-card border-dark-border"
                  : "bg-light-card border-light-border",
              )}
            >
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                Instructions are not available for this exercise yet.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </RNModal>
  );
}
