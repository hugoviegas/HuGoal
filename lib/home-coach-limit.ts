import AsyncStorage from "@react-native-async-storage/async-storage";

export const HOME_COACH_DAILY_LIMIT = 20;

function getTodayDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function storageKey(userId: string): string {
  return `home_coach_limit:${userId}:${getTodayDateKey()}`;
}

export async function getHomeChatUsed(userId: string): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

export async function incrementHomeChatUsed(userId: string): Promise<number> {
  try {
    const key = storageKey(userId);
    const current = await getHomeChatUsed(userId);
    const next = current + 1;
    await AsyncStorage.setItem(key, String(next));
    return next;
  } catch {
    return HOME_COACH_DAILY_LIMIT;
  }
}

export function getRemainingMessages(used: number): number {
  return Math.max(0, HOME_COACH_DAILY_LIMIT - used);
}
