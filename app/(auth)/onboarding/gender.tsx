import { useEffect } from "react";
import { View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mars, Venus, VenusAndMars } from "lucide-react-native";
import { FormStepper } from "@/components/ui/FormStepper";
import { OptionPicker } from "@/components/ui/OptionPicker";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useOnboardingDraft } from "@/hooks/useOnboardingDraft";
import { ONBOARDING_STEPS } from "./_config";

const schema = z.object({
  sex: z.enum(["male", "female", "other"]),
});

type FormData = z.infer<typeof schema>;

const SEX_OPTIONS = [
  {
    value: "male" as const,
    label: "Male",
    icon: <Mars size={22} color="#9099B8" strokeWidth={2} />,
  },
  {
    value: "female" as const,
    label: "Female",
    icon: <Venus size={22} color="#9099B8" strokeWidth={2} />,
  },
  {
    value: "other" as const,
    label: "Other",
    icon: <VenusAndMars size={22} color="#9099B8" strokeWidth={2} />,
  },
];

export default function OnboardingGenderScreen() {
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
      sex: "other",
    },
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const draft = await loadDraft();
      if (mounted && draft?.sex) {
        reset({ sex: draft.sex });
      }
    })();

    return () => {
      mounted = false;
    };
  }, [loadDraft, reset]);

  const onNext = handleSubmit(async (data) => {
    await saveDraft(data);
    router.push("/(auth)/onboarding/age");
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
      <FormStepper steps={ONBOARDING_STEPS} currentStep={0} onNext={onNext}>
        <ScrollView
          contentContainerStyle={{ gap: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Controller
            control={control}
            name="sex"
            render={({ field: { onChange, value } }) => (
              <OptionPicker
                label="Gender"
                options={SEX_OPTIONS}
                value={value}
                onChange={onChange}
                columns={3}
                error={errors.sex?.message}
              />
            )}
          />
        </ScrollView>
      </FormStepper>
    </View>
  );
}
