import { Redirect } from "expo-router";

export default function LegacyExperienceRedirect() {
  return <Redirect href="/(auth)/onboarding/level" />;
}
