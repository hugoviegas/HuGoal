import { create } from "zustand";
import { useAuthStore } from "@/stores/auth.store";
import {
  archiveSession,
  createSession,
  deleteSession,
  deleteExpiredArchivedSessions,
  listSessions,
  loadSession,
  appendToSession,
  type ChatMemoryDocument,
} from "@/lib/chat/chatHistoryService";
import {
  extractMemoriesFromSession,
  loadMemories as loadStoredMemories,
} from "@/lib/chat/chatMemoryService";
import type { AIProvider } from "@/types";

export type ChatState = "hidden" | "collapsed" | "expanded" | "fullscreen";
export type ChatContext = "home" | "workouts" | "nutrition" | "community";
export type ChatMessageType =
  | "text"
  | "nutrition_card"
  | "nutrition_review"
  | "workout_card";

export interface ChatBaseMessage {
  id: string;
  role: "user" | "assistant";
  type: ChatMessageType;
  createdAt: string;
  text?: string;
}

export interface ChatTextMessage extends ChatBaseMessage {
  type: "text";
  text: string;
}

export interface ChatNutritionCardMessage extends ChatBaseMessage {
  role: "assistant";
  type: "nutrition_card";
  payload: import("@/lib/ai/nutritionChatAI").NutritionChatItem[];
}

export interface ChatNutritionReviewMessage extends ChatBaseMessage {
  role: "assistant";
  type: "nutrition_review";
  status: "pending" | "confirmed" | "saved" | "cancelled";
  items: import("@/lib/ai/nutritionChatAI").NutritionReviewItem[];
}

export interface ChatWorkoutCardMessage extends ChatBaseMessage {
  role: "assistant";
  type: "workout_card";
  payload: import("@/lib/firestore/workouts").WorkoutTemplateRecord;
}

export type ChatMessage =
  | ChatTextMessage
  | ChatNutritionCardMessage
  | ChatNutritionReviewMessage
  | ChatWorkoutCardMessage;

interface ChatStore {
  state: ChatState;
  activeContext: ChatContext;
  history: Record<ChatContext, ChatMessage[]>;
  activeSessionId: Record<ChatContext, string | null>;
  memories: ChatMemoryDocument[];
  isLoadingHistory: boolean;
  isSyncingToCloud: boolean;
  setState: (nextState: ChatState) => void;
  setContext: (context: ChatContext) => void;
  appendMessage: (context: ChatContext, message: ChatMessage) => void;
  upsertTextMessage: (
    context: ChatContext,
    messageId: string,
    role: "user" | "assistant",
    text: string,
  ) => void;
  setHistory: (context: ChatContext, messages: ChatMessage[]) => void;
  setLoadingHistory: (value: boolean) => void;
  setSyncingToCloud: (value: boolean) => void;
  clearContextHistory: (context: ChatContext) => void;
  clearAllHistory: () => void;
  initSession: (context: ChatContext) => Promise<void>;
  activateSession: (context: ChatContext, sessionId: string) => Promise<void>;
  deleteSessionById: (context: ChatContext, sessionId: string) => Promise<void>;
  startNewChat: (context: ChatContext) => Promise<void>;
  syncToCloud: (context: ChatContext) => Promise<void>;
  loadMemories: () => Promise<void>;
  refreshContextFromCloud: (context: ChatContext) => Promise<void>;
  updateMessageStatus: (
    context: ChatContext,
    messageId: string,
    status: "pending" | "confirmed" | "saved" | "cancelled",
  ) => void;
  updateReviewItem: (
    context: ChatContext,
    messageId: string,
    itemId: string,
    patch: Partial<import("@/lib/ai/nutritionChatAI").NutritionReviewItem>,
  ) => void;
}

const EMPTY_HISTORY: Record<ChatContext, ChatMessage[]> = {
  home: [],
  workouts: [],
  nutrition: [],
  community: [],
};

