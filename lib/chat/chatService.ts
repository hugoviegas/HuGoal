import { sendHomeChatMessage } from "@/lib/ai/homeChatAI";
import {
  analyzeNutritionReviewText,
  type FoodCandidate,
  type NutritionChatPantryItem,
  type NutritionReviewItem,
} from "@/lib/ai/nutritionChatAI";
import { analyzeWorkoutChatMessage } from "@/lib/ai/workoutChatAI";
import {
  formatAppContextSnapshot,
  getAppContextSnapshotWithTimeout,
} from "@/lib/chat/appContextQuery";
import { injectMemoriesIntoPrompt } from "@/lib/chat/chatMemoryService";
import { listPantryItems } from "@/lib/firestore/pantry";
import { useAuthStore } from "@/stores/auth.store";
import { useChatStore } from "@/stores/chat.store";
import type { ChatContext, ChatMessage } from "@/stores/chat.store";
import type { WorkoutTemplateRecord } from "@/lib/firestore/workouts";
import type { WorkoutChatMessage } from "@/stores/workout.store";
import type { AIProvider } from "@/types";
import { getProviderCapabilities } from "@/lib/ai-provider";

export type ChatServiceResponse =
  | { kind: "text"; text: string }
  | { kind: "nutrition_review"; items: NutritionReviewItem[]; text: string }
  | {
      kind: "workout";
      action:
        | "patch_workout"
        | "create_workout"
        | "substitute_exercise"
        | "none";
      text: string;
      patch?: Partial<WorkoutTemplateRecord>;
      newTemplate?: Omit<
        WorkoutTemplateRecord,
        "id" | "created_at" | "updated_at"
      >;
    }
  | { kind: "app_data"; text: string; payload?: unknown };

interface ChatRouteDefinition {
  endpoint: string;
  systemPromptTag: string;
}

interface HandlerArgs {
  message: string;
  history: ChatMessage[];
  preferredProvider: AIProvider;
  userId?: string;
}

const CONTEXT_ROUTES: Record<ChatContext, ChatRouteDefinition> = {
  home: { endpoint: "/ai/home-chat", systemPromptTag: "home_coach" },
  workouts: { endpoint: "/ai/workouts-chat", systemPromptTag: "workout_coach" },
  nutrition: {
    endpoint: "/ai/nutrition-chat",
    systemPromptTag: "nutrition_coach",
  },
  community: {
    endpoint: "/ai/community-chat",
    systemPromptTag: "community_coach",
  },
};

export interface ChatRouteDeps {
  userId?: string;
  onAssistantToken?: (token: string) => void;
  enableStreaming?: boolean;
  signal?: AbortSignal;
}

const OFFLINE_PROBE_URL = "https://clients3.google.com/generate_204";
const OFFLINE_PROBE_TIMEOUT_MS = 2500;

const inFlightRequests = new Map<
  ChatContext,
  { controller: AbortController; requestId: number }
>();
let requestSequence = 0;

function createAbortError(message: string): Error {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}

function beginRequest(context: ChatContext): {
  signal: AbortSignal;
  requestId: number;
} {
  const previous = inFlightRequests.get(context);
  if (previous) {
    previous.controller.abort();
  }

  const controller = new AbortController();
  const requestId = ++requestSequence;
  inFlightRequests.set(context, { controller, requestId });

  return { signal: controller.signal, requestId };
}

function finalizeRequest(context: ChatContext, requestId: number): void {
  const current = inFlightRequests.get(context);
  if (current?.requestId === requestId) {
    inFlightRequests.delete(context);
  }
}

async function assertOnline(signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    throw createAbortError("Request cancelled");
  }

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort();
  }, OFFLINE_PROBE_TIMEOUT_MS);

  try {
    await fetch(OFFLINE_PROBE_URL, {
      method: "GET",
      cache: "no-store",
      signal: timeoutController.signal,
    });
  } catch {
    throw new Error("You're offline - check your connection");
  } finally {
    clearTimeout(timeoutId);
  }
}

function getPreferredProvider(): AIProvider {
  return useAuthStore.getState().profile?.preferred_ai_provider ?? "gemini";
}

function getMemoryPromptBlock(): string {
  return injectMemoriesIntoPrompt(useChatStore.getState().memories);
}

