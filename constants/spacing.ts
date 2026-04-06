/**
 * HuGoal Design Tokens — Spacing
 * 4px base unit. Used for padding, margin, gap across all components.
 */
export const spacing = {
  /** 4px */ xxs: 4,
  /** 8px */ xs: 8,
  /** 12px */ sm: 12,
  /** 16px */ md: 16,
  /** 20px */ lg: 20,
  /** 24px */ xl: 24,
  /** 32px */ "2xl": 32,
  /** 40px */ "3xl": 40,
  /** 48px */ "4xl": 48,
  /** 64px */ "5xl": 64,
  /** 80px */ "6xl": 80,
  /** 96px */ "7xl": 96,
} as const;

export type SpacingKey = keyof typeof spacing;
export type SpacingValue = (typeof spacing)[SpacingKey];
