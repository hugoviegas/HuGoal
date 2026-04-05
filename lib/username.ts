import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const RESERVED_USERNAMES = [
  "admin",
  "system",
  "root",
  "api",
  "app",
  "support",
  "help",
  "info",
  "test",
  "demo",
] as const;

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  value: boolean;
  expiresAt: number;
};

const availabilityCache = new Map<string, CacheEntry>();

export function validateUsernameFormat(value: string): boolean {
  return USERNAME_REGEX.test(value);
}

export function isReservedUsername(value: string): boolean {
  return RESERVED_USERNAMES.includes(
    value.toLowerCase() as (typeof RESERVED_USERNAMES)[number],
  );
}

export async function checkUsernameAvailable(
  username: string,
): Promise<boolean> {
  if (!validateUsernameFormat(username) || isReservedUsername(username)) {
    return false;
  }

  const cached = availabilityCache.get(username);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const usernameRef = doc(db, "usernames", username);
  const snapshot = await getDoc(usernameRef);
  const available = !snapshot.exists();

  availabilityCache.set(username, {
    value: available,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return available;
}

export function clearUsernameAvailabilityCache() {
  availabilityCache.clear();
}