function toHomeHistory(
  history: ChatMessage[],
): Array<{ role: "user" | "assistant"; text: string }> {
  return history.flatMap((message) => {
    if (message.type !== "text" || typeof message.text !== "string") {
      return [];
    }

    return [
      {
        role: message.role,
        text: message.text,
      },
    ];
  });
}

function toNutritionReviewHistoryItems(
  history: ChatMessage[],
): NutritionReviewItem[] {
  return history.flatMap((message) => {
    if (message.type === "nutrition_review") {
      return message.items;
    }

    if (message.type !== "nutrition_card") {
      return [];
    }

    return message.payload.map((item, index): NutritionReviewItem => {
      const per100g = {
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
      };

      const candidate: FoodCandidate = {
        name: item.name,
        confidence:
          item.confidence === "high"
            ? 0.95
            : item.confidence === "medium"
              ? 0.8
              : 0.6,
        per100g,
        source: item.source === "pantry" ? "pantry" : "generic",
      };

      return {
        id: `${message.id}-${index}`,
        candidates: [candidate],
        selectedCandidateIndex: 0,
        weight_g: Math.max(1, item.quantity),
      };
    });
  });
}

function toWorkoutHistory(history: ChatMessage[]): WorkoutChatMessage[] {
  return history.slice(-12).map((message) => ({
    id: message.id,
    createdAt: message.createdAt,
    text: message.text ?? "",
    type:
      message.type === "text" && message.role === "user"
        ? "user_text"
        : "ai_response",
  }));
}

function mapPantryItems(
  items: Awaited<ReturnType<typeof listPantryItems>>,
): NutritionChatPantryItem[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    calories: item.calories_per_100g,
    protein_g: item.protein_per_100g,
    carbs_g: item.carbs_per_100g,
    fat_g: item.fat_per_100g,
    serving_size_g: item.serving_size_g,
  }));
}

async function getAppContextText(userId?: string): Promise<string | null> {
  if (!userId) {
    return null;
  }

  const snapshot = await getAppContextSnapshotWithTimeout(userId, 3000).catch(
    () => null,
  );
  return snapshot ? formatAppContextSnapshot(snapshot) : null;
}

async function sendHomeContext(
  args: HandlerArgs,
  options?: {
    signal?: AbortSignal;
    onAssistantToken?: (token: string) => void;
    enableStreaming?: boolean;
  },
): Promise<ChatServiceResponse> {
  const authState = useAuthStore.getState();
  const appContext = await getAppContextText(args.userId);
  const memoriesBlock = getMemoryPromptBlock();
  const supportsStreaming = getProviderCapabilities(
    args.preferredProvider,
  ).supportsStreaming;
  const shouldStream =
    options?.enableStreaming === true &&
    supportsStreaming &&
    typeof options.onAssistantToken === "function";

  const text = await sendHomeChatMessage({
    preferredProvider: args.preferredProvider,
    userMessage: args.message,
    profile: authState.profile,
    history: toHomeHistory(args.history),
    appContext: appContext ?? undefined,
    userMemoriesBlock: memoriesBlock || undefined,
    signal: options?.signal,
    stream: shouldStream,
    onToken: options?.onAssistantToken,
  });

  return { kind: "text", text };
}

async function sendNutritionContext(
  args: HandlerArgs,
  options?: { signal?: AbortSignal },
): Promise<ChatServiceResponse> {
  const authState = useAuthStore.getState();
  const appContext = await getAppContextText(args.userId);
  const memoriesBlock = getMemoryPromptBlock();

  let pantryItems: NutritionChatPantryItem[] = [];
  if (authState.user?.uid) {
    try {
      pantryItems = mapPantryItems(await listPantryItems(authState.user.uid));
    } catch {
      pantryItems = [];
    }
  }

  let response;
  try {
    response = await analyzeNutritionReviewText({
      preferredProvider: args.preferredProvider,
      userMessage: args.message,
      pantryItems,
      previousItems: toNutritionReviewHistoryItems(args.history),
      memoryPromptBlock: memoriesBlock || undefined,
      signal: options?.signal,
    });
  } catch {
    const fallbackText = await sendHomeChatMessage({
      preferredProvider: args.preferredProvider,
      userMessage: args.message,
      profile: authState.profile,
      history: toHomeHistory(args.history),
      appContext: appContext ?? undefined,
      userMemoriesBlock: memoriesBlock || undefined,
      signal: options?.signal,
    });

    return { kind: "text", text: fallbackText };
  }

  if (response.items.length > 0) {
    return {
      kind: "nutrition_review",
      items: response.items,
      text: appContext
        ? `Nutrition review ready with app context available.\n${appContext}`
        : `Nutrition review ready: ${response.items.length} item${response.items.length === 1 ? "" : "s"}.`,
    };
  }

  const fallbackText = await sendHomeChatMessage({
    preferredProvider: args.preferredProvider,
    userMessage: args.message,
    profile: authState.profile,
    history: toHomeHistory(args.history),
    appContext: appContext ?? undefined,
    userMemoriesBlock: memoriesBlock || undefined,
  });

  return { kind: "text", text: fallbackText };
}

