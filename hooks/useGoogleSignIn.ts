import { useCallback, useState, useEffect } from "react";
import * as Google from "expo-auth-session/providers/google";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import {
  GoogleAuthProvider,
  fetchSignInMethodsForEmail,
  signInWithCredential,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getDocument, setDocument } from "@/lib/firestore";
import { useAuthStore } from "@/stores/auth.store";
import { GOOGLE_SIGN_IN_DISABLED } from "../lib/auth-flow-flags";
import type { UserProfile } from "@/types";

console.log(
  "[useGoogleSignIn] module loaded — calling maybeCompleteAuthSession",
);
try {
  WebBrowser.maybeCompleteAuthSession();
  console.log("[useGoogleSignIn] maybeCompleteAuthSession OK");
} catch (e: any) {
  console.error(
    "[useGoogleSignIn] maybeCompleteAuthSession THREW:",
    e?.message ?? e,
  );
}

function buildDefaultProfile(
  email: string,
  name: string,
): Omit<UserProfile, "id"> {
  return {
    email,
    name,
    username: "",
    allergies: [],
    dietary_restrictions: [],
    preferred_cuisines: [],
    xp: 0,
    streak_current: 0,
    streak_longest: 0,
    onboarding_complete: false,
    created_at: new Date().toISOString(),
  };
}

export interface GoogleSignInResult {
  isNewProfile: boolean;
}

function useGoogleSignInDisabled() {
  return {
    isReady: false,
    isLoading: false,
    signInWithGoogle: async (): Promise<GoogleSignInResult> => {
      throw new Error("Google sign-in is temporarily disabled for safe boot.");
    },
  };
}

function useGoogleSignInEnabled() {
  const [isLoading, setIsLoading] = useState(false);

  // On web, makeRedirectUri() returns the current page URL (required for Google OAuth web flow).
  // On native (iOS/Android standalone/preview builds), we omit redirectUri so expo-auth-session
  // uses the reverse-DNS scheme derived from the client ID — compliant with Google's OAuth 2.0 policy.
  // useProxy was removed: Google blocks the Expo auth proxy on non-Expo-Go builds.
  const redirectUri =
    Platform.OS === "web" ? AuthSession.makeRedirectUri() : undefined;

  console.log(
    "[useGoogleSignIn] hook mount — platform:",
    Platform.OS,
    "redirectUri:",
    redirectUri,
  );
  console.log(
    "[useGoogleSignIn] androidClientId:",
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "MISSING",
  );
  console.log(
    "[useGoogleSignIn] iosClientId:",
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "MISSING",
  );
  console.log(
    "[useGoogleSignIn] webClientId:",
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "MISSING",
  );

  useEffect(() => {
    console.log("[useGoogleSignIn] redirectUri (effect):", redirectUri);
  }, [redirectUri]);

  console.log("[useGoogleSignIn] Calling useIdTokenAuthRequest...");
  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
    scopes: ["openid", "profile", "email"],
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    ...(redirectUri !== undefined && { redirectUri }),
  });
  console.log(
    "[useGoogleSignIn] useIdTokenAuthRequest returned — request ready:",
    !!request,
  );

  const signInWithGoogle =
    useCallback(async (): Promise<GoogleSignInResult> => {
      if (!request) {
        throw new Error("Google sign-in is not ready yet.");
      }

      setIsLoading(true);
      try {
        const authResult = await promptAsync();

        if (authResult.type !== "success") {
          throw new Error("Google sign-in was cancelled.");
        }

        const idToken = authResult.params?.id_token;
        if (!idToken) {
          throw new Error("Google did not return an ID token.");
        }

        const credential = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(auth, credential);
        useAuthStore.getState().setUser(userCredential.user);

        const currentUser = userCredential.user;
        const existingProfile = await getDocument<UserProfile>(
          "profiles",
          currentUser.uid,
        );

        if (existingProfile) {
          return { isNewProfile: false };
        }

        const profile = buildDefaultProfile(
          currentUser.email ?? "",
          currentUser.displayName ?? "Athlete",
        );
        await setDocument("profiles", currentUser.uid, profile);

        return { isNewProfile: true };
      } catch (e: any) {
        if (e?.code === "auth/account-exists-with-different-credential") {
          const email = e?.customData?.email;
          const methods = email
            ? await fetchSignInMethodsForEmail(auth, email)
            : [];

          if (methods.includes("password")) {
            throw new Error(
              "This email already uses password login. Sign in with email/password first.",
            );
          }

          throw new Error(
            "This account already exists with a different provider.",
          );
        }

        throw e;
      } finally {
        setIsLoading(false);
      }
    }, [promptAsync, request]);

  const isReady = !!request;

  return {
    isReady,
    isLoading: isLoading || !isReady,
    signInWithGoogle,
  };
}

const useGoogleSignInImpl = GOOGLE_SIGN_IN_DISABLED
  ? useGoogleSignInDisabled
  : useGoogleSignInEnabled;

export function useGoogleSignIn() {
  return useGoogleSignInImpl();
}
