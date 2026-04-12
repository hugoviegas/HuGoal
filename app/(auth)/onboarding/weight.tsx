import { useEffect } from "react";
import { View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormStepper } from "@/components/ui/FormStepper";
import { Input } from "@/components/ui/Input";
import { OptionPicker } from "@/components/ui/OptionPicker";
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

const WEIGHT_UNIT_OPTIONS = [
  { value: "kg" as const, label: "KG" },
  { value: "lb" as const, label: "LB" },
];

function lbToKg(lb: number) {
  return Number((lb * 0.45359237).toFixed(1));
}

function kgToLb(kg: number) {
  return Number((kg / 0.45359237).toFixed(1));
}

export default function OnboardingWeightScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
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
          contentContainerStyle={{ gap: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Controller
            control={control}
            name="weight_unit"
            render={({ field: { onChange, value } }) => (
              <OptionPicker
                label="Unit"
                options={WEIGHT_UNIT_OPTIONS}
                value={value}
                onChange={(nextUnit) => {
                  const currentValue = Number(watch("weight_value") ?? 75);
                  const converted =
                    nextUnit === "lb"
                      ? kgToLb(currentValue)
                      : lbToKg(currentValue);
                  onChange(nextUnit);
                  setValue("weight_value", converted, { shouldValidate: true });
                }}
                columns={2}
                error={errors.weight_unit?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="weight_value"
            render={({ field: { onChange, value } }) => (
              <Input
                label={`Current Weight (${unit?.toUpperCase() ?? "KG"})`}
                keyboardType="numeric"
                placeholder={unit === "lb" ? "165" : "75"}
                value={value ? String(value) : ""}
                onChangeText={(v) => onChange(v ? Number(v) : 0)}
                error={errors.weight_value?.message}
              />
            )}
          />
        </ScrollView>
      </FormStepper>
    </View>
  );
}
