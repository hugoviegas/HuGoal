import { create } from 'zustand';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getDocument } from '@/lib/firestore';
import type { UserProfile } from '@/types';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  fetchProfile: (uid: string) => Promise<void>;
  initialize: () => () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setProfile: (profile) => set({ profile }),

  fetchProfile: async (uid) => {
    const profile = await getDocument<UserProfile>('profiles', uid);
    set({ profile });
  },

  initialize: () => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      set({ user, isAuthenticated: !!user, isLoading: false });
      if (user) {
        await get().fetchProfile(user.uid);
      } else {
        set({ profile: null });
      }
    });
    return unsubscribe;
  },
}));
