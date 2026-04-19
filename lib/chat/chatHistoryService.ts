import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import * as SecureStore from "expo-secure-store";
import { generateId } from "@/lib/utils";

import { db } from "@/lib/firebase";
import { decryptMessages, encryptMessages } from "@/lib/chat/chatCrypto";
import {
  cacheMessages,
  clearCache,
  getCachedMessages,
  isCacheStale,
} from "@/lib/chat/chatLocalCache";
import type { ChatContext, ChatMessage } from "@/stores/chat.store";

const DEVICE_ID_KEY = "chat_history_device_id";
const ARCHIVE_TTL_DAYS = 30;

export interface ChatSessionDocument {
  sessionId: string;
  context: ChatContext;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  messageCount: number;
  preview: string;
  encryptedMessages: string;
  deviceId: string;
  isArchived: boolean;
}

export interface ChatMemoryDocument {
  id: string;
  category: "preference" | "goal" | "habit" | "constraint" | "personality";
  content: string;
  extractedAt: Timestamp | null;
  sourceSessionId: string;
  weight: number;
}

interface LoadSessionOptions {
  forceRemote?: boolean;
}

function sessionsCollection(uid: string) {
  return collection(db, "users", uid, "chat_sessions");
}

function sessionDoc(uid: string, sessionId: string) {
  return doc(db, "users", uid, "chat_sessions", sessionId);
}

async function getDeviceId(): Promise<string> {
  // Prefer SecureStore when available (native mobile). Fall back to
  // localStorage (web) or in-memory if neither is accessible.
  try {
    // isAvailableAsync returns false on unsupported platforms; guard calls.
    const available =
      typeof SecureStore.isAvailableAsync === "function"
        ? await SecureStore.isAvailableAsync()
        : false;

    if (available) {
      const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
      if (existing) {
        return existing;
      }

      const created = `device_${generateId().slice(0, 12)}`;
      await SecureStore.setItemAsync(DEVICE_ID_KEY, created);
      return created;
    }
  } catch (e) {
    // If SecureStore throws (e.g., in web environment where native module
    // may be partially present), fall through to localStorage fallback.
  }

  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const existing = window.localStorage.getItem(DEVICE_ID_KEY);
      if (existing) {
        return existing;
      }

      const created = `device_${generateId().slice(0, 12)}`;
      window.localStorage.setItem(DEVICE_ID_KEY, created);
      return created;
    }
  } catch (e) {
    // ignore localStorage errors (private mode, etc.)
  }

  // Last resort: generate a volatile device id (will not persist across reloads).
  return `device_${generateId().slice(0, 12)}`;
}

function getPreview(messages: ChatMessage[]): string {
  const firstUserMessage = messages.find(
    (message) => message.role === "user" && typeof message.text === "string",
  );

  return (firstUserMessage?.text ?? "").slice(0, 60);
}

function toSessionDocument(
  sessionId: string,
  data: Record<string, unknown>,
): ChatSessionDocument {
  return {
    sessionId,
    context: (data.context as ChatContext) ?? "home",
    createdAt: (data.createdAt as Timestamp | null) ?? null,
    updatedAt: (data.updatedAt as Timestamp | null) ?? null,
    messageCount: typeof data.messageCount === "number" ? data.messageCount : 0,
    preview: typeof data.preview === "string" ? data.preview : "",
    encryptedMessages:
      typeof data.encryptedMessages === "string" ? data.encryptedMessages : "",
    deviceId: typeof data.deviceId === "string" ? data.deviceId : "",
    isArchived: Boolean(data.isArchived),
  };
}

export async function createSession(
  uid: string,
  context: ChatContext,
): Promise<ChatSessionDocument> {
  const sessionId = generateId().slice(0, 10);
  const deviceId = await getDeviceId();

  await setDoc(sessionDoc(uid, sessionId), {
    sessionId,
    context,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    messageCount: 0,
    preview: "",
    encryptedMessages: "",
    deviceId,
    isArchived: false,
  });

  return {
    sessionId,
    context,
    createdAt: null,
    updatedAt: null,
    messageCount: 0,
    preview: "",
    encryptedMessages: "",
    deviceId,
    isArchived: false,
  };
}

