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
  "name": "Upper Body Strength - 45min",
  "difficulty": "intermediate",
  "is_ai_generated": true,
  "estimated_duration_minutes": 45,
  "location": "gym",
  "tags": ["strength", "upper_body", "ai_generated"],
  "exercises": [],
  "sections": [
    {
      "id": "warmup",
      "type": "warmup",
      "name": "Warmup",
      "order": 0,
      "blocks": [
        { "id": "warmup_b0", "type": "exercise", "order": 0, "exercise_id": "arm-circles", "name": "Arm Circles", "execution_mode": "time", "exercise_seconds": 25, "prep_seconds": 5, "primary_muscles": ["shoulders"] },
        { "id": "warmup_b1", "type": "exercise", "order": 1, "exercise_id": "cat-cow", "name": "Cat Cow", "execution_mode": "time", "exercise_seconds": 25, "prep_seconds": 5, "primary_muscles": ["core"] }
      ]
    },
    {
      "id": "round_lat_pull_down",
      "type": "round",
      "name": "Lat Pull Down",
      "order": 1,
      "blocks": [
        { "id": "round_lat_pull_down_b0", "type": "exercise", "order": 0, "exercise_id": "lat-pulldown", "name": "Lat Pulldown", "execution_mode": "reps", "reps": "10", "primary_muscles": ["lats", "biceps"] },
        { "id": "round_lat_pull_down_b1", "type": "rest", "order": 1, "rest_seconds": 60 },
        { "id": "round_lat_pull_down_b2", "type": "exercise", "order": 2, "exercise_id": "lat-pulldown", "name": "Lat Pulldown", "execution_mode": "reps", "reps": "10", "primary_muscles": ["lats", "biceps"] },
        { "id": "round_lat_pull_down_b3", "type": "rest", "order": 3, "rest_seconds": 60 },
        { "id": "round_lat_pull_down_b4", "type": "exercise", "order": 4, "exercise_id": "lat-pulldown", "name": "Lat Pulldown", "execution_mode": "reps", "reps": "10", "primary_muscles": ["lats", "biceps"] },
        { "id": "round_lat_pull_down_b5", "type": "rest", "order": 5, "rest_seconds": 90 }
      ]
    },
    {
      "id": "round_lateral_front_raise",
      "type": "round",
      "name": "Lateral Raise + Front Raise",
      "order": 2,
      "blocks": [
        { "id": "round_lateral_front_raise_b0", "type": "exercise", "order": 0, "exercise_id": "lateral-raise", "name": "Lateral Raise", "execution_mode": "reps", "reps": "12", "primary_muscles": ["shoulders"] },
        { "id": "round_lateral_front_raise_b1", "type": "rest", "order": 1, "rest_seconds": 30 },
        { "id": "round_lateral_front_raise_b2", "type": "exercise", "order": 2, "exercise_id": "front-raise", "name": "Front Raise", "execution_mode": "reps", "reps": "12", "primary_muscles": ["shoulders"] },
        { "id": "round_lateral_front_raise_b3", "type": "rest", "order": 3, "rest_seconds": 30 },
        { "id": "round_lateral_front_raise_b4", "type": "exercise", "order": 4, "exercise_id": "lateral-raise", "name": "Lateral Raise", "execution_mode": "reps", "reps": "12", "primary_muscles": ["shoulders"] },
        { "id": "round_lateral_front_raise_b5", "type": "rest", "order": 5, "rest_seconds": 30 },
        { "id": "round_lateral_front_raise_b6", "type": "exercise", "order": 6, "exercise_id": "front-raise", "name": "Front Raise", "execution_mode": "reps", "reps": "12", "primary_muscles": ["shoulders"] },
        { "id": "round_lateral_front_raise_b7", "type": "rest", "order": 7, "rest_seconds": 30 },
        { "id": "round_lateral_front_raise_b8", "type": "exercise", "order": 8, "exercise_id": "lateral-raise", "name": "Lateral Raise", "execution_mode": "reps", "reps": "12", "primary_muscles": ["shoulders"] },
        { "id": "round_lateral_front_raise_b9", "type": "rest", "order": 9, "rest_seconds": 30 },
        { "id": "round_lateral_front_raise_b10", "type": "exercise", "order": 10, "exercise_id": "front-raise", "name": "Front Raise", "execution_mode": "reps", "reps": "12", "primary_muscles": ["shoulders"] }
      ]
    },
    {
      "id": "cooldown",
      "type": "cooldown",
      "name": "Cooldown",
      "order": 3,
      "blocks": [
        { "id": "cooldown_b0", "type": "exercise", "order": 0, "exercise_id": "quad-stretch", "name": "Quad Stretch", "execution_mode": "time", "exercise_seconds": 40, "prep_seconds": 0, "primary_muscles": ["quadriceps"] },
        { "id": "cooldown_b1", "type": "exercise", "order": 1, "exercise_id": "hamstring-stretch", "name": "Hamstring Stretch", "execution_mode": "time", "exercise_seconds": 40, "prep_seconds": 0, "primary_muscles": ["hamstrings"] }
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
- Warmup sections: use category "stretching" exercises, execution_mode = "time" (20-30s), add prep_seconds = 5, and NEVER add rest blocks.
- Round sections: use strength/bodyweight exercises matching target muscles and user equipment.
- Cooldown sections: use static stretching exercises, execution_mode = "time" (30-60s), prep_seconds = 0, and NEVER add rest blocks.
- Round structure: each round section can contain only 1 exercise OR 1 superset pair (max 2 exercises).
- Never create a round with 3 or more exercises; split those into separate rounds.
- Single-exercise round: repeat the same exercise block for each set, with rest blocks between sets, and NEVER end the section with a rest block.
- Superset round: alternate exercise A -> rest -> exercise B -> rest and repeat, and NEVER end the section with a rest block.
- Optional inter-round rest (90-120s) is allowed as the final block of a round only when explicitly desired.
- Rest guidelines: single strength sets 60-90s, single hypertrophy sets 45-60s, superset transitions 20-30s.
- Section names: single rounds use the exercise name, supersets use "X + Y".
- Section order must be Warmup (0) -> Round 1 (1) -> Round 2 (2) -> ... -> Cooldown (last).
- block.id format must be "{section_id}_b{order}" and block.order starts at 0 with no gaps.
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
        const role =
          m.type === "user_text" || m.type === "user_file" ? "User" : "Coach";
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
    const newTemplate =
      tryParseJson<
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
  const {
    preferredProvider,
    userMessage,
    sessionContext,
    previousMessages,
    userMemories = [],
  } = input;
  const order = providerOrder(preferredProvider);

  const catalogIndex = await getAICatalogIndex();
  const subset = buildAIExerciseSubset(
    catalogIndex,
    sessionContext.user_equipment,
    sessionContext.target_muscles,
  );
  const exerciseCatalogJson = JSON.stringify(subset);

  const systemPrompt = buildSystemPrompt(
    sessionContext,
    userMemories.slice(0, 5),
    exerciseCatalogJson,
  );
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
