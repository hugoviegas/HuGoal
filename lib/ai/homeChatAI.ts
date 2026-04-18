import { generateText } from "@/lib/ai-provider";
import type { AIProvider, UserProfile } from "@/types";

export interface HomeChatHistoryItem {
  role: "user" | "assistant";
  text: string;
}

export interface HomeChatInput {
  preferredProvider: AIProvider;
  userMessage: string;
  profile: UserProfile | null;
  history: HomeChatHistoryItem[];
}

const FALLBACK_CHAIN: AIProvider[] = ["gemini", "claude", "openai"];

function providerOrder(preferred: AIProvider): AIProvider[] {
  return Array.from(new Set([preferred, ...FALLBACK_CHAIN]));
}

function buildSystemPrompt(profile: UserProfile | null): string {
  const name = profile?.name?.split(" ")[0] ?? "User";
  const goal = profile?.goal ?? "general_fitness";
  const weight = profile?.weight_kg ? `${profile.weight_kg}kg` : null;
  const level = profile?.level ?? "beginner";

  const userCtx = [
    `goal=${goal}`,
    weight ? `weight=${weight}` : null,
    `level=${level}`,
  ]
    .filter(Boolean)
    .join(", ");

  return `You are HuGoal Coach, a direct fitness & nutrition assistant for ${name} (${userCtx}).
Reply in ≤3 sentences. Be specific and action-oriented — no filler.
For workouts: give sets/reps/rest. For nutrition: give grams/kcal.
If asked off-topic, redirect to fitness or nutrition.`;
}

function buildHistory(history: HomeChatHistoryItem[]): string {
  if (!history.length) return "";
  return (
    history
      .slice(-8)
      .map((m) => `${m.role === "user" ? "User" : "Coach"}: ${m.text}`)
      .join("\n") + "\n"
  );
}

export async function sendHomeChatMessage(
  input: HomeChatInput,
): Promise<string> {
  const { preferredProvider, userMessage, profile, history } = input;
  const order = providerOrder(preferredProvider);
  const systemPrompt = buildSystemPrompt(profile);
  const userPrompt = `${buildHistory(history)}User: ${userMessage}`;

  let lastError: unknown;
  for (const provider of order) {
    try {
      const res = await generateText(provider, systemPrompt, userPrompt);
      return res.text.trim();
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError ?? new Error("No AI provider available");
}
