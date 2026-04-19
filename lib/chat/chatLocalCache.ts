import { createMMKV } from "react-native-mmkv";

import type { ChatMessage } from "@/stores/chat.store";

const storage = createMMKV({ id: "hugoal-chat-history" });

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

  storage.set(keyForSession(sessionId), JSON.stringify(messages));
  storage.set(keyForMeta(sessionId), JSON.stringify({ cachedAt: Date.now() }));
}

export function getCachedMessages(sessionId: string): ChatMessage[] | null {
  if (!sessionId) {
    return null;
  }

  const raw = storage.getString(keyForSession(sessionId));
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
  const raw = storage.getString(keyForMeta(sessionId));
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

  storage.remove(keyForSession(sessionId));
  storage.remove(keyForMeta(sessionId));
}
