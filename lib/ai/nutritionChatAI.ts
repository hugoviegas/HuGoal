import { generateText } from "@/lib/ai-provider";
import { getResolvedApiKey } from "@/lib/api-key-store";
import type { AIProvider } from "@/types";

export type NutritionChatConfidence = "high" | "medium" | "low";

export interface NutritionPer100g {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface LoggedMacros {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export type NutritionReviewSource = "pantry" | "generic";

export interface FoodCandidate {
  name: string;
  confidence: number;
  per100g: NutritionPer100g;
  source: NutritionReviewSource;
  pantryId?: string;
}

export interface NutritionReviewItem {
  id: string;
  candidates: FoodCandidate[];
  selectedCandidateIndex: number;
  weight_g: number;
}

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

function sanitizeNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function createId(index: number): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `nutrition-review-${Date.now()}-${index}`;
}

export function computeMacros(
  per100g: NutritionPer100g,
  weight_g: number,
): LoggedMacros {
  const safeWeight = Math.max(0, sanitizeNumber(weight_g, 0));
  const factor = safeWeight / 100;

  return {
    calories: Math.round(Math.max(0, per100g.calories) * factor),
    protein_g: Math.round(Math.max(0, per100g.protein_g) * factor * 10) / 10,
    carbs_g: Math.round(Math.max(0, per100g.carbs_g) * factor * 10) / 10,
    fat_g: Math.round(Math.max(0, per100g.fat_g) * factor * 10) / 10,
  };
}

function toReviewMacros(item: unknown): NutritionPer100g {
  const raw = (item ?? {}) as Record<string, unknown>;

  return {
    calories: Math.max(0, Math.round(sanitizeNumber(raw.calories, 0))),
    protein_g: Math.max(
      0,
      Math.round(sanitizeNumber(raw.protein_g, 0) * 10) / 10,
    ),
    carbs_g: Math.max(0, Math.round(sanitizeNumber(raw.carbs_g, 0) * 10) / 10),
    fat_g: Math.max(0, Math.round(sanitizeNumber(raw.fat_g, 0) * 10) / 10),
  };
}

function pantryItemToPer100g(
  pantryItem: NutritionChatPantryItem,
): NutritionPer100g {
  return {
    calories: Math.max(0, Math.round(pantryItem.calories)),
    protein_g: Math.max(0, Math.round(pantryItem.protein_g * 10) / 10),
    carbs_g: Math.max(0, Math.round(pantryItem.carbs_g * 10) / 10),
    fat_g: Math.max(0, Math.round(pantryItem.fat_g * 10) / 10),
  };
}

function normalizeConfidence(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 1) {
      return Math.max(0, Math.min(1, value / 100));
    }

    return Math.max(0, Math.min(1, value));
  }

  if (typeof value === "string") {
    const normalized = value.toLowerCase().trim();
    if (normalized === "high") return 0.95;
    if (normalized === "medium") return 0.8;
    if (normalized === "low") return 0.6;

    const parsed = Number(normalized.replace(",", "."));
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.min(1, parsed > 1 ? parsed / 100 : parsed));
    }
  }

  return 0.75;
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

function normalizeReviewCandidate(
  value: unknown,
  pantryItems: NutritionChatPantryItem[],
): FoodCandidate | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const name = String(raw.name ?? "").trim();
  if (!name) {
    return null;
  }

  const pantryMatch = findPantryMatch(name, pantryItems);
  const per100gSource = pantryMatch
    ? pantryItemToPer100g(pantryMatch)
    : toReviewMacros(raw.per100g);

  return {
    name: pantryMatch?.name ?? name,
    confidence: normalizeConfidence(raw.confidence),
    per100g: per100gSource,
    source: pantryMatch ? "pantry" : "generic",
    pantryId: pantryMatch?.id,
  };
}

function normalizeReviewItem(
  value: unknown,
  pantryItems: NutritionChatPantryItem[],
  index: number,
): NutritionReviewItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const candidatesSource = Array.isArray(raw.candidates) ? raw.candidates : [];
  const fallbackCandidate = raw.name
    ? [
        {
          name: raw.name,
          confidence: raw.confidence,
          per100g: raw.per100g,
        },
      ]
    : [];

  const candidates = [...candidatesSource, ...fallbackCandidate]
    .map((entry) => normalizeReviewCandidate(entry, pantryItems))
    .filter((entry): entry is FoodCandidate => entry !== null)
    .sort((left, right) => right.confidence - left.confidence);

  if (candidates.length === 0) {
    return null;
  }

  const selectedCandidateIndex = candidates.findIndex(
    (candidate) => candidate.source === "pantry",
  );

  return {
    id: createId(index),
    candidates,
    selectedCandidateIndex:
      selectedCandidateIndex >= 0 ? selectedCandidateIndex : 0,
    weight_g: Math.max(1, Math.round(sanitizeNumber(raw.weight_g, 100))),
  };
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

