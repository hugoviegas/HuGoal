import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ChatMessage, ChatMessageType } from "@/stores/nutrition.store";

const CHAT_KEY_PREFIX = "nutrition:chat";
const CHAT_LAST_DATE_PREFIX = "nutrition:chat:last-date";

function todayDateKey(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function chatStorageKey(uid: string, dateKey: string): string {
  return `${CHAT_KEY_PREFIX}:${uid}:${dateKey}`;
}

function lastDateStorageKey(uid: string): string {
  return `${CHAT_LAST_DATE_PREFIX}:${uid}`;
}

function isChatMessageType(value: unknown): value is ChatMessageType {
  return (
    value === "user_text" ||
    value === "user_audio_transcript" ||
    value === "user_image" ||
    value === "ai_response" ||
    value === "ai_food_items"
  );
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const raw = value as Record<string, unknown>;

  return (
    typeof raw.id === "string" &&
    isChatMessageType(raw.type) &&
    typeof raw.createdAt === "string" &&
    (raw.text === undefined || typeof raw.text === "string") &&
    (raw.payload === undefined ||
      (typeof raw.payload === "object" && raw.payload !== null))
  );
}

async function cleanupIfDateRolled(uid: string): Promise<void> {
  const today = todayDateKey();
  const lastDateKey = await AsyncStorage.getItem(lastDateStorageKey(uid));

  if (!lastDateKey || lastDateKey === today) {
    return;
  }

  await AsyncStorage.removeItem(chatStorageKey(uid, lastDateKey));
  await AsyncStorage.setItem(lastDateStorageKey(uid), today);
}

export async function loadTodayNutritionChatMessages(
  uid: string,
): Promise<ChatMessage[]> {
  await cleanupIfDateRolled(uid);

  const today = todayDateKey();
  const key = chatStorageKey(uid, today);
  const raw = await AsyncStorage.getItem(key);

  if (!raw) {
    await AsyncStorage.setItem(lastDateStorageKey(uid), today);
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    const messages = parsed.filter((entry): entry is ChatMessage =>
      isChatMessage(entry),
    );

    await AsyncStorage.setItem(lastDateStorageKey(uid), today);
    return messages;
  } catch {
    return [];
  }
}

export async function saveTodayNutritionChatMessages(
  uid: string,
  messages: ChatMessage[],
): Promise<void> {
  await cleanupIfDateRolled(uid);

  const today = todayDateKey();
  await AsyncStorage.setItem(
    chatStorageKey(uid, today),
    JSON.stringify(messages),
  );
  await AsyncStorage.setItem(lastDateStorageKey(uid), today);
}

export async function appendTodayNutritionChatMessage(
  uid: string,
  message: ChatMessage,
): Promise<ChatMessage[]> {
  const existing = await loadTodayNutritionChatMessages(uid);
  const updated = [...existing, message];
  await saveTodayNutritionChatMessages(uid, updated);
  return updated;
}

export async function clearTodayNutritionChatMessages(
  uid: string,
): Promise<void> {
  const today = todayDateKey();
  await AsyncStorage.removeItem(chatStorageKey(uid, today));
  await AsyncStorage.setItem(lastDateStorageKey(uid), today);
}
