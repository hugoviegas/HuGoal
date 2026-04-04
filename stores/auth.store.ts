import { create } from 'zustand';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getDocument, updateDocument } from '@/lib/firestore';
import type { UserProfile } from '@/types';

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
  logout: () => Promise<void>;
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
      const profile = await getDocument<UserProfile>('profiles', uid);
      set({ profile });
    } catch (e: any) {
      set({ profileError: e?.message ?? 'Failed to load profile' });
    }
  },

  retryFetchProfile: async () => {
    const { user } = get();
    if (user) await get().fetchProfile(user.uid);
  },

  setOnboardingCompleted: async (value) => {
    const { user } = get();
    if (!user) return;
    await updateDocument('profiles', user.uid, { onboarding_complete: value });
    set((state) => ({
      profile: state.profile ? { ...state.profile, onboarding_complete: value } : state.profile,
    }));
  },

  logout: async () => {
    await signOut(auth);
    set({ user: null, profile: null, isAuthenticated: false, profileError: null });
  },

  initialize: () => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      set({ user, isAuthenticated: !!user, isLoading: false, isInitializing: false });
      if (user) {
        await get().fetchProfile(user.uid);
      } else {
        set({ profile: null });
      }
    });
    return unsubscribe;
  },
}));
