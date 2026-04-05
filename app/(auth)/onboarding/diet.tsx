import { useEffect, useState } from "react";
import { View, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormStepper } from "@/components/ui/FormStepper";
import { DietaryPreferencePicker } from "@/components/ui/DietaryPreferencePicker";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useOnboardingDraft } from "@/hooks/useOnboardingDraft";
import { useToastStore } from "@/stores/toast.store";
import { onboardingDietSchema } from "@/lib/validation/schemas";
import { saveProfileToFirestore } from "@/lib/firestore/profile";
import type { z } from "zod";

const STEPS = [
  { id: "personal", title: "About You" },
  { id: "goals", title: "Your Goals" },
  { id: "experience", title: "Training Experience" },
  {
    id: "diet",
    title: "Diet Preferences",
    description: "Add allergies and food preferences.",
  },
];

type DietForm = z.input<typeof onboardingDietSchema>;

export default function OnboardingDietScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const user = useAuthStore((s) => s.user);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const { loadDraft, saveDraft, clearDraft } = useOnboardingDraft(user?.uid);
  const showToast = useToastStore((s) => s.show);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, reset } = useForm<DietForm>({
    resolver: zodResolver(onboardingDietSchema),
    defaultValues: {
      allergies: [],
      dietary_restrictions: [],
      preferred_cuisines: [],
    },
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const draft = await loadDraft();
      if (mounted && draft) {
        reset({
          allergies: draft.allergies ?? [],
          dietary_restrictions: draft.dietary_restrictions ?? [],
          preferred_cuisines: draft.preferred_cuisines ?? [],
        });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadDraft, reset]);

  const onPrevious = handleSubmit(async (data) => {
    await saveDraft(data);
    router.back();
  });

  const onSkip = () => {
    Alert.alert(
      "Skip diet details?",
      "You can add allergies and preferences later in settings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Skip",
          onPress: () => handleComplete(true),
        },
      ],
    );
  };

  async function handleComplete(skip = false) {
    if (!user) return;
    setIsSubmitting(true);

    try {
      const draft = (await loadDraft()) ?? {};

      await saveProfileToFirestore(user.uid, {
        id: user.uid,
        email: user.email ?? "",
        name: draft.name ?? "",
        username: draft.username ?? "",
        sex: draft.sex,
        age: draft.age,
        height_cm: draft.height_cm,
        weight_kg: draft.weight_kg,
        goal: draft.goal,
        level: draft.level,
        equipment: draft.equipment,
        available_days_per_week: draft.available_days_per_week,
        avatar_url: draft.avatar_url,
        allergies: skip ? [] : (draft.allergies ?? []),
        dietary_restrictions: skip ? [] : (draft.dietary_restrictions ?? []),
        preferred_cuisines: skip ? [] : (draft.preferred_cuisines ?? []),
        xp: 0,
        streak_current: 0,
        streak_longest: 0,
        onboarding_complete: true,
        created_at: new Date().toISOString(),
      });

      await clearDraft();

      // fetchProfile is best-effort — a failure here must NOT show an error toast
      try {
        await fetchProfile(user.uid);
      } catch {
        // non-critical; the store will pick up the profile on next navigation
      }

      showToast("Profile setup complete! 🎉", "success");
      router.replace("/(tabs)/dashboard");
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : "Could not save profile. Please try again.";
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  const onComplete = handleSubmit(async (data) => {
    await saveDraft(data);
    await handleComplete(false);
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
        currentStep={3}
        onPrevious={onPrevious}
        onComplete={onComplete}
        onSkip={onSkip}
        canSkip
        isLoading={isSubmitting}
      >
        <ScrollView
          contentContainerStyle={{ gap: 18 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Controller
            control={control}
            name="allergies"
            render={({ field: { value, onChange } }) => (
              <DietaryPreferencePicker
                category="allergies"
                label="Allergies"
                value={value ?? []}
                onChange={onChange}
              />
            )}
          />

          <Controller
            control={control}
            name="dietary_restrictions"
            render={({ field: { value, onChange } }) => (
              <DietaryPreferencePicker
                category="restrictions"
                label="Dietary restrictions"
                value={value ?? []}
                onChange={onChange}
              />
            )}
          />

          <Controller
            control={control}
            name="preferred_cuisines"
            render={({ field: { value, onChange } }) => (
              <DietaryPreferencePicker
                category="cuisines"
                label="Preferred cuisines"
                value={value ?? []}
                onChange={onChange}
              />
            )}
          />
        </ScrollView>
      </FormStepper>
    </View>
  );
}
