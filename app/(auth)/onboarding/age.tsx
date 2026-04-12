import { useEffect, useMemo } from "react";
import { View, ScrollView, Text } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormStepper } from "@/components/ui/FormStepper";
import { CalendarLume } from "@/components/ui/CalendarLume";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useOnboardingDraft } from "@/hooks/useOnboardingDraft";
import {
  calculateAgeFromBirthDate,
  isAtLeastAge,
  isValidBirthDate,
} from "@/lib/profile-dates";
import { ONBOARDING_STEPS } from "./_config";

const schema = z.object({
  birth_date: z
    .string()
    .refine((value) => isValidBirthDate(value), "Select a valid birth date")
    .refine(
      (value) => isAtLeastAge(value, 18),
      "You must be at least 18 years old",
    ),
});

type FormData = z.infer<typeof schema>;

export default function OnboardingAgeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const user = useAuthStore((s) => s.user);
  const { loadDraft, saveDraft } = useOnboardingDraft(user?.uid);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      birth_date: "",
    },
  });

  const birthDate = watch("birth_date") ?? "";
  const computedAge = useMemo(
    () => calculateAgeFromBirthDate(birthDate),
    [birthDate],
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      const draft = await loadDraft();
      if (mounted && draft?.birth_date) {
        reset({ birth_date: draft.birth_date });
      }
    })();

    return () => {
      mounted = false;
    };
  }, [loadDraft, reset]);

  const onNext = handleSubmit(async (data) => {
    await saveDraft(data);
    router.push("/(auth)/onboarding/weight");
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
        currentStep={1}
        onNext={onNext}
        onPrevious={onPrevious}
      >
        <ScrollView
          contentContainerStyle={{
            gap: 20,
            flexGrow: 1,
            justifyContent: "center",
            paddingBottom: 8,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Controller
            control={control}
            name="birth_date"
            render={({ field: { onChange, value } }) => (
              <CalendarLume
                label="Birth date"
                value={value || null}
                onChange={onChange}
                maxDate={
                  new Date(
                    new Date().getFullYear() - 18,
                    new Date().getMonth(),
                    new Date().getDate(),
                  )
                }
                minDate={new Date(new Date().getFullYear() - 100, 0, 1)}
                helperText="You must be at least 18 years old."
                error={errors.birth_date?.message}
              />
            )}
          />

          {computedAge !== null ? (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                Calculated age
              </Text>
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 18,
                  fontWeight: "800",
                  marginTop: 4,
                }}
              >
                {computedAge} years old
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </FormStepper>
    </View>
  );
}
