import { useEffect } from "react";
import { View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormStepper } from "@/components/ui/FormStepper";
import { Input } from "@/components/ui/Input";
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

export default function OnboardingHeightScreen() {
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

  const onNext = handleSubmit(async (data) => {
    await saveDraft(data);
    router.push("/(auth)/onboarding/goal");
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
        currentStep={3}
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
            name="height_cm"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Current Height (cm)"
                keyboardType="numeric"
                placeholder="175"
                value={value ? String(value) : ""}
                onChangeText={(v) => onChange(v ? Number(v) : 0)}
                error={errors.height_cm?.message}
              />
            )}
          />
        </ScrollView>
      </FormStepper>
    </View>
  );
}
