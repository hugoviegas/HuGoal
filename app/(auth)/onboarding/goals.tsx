import { Redirect } from "expo-router";

export default function LegacyGoalsRedirect() {
  return <Redirect href="/(auth)/onboarding/goal" />;
}
