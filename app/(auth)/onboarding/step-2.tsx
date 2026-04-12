import { Redirect } from "expo-router";

export default function LegacyStep2Redirect() {
  return <Redirect href="/(auth)/onboarding/goal" />;
}
