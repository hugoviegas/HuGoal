import type { ChatMessage } from "@/stores/chat.store";
import Constants from "expo-constants";

type StorageBackend = {
  set: (key: string, value: string) => void;
  getString: (key: string) => string | undefined;
  remove: (key: string) => void;
};

const memoryStorage = new Map<string, string>();
let storage: StorageBackend | null | undefined;

const isExpoGo =
  Constants.appOwnership === "expo" ||
  Constants.executionEnvironment === "storeClient";

function getStorage(): StorageBackend | null {
  if (storage !== undefined) {
    return storage;
  }

  if (isExpoGo) {
    storage = null;
    return null;
  }

  try {
    const mmkv =
      require("react-native-mmkv") as typeof import("react-native-mmkv");
    storage = mmkv.createMMKV({ id: "hugoal-chat-history" });
    return storage;
  } catch {
    storage = null;
    return null;
  }
}

function setStoredValue(key: string, value: string): void {
  const backend = getStorage();
  if (backend) {
    backend.set(key, value);
    return;
  }

  memoryStorage.set(key, value);
}

function getStoredValue(key: string): string | undefined {
  const backend = getStorage();
  if (backend) {
    return backend.getString(key);
  }

  return memoryStorage.get(key);
}

function removeStoredValue(key: string): void {
  const backend = getStorage();
  if (backend) {
    backend.remove(key);
    return;
  }

  memoryStorage.delete(key);
}

function keyForSession(sessionId: string): string {
  return `chat_session_${sessionId}`;
}

function keyForMeta(sessionId: string): string {
  return `chat_session_meta_${sessionId}`;
}

export function cacheMessages(
  sessionId: string,
  messages: ChatMessage[],
): void {
  if (!sessionId) {
    return;
  }

  setStoredValue(keyForSession(sessionId), JSON.stringify(messages));
  setStoredValue(
    keyForMeta(sessionId),
    JSON.stringify({ cachedAt: Date.now() }),
  );
}

export function getCachedMessages(sessionId: string): ChatMessage[] | null {
  if (!sessionId) {
    return null;
  }

  const raw = getStoredValue(keyForSession(sessionId));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChatMessage[]) : null;
  } catch {
    return null;
  }
}

export function getCachedAt(sessionId: string): number | null {
  const raw = getStoredValue(keyForMeta(sessionId));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { cachedAt?: number };
    return typeof parsed.cachedAt === "number" ? parsed.cachedAt : null;
  } catch {
    return null;
  }
}

export function isCacheStale(
  sessionId: string,
  maxAgeMs = 5 * 60 * 1000,
): boolean {
  const cachedAt = getCachedAt(sessionId);
  if (!cachedAt) {
    return true;
  }

  return Date.now() - cachedAt > maxAgeMs;
}

export function clearCache(sessionId: string): void {
  if (!sessionId) {
    return;
  }

  removeStoredValue(keyForSession(sessionId));
  removeStoredValue(keyForMeta(sessionId));
}