export async function appendToSession(
  uid: string,
  sessionId: string,
  messages: ChatMessage[],
): Promise<void> {
  const encryptedMessages = await encryptMessages(uid, messages);
  const deviceId = await getDeviceId();

  await setDoc(
    sessionDoc(uid, sessionId),
    {
      encryptedMessages,
      messageCount: messages.length,
      preview: getPreview(messages),
      updatedAt: serverTimestamp(),
      deviceId,
      isArchived: false,
    },
    { merge: true },
  );

  cacheMessages(sessionId, messages);
}

export async function loadSession(
  uid: string,
  sessionId: string,
  options: LoadSessionOptions = {},
): Promise<ChatMessage[]> {
  if (!options.forceRemote) {
    const cached = getCachedMessages(sessionId);
    if (cached) {
      if (isCacheStale(sessionId)) {
        void loadSession(uid, sessionId, { forceRemote: true });
      }
      return cached;
    }
  }

  const snap = await getDoc(sessionDoc(uid, sessionId));
  if (!snap.exists()) {
    return [];
  }

  const data = snap.data();
  const encryptedMessages =
    typeof data.encryptedMessages === "string" ? data.encryptedMessages : "";
  const messages = await decryptMessages(uid, encryptedMessages);
  cacheMessages(sessionId, messages);
  return messages;
}

export async function listSessions(
  uid: string,
  context: ChatContext,
  maxResults = 20,
): Promise<ChatSessionDocument[]> {
  const sessionsQuery = query(
    sessionsCollection(uid),
    where("context", "==", context),
    where("isArchived", "==", false),
    orderBy("updatedAt", "desc"),
    limit(maxResults),
  );

  const snapshot = await getDocs(sessionsQuery);
  return snapshot.docs.map((entry) =>
    toSessionDocument(entry.id, entry.data() as Record<string, unknown>),
  );
}

export async function listArchivedSessions(
  uid: string,
  context: ChatContext,
  maxResults = 20,
): Promise<ChatSessionDocument[]> {
  const sessionsQuery = query(
    sessionsCollection(uid),
    where("context", "==", context),
    where("isArchived", "==", true),
    orderBy("updatedAt", "desc"),
    limit(maxResults),
  );

  const snapshot = await getDocs(sessionsQuery);
  return snapshot.docs.map((entry) =>
    toSessionDocument(entry.id, entry.data() as Record<string, unknown>),
  );
}

export async function archiveSession(
  uid: string,
  sessionId: string,
): Promise<void> {
  await setDoc(
    sessionDoc(uid, sessionId),
    {
      isArchived: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  clearCache(sessionId);
}

export async function deleteExpiredArchivedSessions(
  uid: string,
): Promise<void> {
  const threshold = Timestamp.fromDate(
    new Date(Date.now() - ARCHIVE_TTL_DAYS * 24 * 60 * 60 * 1000),
  );

  const expiredQuery = query(
    sessionsCollection(uid),
    where("isArchived", "==", true),
    where("updatedAt", "<=", threshold),
    limit(100),
  );

  const snapshot = await getDocs(expiredQuery);
  if (snapshot.empty) {
    return;
  }

  const batch = writeBatch(db);
  snapshot.docs.forEach((entry) => {
    batch.delete(entry.ref);
  });
  await batch.commit();

  snapshot.docs.forEach((entry) => {
    clearCache(entry.id);
  });
}

export async function deleteSession(
  uid: string,
  sessionId: string,
): Promise<void> {
  await deleteDoc(sessionDoc(uid, sessionId));
  clearCache(sessionId);
}

export async function unarchiveSession(
  uid: string,
  sessionId: string,
): Promise<void> {
  await setDoc(
    sessionDoc(uid, sessionId),
    { isArchived: false, updatedAt: serverTimestamp() },
    { merge: true },
  );

  clearCache(sessionId);
}
