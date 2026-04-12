import { useEffect } from "react";
import { View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Flame,
  Dumbbell,
  TrendingUp,
  Sparkles,
  ShieldCheck,
} from "lucide-react-native";
import { FormStepper } from "@/components/ui/FormStepper";
import { OptionPicker } from "@/components/ui/OptionPicker";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useOnboardingDraft } from "@/hooks/useOnboardingDraft";
import { ONBOARDING_STEPS, type OnboardingGoalTrack } from "./_config";

const schema = z.object({
  goal_track: z.enum([
    "loss_weight",
    "gain_weight",
    "muscle_mass_gain",
    "shape_body",
    "stay_fit",
  ]),
});

type FormData = z.infer<typeof schema>;

const GOAL_OPTIONS = [
  {
    value: "loss_weight" as const,
    label: "Loss Weight",
    icon: <Flame size={18} color="#0ea5b0" />,
  },
  {
    value: "gain_weight" as const,
    label: "Gain Weight",
    icon: <TrendingUp size={18} color="#0ea5b0" />,
  },
  {
    value: "muscle_mass_gain" as const,
    label: "Muscle Mass Gain",
    icon: <Dumbbell size={18} color="#0ea5b0" />,
  },
  {
    value: "shape_body" as const,
    label: "Shape Body",
    icon: <Sparkles size={18} color="#0ea5b0" />,
  },
  {
    value: "stay_fit" as const,
    label: "Stay Fit",
    icon: <ShieldCheck size={18} color="#0ea5b0" />,
  },
];

const DEFAULT_GOAL: OnboardingGoalTrack = "stay_fit";

export default function OnboardingGoalScreen() {
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
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      goal_track: DEFAULT_GOAL,
    },
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const draft = await loadDraft();
      if (!mounted) {
        return;
      }

      reset({
        goal_track:
          (draft?.goal_track as OnboardingGoalTrack | undefined) ??
          DEFAULT_GOAL,
      });
    })();

    return () => {
      mounted = false;
    };
  }, [loadDraft, reset]);

  const onNext = handleSubmit(async (data) => {
    await saveDraft(data);
    router.push("/(auth)/onboarding/level");
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
        steps={ONBOARDING_STEPS}
        currentStep={4}
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
            name="goal_track"
            render={({ field: { onChange, value } }) => (
              <OptionPicker
                label="Primary Goal"
                options={GOAL_OPTIONS}
                value={value}
                onChange={onChange}
                columns={2}
                error={errors.goal_track?.message}
              />
            )}
          />
        </ScrollView>
      </FormStepper>
    </View>
  );
}