const EMPTY_SESSION_ID: Record<ChatContext, string | null> = {
  home: null,
  workouts: null,
  nutrition: null,
  community: null,
};

const SYNC_DEBOUNCE_MS = 2000;
const syncTimers: Partial<Record<ChatContext, ReturnType<typeof setTimeout>>> =
  {};

function clearSyncTimer(context: ChatContext): void {
  const existing = syncTimers[context];
  if (existing) {
    clearTimeout(existing);
    syncTimers[context] = undefined;
  }
}

function getPreferredProvider(): AIProvider {
  return useAuthStore.getState().profile?.preferred_ai_provider ?? "gemini";
}

export const useChatStore = create<ChatStore>((set) => ({
  state: "hidden",
  activeContext: "home",
  history: EMPTY_HISTORY,
  activeSessionId: EMPTY_SESSION_ID,
  memories: [],
  isLoadingHistory: false,
  isSyncingToCloud: false,

  setState: (nextState) => set({ state: nextState }),

  setContext: (context) => {
    set({ activeContext: context });
    void useChatStore.getState().initSession(context);
  },

  appendMessage: (context, message) =>
    set((current) => {
      clearSyncTimer(context);
      syncTimers[context] = setTimeout(() => {
        void useChatStore.getState().syncToCloud(context);
      }, SYNC_DEBOUNCE_MS);

      return {
        history: {
          ...current.history,
          [context]: [...current.history[context], message],
        },
      };
    }),

  upsertTextMessage: (context, messageId, role, text) =>
    set((current) => {
      const messages = current.history[context];
      const idx = messages.findIndex((message) => message.id === messageId);

      if (idx === -1) {
        const nextMessage: ChatTextMessage = {
          id: messageId,
          role,
          type: "text",
          text,
          createdAt: new Date().toISOString(),
        };
        return {
          history: {
            ...current.history,
            [context]: [...messages, nextMessage],
          },
        };
      }

      const target = messages[idx];
      if (target.type !== "text") {
        return current;
      }

      const updated: ChatTextMessage = {
        ...target,
        role,
        text,
      };

      const nextMessages = [...messages];
      nextMessages[idx] = updated;
      return {
        history: {
          ...current.history,
          [context]: nextMessages,
        },
      };
    }),

  setHistory: (context, messages) =>
    set((current) => ({
      history: {
        ...current.history,
        [context]: messages,
      },
    })),

  setLoadingHistory: (value) => set({ isLoadingHistory: value }),

  setSyncingToCloud: (value) => set({ isSyncingToCloud: value }),

  clearContextHistory: (context) =>
    set((current) => ({
      history: {
        ...current.history,
        [context]: [],
      },
    })),

  clearAllHistory: () =>
    set({
      history: EMPTY_HISTORY,
      activeSessionId: EMPTY_SESSION_ID,
      memories: [],
    }),

  initSession: async (context) => {
    const uid = useAuthStore.getState().user?.uid;
    if (!uid) {
      return;
    }

    set({ isLoadingHistory: true });
    try {
      void deleteExpiredArchivedSessions(uid).catch(() => undefined);

      const currentSession = useChatStore.getState().activeSessionId[context];
      if (currentSession) {
        const messages = await loadSession(uid, currentSession);
        set((current) => ({
          history: {
            ...current.history,
            [context]: messages,
          },
        }));
        return;
      }

      const existingSessions = await listSessions(uid, context, 1);
      const latestSession =
        existingSessions[0] ?? (await createSession(uid, context));
      const messages = await loadSession(uid, latestSession.sessionId);

      set((current) => ({
        activeSessionId: {
          ...current.activeSessionId,
          [context]: latestSession.sessionId,
        },
        history: {
          ...current.history,
          [context]: messages,
        },
      }));
    } finally {
      set({ isLoadingHistory: false });
    }
  },

  activateSession: async (context, sessionId) => {
    const uid = useAuthStore.getState().user?.uid;
    if (!uid) {
      return;
    }

    const messages = await loadSession(uid, sessionId, { forceRemote: true });
    set((current) => ({
      activeSessionId: {
        ...current.activeSessionId,
        [context]: sessionId,
      },
      history: {
        ...current.history,
        [context]: messages,
      },
    }));
  },

  deleteSessionById: async (context, sessionId) => {
    const uid = useAuthStore.getState().user?.uid;
    if (!uid) {
      return;
    }

    set({ isLoadingHistory: true });
    try {
      await deleteSession(uid, sessionId);

      const currentActive = useChatStore.getState().activeSessionId[context];
      if (currentActive !== sessionId) {
        return;
      }

      const existingSessions = await listSessions(uid, context, 1);
      const latestSession =
        existingSessions[0] ?? (await createSession(uid, context));
      const messages = await loadSession(uid, latestSession.sessionId);

      set((current) => ({
        activeSessionId: {
          ...current.activeSessionId,
          [context]: latestSession.sessionId,
        },
        history: {
          ...current.history,
          [context]: messages,
        },
      }));
    } finally {
      set({ isLoadingHistory: false });
    }
  },

  startNewChat: async (context) => {
    const uid = useAuthStore.getState().user?.uid;
    if (!uid) {
      return;
    }

    const state = useChatStore.getState();
    const sessionId = state.activeSessionId[context];
    const messages = state.history[context];

    set({ isLoadingHistory: true });
    try {
      if (sessionId && messages.length > 0) {
        await extractMemoriesFromSession(
          uid,
          messages,
          sessionId,
          getPreferredProvider(),
        );
      }

      // Create a new session and keep the previous session available in history.
      // Previously we archived the session which removed it from the visible
      // history. To preserve the previous conversation while starting a fresh
      // one, create a new session explicitly and activate it.
      const newSession = await createSession(uid, context);

      set((current) => ({
        history: {
          ...current.history,
          [context]: [],
        },
        activeSessionId: {
          ...current.activeSessionId,
          [context]: newSession.sessionId,
        },
      }));

      await useChatStore.getState().loadMemories();
    } finally {
      set({ isLoadingHistory: false });
    }
  },

  syncToCloud: async (context) => {
    const uid = useAuthStore.getState().user?.uid;
    if (!uid) {
      return;
    }

    const state = useChatStore.getState();
    const sessionId = state.activeSessionId[context];
    if (!sessionId) {
      return;
    }

    set({ isSyncingToCloud: true });
    try {
      await appendToSession(uid, sessionId, state.history[context]);
    } finally {
      set({ isSyncingToCloud: false });
    }
  },

  loadMemories: async () => {
    const uid = useAuthStore.getState().user?.uid;
    if (!uid) {
      set({ memories: [] });
      return;
    }

    const memories = await loadStoredMemories(uid, 10);
    set({ memories });
  },

  refreshContextFromCloud: async (context) => {
    const uid = useAuthStore.getState().user?.uid;
    if (!uid) {
      return;
    }

    const sessionId = useChatStore.getState().activeSessionId[context];
    if (!sessionId) {
      return;
    }

    const messages = await loadSession(uid, sessionId, { forceRemote: true });
    set((current) => ({
      history: {
        ...current.history,
        [context]: messages,
      },
    }));
  },

  updateMessageStatus: (context, messageId, status) =>
    set((current) => ({
      history: {
        ...current.history,
        [context]: current.history[context].map((message) =>
          message.id === messageId && message.type === "nutrition_review"
            ? { ...message, status }
            : message,
        ),
      },
    })),

  updateReviewItem: (context, messageId, itemId, patch) =>
    set((current) => ({
      history: {
        ...current.history,
        [context]: current.history[context].map((message) => {
          if (message.id !== messageId || message.type !== "nutrition_review") {
            return message;
          }

          if (message.status !== "pending") {
            return message;
          }

          return {
            ...message,
            items: message.items.map((item) =>
              item.id === itemId ? { ...item, ...patch } : item,
            ),
          };
        }),
      },
    })),
}));
