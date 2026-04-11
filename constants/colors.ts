// ─── Perplexity-inspired teal palette ──────────────────────────────────────
export const lightColors = {
  background: "#FFFFFF",
  foreground: "#0E1117",
  card: "#FFFFFF",
  cardBorder: "#E0E4EF",
  surface: "#F2F5FB",
  primary: "#0EA5B0",
  primaryForeground: "#FFFFFF",
  secondary: "#EEF2FA",
  secondaryForeground: "#3B4369",
  muted: "#9099B8",
  mutedForeground: "#636B8A",
  accent: "#1DB89A",
  accentForeground: "#FFFFFF",
  destructive: "#EF4444",
  glassBg: "rgba(255, 255, 255, 0.76)",
  glassBorder: "rgba(224, 228, 239, 0.76)",
  tabBar: "rgba(255, 255, 255, 0.90)",
  tabBarBorder: "rgba(0, 0, 0, 0.07)",
};

export const darkColors = {
  background: "#16181C",
  foreground: "#F2F4FA",
  card: "#16181C",
  cardBorder: "#2A2D3A",
  surface: "#22252F",
  primary: "#22C4D5",
  primaryForeground: "#0A1016",
  secondary: "#2A2D3A",
  secondaryForeground: "#C8CCE0",
  muted: "#5B6080",
  mutedForeground: "#8B90AA",
  accent: "#25D0AD",
  accentForeground: "#0A1016",
  destructive: "#F87171",
  glassBg: "rgba(22, 24, 28, 0.76)",
  glassBorder: "rgba(42, 45, 58, 0.76)",
  tabBar: "rgba(22, 24, 28, 0.90)",
  tabBarBorder: "rgba(255, 255, 255, 0.07)",
};

export type ThemeColors = typeof lightColors;
