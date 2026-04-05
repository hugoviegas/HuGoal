import { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { OptionPicker } from "@/components/ui/OptionPicker";
import { DietaryPreferencePicker } from "@/components/ui/DietaryPreferencePicker";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useToastStore } from "@/stores/toast.store";
import { profileEditSchema } from "@/lib/validation/schemas";
import { updateProfileInFirestore } from "@/lib/firestore/profile";
import type { z } from "zod";

// Use z.input so RHF form values match what the user types (before defaults/transforms)
type ProfileEditFormValues = z.input<typeof profileEditSchema>;

const SEX_OPTIONS = [
  { value: "male" as const, label: "Male", icon: "♂️" },
  { value: "female" as const, label: "Female", icon: "♀️" },
  { value: "other" as const, label: "Other", icon: "⚧️" },
];

const GOAL_OPTIONS = [
  {
    value: "lose_fat" as const,
    label: "Lose Fat",
    icon: "🔥",
    description: "Burn excess body fat",
  },
  {
    value: "gain_muscle" as const,
    label: "Build Muscle",
    icon: "💪",
    description: "Increase size & strength",
  },
  {
    value: "maintain" as const,
    label: "Maintain",
    icon: "⚖️",
    description: "Keep current physique",
  },
  {
    value: "recomp" as const,
    label: "Recomposition",
    icon: "🔄",
    description: "Lose fat, gain muscle",
  },
];

const LEVEL_OPTIONS = [
  {
    value: "beginner" as const,
    label: "Beginner",
    icon: "🌱",
    description: "New to training",
  },
  {
    value: "intermediate" as const,
    label: "Intermediate",
    icon: "⚡",
    description: "1–3 years",
  },
  {
    value: "advanced" as const,
    label: "Advanced",
    icon: "🏆",
    description: "3+ years",
  },
];

const EQUIPMENT_OPTIONS = [
  {
    value: "none" as const,
    label: "No Equipment",
    icon: "🏃",
    description: "Bodyweight only",
  },
  {
    value: "home" as const,
    label: "Home Gym",
    icon: "🏠",
    description: "Basic equipment",
  },
  {
    value: "gym" as const,
    label: "Full Gym",
    icon: "🏋️",
    description: "All equipment",
  },
];

