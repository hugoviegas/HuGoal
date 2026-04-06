import { Easing } from "react-native-reanimated";

/**
 * HuGoal Design Tokens — Animation
 * Durations and easing functions for consistent motion.
 */
export const duration = {
  /** 100ms — micro feedback (tap highlight, checkbox tick) */
  fast: 100,
  /** 200ms — UI transitions (sheet open, tab switch) */
  normal: 200,
  /** 350ms — modal enter/exit, page transitions */
  slow: 350,
  /** 500ms — skeleton shimmer, progress fill */
  slower: 500,
} as const;

export const easing = {
  /** Standard curve — used for most transitions */
  standard: Easing.bezier(0.4, 0, 0.2, 1),
  /** Decelerate — element enters the screen */
  decelerate: Easing.bezier(0, 0, 0.2, 1),
  /** Accelerate — element exits the screen */
  accelerate: Easing.bezier(0.4, 0, 1, 1),
  /** Sharp — used for quick precise actions */
  sharp: Easing.bezier(0.4, 0, 0.6, 1),
} as const;

export type DurationKey = keyof typeof duration;
