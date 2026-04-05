import { z } from "zod";
import { isReservedUsername } from "@/lib/username";

const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

/**
 * Accept empty string or undefined as "no value", transform to undefined.
 * Using .transform() keeps TypeScript types correct (input: string | undefined).
 */
const optionalUrl = z
  .string()
  .optional()
  .transform((val) => (val === "" ? undefined : val))
  .pipe(z.string().url().optional());

const optionalString500 = z
  .string()
  .optional()
  .transform((val) => (val === "" ? undefined : val))
  .pipe(z.string().max(500).optional());

const optionalString280 = z
  .string()
  .optional()
  .transform((val) => (val === "" ? undefined : val))
  .pipe(z.string().max(280).optional());

export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be at most 20 characters")
  .regex(usernameRegex, "Use only letters, numbers, and underscore")
  .refine((value) => !isReservedUsername(value), "This username is reserved");

export const onboardingPersonalSchema = z.object({
  name: z.string().min(2, "Name is required"),
  username: usernameSchema,
  sex: z.enum(["male", "female", "other"]),
  avatar_url: optionalUrl,
  age: z.number().int().min(13).max(100).optional(),
  height_cm: z.number().int().min(120).max(250).optional(),
  weight_kg: z.number().min(30).max(300).optional(),
});

export const onboardingGoalsSchema = z.object({
  goal: z.enum(["lose_fat", "gain_muscle", "maintain", "recomp"]),
  target_timeline: z.number().int().min(1).max(104).optional(),
});

export const onboardingExperienceSchema = z.object({
  level: z.enum(["beginner", "intermediate", "advanced"]),
  equipment: z.enum(["home", "gym", "none"]),
  available_days_per_week: z.number().int().min(1).max(7).optional(),
  injuries: optionalString500,
});

export const onboardingDietSchema = z.object({
  allergies: z.array(z.string()).default([]),
  dietary_restrictions: z.array(z.string()).default([]),
  preferred_cuisines: z.array(z.string()).default([]),
});

// Zod v4: .merge() was removed → use .extend(schema.shape) chain
export const onboardingSchema = onboardingPersonalSchema
  .extend(onboardingGoalsSchema.shape)
  .extend(onboardingExperienceSchema.shape)
  .extend(onboardingDietSchema.shape)
  .extend({
    onboarding_complete: z.boolean(),
  });

export const profileEditSchema = z.object({
  name: z.string().min(2, "Name is required"),
  avatar_url: optionalUrl,
  bio: optionalString280,
  age: z.number().int().min(13).max(100).optional(),
  sex: z.enum(["male", "female", "other"]).optional(),
  height_cm: z.number().int().min(120).max(250).optional(),
  weight_kg: z.number().min(30).max(300).optional(),
  goal: z.enum(["lose_fat", "gain_muscle", "maintain", "recomp"]).optional(),
  level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  equipment: z.enum(["home", "gym", "none"]).optional(),
  available_days_per_week: z.number().int().min(1).max(7).optional(),
  injuries: optionalString500,
  allergies: z.array(z.string()).default([]),
  dietary_restrictions: z.array(z.string()).default([]),
  preferred_cuisines: z.array(z.string()).default([]),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type ProfileEditInput = z.infer<typeof profileEditSchema>;
