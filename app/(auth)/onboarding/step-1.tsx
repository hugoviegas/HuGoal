import { Redirect } from "expo-router";

export default function LegacyStep1Redirect() {
  return <Redirect href="/(auth)/onboarding/gender" />;
}
