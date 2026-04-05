import { Redirect } from "expo-router";

export default function LegacyStep4Redirect() {
  return <Redirect href="/(auth)/onboarding/diet" />;
}