function parseReviewResponseToItems(
  rawText: string,
  pantryItems: NutritionChatPantryItem[],
): NutritionReviewItem[] {
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
    throw new Error("AI returned an invalid format for nutrition review items");
  }

  const items = parsed
    .map((entry, index) => normalizeReviewItem(entry, pantryItems, index))
    .filter((entry): entry is NutritionReviewItem => entry !== null);

  if (items.length === 0) {
    throw new Error("AI did not return any valid nutrition review items");
  }

  return items;
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

const REVIEW_SYSTEM_PROMPT = `You are a precise nutrition coach. Analyze the user's food description and return ONLY a valid JSON array.
Each item must follow this exact shape:
{
  "candidates": [
    {
      "name": string,
      "confidence": number,
      "per100g": {
        "calories": number,
        "protein_g": number,
        "carbs_g": number,
        "fat_g": number
      }
    }
  ],
  "weight_g": number,
  "source": "pantry"|"generic"
}
Rules:
1) Return ONLY JSON array. No prose and no markdown.
2) Use verified nutritional database values (USDA FoodData Central or equivalent scientific source).
3) Per-100g values must be accurate for the specific preparation method (cooked vs raw, grilled vs fried).
4) Return up to 3 candidate names sorted by confidence.
5) If quantity is missing, infer a realistic serving weight in grams.
6) All numbers must be non-negative.`;

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

function confidenceFromNumeric(value: number): NutritionChatConfidence {
  if (value >= 0.9) {
    return "high";
  }

  if (value >= 0.7) {
    return "medium";
  }

  return "low";
}

function reviewItemToLegacyItem(item: NutritionReviewItem): NutritionChatItem {
  const selectedCandidate =
    item.candidates[item.selectedCandidateIndex] ?? item.candidates[0];
  const macros = computeMacros(selectedCandidate.per100g, item.weight_g);

  return {
    name: selectedCandidate.name,
    quantity: item.weight_g,
    unit: "g",
    calories: macros.calories,
    protein_g: macros.protein_g,
    carbs_g: macros.carbs_g,
    fat_g: macros.fat_g,
    confidence: confidenceFromNumeric(selectedCandidate.confidence),
    source: selectedCandidate.source,
  };
}

async function providerOrder(
  preferredProvider: AIProvider,
): Promise<AIProvider[]> {
  const chain: AIProvider[] = Array.from(
    new Set<AIProvider>([
      "gemini",
      preferredProvider,
      ...FALLBACK_PROVIDER_CHAIN,
    ]),
  );
  const resolved = await Promise.all(
    chain.map(async (provider) => {
      const key = await getResolvedApiKey(provider);
      return key.key ? provider : null;
    }),
  );

  return resolved.filter(
    (provider): provider is AIProvider => provider !== null,
  );
}

export async function analyzeNutritionChatText(
  params: AnalyzeNutritionChatParams,
): Promise<{ provider: AIProvider; items: NutritionChatItem[] }> {
  const order = await providerOrder(params.preferredProvider);
  const pantryPreview = params.pantryItems.slice(0, 300);
  const previousItems = params.previousItems ?? [];

  const userPrompt = `User message: "${params.userMessage}"
User's pantry items (prioritize exact matches): ${JSON.stringify(pantryPreview)}
Current pending items (update these when user asks for corrections): ${JSON.stringify(previousItems)}`;

  let lastError: unknown = null;

  for (const provider of order) {
    try {
      const response = await generateText(
        provider,
        REVIEW_SYSTEM_PROMPT,
        userPrompt,
      );
      const reviewItems = parseReviewResponseToItems(
        response.text,
        params.pantryItems,
      );
      const legacyItems = reviewItems.map(reviewItemToLegacyItem);
      return { provider, items: legacyItems };
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

interface AnalyzeNutritionReviewParams {
  preferredProvider: AIProvider;
  userMessage: string;
  pantryItems: NutritionChatPantryItem[];
  previousItems?: NutritionReviewItem[];
  memoryPromptBlock?: string;
}

export async function analyzeNutritionReviewText(
  params: AnalyzeNutritionReviewParams,
): Promise<{ provider: AIProvider; items: NutritionReviewItem[] }> {
  const order = await providerOrder(params.preferredProvider);
  const pantryPreview = params.pantryItems.slice(0, 300);
  const previousItems = params.previousItems ?? [];
  const memoryPrefix = params.memoryPromptBlock?.trim()
    ? `${params.memoryPromptBlock.trim()}\n\n`
    : "";

  const userPrompt = `User message: "${params.userMessage}"
User's pantry items (prioritize exact matches): ${JSON.stringify(pantryPreview)}
Current pending review items (update these when user asks for corrections): ${JSON.stringify(previousItems)}`;

  let lastError: unknown = null;

  for (const provider of order) {
    try {
      const response = await generateText(
        provider,
        `${memoryPrefix}${REVIEW_SYSTEM_PROMPT}`,
        userPrompt,
      );
      const items = parseReviewResponseToItems(
        response.text,
        params.pantryItems,
      );
      return { provider, items };
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
