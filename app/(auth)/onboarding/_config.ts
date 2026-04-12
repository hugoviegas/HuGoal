import type { FormStepItem } from "@/components/ui/FormStepper";

export const ONBOARDING_STEPS: FormStepItem[] = [
  {
    id: "gender",
    title: "Gender",
    description: "Tell us how you identify so we can personalize your plan.",
  },
  {
    id: "age",
    title: "Age",
    description: "Your age helps tailor safe training intensity.",
  },
  {
    id: "weight",
    title: "Weight",
    description: "Set your current weight to calibrate targets.",
  },
  {
    id: "height",
    title: "Height",
    description: "Your height helps estimate healthy ranges.",
  },
  {
    id: "goal",
    title: "Goal",
    description: "Pick your primary fitness objective.",
  },
  {
    id: "level",
    title: "Level",
    description: "Choose your current training experience.",
  },
  {
    id: "profile-info",
    title: "Profile Info",
    description: "Finish your account details and start your journey.",
  },
];

export type OnboardingGoalTrack =
  | "loss_weight"
  | "gain_weight"
  | "muscle_mass_gain"
  | "shape_body"
  | "stay_fit";