export default function ProfileEditScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const showToast = useToastStore((s) => s.show);
  const [isSaving, setIsSaving] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProfileEditFormValues>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      name: "",
      avatar_url: undefined,
      bio: undefined,
      age: undefined,
      sex: undefined,
      height_cm: undefined,
      weight_kg: undefined,
      goal: undefined,
      level: undefined,
      equipment: undefined,
      available_days_per_week: undefined,
      injuries: undefined,
      allergies: [],
      dietary_restrictions: [],
      preferred_cuisines: [],
    },
  });

  useEffect(() => {
    if (!profile) return;
    reset({
      name: profile.name ?? "",
      avatar_url: profile.avatar_url,
      bio: profile.bio,
      age: profile.age,
      sex: profile.sex,
      height_cm: profile.height_cm,
      weight_kg: profile.weight_kg,
      goal: profile.goal,
      level: profile.level,
      equipment: profile.equipment,
      available_days_per_week: profile.available_days_per_week,
      injuries: profile.injuries,
      allergies: profile.allergies ?? [],
      dietary_restrictions: profile.dietary_restrictions ?? [],
      preferred_cuisines: profile.preferred_cuisines ?? [],
    });
  }, [profile, reset]);

  const name = watch("name") ?? profile?.name ?? "";

  const onSubmit = handleSubmit(async (data) => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateProfileInFirestore(user.uid, data);
      // fetchProfile best-effort — failure should not block navigation
      try {
        await fetchProfile(user.uid);
      } catch {
        // non-critical
      }
      showToast("Profile updated successfully", "success");
      router.back();
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : "Could not update profile. Please try again.";
      showToast(msg, "error");
    } finally {
      setIsSaving(false);
    }
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 16,
          gap: 20,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              padding: 8,
              borderRadius: 12,
              backgroundColor: pressed ? colors.surface : "transparent",
            })}
            hitSlop={8}
          >
            <Text
              style={{
                color: colors.primary,
                fontSize: 16,
                fontWeight: "600",
              }}
            >
              ← Back
            </Text>
          </Pressable>
          <Text
            style={{
              color: colors.foreground,
              fontSize: 22,
              fontWeight: "800",
              flex: 1,
            }}
          >
            Edit Profile
          </Text>
        </View>

        {/* Avatar */}
        <Controller
          control={control}
          name="avatar_url"
          render={({ field: { value, onChange } }) => (
            <View style={{ alignItems: "center", marginVertical: 4 }}>
              <Avatar
                mode="upload"
                userId={user?.uid}
                source={value}
                name={name}
                size="xl"
                onUpload={onChange}
              />
            </View>
          )}
        />

        {/* Username (read-only hint) */}
        <Text
          style={{
            color: colors.mutedForeground,
            fontSize: 12,
            textAlign: "center",
            marginTop: -8,
          }}
        >
          @{profile?.username ?? ""} · username is locked after onboarding
        </Text>

        {/* Name */}
        <Controller
          control={control}
          name="name"
          render={({ field: { value, onChange } }) => (
            <Input
              label="Full Name"
              placeholder="Your name"
              value={value}
              onChangeText={onChange}
              error={errors.name?.message}
            />
          )}
        />

        {/* Bio */}
        <Controller
          control={control}
          name="bio"
          render={({ field: { value, onChange } }) => (
            <Input
              label="Bio (optional)"
              placeholder="A short bio about you..."
              value={value ?? ""}
              onChangeText={onChange}
              multiline
              numberOfLines={3}
              style={{ minHeight: 72, textAlignVertical: "top" }}
              error={errors.bio?.message}
            />
          )}
        />

        {/* Age */}
        <Controller
          control={control}
          name="age"
          render={({ field: { value, onChange } }) => (
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

        {/* Height */}
        <Controller
          control={control}
          name="height_cm"
          render={({ field: { value, onChange } }) => (
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

        {/* Weight */}
        <Controller
          control={control}
          name="weight_kg"
          render={({ field: { value, onChange } }) => (
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

        {/* Sex */}
        <Controller
          control={control}
          name="sex"
          render={({ field: { value, onChange } }) => (
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

        {/* Goal */}
        <Controller
          control={control}
          name="goal"
          render={({ field: { value, onChange } }) => (
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

        {/* Level */}
        <Controller
          control={control}
          name="level"
          render={({ field: { value, onChange } }) => (
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

        {/* Equipment */}
        <Controller
          control={control}
          name="equipment"
          render={({ field: { value, onChange } }) => (
            <OptionPicker
              label="Available Equipment"
              options={EQUIPMENT_OPTIONS}
              value={value}
              onChange={onChange}
              columns={3}
              error={errors.equipment?.message}
            />
          )}
        />

        {/* Days per week */}
        <Controller
          control={control}
          name="available_days_per_week"
          render={({ field: { value, onChange } }) => (
            <Input
              label="Days per week available (optional)"
              keyboardType="numeric"
              placeholder="4"
              value={value ? String(value) : ""}
              onChangeText={(v) => onChange(v ? Number(v) : undefined)}
              error={errors.available_days_per_week?.message}
            />
          )}
        />

        {/* Injuries */}
        <Controller
          control={control}
          name="injuries"
          render={({ field: { value, onChange } }) => (
            <Input
              label="Injuries or limitations (optional)"
              placeholder="e.g. shoulder discomfort, bad knee..."
              value={value ?? ""}
              onChangeText={onChange}
              error={errors.injuries?.message}
            />
          )}
        />

        {/* Dietary pickers */}
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

        {/* Save */}
        <Button
          variant="primary"
          size="lg"
          isLoading={isSaving}
          onPress={onSubmit}
        >
          Save Changes
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
