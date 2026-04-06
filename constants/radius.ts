/**
 * HuGoal Design Tokens — Border Radius
 */
export const radius = {
  /** 4px — badges, small chips */
  xs: 4,
  /** 8px — buttons, small cards */
  sm: 8,
  /** 12px — inputs, toggles */
  md: 12,
  /** 16px — cards, modals */
  lg: 16,
  /** 24px — floating panels, tab bar */
  xl: 24,
  /** 9999 — pills, avatars */
  full: 9999,
} as const;

export type RadiusKey = keyof typeof radius;
