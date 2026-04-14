import { useCallback, useEffect, useRef, useState } from 'react';
import { differenceInCalendarDays, startOfDay } from 'date-fns';
import { useAuthStore } from '@/stores/auth.store';
import { updateDocument } from '@/lib/firestore';

export interface StreakBrokenInfo {
  previousStreak: number;
}

/**
 * Validates the streak on mount. If the user missed a workout day (gap > 1),
 * resets streak to 0, persists to Firestore, and returns alert info.
 *
 * Uses a session-scoped ref so the alert only fires once per app session.
 */
export function useStreakValidator() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);

  // Session guard — prevent re-alerting after the component re-mounts within the same session.
  const hasValidatedRef = useRef(false);

  const [brokenInfo, setBrokenInfo] = useState<StreakBrokenInfo | null>(null);

  useEffect(() => {
    if (!user?.uid || !profile) return;
    if (hasValidatedRef.current) return;

    const streak = profile.streak_current ?? 0;
    const lastActivity = profile.last_activity_date;

    if (streak === 0 || !lastActivity) {
      hasValidatedRef.current = true;
      return;
    }

    const today = startOfDay(new Date());
    const last = startOfDay(new Date(lastActivity));
    const diff = differenceInCalendarDays(today, last);

    if (diff <= 1) {
      hasValidatedRef.current = true;
      return;
    }

    // Streak is broken — mark validated immediately to avoid double-fire
    hasValidatedRef.current = true;
    const previousStreak = streak;

    // Optimistic store update
    setProfile({
      ...profile,
      streak_current: 0,
      updated_at: new Date().toISOString(),
    });

    // Persist to Firestore (fire-and-forget; non-fatal if it fails)
    updateDocument('profiles', user.uid, {
      streak_current: 0,
      updated_at: new Date().toISOString(),
    }).catch((err: unknown) => {
      console.error('[useStreakValidator] Failed to persist streak reset', err);
    });

    setBrokenInfo({ previousStreak });
  }, [user?.uid, profile?.streak_current, profile?.last_activity_date]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = useCallback(() => setBrokenInfo(null), []);

  return { brokenInfo, dismiss };
}
