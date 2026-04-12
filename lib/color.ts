function clampAlpha(alpha: number): number {
  if (Number.isNaN(alpha)) return 1;
  if (alpha < 0) return 0;
  if (alpha > 1) return 1;
  return alpha;
}

/**
 * Applies opacity to a color string in a React Native-safe format.
 * Supports #RGB, #RRGGBB and rgb/rgba strings.
 */
export function withOpacity(color: string, alpha: number): string {
  const safeAlpha = clampAlpha(alpha);
  const normalized = color.trim();

  if (normalized.startsWith("#")) {
    const hex = normalized.slice(1);

    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
    }

    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
    }
  }

  const rgbMatch = normalized.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i,
  );
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
  }

  return normalized;
}
