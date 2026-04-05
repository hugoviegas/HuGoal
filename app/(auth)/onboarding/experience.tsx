import { useEffect } from "react";
import { View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormStepper } from "@/components/ui/FormStepper";
import { Input } from "@/components/ui/Input";
import { OptionPicker } from "@/components/ui/OptionPicker";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useOnboardingDraft } from "@/hooks/useOnboardingDraft";
import { onboardingExperienceSchema } from "@/lib/validation/schemas";
import type { z } from "zod";

const STEPS = [
  { id: "personal", title: "About You" },
  { id: "goals", title: "Your Goals" },
  {
    id: "experience",
    title: "Training Experience",
    description: "Tell us your level and routine.",
  },
  { id: "diet", title: "Diet Preferences" },
];

const LEVEL_OPTIONS = [
  {
    value: "beginner" as const,
    label: "Beginner",
    icon: "🌱",
    description: "New to training",
  },
  {
    value: "intermediate" as const,
    label: "Intermediate",
    icon: "⚡",
    description: "1–3 years",
  },
  {
    value: "advanced" as const,
    label: "Advanced",
    icon: "🏆",
    description: "3+ years",
  },
];

const EQUIPMENT_OPTIONS = [
  {
    value: "none" as const,
    label: "No Equipment",
    icon: "🏃",
    description: "Bodyweight only",
  },
  {
    value: "home" as const,
    label: "Home Gym",
    icon: "🏠",
    description: "Basic equipment",
  },
  {
    value: "gym" as const,
    label: "Full Gym",
    icon: "🏋️",
    description: "All equipment",
  },
];

type ExperienceForm = z.infer<typeof onboardingExperienceSchema>;

export default function OnboardingExperienceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const user = useAuthStore((s) => s.user);
  const { loadDraft, saveDraft } = useOnboardingDraft(user?.uid);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExperienceForm>({
    resolver: zodResolver(onboardingExperienceSchema),
    defaultValues: {
      level: "beginner",
      equipment: "none",
      available_days_per_week: undefined,
      injuries: undefined,
    },
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const draft = await loadDraft();
      if (mounted && draft) {
        reset({
          level: draft.level ?? "beginner",
          equipment: draft.equipment ?? "none",
          available_days_per_week: draft.available_days_per_week,
          injuries: draft.injuries,
        });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadDraft, reset]);

  const onNext = handleSubmit(async (data) => {
    await saveDraft(data);
    router.push("/(auth)/onboarding/diet");
  });

  const onPrevious = handleSubmit(async (data) => {
    await saveDraft(data);
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
        steps={STEPS}
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
            name="level"
            render={({ field: { onChange, value } }) => (
              <OptionPicker
                label="Fitness Level"
                options={LEVEL_OPTIONS}
                value={value}
                onChange={onChange}
                columns={3}
                error={errors.level?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="equipment"
            render={({ field: { onChange, value } }) => (
              <OptionPicker
                label="Available Equipment"
                options={EQUIPMENT_OPTIONS}
                value={value}
                onChange={onChange}
                columns={3}
                error={errors.equipment?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="available_days_per_week"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Days per week available (optional)"
                keyboardType="numeric"
                placeholder="4"
                value={value ? String(value) : ""}
                onChangeText={(v) => onChange(v ? Number(v) : undefined)}
                error={errors.available_days_per_week?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="injuries"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Injuries or limitations (optional)"
                placeholder="e.g. shoulder discomfort, bad knee..."
                value={value ?? ""}
                onChangeText={onChange}
                error={errors.injuries?.message}
              />
            )}
          />
        </ScrollView>
      </FormStepper>
    </View>
  );
}
