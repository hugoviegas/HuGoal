import { useEffect } from "react";
import { View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormStepper } from "@/components/ui/FormStepper";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { UsernameAvailability } from "@/components/ui/UsernameAvailability";
import { OptionPicker } from "@/components/ui/OptionPicker";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useOnboardingDraft } from "@/hooks/useOnboardingDraft";
import { useUsernameCheck } from "@/hooks/useUsernameCheck";
import { onboardingPersonalSchema } from "@/lib/validation/schemas";
import type { z } from "zod";

const STEPS = [
  {
    id: "personal",
    title: "About You",
    description: "Tell us your basics to personalize your plan.",
  },
  { id: "goals", title: "Your Goals" },
  { id: "experience", title: "Training Experience" },
  { id: "diet", title: "Diet Preferences" },
];

const SEX_OPTIONS = [
  { value: "male" as const, label: "Male", icon: "♂️" },
  { value: "female" as const, label: "Female", icon: "♀️" },
  { value: "other" as const, label: "Other", icon: "⚧️" },
];

type PersonalForm = z.infer<typeof onboardingPersonalSchema>;

export default function OnboardingPersonalScreen() {
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
  } = useForm<PersonalForm>({
    resolver: zodResolver(onboardingPersonalSchema),
    defaultValues: {
      name: "",
      username: "",
      sex: "other",
      age: undefined,
      height_cm: undefined,
      weight_kg: undefined,
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
      if (mounted && draft) {
        reset({
          name: draft.name ?? "",
          username: draft.username ?? "",
          sex: draft.sex ?? "other",
          age: draft.age,
          height_cm: draft.height_cm,
          weight_kg: draft.weight_kg,
          avatar_url: draft.avatar_url,
        });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadDraft, reset]);

  const onNext = handleSubmit(async (data) => {
    await saveDraft(data);
    router.push("/(auth)/onboarding/goals");
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
      <FormStepper steps={STEPS} currentStep={0} onNext={onNext}>
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
            name="sex"
            render={({ field: { onChange, value } }) => (
              <OptionPicker
                label="Biological Sex"
                options={SEX_OPTIONS}
                value={value}
                onChange={onChange}
                columns={3}
                error={errors.sex?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="age"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Age (optional)"
                keyboardType="numeric"
                placeholder="25"
                value={value ? String(value) : ""}
                onChangeText={(v) => onChange(v ? Number(v) : undefined)}
                error={errors.age?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="height_cm"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Height in cm (optional)"
                keyboardType="numeric"
                placeholder="175"
                value={value ? String(value) : ""}
                onChangeText={(v) => onChange(v ? Number(v) : undefined)}
                error={errors.height_cm?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="weight_kg"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Weight in kg (optional)"
                keyboardType="numeric"
                placeholder="72"
                value={value ? String(value) : ""}
                onChangeText={(v) => onChange(v ? Number(v) : undefined)}
                error={errors.weight_kg?.message}
              />
            )}
          />
        </ScrollView>
      </FormStepper>
    </View>
  );
}