async function sendWorkoutsContext(
  args: HandlerArgs,
  options?: { signal?: AbortSignal },
): Promise<ChatServiceResponse> {
  const authState = useAuthStore.getState();
  const appContext = await getAppContextText(args.userId);
  const memories = useChatStore.getState().memories;

  const response = await analyzeWorkoutChatMessage({
    preferredProvider: args.preferredProvider,
    userMessage: args.message,
    sessionContext: {
      template_id: "global-chat-template",
      template_name:
        useAuthStore.getState().profile?.name ?? "Global Workout Context",
      difficulty: "beginner",
      estimated_duration_minutes: 45,
      location: "home",
      target_muscles: [],
      sections: [],
      user_equipment: ["bodyweight"],
      user_locations: [],
      user_training_days: [],
      user_fitness_goal: authState.profile?.goal ?? "general_fitness",
      today_override: null,
    },
    previousMessages: toWorkoutHistory(args.history),
    userMemories: memories.slice(0, 10).map((memory) => ({
      category: memory.category,
      content: memory.content,
    })),
    signal: options?.signal,
  });

  if (response.action !== "none") {
    return {
      kind: "workout",
      action: response.action,
      text: response.text || "Workout update ready.",
      patch: response.patch,
      newTemplate: response.newTemplate,
    };
  }

  const fallbackText = await sendHomeChatMessage({
    preferredProvider: args.preferredProvider,
    userMessage: args.message,
    profile: authState.profile,
    history: toHomeHistory(args.history),
    appContext: appContext ?? undefined,
    userMemoriesBlock: getMemoryPromptBlock() || undefined,
    signal: options?.signal,
  });

  return { kind: "text", text: fallbackText };
}

async function sendCommunityContext(
  args: HandlerArgs,
  options?: {
    signal?: AbortSignal;
    onAssistantToken?: (token: string) => void;
    enableStreaming?: boolean;
  },
): Promise<ChatServiceResponse> {
  return sendHomeContext(args, options);
}

export async function routeMessage(
  context: ChatContext,
  message: string,
  history: ChatMessage[],
  deps: ChatRouteDeps = {},
): Promise<ChatServiceResponse> {
  const route = CONTEXT_ROUTES[context];
  void route;
  const preferredProvider = getPreferredProvider();
  const signal = deps.signal;

  if (context === "nutrition") {
    return sendNutritionContext(
      {
        message,
        history,
        preferredProvider,
        userId: deps.userId,
      },
      { signal },
    );
  }

  if (context === "workouts") {
    return sendWorkoutsContext(
      {
        message,
        history,
        preferredProvider,
        userId: deps.userId,
      },
      { signal },
    );
  }

  if (context === "community") {
    return sendCommunityContext(
      {
        message,
        history,
        preferredProvider,
        userId: deps.userId,
      },
      {
        signal,
        onAssistantToken: deps.onAssistantToken,
        enableStreaming: deps.enableStreaming,
      },
    );
  }

  return sendHomeContext(
    {
      message,
      history,
      preferredProvider,
      userId: deps.userId,
    },
    {
      signal,
      onAssistantToken: deps.onAssistantToken,
      enableStreaming: deps.enableStreaming,
    },
  );
}

export async function sendMessage(
  context: ChatContext,
  message: string,
  history: ChatMessage[],
  deps: ChatRouteDeps = {},
): Promise<ChatServiceResponse> {
  const { signal, requestId } = beginRequest(context);

  try {
    await assertOnline(signal);
    return await routeMessage(context, message, history, {
      ...deps,
      signal,
    });
  } finally {
    finalizeRequest(context, requestId);
  }
}

export function getChatRouteMap(): Record<ChatContext, ChatRouteDefinition> {
  return CONTEXT_ROUTES;
}
