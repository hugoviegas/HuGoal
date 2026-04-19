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
): Promise<ChatServiceResponse> {
  const authState = useAuthStore.getState();
  const appContext = await getAppContextText(args.userId);
  const memoriesBlock = getMemoryPromptBlock();

  const text = await sendHomeChatMessage({
    preferredProvider: args.preferredProvider,
    userMessage: args.message,
    profile: authState.profile,
    history: toHomeHistory(args.history),
    appContext: appContext ?? undefined,
    userMemoriesBlock: memoriesBlock || undefined,
  });

  return { kind: "text", text };
}

async function sendNutritionContext(
  args: HandlerArgs,
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
    });
  } catch {
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
  });

  return { kind: "text", text: fallbackText };
}

async function sendCommunityContext(
  args: HandlerArgs,
): Promise<ChatServiceResponse> {
  return sendHomeContext(args);
}

export async function routeMessage(
  context: ChatContext,
  message: string,
  history: ChatMessage[],
  deps: ChatRouteDeps = {},
): Promise<ChatServiceResponse> {
  const route = CONTEXT_ROUTES[context];
  const preferredProvider = getPreferredProvider();

  if (context === "nutrition") {
    return sendNutritionContext({
      message,
      history,
      preferredProvider,
      userId: deps.userId,
    });
  }

  if (context === "workouts") {
    return sendWorkoutsContext({
      message,
      history,
      preferredProvider,
      userId: deps.userId,
    });
  }

  if (context === "community") {
    return sendCommunityContext({
      message,
      history,
      preferredProvider,
      userId: deps.userId,
    });
  }

  return sendHomeContext({
    message,
    history,
    preferredProvider,
    userId: deps.userId,
  });
}

export async function sendMessage(
  context: ChatContext,
  message: string,
  history: ChatMessage[],
  deps: ChatRouteDeps = {},
): Promise<ChatServiceResponse> {
  return routeMessage(context, message, history, deps);
}

export function getChatRouteMap(): Record<ChatContext, ChatRouteDefinition> {
  return CONTEXT_ROUTES;
}
