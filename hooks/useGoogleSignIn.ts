import { useCallback, useState, useEffect } from "react";
import * as Google from "expo-auth-session/providers/google";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import {
  GoogleAuthProvider,
  fetchSignInMethodsForEmail,
  signInWithCredential,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getDocument, setDocument } from "@/lib/firestore";
import type { UserProfile } from "@/types";

WebBrowser.maybeCompleteAuthSession();

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

export function useGoogleSignIn() {
  const [isLoading, setIsLoading] = useState(false);

  const redirectUri = AuthSession.makeRedirectUri({ useProxy: true } as any);

  useEffect(() => {
    if (__DEV__) {
      // Log exact redirect URI used by the app so you can add it to Google Cloud Console
      // Remove this log if you don't want it in dev output.
      // Example value: https://auth.expo.io/@hviegas/betteru
      console.log("[useGoogleSignIn] redirectUri:", redirectUri);
    }
  }, [redirectUri]);

  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
    scopes: ["openid", "profile", "email"],
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    redirectUri,
  });

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
