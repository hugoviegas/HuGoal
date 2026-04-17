import { generateText } from "@/lib/ai-provider";
import type { WorkoutTemplateRecord } from "@/lib/firestore/workouts";
import type { WorkoutSessionContext } from "@/lib/workouts/workout-session-context";
import type { WorkoutChatMessage } from "@/stores/workout.store";
import type { AIProvider } from "@/types";

export interface WorkoutChatUserMemory {
  category: string;
  content: string;
}

export interface WorkoutChatAIInput {
  preferredProvider: AIProvider;
  userMessage: string;
  sessionContext: WorkoutSessionContext;
  previousMessages: WorkoutChatMessage[];
  userMemories?: WorkoutChatUserMemory[];
}

export interface WorkoutChatAIResponse {
  text: string;
  action: "patch_workout" | "create_workout" | "substitute_exercise" | "none";
  patch?: Partial<WorkoutTemplateRecord>;
  newTemplate?: Omit<WorkoutTemplateRecord, "id" | "created_at" | "updated_at">;
}

const FALLBACK_PROVIDER_CHAIN: AIProvider[] = ["gemini", "claude", "openai"];

function providerOrder(preferred: AIProvider): AIProvider[] {
  return Array.from(new Set([preferred, ...FALLBACK_PROVIDER_CHAIN]));
}

function buildSystemPrompt(
  context: WorkoutSessionContext,
  memories: WorkoutChatUserMemory[],
): string {
  const memoriesBlock =
    memories.length > 0
      ? `\n<user_memories>\n${memories.map((m) => m.content).join("\n")}\n</user_memories>`
      : "";

  return `You are a personal workout coach AI. You have full knowledge of the user's active workout and profile.

<workout_context>
${JSON.stringify(context)}
</workout_context>${memoriesBlock}

Rules:
- Always reference the user's current equipment (user_equipment) and location when suggesting modifications.
- When modifying today's workout, return the FULL updated template JSON wrapped in <workout_patch></workout_patch> tags.
- When creating a new workout template, return the FULL template JSON wrapped in <new_workout></new_workout> tags.
- When substituting a single exercise, return ONLY the updated template JSON (with the substitution applied) in <workout_patch></workout_patch> tags.
- Validate all suggested exercises against user_equipment list.
- Calibrate intensity using user_fitness_goal.
- Keep conversational responses concise: 1-2 sentences max outside of JSON blocks.
- Do not invent exercises that require equipment the user does not have.`;
}

function buildConversationHistory(messages: WorkoutChatMessage[]): string {
  if (messages.length === 0) return "";
  const recent = messages.slice(-10);
  return (
    "\n\nConversation so far:\n" +
    recent
      .map((m) => {
        const role = m.type === "user_text" || m.type === "user_file" ? "User" : "Coach";
        return `${role}: ${m.text ?? ""}`;
      })
      .join("\n")
  );
}

function extractXmlBlock(text: string, tag: string): string | null {
  const open = `<${tag}>`;
  const close = `</${tag}>`;
  const start = text.indexOf(open);
  if (start === -1) return null;
  const end = text.indexOf(close, start);
  if (end === -1) return null;
  return text.slice(start + open.length, end).trim();
}

function tryParseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const fenceStart = raw.indexOf("{");
    const fenceEnd = raw.lastIndexOf("}");
    if (fenceStart >= 0 && fenceEnd > fenceStart) {
      try {
        return JSON.parse(raw.slice(fenceStart, fenceEnd + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function stripXmlBlocks(text: string): string {
  return text
    .replace(/<workout_patch>[\s\S]*?<\/workout_patch>/g, "")
    .replace(/<new_workout>[\s\S]*?<\/new_workout>/g, "")
    .trim();
}

function parseResponse(rawText: string): WorkoutChatAIResponse {
  const patchRaw = extractXmlBlock(rawText, "workout_patch");
  if (patchRaw) {
    const patch = tryParseJson<Partial<WorkoutTemplateRecord>>(patchRaw);
    return {
      text: stripXmlBlocks(rawText),
      action: "patch_workout",
      patch: patch ?? undefined,
    };
  }

  const newWorkoutRaw = extractXmlBlock(rawText, "new_workout");
  if (newWorkoutRaw) {
    const newTemplate = tryParseJson<
      Omit<WorkoutTemplateRecord, "id" | "created_at" | "updated_at">
    >(newWorkoutRaw);
    return {
      text: stripXmlBlocks(rawText),
      action: "create_workout",
      newTemplate: newTemplate ?? undefined,
    };
  }

  return { text: rawText.trim(), action: "none" };
}

export async function analyzeWorkoutChatMessage(
  input: WorkoutChatAIInput,
): Promise<WorkoutChatAIResponse> {
  const { preferredProvider, userMessage, sessionContext, previousMessages, userMemories = [] } = input;
  const order = providerOrder(preferredProvider);

  const systemPrompt = buildSystemPrompt(sessionContext, userMemories.slice(0, 5));
  const history = buildConversationHistory(previousMessages);
  const userPrompt = `${history}\n\nUser: ${userMessage}`;

  let lastError: unknown = null;

  for (const provider of order) {
    try {
      const response = await generateText(provider, systemPrompt, userPrompt);
      return parseResponse(response.text);
    } catch (err) {
      lastError = err;
    }
  }

  const message =
    lastError instanceof Error
      ? lastError.message
      : "Unable to process workout message with available providers";

  throw new Error(message);
}
