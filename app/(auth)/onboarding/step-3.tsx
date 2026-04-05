import { Redirect } from "expo-router";

export default function LegacyStep3Redirect() {
  return <Redirect href="/(auth)/onboarding/experience" />;
}
