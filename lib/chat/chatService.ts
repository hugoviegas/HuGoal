import { sendHomeChatMessage } from "@/lib/ai/homeChatAI";
import {
  analyzeNutritionChatText,
  type NutritionChatItem,
  type NutritionChatPantryItem,
} from "@/lib/ai/nutritionChatAI";
import { analyzeWorkoutChatMessage } from "@/lib/ai/workoutChatAI";
import { listPantryItems } from "@/lib/firestore/pantry";
import { useAuthStore } from "@/stores/auth.store";
import { useWorkoutStore } from "@/stores/workout.store";
import type { WorkoutChatMessage } from "@/stores/workout.store";
import type { AIProvider } from "@/types";
import type { ChatContext, ChatMessage } from "@/stores/chat.store";
import type { WorkoutSessionContext } from "@/lib/workouts/workout-session-context";

interface ChatRouteDefinition {
  endpoint: string;
  systemPromptTag: string;
  handler: (args: HandlerArgs) => Promise<string>;
}

interface HandlerArgs {
  message: string;
  history: ChatMessage[];
  preferredProvider: AIProvider;
}

const CONTEXT_ROUTES: Record<ChatContext, ChatRouteDefinition> = {
  home: {
    endpoint: "/ai/home-chat",
    systemPromptTag: "home_coach",
    handler: sendHomeContext,
  },
  workouts: {
    endpoint: "/ai/workouts-chat",
    systemPromptTag: "workout_coach",
    handler: sendWorkoutsContext,
  },
  nutrition: {
    endpoint: "/ai/nutrition-chat",
    systemPromptTag: "nutrition_coach",
    handler: sendNutritionContext,
  },
  community: {
    endpoint: "/ai/community-chat",
    systemPromptTag: "community_coach",
    handler: sendCommunityContext,
  },
};

export interface ChatServiceResult {
  text: string;
  endpoint: string;
}

function getPreferredProvider(): AIProvider {
  return useAuthStore.getState().profile?.preferred_ai_provider ?? "gemini";
}

function summarizeNutritionItems(items: NutritionChatItem[]): string {
  const lines = items.slice(0, 6).map((item) => {
    const macros = `${item.calories} kcal | P ${item.protein_g}g | C ${item.carbs_g}g | F ${item.fat_g}g`;
    return `- ${item.quantity} ${item.unit} ${item.name} (${macros})`;
  });

  if (lines.length === 0) {
    return "I could not identify valid nutrition items from that message.";
  }

  return `I parsed these items:\n${lines.join("\n")}`;
}

function toWorkoutHistory(history: ChatMessage[]): WorkoutChatMessage[] {
  return history.slice(-10).map((message) => ({
    id: message.id,
    createdAt: message.createdAt,
    text: message.text,
    type: message.role === "user" ? "user_text" : "ai_response",
  }));
}

function buildFallbackWorkoutContext(): WorkoutSessionContext {
  const workoutStore = useWorkoutStore.getState();
  const authStore = useAuthStore.getState();

  return {
    template_id: workoutStore.templateId ?? "global-chat-template",
    template_name: workoutStore.templateName ?? "Global Workout Context",
    difficulty: "beginner",
    estimated_duration_minutes: 45,
    location: "home",
    target_muscles: [],
    sections: [],
    user_equipment: ["bodyweight"],
    user_locations: [],
    user_training_days: [],
    user_fitness_goal: authStore.profile?.goal ?? "general_fitness",
    today_override: null,
  };
}

async function sendHomeContext(args: HandlerArgs): Promise<string> {
  const authState = useAuthStore.getState();

  return sendHomeChatMessage({
    preferredProvider: args.preferredProvider,
    userMessage: args.message,
    profile: authState.profile,
    history: args.history.map((item) => ({
      role: item.role,
      text: item.text,
    })),
  });
}

async function sendNutritionContext(args: HandlerArgs): Promise<string> {
  const authState = useAuthStore.getState();

  let pantryItems: NutritionChatPantryItem[] = [];
  if (authState.user?.uid) {
    try {
      const pantryDocs = await listPantryItems(authState.user.uid);
      pantryItems = pantryDocs.map((item) => ({
        id: item.id,
        name: item.name,
        calories: item.calories_per_100g,
        protein_g: item.protein_per_100g,
        carbs_g: item.carbs_per_100g,
        fat_g: item.fat_per_100g,
        serving_size_g: item.serving_size_g,
      }));
    } catch {
      pantryItems = [];
    }
  }

  const response = await analyzeNutritionChatText({
    preferredProvider: args.preferredProvider,
    userMessage: args.message,
    pantryItems,
    previousItems: [],
  });

  return summarizeNutritionItems(response.items);
}

async function sendWorkoutsContext(args: HandlerArgs): Promise<string> {
  const response = await analyzeWorkoutChatMessage({
    preferredProvider: args.preferredProvider,
    userMessage: args.message,
    sessionContext: buildFallbackWorkoutContext(),
    previousMessages: toWorkoutHistory(args.history),
    userMemories: [],
  });

  return response.text || "Updated workout guidance ready.";
}

async function sendCommunityContext(args: HandlerArgs): Promise<string> {
  return sendHomeContext(args);
}

export async function sendMessage(
  context: ChatContext,
  message: string,
  history: ChatMessage[],
): Promise<ChatServiceResult> {
  const route = CONTEXT_ROUTES[context];
  const preferredProvider = getPreferredProvider();

  const text = await route.handler({
    message,
    history,
    preferredProvider,
  });

  return {
    text,
    endpoint: route.endpoint,
  };
}

export function getChatRouteMap(): Record<ChatContext, ChatRouteDefinition> {
  return CONTEXT_ROUTES;
}
