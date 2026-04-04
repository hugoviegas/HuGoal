import { create } from 'zustand';
import { Appearance } from 'react-native';
import { lightColors, darkColors, type ThemeColors } from '@/constants/colors';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
}

function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === 'system') {
    return Appearance.getColorScheme() === 'dark';
  }
  return mode === 'dark';
}

export const useThemeStore = create<ThemeState>((set) => {
  const isDark = resolveIsDark('system');
  return {
    mode: 'system',
    isDark,
    colors: isDark ? darkColors : lightColors,

    setMode: (mode) => {
      const dark = resolveIsDark(mode);
      set({ mode, isDark: dark, colors: dark ? darkColors : lightColors });
    },
  };
});
