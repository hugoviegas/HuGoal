import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  View,
  ScrollView,
  Pressable,
  Text,
  PanResponder,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Minus, Plus, GripVertical } from "lucide-react-native";
import { FormStepper } from "@/components/ui/FormStepper";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useOnboardingDraft } from "@/hooks/useOnboardingDraft";
import { ONBOARDING_STEPS } from "./_config";

const schema = z.object({
  height_cm: z
    .number()
    .int()
    .min(120, "Min height is 120 cm")
    .max(250, "Max height is 250 cm"),
});

type FormData = z.infer<typeof schema>;

function snapHeight(value: number) {
  return Math.max(120, Math.min(250, Math.round(value)));
}

export default function OnboardingHeightScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const { width: windowWidth } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const { loadDraft, saveDraft } = useOnboardingDraft(user?.uid);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      height_cm: 175,
    },
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const draft = await loadDraft();
      if (mounted) {
        reset({ height_cm: draft?.height_cm ?? 175 });
      }
    })();

    return () => {
      mounted = false;
    };
  }, [loadDraft, reset]);

  const currentHeight = watch("height_cm") ?? 175;
  const trackHeight = Math.min(windowWidth - 176, 340);

  const updateHeight = useCallback(
    (next: number) => {
      const clamped = snapHeight(next);
      setValue("height_cm", clamped, { shouldValidate: true });
    },
    [setValue],
  );

  const startHeightRef = useRef(currentHeight);

  const heightPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > 1,
        onPanResponderGrant: () => {
          startHeightRef.current = currentHeight;
        },
        onPanResponderMove: (_, gestureState) => {
          const range = 250 - 120;
          const delta = (-gestureState.dy / Math.max(trackHeight, 1)) * range;
          updateHeight(startHeightRef.current + delta);
        },
      }),
    [currentHeight, trackHeight, updateHeight],
  );

  const heightProgress = (currentHeight - 120) / Math.max(250 - 120, 1);
  const thumbOffset = Math.max(
    0,
    Math.min(trackHeight, (1 - heightProgress) * trackHeight),
  );

  const onNext = handleSubmit(async (data) => {
    await saveDraft(data);
    router.push("/(auth)/onboarding/goal");
  });

  const onPrevious = handleSubmit(async (data) => {
    await saveDraft(data);
    router.replace("/(auth)/onboarding/weight");
  });

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 16,
      }}
    >
      <FormStepper
        steps={ONBOARDING_STEPS}
        currentStep={3}
        onNext={onNext}
        onPrevious={onPrevious}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            alignItems: "center",
            gap: 18,
            paddingBottom: 8,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Controller
            control={control}
            name="height_cm"
            render={() => (
              <View style={{ width: "100%", alignItems: "center", gap: 16 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "baseline",
                    gap: 8,
                  }}
                >
                  <Text
                    style={{
                      color: colors.foreground,
                      fontSize: 74,
                      fontWeight: "800",
                      lineHeight: 80,
                    }}
                  >
                    {currentHeight}
                  </Text>
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontSize: 42,
                      fontWeight: "700",
                    }}
                  >
                    cm
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                    justifyContent: "center",
                  }}
                >
                  <Pressable
                    onPress={() => updateHeight(currentHeight - 1)}
                    style={({ pressed }) => ({
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: colors.cardBorder,
                      backgroundColor: colors.surface,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Minus size={22} color={colors.foreground} />
                  </Pressable>

                  <View
                    {...heightPanResponder.panHandlers}
                    style={{
                      width: 96,
                      height: trackHeight,
                      borderRadius: 14,
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.cardBorder,
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,
                        paddingVertical: 16,
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      {Array.from({ length: 15 }).map((_, idx) => {
                        const center = 7;
                        return (
                          <View
                            key={`height-tick-${idx}`}
                            style={{
                              width:
                                idx === center ? 54 : idx % 2 === 0 ? 34 : 26,
                              height: 2,
                              borderRadius: 999,
                              backgroundColor:
                                idx === center ? colors.primary : colors.muted,
                              opacity: idx === center ? 1 : 0.75,
                            }}
                          />
                        );
                      })}
                    </View>

                    <View
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: thumbOffset,
                        alignItems: "center",
                        transform: [{ translateY: -18 }],
                      }}
                    >
                      <View
                        style={{
                          width: 46,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: colors.primary,
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: `0px 4px 14px rgba(14, 165, 176, 0.22)`,
                          elevation: 4,
                        }}
                      >
                        <GripVertical
                          size={20}
                          color={colors.primaryForeground}
                        />
                      </View>
                    </View>
                  </View>

                  <Pressable
                    onPress={() => updateHeight(currentHeight + 1)}
                    style={({ pressed }) => ({
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: colors.cardBorder,
                      backgroundColor: colors.surface,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Plus size={22} color={colors.foreground} />
                  </Pressable>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 2,
                  }}
                >
                  <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                    Drag to adjust
                  </Text>
                  <Text
                    style={{
                      color: colors.primary,
                      fontSize: 12,
                      fontWeight: "700",
                    }}
                  >
                    1 cm snap
                  </Text>
                </View>

                {errors.height_cm?.message ? (
                  <Text style={{ color: colors.destructive, fontSize: 12 }}>
                    {errors.height_cm.message}
                  </Text>
                ) : null}
              </View>
            )}
          />
        </ScrollView>
      </FormStepper>
    </View>
  );
}
