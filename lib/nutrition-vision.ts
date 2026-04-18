import { analyzeImage } from "@/lib/ai-provider";
import {
  GEMINI_MODEL_LIMITS,
  getPreferredGeminiVisionChain,
  getRecommendedVisionModel,
  type GeminiModelLimit,
} from "@/constants/ai-models";

export interface FoodCandidate {
  name: string;
  confidence: number;
  reason?: string;
}

export interface MealFoodEstimate {
  slot_id: string;
  candidates: FoodCandidate[];
  selected_name?: string;
  estimated_weight_g: number;
  macros: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number;
    sugar_g?: number;
  };
  notes?: string;
}

export interface NutritionVisionOutput {
  version: string;
  locale: string;
  analysis_type: "meal_photo" | "nutrition_label";
  confidence_overall: number;
  foods: MealFoodEstimate[];
  totals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number;
    sugar_g?: number;
  };
  assumptions: string[];
  warnings: string[];
  needs_user_confirmation: boolean;
}

export interface NutritionModelTestResult {
  model: GeminiModelLimit;
  effectiveModelId?: string;
  success: boolean;
  durationMs: number;
  error?: string;
  rawText?: string;
  parsed?: NutritionVisionOutput;
}

export const NUTRITION_IMAGE_SYSTEM_PROMPT = `You are a nutrition computer vision assistant for a fitness app.
You must inspect one user image and return ONLY strict JSON.

Rules:
1) Never return markdown.
2) If uncertain, include up to 3 candidates for the same food slot with confidence 0..1.
3) Keep confidence conservative.
4) Use verified nutritional database values (USDA FoodData Central or equivalent scientific source).
5) Per-100g values must be accurate for the specific preparation method (cooked vs raw, grilled vs fried).
6) For composite dishes (sandwich, burger, bowl, pasta), split into major components only when visually justified.
7) Avoid over-fragmentation: do not create tiny ingredients unless they materially affect calories.
8) All grams and macro values must be non-negative.
9) Fill totals as sum of foods.
10) Set needs_user_confirmation=true whenever any candidate confidence < 0.8.
11) If food quantity is ambiguous, provide a conservative estimated_weight_g and explain it in assumptions.
12) Prefer Portuguese names in selected_name while keeping concise wording.

JSON schema:
{
  "version": "1.0",
  "locale": "pt-BR",
  "analysis_type": "meal_photo",
  "confidence_overall": 0.0,
  "foods": [
    {
      "slot_id": "item_1",
      "candidates": [
        {
          "name": "arroz branco (cozido)",
          "confidence": 0.82,
          "per100g": {
            "calories": 130,
            "protein_g": 2.7,
            "carbs_g": 28.2,
            "fat_g": 0.3
          }
        },
        {
          "name": "arroz integral (cozido)",
          "confidence": 0.24,
          "per100g": {
            "calories": 111,
            "protein_g": 2.6,
            "carbs_g": 23.0,
            "fat_g": 0.9
          }
        }
      ],
      "selected_name": "arroz branco",
      "estimated_weight_g": 120,
      "source": "generic",
      "notes": "cozido"
    }
  ],
  "totals": {
    "calories": 156,
    "protein_g": 3,
    "carbs_g": 34,
    "fat_g": 0.4,
    "fiber_g": 0.6,
    "sugar_g": 0.1
  },
  "assumptions": ["portion estimated visually"],
  "warnings": ["possible sauce not fully visible"],
  "needs_user_confirmation": true
}`;

