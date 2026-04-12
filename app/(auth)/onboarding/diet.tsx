import { Redirect } from "expo-router";

export default function LegacyDietRedirect() {
  return <Redirect href="/(auth)/onboarding/profile-info" />;
}
