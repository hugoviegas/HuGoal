import { Redirect } from "expo-router";

export default function LegacyPersonalRedirect() {
  return <Redirect href="/(auth)/onboarding/gender" />;
}
