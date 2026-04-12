import { useEffect, useMemo, useRef } from "react";
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
import { Minus, Plus, GripHorizontal } from "lucide-react-native";
import { FormStepper } from "@/components/ui/FormStepper";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useOnboardingDraft } from "@/hooks/useOnboardingDraft";
import { ONBOARDING_STEPS } from "./_config";

const schema = z.object({
  weight_unit: z.enum(["kg", "lb"]),
  weight_value: z
    .number()
    .min(30, "Weight is too low")
    .max(660, "Weight is too high"),
});

type FormData = z.infer<typeof schema>;

function lbToKg(lb: number) {
  return Number((lb * 0.45359237).toFixed(1));
}

function kgToLb(kg: number) {
  return Number((kg / 0.45359237).toFixed(1));
}

function snapToStep(value: number, min: number, max: number, step: number) {
  const normalized = Math.max(min, Math.min(max, value));
  const snapped = Math.round((normalized - min) / step) * step + min;
  return Number(Math.max(min, Math.min(max, snapped)).toFixed(1));
}

export default function OnboardingWeightScreen() {
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
      weight_unit: "kg",
      weight_value: 75,
    },
  });

  const unit = watch("weight_unit");
  const currentWeight = watch("weight_value") ?? 75;
  const minByUnit = unit === "lb" ? 66 : 30;
  const maxByUnit = unit === "lb" ? 660 : 300;
  const stepByUnit = unit === "lb" ? 0.2 : 0.1;
  const trackWidth = Math.min(windowWidth - 112, 360);
  const currentStepWeight = snapToStep(
    currentWeight,
    minByUnit,
    maxByUnit,
    stepByUnit,
  );

  const updateWeight = (next: number) => {
    const clamped = snapToStep(next, minByUnit, maxByUnit, stepByUnit);
    setValue("weight_value", clamped, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const startWeightRef = useRef(currentStepWeight);

  const weightPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 1,
        onPanResponderGrant: () => {
          startWeightRef.current = currentStepWeight;
        },
        onPanResponderMove: (_, gestureState) => {
          const range = maxByUnit - minByUnit;
          const delta = (gestureState.dx / Math.max(trackWidth, 1)) * range;
          updateWeight(startWeightRef.current + delta);
        },
      }),
    [currentStepWeight, maxByUnit, minByUnit, trackWidth],
  );

  const weightProgress =
    (currentStepWeight - minByUnit) / Math.max(maxByUnit - minByUnit, 1);
  const weightThumbOffset = Math.max(
    0,
    Math.min(trackWidth, weightProgress * trackWidth),
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      const draft = await loadDraft();
      if (!mounted) {
        return;
      }

      const weightKg = draft?.weight_kg ?? 75;
      const weightUnit = draft?.weight_unit ?? "kg";

      reset({
        weight_unit: weightUnit,
        weight_value: weightUnit === "lb" ? kgToLb(weightKg) : weightKg,
      });
    })();

    return () => {
      mounted = false;
    };
  }, [loadDraft, reset]);

  const onNext = handleSubmit(async (data) => {
    const weightKg =
      data.weight_unit === "lb"
        ? lbToKg(data.weight_value)
        : Number(data.weight_value.toFixed(1));
    await saveDraft({
      weight_unit: data.weight_unit,
      weight_kg: weightKg,
    });
    router.push("/(auth)/onboarding/height");
  });

  const onPrevious = handleSubmit(async (data) => {
    const weightKg =
      data.weight_unit === "lb"
        ? lbToKg(data.weight_value)
        : Number(data.weight_value.toFixed(1));
    await saveDraft({
      weight_unit: data.weight_unit,
      weight_kg: weightKg,
    });
    router.back();
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
        currentStep={2}
        onNext={onNext}
        onPrevious={onPrevious}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            alignItems: "center",
            gap: 22,
            paddingBottom: 8,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Controller
            control={control}
            name="weight_unit"
            render={({ field: { onChange, value } }) => (
              <View
                style={{
                  width: "100%",
                  maxWidth: 360,
                  flexDirection: "row",
                  backgroundColor: colors.surface,
                  borderRadius: 14,
                  padding: 4,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                }}
              >
                <Pressable
                  onPress={() => {
                    if (value === "kg") return;
                    onChange("kg");
                    updateWeight(lbToKg(currentStepWeight));
                  }}
                  style={{
                    flex: 1,
                    borderRadius: 10,
                    paddingVertical: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor:
                      value === "kg" ? colors.primary : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color:
                        value === "kg"
                          ? colors.primaryForeground
                          : colors.foreground,
                      fontSize: 26,
                      fontWeight: "800",
                    }}
                  >
                    KG
                  </Text>
                </Pressable>
                <View
                  style={{
                    width: 1,
                    marginVertical: 8,
                    backgroundColor: colors.cardBorder,
                  }}
                />
                <Pressable
                  onPress={() => {
                    if (value === "lb") return;
                    onChange("lb");
                    updateWeight(kgToLb(currentStepWeight));
                  }}
                  style={{
                    flex: 1,
                    borderRadius: 10,
                    paddingVertical: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor:
                      value === "lb" ? colors.primary : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color:
                        value === "lb"
                          ? colors.primaryForeground
                          : colors.foreground,
                      fontSize: 26,
                      fontWeight: "800",
                    }}
                  >
                    LB
                  </Text>
                </Pressable>
              </View>
            )}
          />

          <View
            style={{
              width: "100%",
              alignItems: "center",
              gap: 14,
              marginTop: 8,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 16,
              }}
            >
              <Pressable
                onPress={() => updateWeight(currentStepWeight - stepByUnit)}
                style={({ pressed }) => ({
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  backgroundColor: colors.surface,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Minus size={24} color={colors.foreground} />
              </Pressable>

              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 72,
                  fontWeight: "800",
                  lineHeight: 80,
                }}
              >
                {Number(currentStepWeight).toFixed(unit === "lb" ? 1 : 1)}
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: 34,
                  fontWeight: "700",
                  marginTop: 8,
                }}
              >
                {unit.toUpperCase()}
              </Text>

              <Pressable
                onPress={() => updateWeight(currentStepWeight + stepByUnit)}
                style={({ pressed }) => ({
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  backgroundColor: colors.surface,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Plus size={24} color={colors.foreground} />
              </Pressable>
            </View>

            <View
              {...weightPanResponder.panHandlers}
              style={{
                width: "100%",
                maxWidth: 360,
                height: 84,
                borderRadius: 14,
                backgroundColor: colors.surface,
                justifyContent: "center",
                paddingHorizontal: 16,
                borderWidth: 1,
                borderColor: colors.cardBorder,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                }}
              >
                {Array.from({ length: 21 }).map((_, idx) => {
                  const center = 10;
                  const distance = Math.abs(idx - center);
                  return (
                    <View
                      key={`tick-${idx}`}
                      style={{
                        width: 2,
                        height: distance === 0 ? 28 : idx % 5 === 0 ? 22 : 14,
                        borderRadius: 999,
                        backgroundColor:
                          idx === center ? colors.primary : colors.muted,
                        opacity: idx === center ? 1 : 0.8,
                      }}
                    />
                  );
                })}
              </View>

              <View
                style={{
                  position: "absolute",
                  left: 16,
                  right: 16,
                  top: 0,
                  height: 84,
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    position: "absolute",
                    left: weightThumbOffset,
                    transform: [{ translateX: -14 }],
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: colors.primary,
                    borderWidth: 3,
                    borderColor: colors.primaryForeground,
                    boxShadow: `0px 4px 14px rgba(14, 165, 176, 0.28)`,
                    elevation: 4,
                  }}
                />
              </View>

              <View
                style={{
                  position: "absolute",
                  left: 16,
                  right: 16,
                  top: 0,
                  height: 84,
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: 4,
                    borderRadius: 999,
                    backgroundColor: colors.cardBorder,
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    left: 0,
                    width: weightThumbOffset + 14,
                    height: 4,
                    borderRadius: 999,
                    backgroundColor: colors.primary,
                  }}
                />
              </View>

              <View
                style={{
                  position: "absolute",
                  bottom: 8,
                  left: 16,
                  right: 16,
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                {[-2, -1, 0, 1, 2].map((offset) => {
                  const displayValue =
                    currentStepWeight + offset * stepByUnit * 5;
                  return (
                    <Text
                      key={`weight-label-${offset}`}
                      style={{
                        color:
                          offset === 0
                            ? colors.primary
                            : colors.mutedForeground,
                        fontSize: offset === 0 ? 18 : 14,
                        fontWeight: offset === 0 ? "800" : "600",
                        opacity: offset === 0 ? 1 : 0.7,
                      }}
                    >
                      {unit === "lb"
                        ? Math.round(displayValue).toString()
                        : displayValue.toFixed(1)}
                    </Text>
                  );
                })}
              </View>
            </View>

            {errors.weight_value?.message ? (
              <Text style={{ color: colors.destructive, fontSize: 12 }}>
                {errors.weight_value.message}
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </FormStepper>
    </View>
  );
}