export const NUTRITION_LABEL_SYSTEM_PROMPT = `You are a nutrition label parser for a fitness app.
You must inspect one nutrition facts label image and return ONLY strict JSON.

Rules:
1) Never return markdown.
2) Parse one serving, not the whole package unless clearly indicated.
3) If values are uncertain, keep warnings and set needs_user_confirmation=true.

JSON schema:
{
  "version": "1.0",
  "locale": "pt-BR",
  "analysis_type": "nutrition_label",
  "confidence_overall": 0.0,
  "foods": [
    {
      "slot_id": "item_1",
      "candidates": [{ "name": "nome do produto", "confidence": 0.9 }],
      "selected_name": "nome do produto",
      "estimated_weight_g": 30,
      "macros": {
        "calories": 120,
        "protein_g": 3,
        "carbs_g": 17,
        "fat_g": 4,
        "fiber_g": 2,
        "sugar_g": 6
      },
      "notes": "dados por porcao"
    }
  ],
  "totals": {
    "calories": 120,
    "protein_g": 3,
    "carbs_g": 17,
    "fat_g": 4,
    "fiber_g": 2,
    "sugar_g": 6
  },
  "assumptions": ["serving extracted from label"],
  "warnings": [],
  "needs_user_confirmation": false
}`;

function stripCodeFence(raw: string): string {
  return raw
    .replace(/```json?\n?/gi, "")
    .replace(/```/g, "")
    .trim();
}

function isModelNotFoundError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes("is not found for API version") || message.includes("404")
  );
}

async function runVisionWithModelCandidates(
  base64Image: string,
  prompt: string,
  model: GeminiModelLimit,
): Promise<{ text: string; effectiveModelId: string }> {
  const candidates =
    model.modelCandidates && model.modelCandidates.length > 0
      ? model.modelCandidates
      : [model.modelId];

  let lastError: unknown = null;

  for (const candidate of candidates) {
    try {
      const response = await analyzeImage("gemini", base64Image, prompt, {
        model: candidate,
      });

      return {
        text: response.text,
        effectiveModelId: candidate,
      };
    } catch (error) {
      lastError = error;
      if (!isModelNotFoundError(error)) {
        throw error;
      }
    }
  }

  throw (
    lastError ?? new Error(`No compatible model ID found for ${model.label}`)
  );
}

function parseVisionJson(rawText: string): NutritionVisionOutput {
  const parsed = JSON.parse(stripCodeFence(rawText));

  return {
    version: String(parsed.version ?? "1.0"),
    locale: String(parsed.locale ?? "pt-BR"),
    analysis_type:
      parsed.analysis_type === "nutrition_label"
        ? "nutrition_label"
        : "meal_photo",
    confidence_overall: Number(parsed.confidence_overall ?? 0),
    foods: Array.isArray(parsed.foods)
      ? parsed.foods.map((item: any, index: number) => ({
          slot_id: String(item.slot_id ?? `item_${index + 1}`),
          candidates: Array.isArray(item.candidates)
            ? item.candidates.map((candidate: any) => ({
                name: String(candidate.name ?? "unknown"),
                confidence: Number(candidate.confidence ?? 0),
                reason:
                  typeof candidate.reason === "string"
                    ? candidate.reason
                    : undefined,
              }))
            : [],
          selected_name:
            typeof item.selected_name === "string"
              ? item.selected_name
              : undefined,
          estimated_weight_g: Number(item.estimated_weight_g ?? 0),
          macros: {
            calories: Number(item?.macros?.calories ?? 0),
            protein_g: Number(item?.macros?.protein_g ?? 0),
            carbs_g: Number(item?.macros?.carbs_g ?? 0),
            fat_g: Number(item?.macros?.fat_g ?? 0),
            fiber_g:
              item?.macros?.fiber_g === undefined
                ? undefined
                : Number(item?.macros?.fiber_g),
            sugar_g:
              item?.macros?.sugar_g === undefined
                ? undefined
                : Number(item?.macros?.sugar_g),
          },
          notes: typeof item.notes === "string" ? item.notes : undefined,
        }))
      : [],
    totals: {
      calories: Number(parsed?.totals?.calories ?? 0),
      protein_g: Number(parsed?.totals?.protein_g ?? 0),
      carbs_g: Number(parsed?.totals?.carbs_g ?? 0),
      fat_g: Number(parsed?.totals?.fat_g ?? 0),
      fiber_g:
        parsed?.totals?.fiber_g === undefined
          ? undefined
          : Number(parsed?.totals?.fiber_g),
      sugar_g:
        parsed?.totals?.sugar_g === undefined
          ? undefined
          : Number(parsed?.totals?.sugar_g),
    },
    assumptions: Array.isArray(parsed.assumptions)
      ? parsed.assumptions.map((item: unknown) => String(item))
      : [],
    warnings: Array.isArray(parsed.warnings)
      ? parsed.warnings.map((item: unknown) => String(item))
      : [],
    needs_user_confirmation: Boolean(parsed.needs_user_confirmation),
  };
}

