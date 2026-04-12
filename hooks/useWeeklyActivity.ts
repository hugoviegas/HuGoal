import { useEffect, useState } from 'react';
import { queryDocuments, where } from '@/lib/firestore';

interface CompletedSessionRecord {
  ended_at: string;
}

export function useWeeklyActivity(uid: string) {
  const [activeDays, setActiveDays] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;

    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);

    queryDocuments<CompletedSessionRecord>(
      'completed_workout_sessions',
      where('user_id', '==', uid),
      where('ended_at', '>=', since.toISOString())
    )
      .then((sessions) => {
        setActiveDays(new Set(sessions.map((s) => s.ended_at.slice(0, 10))));
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [uid]);

  return { activeDays, isLoading };
}
