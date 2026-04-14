import { generateText } from "@/lib/ai-provider";
import type { AIProvider } from "@/types";

export type NutritionChatConfidence = "high" | "medium" | "low";

export interface NutritionChatItem {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: NutritionChatConfidence;
  source?: "pantry" | "generic";
}

export interface NutritionChatPantryItem {
  id: string;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  serving_size_g: number;
}

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pantryMatchScore(left: string, right: string): number {
  const a = normalizeName(left);
  const b = normalizeName(right);

  if (!a || !b) {
    return 0;
  }

  if (a === b) {
    return 1;
  }

  if (a.includes(b) || b.includes(a)) {
    return 0.9;
  }

  const aTokens = new Set(a.split(" "));
  const bTokens = b.split(" ");
  const overlap = bTokens.filter((token) => aTokens.has(token)).length;

  if (overlap === 0) {
    return 0;
  }

  return overlap / Math.max(aTokens.size, bTokens.length);
}

function findPantryMatch(
  name: string,
  pantryItems: NutritionChatPantryItem[],
): NutritionChatPantryItem | null {
  let best: NutritionChatPantryItem | null = null;
  let score = 0;

  for (const pantryItem of pantryItems) {
    const nextScore = pantryMatchScore(name, pantryItem.name);
    if (nextScore > score) {
      best = pantryItem;
      score = nextScore;
    }
  }

  return score >= 0.6 ? best : null;
}

function applyPantryOverrides(
  items: NutritionChatItem[],
  pantryItems: NutritionChatPantryItem[],
): NutritionChatItem[] {
  if (pantryItems.length === 0) {
    return items;
  }

  return items.map((item) => {
    const match = findPantryMatch(item.name, pantryItems);
    if (!match) {
      return item;
    }

    return {
      ...item,
      name: match.name,
      unit: "serving",
      calories: Math.max(0, Math.round(match.calories)),
      protein_g: Math.max(0, Math.round(match.protein_g * 10) / 10),
      carbs_g: Math.max(0, Math.round(match.carbs_g * 10) / 10),
      fat_g: Math.max(0, Math.round(match.fat_g * 10) / 10),
      confidence: "high",
      source: "pantry",
    };
  });
}

interface AnalyzeNutritionChatParams {
  preferredProvider: AIProvider;
  userMessage: string;
  pantryItems: NutritionChatPantryItem[];
  previousItems?: NutritionChatItem[];
}

const FALLBACK_PROVIDER_CHAIN: AIProvider[] = ["gemini", "claude", "openai"];

const SYSTEM_PROMPT = `You are a precise nutrition coach. Analyze the user's food description and return ONLY a valid JSON array.
Each item must follow this exact shape:
{
  "name": string,
  "quantity": number,
  "unit": string,
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "confidence": "high"|"medium"|"low",
  "source": "pantry"|"generic"
}
Rules:
1) Return ONLY JSON array. No prose and no markdown.
2) Use pantry values when item name matches pantry list exactly or almost exactly.
3) If the user asks to correct previous items, update and return the FULL updated list.
4) If quantity is missing, use a realistic standard serving.
5) All numbers must be non-negative.`;

function stripCodeFence(raw: string): string {
  return raw
    .replace(/```json?\n?/gi, "")
    .replace(/```/g, "")
    .trim();
}

function parseConfidence(value: unknown): NutritionChatConfidence {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }
  return "medium";
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, value);
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) {
      return Math.max(0, parsed);
    }
  }

  return fallback;
}

function normalizeItem(value: unknown): NutritionChatItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const name = String(raw.name ?? "").trim();
  if (!name) {
    return null;
  }

  const quantity = toNumber(raw.quantity, 1);
  const unit = String(raw.unit ?? "serving").trim() || "serving";

  const sourceRaw = raw.source;
  const source =
    sourceRaw === "pantry" || sourceRaw === "generic" ? sourceRaw : "generic";

  return {
    name,
    quantity: quantity > 0 ? quantity : 1,
    unit,
    calories: Math.round(toNumber(raw.calories, 0)),
    protein_g: Math.round(toNumber(raw.protein_g, 0) * 10) / 10,
    carbs_g: Math.round(toNumber(raw.carbs_g, 0) * 10) / 10,
    fat_g: Math.round(toNumber(raw.fat_g, 0) * 10) / 10,
    confidence: parseConfidence(raw.confidence),
    source,
  };
}

function parseResponseToItems(rawText: string): NutritionChatItem[] {
  const cleaned = stripCodeFence(rawText);

  const tryParse = (input: string): unknown => {
    try {
      return JSON.parse(input);
    } catch {
      return null;
    }
  };

  const directParsed = tryParse(cleaned);

  const parsed = (() => {
    if (Array.isArray(directParsed)) {
      return directParsed;
    }

    if (directParsed && typeof directParsed === "object") {
      const fromObject = (directParsed as Record<string, unknown>).items;
      if (Array.isArray(fromObject)) {
        return fromObject;
      }
    }

    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start >= 0 && end > start) {
      const arrayChunk = cleaned.slice(start, end + 1);
      const chunkParsed = tryParse(arrayChunk);
      if (Array.isArray(chunkParsed)) {
        return chunkParsed;
      }
    }

    return null;
  })();

  if (!Array.isArray(parsed)) {
    throw new Error("AI returned an invalid format for nutrition items");
  }

  const items = parsed
    .map((entry) => normalizeItem(entry))
    .filter((entry): entry is NutritionChatItem => entry !== null);

  if (items.length === 0) {
    throw new Error("AI did not return any valid nutrition items");
  }

  return items;
}

function providerOrder(preferredProvider: AIProvider): AIProvider[] {
  const chain = [preferredProvider, ...FALLBACK_PROVIDER_CHAIN];
  return Array.from(new Set(chain));
}

export async function analyzeNutritionChatText(
  params: AnalyzeNutritionChatParams,
): Promise<{ provider: AIProvider; items: NutritionChatItem[] }> {
  const order = providerOrder(params.preferredProvider);
  const pantryPreview = params.pantryItems.slice(0, 300);
  const previousItems = params.previousItems ?? [];

  const userPrompt = `User message: "${params.userMessage}"
User's pantry items (prioritize exact matches): ${JSON.stringify(pantryPreview)}
Current pending items (update these when user asks for corrections): ${JSON.stringify(previousItems)}`;

  let lastError: unknown = null;

  for (const provider of order) {
    try {
      const response = await generateText(provider, SYSTEM_PROMPT, userPrompt);
      const items = parseResponseToItems(response.text);
        const withPantryPriority = applyPantryOverrides(items, params.pantryItems);
        return { provider, items: withPantryPriority };
    } catch (error) {
      lastError = error;
    }
  }

  const message =
    lastError instanceof Error
      ? lastError.message
      : "Unable to analyze nutrition text with available providers";

  throw new Error(message);
}
