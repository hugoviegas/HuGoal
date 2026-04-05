import { useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface OnboardingDraftData {
  name?: string;
  username?: string;
  avatar_url?: string;
  birth_date?: string;
  age?: number;
  sex?: "male" | "female" | "other";
  height_cm?: number;
  weight_kg?: number;
  goal?: "lose_fat" | "gain_muscle" | "maintain" | "recomp";
  target_timeline?: number;
  level?: "beginner" | "intermediate" | "advanced";
  equipment?: "home" | "gym" | "none";
  available_days_per_week?: number;
  injuries?: string;
  allergies?: string[];
  dietary_restrictions?: string[];
  preferred_cuisines?: string[];
}

function getDraftKey(uid: string) {
  return `onboarding_draft:${uid}`;
}

export function useOnboardingDraft(uid?: string) {
  const loadDraft =
    useCallback(async (): Promise<OnboardingDraftData | null> => {
      if (!uid) return null;
      const raw = await AsyncStorage.getItem(getDraftKey(uid));
      if (!raw) return null;

      try {
        return JSON.parse(raw) as OnboardingDraftData;
      } catch {
        return null;
      }
    }, [uid]);

  const saveDraft = useCallback(
    async (patch: Partial<OnboardingDraftData>) => {
      if (!uid) return;
      const current = (await loadDraft()) ?? {};
      const next = { ...current, ...patch };
      await AsyncStorage.setItem(getDraftKey(uid), JSON.stringify(next));
    },
    [uid, loadDraft],
  );

  const clearDraft = useCallback(async () => {
    if (!uid) return;
    await AsyncStorage.removeItem(getDraftKey(uid));
  }, [uid]);

  return {
    loadDraft,
    saveDraft,
    clearDraft,
  };
}
