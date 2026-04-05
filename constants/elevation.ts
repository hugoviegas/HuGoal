import { Platform, type ViewStyle } from 'react-native';

/**
 * BetterU Design Tokens — Elevation
 * Cross-platform shadows for Android (elevation) and iOS (shadow*).
 */

function shadow(
  offsetY: number,
  radius: number,
  opacity: number,
  elevation: number,
): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: { elevation },
    default: {},
  }) as ViewStyle;
}

export const elevation = {
  /** Subtle — input focus ring, chip borders */
  xs: shadow(1, 2, 0.06, 1),
  /** Card — default card lift */
  sm: shadow(2, 4, 0.08, 2),
  /** Sheet — modal/sheet backdrop */
  md: shadow(4, 8, 0.12, 4),
  /** Floating — TabBar, FAB */
  lg: shadow(8, 16, 0.18, 8),
  /** Overlay — dialogs, dropdowns */
  xl: shadow(12, 24, 0.24, 12),
} as const;

export type ElevationKey = keyof typeof elevation;
