import { generateText } from "@/lib/ai-provider";
import type { WorkoutTemplateRecord } from "@/lib/firestore/workouts";
import {
  getAICatalogIndex,
  buildAIExerciseSubset,
} from "@/lib/workouts/workout-ai-catalog";
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

const EXAMPLE_TEMPLATE = `{
  "name": "Full Body Strength - 45min",
  "difficulty": "intermediate",
  "is_ai_generated": true,
  "estimated_duration_minutes": 45,
  "location": "gym",
  "tags": ["strength", "full_body", "ai_generated"],
  "exercises": [],
  "sections": [
    {
      "id": "warmup", "type": "warmup", "name": "Warmup", "order": 0,
      "blocks": [
        { "id": "w1", "type": "exercise", "order": 0, "exercise_id": "arm-circles", "name": "Arm Circles", "execution_mode": "time", "exercise_seconds": 30, "prep_seconds": 5, "primary_muscles": ["shoulders"] },
        { "id": "w2", "type": "exercise", "order": 1, "exercise_id": "kneeling-hip-flexor", "name": "Kneeling Hip Flexor", "execution_mode": "time", "exercise_seconds": 30, "prep_seconds": 5, "primary_muscles": ["hip_flexors"] }
      ]
    },
    {
      "id": "round_1", "type": "round", "name": "Round 1", "order": 1,
      "blocks": [
        { "id": "r1e1", "type": "exercise", "order": 0, "exercise_id": "barbell-squat", "name": "Barbell Squat", "execution_mode": "reps", "reps": "10-12", "weight_kg": 60, "primary_muscles": ["quadriceps", "glutes"] },
        { "id": "r1rst1", "type": "rest", "order": 1, "rest_seconds": 45 },
        { "id": "r1e2", "type": "exercise", "order": 2, "exercise_id": "decline-push-up", "name": "Decline Push Up", "execution_mode": "reps", "reps": "12-15", "primary_muscles": ["chest", "triceps"] },
        { "id": "r1rst2", "type": "rest", "order": 3, "rest_seconds": 45 },
        { "id": "r1e3", "type": "exercise", "order": 4, "exercise_id": "plank", "name": "Plank", "execution_mode": "time", "exercise_seconds": 45, "prep_seconds": 3, "primary_muscles": ["core"] },
        { "id": "r1rrst", "type": "rest", "order": 5, "rest_seconds": 90 }
      ]
    },
    {
      "id": "round_2", "type": "round", "name": "Round 2", "order": 2,
      "blocks": [
        { "id": "r2e1", "type": "exercise", "order": 0, "exercise_id": "barbell-squat", "name": "Barbell Squat", "execution_mode": "reps", "reps": "10-12", "weight_kg": 60, "primary_muscles": ["quadriceps", "glutes"] },
        { "id": "r2rst1", "type": "rest", "order": 1, "rest_seconds": 45 },
        { "id": "r2e2", "type": "exercise", "order": 2, "exercise_id": "decline-push-up", "name": "Decline Push Up", "execution_mode": "reps", "reps": "12-15", "primary_muscles": ["chest", "triceps"] },
        { "id": "r2rst2", "type": "rest", "order": 3, "rest_seconds": 45 },
        { "id": "r2e3", "type": "exercise", "order": 4, "exercise_id": "plank", "name": "Plank", "execution_mode": "time", "exercise_seconds": 45, "prep_seconds": 3, "primary_muscles": ["core"] }
      ]
    },
    {
      "id": "cooldown", "type": "cooldown", "name": "Cooldown", "order": 3,
      "blocks": [
        { "id": "c1", "type": "exercise", "order": 0, "exercise_id": "quad-stretch", "name": "Quad Stretch", "execution_mode": "time", "exercise_seconds": 30, "prep_seconds": 5, "primary_muscles": ["quadriceps"] },
        { "id": "c2", "type": "exercise", "order": 1, "exercise_id": "hamstring-stretch", "name": "Hamstring Stretch", "execution_mode": "time", "exercise_seconds": 45, "prep_seconds": 0, "primary_muscles": ["hamstrings"] }
      ]
    }
  ]
}`;

function buildSystemPrompt(
  context: WorkoutSessionContext,
  memories: WorkoutChatUserMemory[],
  exerciseCatalogJson: string,
): string {
  const memoriesBlock =
    memories.length > 0
      ? `\n<user_memories>\n${memories.map((m) => m.content).join("\n")}\n</user_memories>`
      : "";

  return `You are a personal workout coach AI. You have full knowledge of the user's active workout and profile.

<workout_context>
${JSON.stringify(context)}
</workout_context>${memoriesBlock}

EXERCISE CATALOG RULES:
- You MUST ONLY use exercise_ids from the catalog below. NEVER invent exercise IDs.
- Only select exercises compatible with the user's equipment list (user_equipment).
- Warmup sections: use category "stretching" exercises, execution_mode = "time" (30-45s), add prep_seconds = 5.
- Round sections: use strength/bodyweight exercises matching target muscles and user equipment.
- Cooldown sections: use stretching/static exercises, execution_mode = "time" (30-60s).
- Insert a rest block (type: "rest") after each exercise block within a round (rest_seconds: 30-60).
- Insert a rest block at the end of each round section (rest_seconds: 60-90) as the last block.
- Every exercise block MUST have execution_mode set.
- Copy name and primary_muscles exactly from the catalog entry.
- sections[] is ALWAYS required. exercises[] must be set to [].

<exercise_catalog>
${exerciseCatalogJson}
</exercise_catalog>

<example_template>
${EXAMPLE_TEMPLATE}
</example_template>

When modifying today's workout: return the FULL updated template JSON in <workout_patch></workout_patch> tags.
When creating a new workout: return the FULL template JSON in <workout_template></workout_template> tags.
When substituting a single exercise: return the FULL updated template in <workout_patch></workout_patch> tags.
Keep conversational text concise: 1-2 sentences max outside of JSON blocks.`;
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
    .replace(/<workout_template>[\s\S]*?<\/workout_template>/g, "")
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

  // <workout_template> is the preferred tag for new workouts
  const templateRaw =
    extractXmlBlock(rawText, "workout_template") ??
    extractXmlBlock(rawText, "new_workout");
  if (templateRaw) {
    const newTemplate = tryParseJson<
      Omit<WorkoutTemplateRecord, "id" | "created_at" | "updated_at">
    >(templateRaw);
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

  const catalogIndex = await getAICatalogIndex();
  const subset = buildAIExerciseSubset(
    catalogIndex,
    sessionContext.user_equipment,
    sessionContext.target_muscles,
  );
  const exerciseCatalogJson = JSON.stringify(subset);

  const systemPrompt = buildSystemPrompt(sessionContext, userMemories.slice(0, 5), exerciseCatalogJson);
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
