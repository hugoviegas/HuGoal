import { Platform } from 'react-native';
import type { TextStyle } from 'react-native';

/**
 * HuGoal Design Tokens — Typography
 * 5-level hierarchy: display, h1, h2, h3, body, small, caption
 * Font: Inter (sans) + SpaceMono (mono) — registered in app.json
 */

const FONT_FAMILY = Platform.select({
  ios: 'Inter',
  android: 'Inter',
  default: 'System',
});

const FONT_FAMILY_MONO = Platform.select({
  ios: 'SpaceMono',
  android: 'SpaceMono',
  default: 'monospace',
});

export const typography = {
  display: {
    fontFamily: FONT_FAMILY,
    fontSize: 36,
    fontWeight: '800' as TextStyle['fontWeight'],
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  h1: {
    fontFamily: FONT_FAMILY,
    fontSize: 28,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  h2: {
    fontFamily: FONT_FAMILY,
    fontSize: 22,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 30,
    letterSpacing: -0.2,
  },
  h3: {
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 26,
    letterSpacing: 0,
  },
  body: {
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 24,
    letterSpacing: 0,
  },
  bodyMedium: {
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 24,
    letterSpacing: 0,
  },
  small: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 20,
    letterSpacing: 0,
  },
  smallMedium: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 20,
    letterSpacing: 0,
  },
  caption: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 16,
    letterSpacing: 0.3,
  },
  label: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as TextStyle['textTransform'],
  },
  mono: {
    fontFamily: FONT_FAMILY_MONO,
    fontSize: 14,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 20,
    letterSpacing: 0,
  },
} as const;

export type TypographyKey = keyof typeof typography;
export type TypographyStyle = (typeof typography)[TypographyKey];
