import { generateText } from "@/lib/ai-provider";
import type { AIProvider, Difficulty } from "@/types";
import type { FreeExerciseDbTransformedRecord } from "@/lib/workouts/free-exercise-db-transform";

export interface ExerciseCategorizationSuggestion {
  primary_muscles: string[];
  secondary_muscles: string[];
  difficulty: Difficulty;
  category: string;
  muscle_primary: string;
  muscle_secondary: string[];
  training_style: string[];
  type: string;
  confidence?: number;
  notes?: string;
}

const SYSTEM_PROMPT_EXERCISE_CATEGORIZATION = `You are a fitness taxonomy assistant for HuGoal.
Return STRICT JSON only (no markdown, no comments).
Classify each exercise into this JSON shape:
{
  "primary_muscles": ["snake_case_pt_br"],
  "secondary_muscles": ["snake_case_pt_br"],
  "difficulty": "beginner" | "intermediate" | "advanced",
  "category": "string",
  "muscle_primary": "string",
  "muscle_secondary": ["string"],
  "training_style": ["string"],
  "type": "string",
  "confidence": number,
  "notes": "string"
}

Rules:
- Use lowercase snake_case for primary_muscles and secondary_muscles.
- Confidence must be between 0 and 1.
- Keep outputs practical for workout filters.
- Prefer preserving the source exercise semantics instead of translating them.
- Treat force, mechanic, category, primary muscles, secondary muscles, and instructions as source-of-truth context.
- If unsure, pick conservative defaults and explain in notes.`;

function normalizeDifficulty(value: string | undefined): Difficulty {
  if (
    value === "beginner" ||
    value === "intermediate" ||
    value === "advanced"
  ) {
    return value;
  }
  return "intermediate";
}

function normalizeSnakeArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const output: string[] = [];
  for (const item of value) {
    const text = String(item ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    if (!text || seen.has(text)) {
      continue;
    }
    seen.add(text);
    output.push(text);
  }

  return output;
}

function normalizeTextArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const output: string[] = [];
  for (const item of value) {
    const text = String(item ?? "").trim();
    if (!text || seen.has(text)) {
      continue;
    }
    seen.add(text);
    output.push(text);
  }

  return output;
}

function parseJsonResponse(raw: string): Record<string, unknown> {
  const cleaned = raw
    .replace(/```json?\n?/g, "")
    .replace(/```/g, "")
    .trim();
  return JSON.parse(cleaned) as Record<string, unknown>;
}

export async function categorizeExerciseWithAI(
  provider: AIProvider,
  exercise: Pick<
    FreeExerciseDbTransformedRecord,
    | "id"
    | "name"
    | "force"
    | "mechanic"
    | "instructions_en"
    | "equipment"
    | "primary_muscles"
    | "secondary_muscles"
    | "difficulty"
    | "category"
    | "primaryMuscles"
    | "secondaryMuscles"
    | "instructions"
    | "source_images"
  >,
  options: { model?: string } = {},
): Promise<ExerciseCategorizationSuggestion> {
  const userPrompt = JSON.stringify(
    {
      id: exercise.id,
      name: exercise.name,
      force: exercise.force,
      mechanic: exercise.mechanic,
      instructions_en: exercise.instructions_en,
      instructions: exercise.instructions,
      equipment: exercise.equipment,
      source_images: exercise.source_images,
      current_guess: {
        primary_muscles: exercise.primary_muscles,
        secondary_muscles: exercise.secondary_muscles,
        difficulty: exercise.difficulty,
        category: exercise.category,
      },
    },
    null,
    2,
  );

  const response = await generateText(
    provider,
    SYSTEM_PROMPT_EXERCISE_CATEGORIZATION,
    userPrompt,
    { model: options.model },
  );

  const parsed = parseJsonResponse(response.text);

  const primary = normalizeSnakeArray(parsed.primary_muscles);
  const secondary = normalizeSnakeArray(parsed.secondary_muscles);
  const muscleSecondary = normalizeTextArray(parsed.muscle_secondary);
  const trainingStyle = normalizeTextArray(parsed.training_style);
  const confidenceRaw = Number(parsed.confidence);

  return {
    primary_muscles: primary.length ? primary : exercise.primary_muscles,
    secondary_muscles: secondary,
    difficulty: normalizeDifficulty(String(parsed.difficulty ?? "")),
    category: String(parsed.category ?? exercise.category),
    muscle_primary: String(parsed.muscle_primary ?? exercise.category),
    muscle_secondary: muscleSecondary,
    training_style: trainingStyle.length ? trainingStyle : ["Forca"],
    type: String(parsed.type ?? "Forca"),
    confidence:
      Number.isFinite(confidenceRaw) && confidenceRaw >= 0 && confidenceRaw <= 1
        ? confidenceRaw
        : undefined,
    notes: parsed.notes ? String(parsed.notes) : undefined,
  };
}

export function applyExerciseCategorization(
  exercise: FreeExerciseDbTransformedRecord,
  suggestion: ExerciseCategorizationSuggestion,
): FreeExerciseDbTransformedRecord {
  return {
    ...exercise,
    primary_muscles: suggestion.primary_muscles,
    secondary_muscles: suggestion.secondary_muscles,
    difficulty: suggestion.difficulty,
    category: suggestion.category,
    muscle_primary: suggestion.muscle_primary,
    muscle_secondary: suggestion.muscle_secondary,
    training_style: suggestion.training_style,
    type: suggestion.type,
  };
}
