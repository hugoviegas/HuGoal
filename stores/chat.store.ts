import { create } from "zustand";

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
  status: "pending" | "confirmed" | "cancelled";
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
  setState: (nextState: ChatState) => void;
  setContext: (context: ChatContext) => void;
  appendMessage: (context: ChatContext, message: ChatMessage) => void;
  setHistory: (context: ChatContext, messages: ChatMessage[]) => void;
  clearContextHistory: (context: ChatContext) => void;
  clearAllHistory: () => void;
  updateMessageStatus: (
    context: ChatContext,
    messageId: string,
    status: "pending" | "confirmed" | "cancelled",
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

export const useChatStore = create<ChatStore>((set) => ({
  state: "hidden",
  activeContext: "home",
  history: EMPTY_HISTORY,

  setState: (nextState) => set({ state: nextState }),

  setContext: (context) => set({ activeContext: context }),

  appendMessage: (context, message) =>
    set((current) => ({
      history: {
        ...current.history,
        [context]: [...current.history[context], message],
      },
    })),

  setHistory: (context, messages) =>
    set((current) => ({
      history: {
        ...current.history,
        [context]: messages,
      },
    })),

  clearContextHistory: (context) =>
    set((current) => ({
      history: {
        ...current.history,
        [context]: [],
      },
    })),

  clearAllHistory: () => set({ history: EMPTY_HISTORY }),

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
