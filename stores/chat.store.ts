import { create } from "zustand";

export type ChatState = "hidden" | "collapsed" | "expanded" | "fullscreen";
export type ChatContext = "home" | "workouts" | "nutrition" | "community";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
}

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
}));
