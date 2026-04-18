import { create } from "zustand";
import { getAuth, onAuthStateChanged, signOut, type User } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { app, auth as firebaseAuth } from "@/lib/firebase";
import { getDocument, updateDocument } from "@/lib/firestore";
import { deleteAllApiKeys } from "@/lib/api-key-store";
import { phaseDebug } from "@/lib/debug/phase-debug";
import { AUTH_SAFE_BOOT } from "@/lib/auth-flow-flags";
import type { UserProfile, WorkoutSettings } from "@/types";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isInitializing: boolean;
  isAuthenticated: boolean;
  profileError: string | null;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  fetchProfile: (uid: string) => Promise<void>;
  retryFetchProfile: () => Promise<void>;
  setOnboardingCompleted: (value: boolean) => Promise<void>;
  setWorkoutSettings: (settings: WorkoutSettings) => Promise<void>;
  logout: () => Promise<void>;
  forceReady: () => void;
  initialize: () => () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isInitializing: true,
  isAuthenticated: false,
  profileError: null,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setProfile: (profile) => set({ profile }),

  fetchProfile: async (uid) => {
    try {
      set({ profileError: null });
      const profile = await getDocument<UserProfile>("profiles", uid);
      set({ profile });
    } catch (e: any) {
      set({ profileError: e?.message ?? "Failed to load profile" });
    } finally {
      set({ isLoading: false });
    }
  },

  retryFetchProfile: async () => {
    const { user } = get();
    if (user) await get().fetchProfile(user.uid);
  },

  setOnboardingCompleted: async (value) => {
    const { user } = get();
    if (!user) return;
    await updateDocument("profiles", user.uid, { onboarding_complete: value });
    set((state) => ({
      profile: state.profile
        ? { ...state.profile, onboarding_complete: value }
        : state.profile,
    }));
  },

  setWorkoutSettings: async (settings) => {
    const { user } = get();
    if (!user) return;
    await updateDocument("profiles", user.uid, {
      workout_settings: settings,
      updated_at: new Date().toISOString(),
    });
    set((state) => ({
      profile: state.profile
        ? {
            ...state.profile,
            workout_settings: settings,
            updated_at: new Date().toISOString(),
          }
        : state.profile,
    }));
  },

  forceReady: () => {
    set({ isLoading: false, isInitializing: false });
    phaseDebug("auth", "forceReady");
  },

  logout: async () => {
    const uid = get().user?.uid;
    const authInstance = firebaseAuth ?? getAuth(app);
    await signOut(authInstance);
    await deleteAllApiKeys();
    if (uid) {
      await AsyncStorage.removeItem(`onboarding_draft:${uid}`);
    }
    set({
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
      isInitializing: false,
      profileError: null,
    });
  },

  initialize: () => {
    if (AUTH_SAFE_BOOT) {
      set({
        user: null,
        profile: null,
        isLoading: false,
        isInitializing: false,
        isAuthenticated: false,
        profileError: null,
      });
      phaseDebug("auth", "initialize:safeBoot");
      return () => {};
    }

    let active = true;
    let firstAuthEvent = true;

    set({ isInitializing: true, isLoading: true });
    console.log("[auth.store] initialize:start");
    phaseDebug("auth", "initialize:start");

    const safetyTimer = setTimeout(() => {
      if (active && get().isLoading) {
        phaseDebug("auth", "initialize:safetyTimeout");
        get().forceReady();
      }
    }, 8000);

    let authInstance;
    try {
      authInstance = firebaseAuth ?? getAuth(app);
    } catch (e: any) {
      clearTimeout(safetyTimer);
      set({
        isLoading: false,
        isInitializing: false,
        profileError: e?.message ?? "Failed to initialize auth",
      });
      phaseDebug("auth", "initialize:error", {
        error: e?.message ?? String(e),
      });
      return () => {
        active = false;
      };
    }

    const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
      if (!active) return;

      console.log(
        "[auth.store] onAuthStateChanged — hasUser:",
        !!user,
        "uid:",
        user?.uid ?? "none",
      );
      set({ user, isAuthenticated: !!user, isLoading: true });
      phaseDebug("auth", "onAuthStateChanged", {
        hasUser: !!user,
        uid: user?.uid ?? null,
      });

      try {
        if (user) {
          console.log("[auth.store] Fetching profile for uid:", user.uid);
          await get().fetchProfile(user.uid);
          console.log(
            "[auth.store] Profile fetch done. profile:",
            !!get().profile,
            "error:",
            get().profileError,
          );
        } else {
          console.log("[auth.store] No user — clearing profile.");
          set({ profile: null, profileError: null });
        }
      } finally {
        if (active) {
          set({ isLoading: false, isInitializing: false });
          console.log(
            "[auth.store] Auth ready — isAuthenticated:",
            get().isAuthenticated,
          );

          if (firstAuthEvent) {
            firstAuthEvent = false;
            const state = get();
            phaseDebug("auth", "initialize:ready", {
              isAuthenticated: state.isAuthenticated,
              hasProfile: !!state.profile,
              profileError: state.profileError,
            });
          }

          const state = get();
          phaseDebug("auth", "onAuthStateChanged:done", {
            isAuthenticated: state.isAuthenticated,
            hasProfile: !!state.profile,
            profileError: state.profileError,
          });
        }
      }
    });

    return () => {
      active = false;
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  },
}));
