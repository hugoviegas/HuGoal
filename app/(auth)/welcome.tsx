import { Redirect } from "expo-router";

// Legacy route kept for backward compatibility.
export default function WelcomeRedirect() {
  return <Redirect href="/(auth)/login" />;
}