export async function analyzeMealImageWithGeminiModel(
  base64Image: string,
  modelId?: string,
): Promise<NutritionVisionOutput> {
  if (modelId) {
    const response = await analyzeImage(
      "gemini",
      base64Image,
      NUTRITION_IMAGE_SYSTEM_PROMPT,
      {
        model: modelId,
      },
    );
    return parseVisionJson(response.text);
  }

  const chain = getPreferredGeminiVisionChain();
  let lastError: unknown = null;

  for (const model of chain) {
    try {
      const response = await runVisionWithModelCandidates(
        base64Image,
        NUTRITION_IMAGE_SYSTEM_PROMPT,
        model,
      );
      return parseVisionJson(response.text);
    } catch (error) {
      lastError = error;
    }
  }

  const fallback = getRecommendedVisionModel();
  const fallbackResponse = await runVisionWithModelCandidates(
    base64Image,
    NUTRITION_IMAGE_SYSTEM_PROMPT,
    fallback,
  );

  if (!fallbackResponse.text && lastError) {
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  return parseVisionJson(fallbackResponse.text);
}

export async function analyzeNutritionLabelImageWithGeminiModel(
  base64Image: string,
  modelId?: string,
): Promise<NutritionVisionOutput> {
  const model = modelId ?? getRecommendedVisionModel().modelId;
  const response = await analyzeImage(
    "gemini",
    base64Image,
    NUTRITION_LABEL_SYSTEM_PROMPT,
    { model },
  );

  return parseVisionJson(response.text);
}

export async function benchmarkNutritionModels(
  base64Image: string,
  analysisType: "meal_photo" | "nutrition_label",
): Promise<NutritionModelTestResult[]> {
  const results: NutritionModelTestResult[] = [];

  for (const model of GEMINI_MODEL_LIMITS) {
    const startedAt = Date.now();

    try {
      let rawText = "";
      let parsed: NutritionVisionOutput;
      let effectiveModelId = model.modelId;

      if (analysisType === "meal_photo") {
        if (model.vision) {
          const response = await runVisionWithModelCandidates(
            base64Image,
            NUTRITION_IMAGE_SYSTEM_PROMPT,
            model,
          );
          rawText = response.text;
          effectiveModelId = response.effectiveModelId;
          parsed = parseVisionJson(response.text);
        } else {
          rawText = JSON.stringify(
            {
              supports_vision: false,
              reason: `Model ${model.modelId} does not support image input`,
            },
            null,
            2,
          );
          parsed = {
            version: "1.0",
            locale: "pt-BR",
            analysis_type: "meal_photo",
            confidence_overall: 0,
            foods: [],
            totals: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
            assumptions: [],
            warnings: [stripCodeFence(rawText)],
            needs_user_confirmation: true,
          };
        }
      } else {
        if (model.vision) {
          const response = await runVisionWithModelCandidates(
            base64Image,
            NUTRITION_LABEL_SYSTEM_PROMPT,
            model,
          );
          rawText = response.text;
          effectiveModelId = response.effectiveModelId;
          parsed = parseVisionJson(response.text);
        } else {
          rawText = JSON.stringify(
            {
              supports_vision: false,
              reason: `Model ${model.modelId} does not support image input`,
            },
            null,
            2,
          );
          parsed = {
            version: "1.0",
            locale: "pt-BR",
            analysis_type: "nutrition_label",
            confidence_overall: 0,
            foods: [],
            totals: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
            assumptions: [],
            warnings: [stripCodeFence(rawText)],
            needs_user_confirmation: true,
          };
        }
      }

      results.push({
        model,
        effectiveModelId,
        success: true,
        durationMs: Date.now() - startedAt,
        rawText,
        parsed,
      });
    } catch (error) {
      results.push({
        model,
        success: false,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Unknown model error",
      });
    }
  }

  return results;
}
