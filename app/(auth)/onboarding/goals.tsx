import { useEffect } from "react";
import { View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Flame, Scale, Sparkles, Dumbbell } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormStepper } from "@/components/ui/FormStepper";
import { Input } from "@/components/ui/Input";
import { OptionPicker } from "@/components/ui/OptionPicker";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useOnboardingDraft } from "@/hooks/useOnboardingDraft";
import { onboardingGoalsSchema } from "@/lib/validation/schemas";
import type { z } from "zod";

const STEPS = [
  { id: "personal", title: "About You" },
  {
    id: "goals",
    title: "Your Goals",
    description: "What do you want to achieve?",
  },
  { id: "experience", title: "Training Experience" },
  { id: "diet", title: "Diet Preferences" },
];

const GOAL_OPTIONS = [
  {
    value: "lose_fat" as const,
    label: "Lose Fat",
    icon: <Flame size={18} color="#0ea5b0" />,
    description: "Burn excess body fat",
  },
  {
    value: "gain_muscle" as const,
    label: "Build Muscle",
    icon: <Dumbbell size={18} color="#0ea5b0" />,
    description: "Increase size & strength",
  },
  {
    value: "maintain" as const,
    label: "Maintain",
    icon: <Scale size={18} color="#0ea5b0" />,
    description: "Keep current physique",
  },
  {
    value: "recomp" as const,
    label: "Recomposition",
    icon: <Sparkles size={18} color="#0ea5b0" />,
    description: "Lose fat, gain muscle",
  },
];

type GoalsForm = z.infer<typeof onboardingGoalsSchema>;

export default function OnboardingGoalsScreen() {
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
  } = useForm<GoalsForm>({
    resolver: zodResolver(onboardingGoalsSchema),
    defaultValues: {
      goal: "maintain",
      target_timeline: undefined,
    },
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const draft = await loadDraft();
      if (mounted && draft) {
        reset({
          goal: draft.goal ?? "maintain",
          target_timeline: draft.target_timeline,
        });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadDraft, reset]);

  const onNext = handleSubmit(async (data) => {
    await saveDraft(data);
    router.push("/(auth)/onboarding/experience");
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
        currentStep={1}
        onNext={onNext}
        onPrevious={onPrevious}
      >
        <ScrollView
          contentContainerStyle={{ gap: 18 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Controller
            control={control}
            name="goal"
            render={({ field: { onChange, value } }) => (
              <OptionPicker
                label="Primary Goal"
                options={GOAL_OPTIONS}
                value={value}
                onChange={onChange}
                columns={2}
                error={errors.goal?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="target_timeline"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Target timeline in weeks (optional)"
                keyboardType="numeric"
                placeholder="12"
                value={value ? String(value) : ""}
                onChangeText={(v) => onChange(v ? Number(v) : undefined)}
                error={errors.target_timeline?.message}
              />
            )}
          />
        </ScrollView>
      </FormStepper>
    </View>
  );
}
