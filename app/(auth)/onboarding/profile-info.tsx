import { useEffect, useState } from "react";
import { View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormStepper } from "@/components/ui/FormStepper";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { UsernameAvailability } from "@/components/ui/UsernameAvailability";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useToastStore } from "@/stores/toast.store";
import { useOnboardingDraft } from "@/hooks/useOnboardingDraft";
import { useUsernameCheck } from "@/hooks/useUsernameCheck";
import { usernameSchema } from "@/lib/validation/schemas";
import { saveProfileToFirestore } from "@/lib/firestore/profile";
import { ONBOARDING_STEPS, type OnboardingGoalTrack } from "./_config";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  username: usernameSchema,
  phone: z.string().optional(),
  avatar_url: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function mapGoal(track: OnboardingGoalTrack) {
  switch (track) {
    case "loss_weight":
      return "lose_fat" as const;
    case "gain_weight":
      return "gain_muscle" as const;
    case "muscle_mass_gain":
      return "gain_muscle" as const;
    case "shape_body":
      return "recomp" as const;
    case "stay_fit":
    default:
      return "maintain" as const;
  }
}

export default function OnboardingProfileInfoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const user = useAuthStore((s) => s.user);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const showToast = useToastStore((s) => s.show);
  const { loadDraft, saveDraft, clearDraft } = useOnboardingDraft(user?.uid);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.displayName ?? "",
      username: "",
      phone: "",
      avatar_url: undefined,
    },
  });

  const username = watch("username") ?? "";
  const name = watch("name") ?? "";
  const usernameCheck = useUsernameCheck(username);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const draft = await loadDraft();
      if (!mounted) {
        return;
      }

      reset({
        name: draft?.name ?? user?.displayName ?? "",
        username: draft?.username ?? "",
        phone: draft?.phone ?? "",
        avatar_url: draft?.avatar_url,
      });
    })();

    return () => {
      mounted = false;
    };
  }, [loadDraft, reset, user?.displayName]);

  const onPrevious = handleSubmit(async (data) => {
    await saveDraft(data);
    router.back();
  });

  const onComplete = handleSubmit(async (data) => {
    if (!user) {
      showToast("User session not found.", "error");
      return;
    }

    const draft = (await loadDraft()) ?? {};
    const goalTrack =
      (draft.goal_track as OnboardingGoalTrack | undefined) ?? "stay_fit";

    if (
      !draft.sex ||
      !draft.birth_date ||
      !draft.height_cm ||
      !draft.weight_kg ||
      !draft.level
    ) {
      showToast(
        "Please complete the previous onboarding steps first.",
        "error",
      );
      router.replace("/(auth)/onboarding/gender");
      return;
    }

    setIsSubmitting(true);
    try {
      await saveDraft(data);

      await saveProfileToFirestore(user.uid, {
        id: user.uid,
        email: user.email ?? "",
        name: data.name,
        username: data.username,
        phone: data.phone?.trim() || undefined,
        avatar_url: data.avatar_url,
        sex: draft.sex,
        birth_date: draft.birth_date,
        height_cm: draft.height_cm,
        weight_kg: draft.weight_kg,
        goal: mapGoal(goalTrack),
        level: draft.level,
        equipment: "none",
        allergies: draft.allergies ?? [],
        dietary_restrictions: draft.dietary_restrictions ?? [],
        preferred_cuisines: draft.preferred_cuisines ?? [],
        xp: 0,
        streak_current: 0,
        streak_longest: 0,
        onboarding_complete: true,
        created_at: new Date().toISOString(),
      });

      await clearDraft();
      await fetchProfile(user.uid);

      showToast("Profile setup complete!", "success");
      router.replace("/(tabs)/dashboard");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not save profile. Please try again.";
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
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
        currentStep={6}
        onPrevious={onPrevious}
        onComplete={onComplete}
        isLoading={isSubmitting}
      >
        <ScrollView
          contentContainerStyle={{ gap: 18 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: "center", marginBottom: 8 }}>
            <Controller
              control={control}
              name="avatar_url"
              render={({ field: { value, onChange } }) => (
                <Avatar
                  mode="upload"
                  userId={user?.uid}
                  source={value}
                  name={name}
                  size="xl"
                  onUpload={onChange}
                />
              )}
            />
          </View>

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Full Name"
                placeholder="Your name"
                value={value}
                onChangeText={onChange}
                error={errors.name?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="username"
            render={({ field: { onChange, value } }) => (
              <UsernameAvailability
                value={value}
                onChange={onChange}
                error={errors.username?.message ?? usernameCheck.error}
                isAvailable={usernameCheck.isAvailable}
                isLoading={usernameCheck.isLoading}
              />
            )}
          />

          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Phone (optional)"
                keyboardType="phone-pad"
                placeholder="+351 900 000 000"
                value={value ?? ""}
                onChangeText={onChange}
                error={errors.phone?.message}
              />
            )}
          />
        </ScrollView>
      </FormStepper>
    </View>
  );
}
