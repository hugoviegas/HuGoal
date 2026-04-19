import { create } from "zustand";
import { getAuth, onAuthStateChanged, signOut, type User } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { app, auth as firebaseAuth } from "@/lib/firebase";
import { getDocument, updateDocument } from "@/lib/firestore";
import { deleteAllApiKeys } from "@/lib/api-key-store";
import { phaseDebug } from "@/lib/debug/phase-debug";
import { AUTH_SAFE_BOOT } from "@/lib/auth-flow-flags";
import type { UserProfile, WorkoutSettings } from "@/types";

export type AuthStatus =
  | "loading"
  | "authenticated_cached"
  | "authenticated"
  | "unauthenticated";

const AUTH_CACHE_KEY = "auth_profile_cache";
const AUTH_CACHE_SCHEMA_VERSION = 1;

type StorageBackend = {
  set: (key: string, value: string) => void;
  getString: (key: string) => string | undefined;
  remove: (key: string) => void;
};

interface CachedAuthSnapshot {
  v: number;
  cachedAt: number;
  profile: UserProfile | null;
  user: {
    uid: string;
    email: string | null;
    emailVerified: boolean;
    displayName: string | null;
    photoURL: string | null;
  };
}

const isExpoGo =
  Constants.appOwnership === "expo" ||
  Constants.executionEnvironment === "storeClient";

const memoryStorage = new Map<string, string>();
let mmkvStorage: StorageBackend | null | undefined;

function getAuthStorage(): StorageBackend | null {
  if (mmkvStorage !== undefined) {
    return mmkvStorage;
  }

  if (isExpoGo) {
    mmkvStorage = null;
    return null;
  }

  try {
    const mmkv =
      require("react-native-mmkv") as typeof import("react-native-mmkv");
    mmkvStorage = mmkv.createMMKV({ id: "hugoal-auth-cache" });
    return mmkvStorage;
  } catch {
    mmkvStorage = null;
    return null;
  }
}

function storageGet(key: string): string | null {
  const backend = getAuthStorage();
  if (backend) {
    return backend.getString(key) ?? null;
  }

  return memoryStorage.get(key) ?? null;
}

function storageSet(key: string, value: string): void {
  const backend = getAuthStorage();
  if (backend) {
    backend.set(key, value);
    return;
  }

  memoryStorage.set(key, value);
}

function storageRemove(key: string): void {
  const backend = getAuthStorage();
  if (backend) {
    backend.remove(key);
    return;
  }

  memoryStorage.delete(key);
}

function toCachedUser(user: User): CachedAuthSnapshot["user"] {
  return {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

function fromCachedUser(snapshot: CachedAuthSnapshot["user"]): User {
  return {
    uid: snapshot.uid,
    email: snapshot.email,
    emailVerified: snapshot.emailVerified,
    displayName: snapshot.displayName,
    photoURL: snapshot.photoURL,
  } as unknown as User;
}

function persistAuthSnapshot(user: User, profile: UserProfile | null): void {
  const snapshot: CachedAuthSnapshot = {
    v: AUTH_CACHE_SCHEMA_VERSION,
    cachedAt: Date.now(),
    user: toCachedUser(user),
    profile,
  };

  storageSet(AUTH_CACHE_KEY, JSON.stringify(snapshot));
}

function clearAuthSnapshot(): void {
  storageRemove(AUTH_CACHE_KEY);
}

function getCachedAuthSnapshot(): CachedAuthSnapshot | null {
  const raw = storageGet(AUTH_CACHE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CachedAuthSnapshot;
    if (parsed.v !== AUTH_CACHE_SCHEMA_VERSION) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isInitializing: boolean;
  isAuthenticated: boolean;
  authStatus: AuthStatus;
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
  authStatus: "loading",
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
    set((state) => ({
      isLoading: false,
      isInitializing: false,
      authStatus: state.isAuthenticated ? "authenticated" : "unauthenticated",
    }));
    phaseDebug("auth", "forceReady");
  },

  logout: async () => {
    const uid = get().user?.uid;
    const authInstance = firebaseAuth ?? getAuth(app);
    await signOut(authInstance);
    await deleteAllApiKeys();
    clearAuthSnapshot();
    if (uid) {
      await AsyncStorage.removeItem(`onboarding_draft:${uid}`);
    }
    set({
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
      isInitializing: false,
      authStatus: "unauthenticated",
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
        authStatus: "unauthenticated",
        profileError: null,
      });
      phaseDebug("auth", "initialize:safeBoot");
      return () => {};
    }

    let active = true;
    let firstAuthEvent = true;
    const cachedSnapshot = getCachedAuthSnapshot();

    if (cachedSnapshot) {
      set({
        user: fromCachedUser(cachedSnapshot.user),
        profile: cachedSnapshot.profile,
        isAuthenticated: true,
        isLoading: false,
        isInitializing: true,
        authStatus: "authenticated_cached",
        profileError: null,
      });
    } else {
      set({ isInitializing: true, isLoading: true, authStatus: "loading" });
    }

    if (__DEV__) {
      console.log("[auth.store] initialize:start");
    }
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
        authStatus: "unauthenticated",
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

      if (__DEV__) {
        console.log(
          "[auth.store] onAuthStateChanged — hasUser:",
          !!user,
          "uid:",
          user?.uid ?? "none",
        );
      }
      set({
        user,
        isAuthenticated: !!user,
        isLoading: true,
        authStatus: "loading",
      });
      phaseDebug("auth", "onAuthStateChanged", {
        hasUser: !!user,
        uid: user?.uid ?? null,
      });

      try {
        if (user) {
          if (__DEV__) {
            console.log("[auth.store] Fetching profile for uid:", user.uid);
          }
          await get().fetchProfile(user.uid);
          persistAuthSnapshot(user, get().profile);
          if (__DEV__) {
            console.log(
              "[auth.store] Profile fetch done. profile:",
              !!get().profile,
              "error:",
              get().profileError,
            );
          }
        } else {
          if (__DEV__) {
            console.log("[auth.store] No user — clearing profile.");
          }
          clearAuthSnapshot();
          set({ profile: null, profileError: null });
        }
      } finally {
        if (active) {
          set({
            isLoading: false,
            isInitializing: false,
            authStatus: user ? "authenticated" : "unauthenticated",
          });
          if (__DEV__) {
            console.log(
              "[auth.store] Auth ready — isAuthenticated:",
              get().isAuthenticated,
            );
          }

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
