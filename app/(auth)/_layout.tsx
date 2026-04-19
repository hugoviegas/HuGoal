import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Redirect, Stack, useRouter, useSegments } from "expo-router";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { AUTH_ROUTE_GUARDS_DISABLED } from "@/lib/auth-flow-flags";

const PROFILE_WAIT_MS = 5000;

export default function AuthLayout() {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    profile,
    profileError,
    isInitializing,
    isLoading,
    retryFetchProfile,
  } = useAuthStore();
  const colors = useThemeStore((s) => s.colors);
  const segments = useSegments();
  const isOnboardingRoute = segments.includes("onboarding");
  const isVerifyEmailRoute = segments.includes("verify-email");

  const [profileTimedOut, setProfileTimedOut] = useState(false);
  const profileTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const shouldWait =
      isAuthenticated &&
      !profile &&
      !profileError &&
      !isLoading &&
      !isInitializing;

    if (shouldWait) {
      setProfileTimedOut(false);
      profileTimeoutRef.current = setTimeout(
        () => setProfileTimedOut(true),
        PROFILE_WAIT_MS,
      );
      return () => {
        if (profileTimeoutRef.current) {
          clearTimeout(profileTimeoutRef.current);
          profileTimeoutRef.current = null;
        }
      };
    }

    setProfileTimedOut(false);
    return () => {
      if (profileTimeoutRef.current) {
        clearTimeout(profileTimeoutRef.current);
        profileTimeoutRef.current = null;
      }
    };
  }, [isAuthenticated, profile, profileError, isLoading, isInitializing]);

  if (AUTH_ROUTE_GUARDS_DISABLED) {
    return (
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "slide_from_right",
        }}
      />
    );
  }
  if (__DEV__) {
    console.log("[AuthLayout] render —", {
      isInitializing,
      isLoading,
      isAuthenticated,
      hasProfile: !!profile,
      segments,
    });
  }

  if (isInitializing || isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isAuthenticated && user && !profile && !profileError) {
    if (profileTimedOut) {
      return (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.background,
            paddingHorizontal: 24,
            gap: 14,
          }}
        >
          <Text
            style={{
              color: colors.foreground,
              fontSize: 22,
              fontWeight: "800",
              textAlign: "center",
            }}
          >
            We could not finish loading your profile.
          </Text>
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 15,
              lineHeight: 22,
              textAlign: "center",
            }}
          >
            This can happen if the profile write is delayed or blocked. Try
            again, or continue to email verification.
          </Text>
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
              marginTop: 8,
            }}
          >
            <Pressable
              onPress={() => void retryFetchProfile()}
              style={{
                minWidth: 150,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.primary,
              }}
            >
              <Text style={{ color: colors.background, fontWeight: "700" }}>
                Retry
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.replace("/(auth)/verify-email")}
              style={{
                minWidth: 150,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: colors.cardBorder,
              }}
            >
              <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                Go to verification
              </Text>
            </Pressable>
          </View>
        </View>
      );
    }
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated && (isOnboardingRoute || isVerifyEmailRoute)) {
    if (__DEV__) {
      console.log(
        "[AuthLayout] Unauthenticated on protected route — redirecting to auth",
      );
    }
    return <Redirect href="/(auth)/auth" />;
  }

  if (isAuthenticated && user && !user.emailVerified && !isVerifyEmailRoute) {
    if (__DEV__) {
      console.log(
        "[AuthLayout] Email not verified — redirecting to verify-email",
      );
    }
    return <Redirect href="/(auth)/verify-email" />;
  }

  if (isAuthenticated && user?.emailVerified && isVerifyEmailRoute) {
    if (profile?.onboarding_complete) {
      return <Redirect href="/(tabs)/home" />;
    }
    return <Redirect href="/(auth)/onboarding/gender" />;
  }

  if (isAuthenticated && profile?.onboarding_complete) {
    return <Redirect href="/(tabs)/home" />;
  }

  if (
    isAuthenticated &&
    profile &&
    !profile.onboarding_complete &&
    !isOnboardingRoute
  ) {
    return <Redirect href="/(auth)/onboarding/gender" />;
  }

  if (__DEV__) {
    console.log("[AuthLayout] Rendering Stack — unauthenticated login flow");
  }
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: "slide_from_right",
      }}
    />
  );
}
