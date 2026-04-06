/**
 * HuGoal Design System — Single import point
 *
 * Usage:
 *   import * as DS from '@/constants/design-system';
 *   DS.spacing.md       // 16
 *   DS.typography.h1    // { fontSize: 28, fontWeight: '700', ... }
 *   DS.duration.normal  // 200
 *   DS.elevation.sm     // cross-platform shadow style
 *   DS.radius.lg        // 16
 */

export { spacing } from "./spacing";
export { typography } from "./typography";
export { duration, easing } from "./animation";
export { elevation } from "./elevation";
export { radius } from "./radius";

// Re-export color palettes for convenience
export { lightColors, darkColors } from "./colors";
export type { ThemeColors } from "./colors";
