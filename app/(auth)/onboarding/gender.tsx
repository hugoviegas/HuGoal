import { useEffect } from "react";
import { View, ScrollView, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mars, Venus, VenusAndMars } from "lucide-react-native";
import { FormStepper } from "@/components/ui/FormStepper";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useOnboardingDraft } from "@/hooks/useOnboardingDraft";
import { ONBOARDING_STEPS } from "./_config";

const schema = z.object({
  sex: z.enum(["male", "female", "other"]),
});

type FormData = z.infer<typeof schema>;

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
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            alignItems: "center",
            gap: 18,
            paddingBottom: 8,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Controller
            control={control}
            name="sex"
            render={({ field: { onChange, value } }) => (
              <View style={{ width: "100%", alignItems: "center", gap: 16 }}>
                <Pressable
                  onPress={() => onChange("male")}
                  style={({ pressed }) => ({
                    width: 170,
                    height: 170,
                    borderRadius: 999,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor:
                      value === "male" ? colors.primary : colors.cardBorder,
                    backgroundColor:
                      value === "male" ? colors.primary + "22" : colors.card,
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <Mars
                    size={72}
                    color={
                      value === "male" ? colors.primary : colors.foreground
                    }
                    strokeWidth={2.1}
                  />
                </Pressable>
                <Text
                  style={{
                    color: colors.foreground,
                    fontSize: 34,
                    fontWeight: value === "male" ? "800" : "700",
                  }}
                >
                  Male
                </Text>

                <Pressable
                  onPress={() => onChange("female")}
                  style={({ pressed }) => ({
                    width: 170,
                    height: 170,
                    borderRadius: 999,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor:
                      value === "female" ? colors.primary : colors.cardBorder,
                    backgroundColor:
                      value === "female" ? "#d7e95a" : colors.surface,
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <Venus
                    size={72}
                    color={value === "female" ? "#1f232b" : colors.foreground}
                    strokeWidth={2.1}
                  />
                </Pressable>
                <Text
                  style={{
                    color: colors.foreground,
                    fontSize: 34,
                    fontWeight: value === "female" ? "800" : "700",
                  }}
                >
                  Female
                </Text>

                <Pressable
                  onPress={() => onChange("other")}
                  style={({ pressed }) => ({
                    marginTop: 4,
                    paddingVertical: 10,
                    paddingHorizontal: 18,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor:
                      value === "other" ? colors.primary : colors.cardBorder,
                    backgroundColor:
                      value === "other"
                        ? colors.primary + "1A"
                        : colors.background,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <VenusAndMars
                    size={17}
                    color={
                      value === "other"
                        ? colors.primary
                        : colors.mutedForeground
                    }
                  />
                  <Text
                    style={{
                      color:
                        value === "other"
                          ? colors.primary
                          : colors.mutedForeground,
                      fontWeight: "700",
                    }}
                  >
                    Other
                  </Text>
                </Pressable>

                {errors.sex?.message ? (
                  <Text style={{ color: colors.destructive, fontSize: 12 }}>
                    {errors.sex.message}
                  </Text>
                ) : null}
              </View>
            )}
          />
        </ScrollView>
      </FormStepper>
    </View>
  );
}
