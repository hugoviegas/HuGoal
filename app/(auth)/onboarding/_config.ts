import type { FormStepItem } from "@/components/ui/FormStepper";

export const ONBOARDING_STEPS: FormStepItem[] = [
  {
    id: "gender",
    title: "What Is Your Gender?",
    description: "This helps us personalize your workouts and recommendations.",
  },
  {
    id: "age",
    title: "How Old Are You?",
    description: "Your age helps us recommend safe and effective intensity.",
  },
  {
    id: "weight",
    title: "What Is Your Weight?",
    description: "Set your current weight so we can calibrate your targets.",
  },
  {
    id: "height",
    title: "What Is Your Height?",
    description: "Your height helps estimate healthy ranges and progression.",
  },
  {
    id: "goal",
    title: "What Is Your Main Goal?",
    description: "Choose the fitness objective you want to focus on first.",
  },
  {
    id: "level",
    title: "What Is Your Level?",
    description: "Tell us your current training experience.",
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

export default ONBOARDING_STEPS;
