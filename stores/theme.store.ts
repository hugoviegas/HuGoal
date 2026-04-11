import { create } from 'zustand';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, type ThemeColors } from '@/constants/colors';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_MODE_STORAGE_KEY = 'theme_mode';

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  initialized: boolean;
  setMode: (mode: ThemeMode) => void;
  initialize: () => Promise<void>;
  syncWithSystem: () => void;
}

function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === 'system') {
    return Appearance.getColorScheme() === 'dark';
  }
  return mode === 'dark';
}

export const useThemeStore = create<ThemeState>((set) => {
  const isDark = resolveIsDark('system');

  const applyMode = (mode: ThemeMode) => {
    const dark = resolveIsDark(mode);
    set({ mode, isDark: dark, colors: dark ? darkColors : lightColors });
  };

  return {
    mode: 'system',
    isDark,
    colors: isDark ? darkColors : lightColors,
    initialized: false,

    setMode: (mode) => {
      applyMode(mode);
      AsyncStorage.setItem(THEME_MODE_STORAGE_KEY, mode).catch(() => {
        // Best effort persistence.
      });
    },

    initialize: async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_MODE_STORAGE_KEY);
        if (
          savedMode === 'light' ||
          savedMode === 'dark' ||
          savedMode === 'system'
        ) {
          applyMode(savedMode);
        }
      } finally {
        set({ initialized: true });
      }
    },

    syncWithSystem: () => {
      set((state) => {
        if (state.mode !== 'system') return state;
        const dark = resolveIsDark('system');
        if (dark === state.isDark) return state;
        return { ...state, isDark: dark, colors: dark ? darkColors : lightColors };
      });
    },
  };
});
