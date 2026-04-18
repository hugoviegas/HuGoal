import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { reload, sendEmailVerification } from "firebase/auth";
import { Button } from "@/components/ui/Button";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const showToast = useToastStore((s) => s.show);
  const { setUser, logout, user } = useAuthStore();

  const [isResending, setIsResending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const currentUser = auth.currentUser ?? user;
  const email = currentUser?.email;

  const handleResend = async () => {
    if (!currentUser) {
      showToast("No authenticated user found.", "error");
      return;
    }

    setIsResending(true);
    try {
      await sendEmailVerification(currentUser);
      showToast("Verification email sent.", "success");
    } catch (e: any) {
      showToast(e?.message ?? "Failed to send verification email.", "error");
    } finally {
      setIsResending(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (!currentUser) {
      showToast("No authenticated user found.", "error");
      return;
    }

    setIsRefreshing(true);
    try {
      await reload(currentUser);
      // reload() mutates the current user object in place; update store to re-run route guards.
      setUser(auth.currentUser ?? currentUser);

      if (auth.currentUser?.emailVerified) {
        showToast("Email verified successfully.", "success");
        router.replace("/(auth)/onboarding/gender");
        return;
      }

      showToast(
        "Email not verified yet. Check your inbox and try again.",
        "info",
      );
    } catch (e: any) {
      showToast(
        e?.message ?? "Failed to refresh verification status.",
        "error",
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSwitchAccount = async () => {
    setIsSwitching(true);
    try {
      await logout();
      router.replace("/(auth)/login");
    } catch {
      Alert.alert("Error", "Unable to switch account right now.");
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 24,
        justifyContent: "center",
      }}
    >
      <View style={{ gap: 12, marginBottom: 28 }}>
        <Text
          style={{
            fontSize: 30,
            fontWeight: "800",
            color: colors.foreground,
          }}
        >
          Verify your email
        </Text>
        <Text
          style={{
            fontSize: 16,
            lineHeight: 24,
            color: colors.mutedForeground,
          }}
        >
          We sent a verification link to {email ?? "your email"}. Verify your
          account to continue to onboarding.
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        <Button
          variant="primary"
          size="lg"
          isLoading={isRefreshing}
          onPress={handleRefreshStatus}
          className="w-full"
        >
          I verified my email
        </Button>

        <Button
          variant="outline"
          size="lg"
          isLoading={isResending}
          onPress={handleResend}
          className="w-full"
        >
          Resend verification email
        </Button>

        <Button
          variant="ghost"
          size="lg"
          onPress={() => router.replace("/(auth)/login")}
          className="w-full"
        >
          Go to sign in
        </Button>

        <Button
          variant="ghost"
          size="lg"
          isLoading={isSwitching}
          onPress={handleSwitchAccount}
          className="w-full"
        >
          Switch account
        </Button>
      </View>
    </View>
  );
}
