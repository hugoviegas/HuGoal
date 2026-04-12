import { useEffect } from "react";
import { View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sprout, Zap, Trophy } from "lucide-react-native";
import { FormStepper } from "@/components/ui/FormStepper";
import { OptionPicker } from "@/components/ui/OptionPicker";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useOnboardingDraft } from "@/hooks/useOnboardingDraft";
import { ONBOARDING_STEPS } from "./_config";

const schema = z.object({
  level: z.enum(["beginner", "intermediate", "advanced"]),
});

type FormData = z.infer<typeof schema>;

const LEVEL_OPTIONS = [
  {
    value: "beginner" as const,
    label: "Beginner",
    icon: <Sprout size={18} color="#0ea5b0" />,
  },
  {
    value: "intermediate" as const,
    label: "Intermediate",
    icon: <Zap size={18} color="#0ea5b0" />,
  },
  {
    value: "advanced" as const,
    label: "Advance",
    icon: <Trophy size={18} color="#0ea5b0" />,
  },
];

export default function OnboardingLevelScreen() {
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
      level: "beginner",
    },
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const draft = await loadDraft();
      if (mounted) {
        reset({ level: draft?.level ?? "beginner" });
      }
    })();

    return () => {
      mounted = false;
    };
  }, [loadDraft, reset]);

  const onNext = handleSubmit(async (data) => {
    await saveDraft(data);
    router.push("/(auth)/onboarding/profile-info");
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
        currentStep={5}
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
        </ScrollView>
      </FormStepper>
    </View>
  );
}
