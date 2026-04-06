import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
  }
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `${secs}s`;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

/**
 * Blur the currently focused element on web to avoid hiding a focused element
 * when an ancestor is marked `aria-hidden` (e.g. when opening a modal).
 */
export function blurActiveElementOnWeb(): void {
  try {
    if (typeof document === "undefined") return;
    const el = document.activeElement as HTMLElement | null;
    if (el && typeof el.blur === "function") {
      el.blur();
    }
  } catch (e) {
    // swallow errors, this is a best-effort accessibility helper
    // eslint-disable-next-line no-console
    console.warn("[a11y] blurActiveElementOnWeb failed", e);
  }
}

/**
 * Try to restore focus to a previously focused element on web.
 */
export function restoreFocusOnWeb(prev?: HTMLElement | null): void {
  try {
    if (typeof document === "undefined") return;
    if (prev && typeof prev.focus === "function") {
      prev.focus();
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[a11y] restoreFocusOnWeb failed", e);
  }
}
