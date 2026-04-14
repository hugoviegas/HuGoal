import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { analyzeImage } from "@/lib/ai-provider";
import {
  NUTRITION_IMAGE_SYSTEM_PROMPT,
  NUTRITION_LABEL_SYSTEM_PROMPT,
} from "@/lib/nutrition-vision";
import { storage } from "@/lib/firebase";
import type { NutritionChatItem } from "@/lib/ai/nutritionChatAI";
import type { PantryItem } from "@/lib/firestore/pantry";
import type { AIProvider } from "@/types";

export interface NutritionImageUploadResult {
  storagePath: string;
  downloadUrl: string;
  mimeType: string;
}

export interface PantryLabelDraft {
  name: string;
  brand: string | null;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  serving_size_g: number;
  serving_unit: string;
}

const FALLBACK_IMAGE_PROVIDERS: AIProvider[] = ["gemini", "claude", "openai"];

function toDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function detectImageMimeType(uri: string): string {
  const lower = uri.toLowerCase();

  if (lower.endsWith(".png")) {
    return "image/png";
  }
  if (lower.endsWith(".webp")) {
    return "image/webp";
  }

  return "image/jpeg";
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

function pantryMatchScore(a: string, b: string): number {
  const left = normalizeName(a);
  const right = normalizeName(b);

  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  if (left.includes(right) || right.includes(left)) {
    return 0.9;
  }

  const leftTokens = new Set(left.split(" "));
  const rightTokens = right.split(" ");
  const common = rightTokens.filter((token) => leftTokens.has(token)).length;

  if (common === 0) {
    return 0;
  }

  return common / Math.max(leftTokens.size, rightTokens.length);
}

function findBestPantryMatch(
  foodName: string,
  pantryItems: PantryItem[],
): PantryItem | null {
  let best: PantryItem | null = null;
  let bestScore = 0;

  for (const pantryItem of pantryItems) {
    const score = pantryMatchScore(foodName, pantryItem.name);
    if (score > bestScore) {
      best = pantryItem;
      bestScore = score;
    }
  }

  return bestScore >= 0.6 ? best : null;
}

function toServingMacrosFromPantry(item: PantryItem): {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
} {
  const factor = Math.max(1, item.serving_size_g) / 100;
  return {
    calories: Math.round(item.calories_per_100g * factor),
    protein_g: Math.round(item.protein_per_100g * factor * 10) / 10,
    carbs_g: Math.round(item.carbs_per_100g * factor * 10) / 10,
    fat_g: Math.round(item.fat_per_100g * factor * 10) / 10,
  };
}

function providerOrder(preferredProvider?: AIProvider): AIProvider[] {
  const chain = preferredProvider
    ? [preferredProvider, ...FALLBACK_IMAGE_PROVIDERS]
    : FALLBACK_IMAGE_PROVIDERS;

  return Array.from(new Set(chain));
}

async function analyzeImageWithProviderChain(
  base64Image: string,
  prompt: string,
  preferredProvider?: AIProvider,
): Promise<string> {
  let lastError: unknown = null;

  for (const provider of providerOrder(preferredProvider)) {
    try {
      const response = await analyzeImage(provider, base64Image, prompt);
      return response.text;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to analyze image with available providers");
}

export async function uploadNutritionImageTemp(
  uid: string,
  localUri: string,
): Promise<NutritionImageUploadResult> {
  const now = new Date();
  const dateKey = toDateKey(now);
  const mimeType = detectImageMimeType(localUri);
  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const storagePath = `users/${uid}/nutrition/images/${dateKey}/${Date.now()}.${extension}`;

  const response = await fetch(localUri);
  if (!response.ok) {
    throw new Error("Unable to read selected image file");
  }

  const blob = await response.blob();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, blob, {
    contentType: mimeType,
    customMetadata: {
      uploadedAt: now.toISOString(),
      expiresAt,
      temporary: "true",
      dateKey,
    },
  });

  const downloadUrl = await getDownloadURL(fileRef);
  return {
    storagePath,
    downloadUrl,
    mimeType,
  };
}

export async function analyzeMealImageToChatItems(
  base64Image: string,
  pantryItems: PantryItem[],
  preferredProvider?: AIProvider,
): Promise<NutritionChatItem[]> {
  const rawText = await analyzeImageWithProviderChain(
    base64Image,
    NUTRITION_IMAGE_SYSTEM_PROMPT,
    preferredProvider,
  );

  const parsed = JSON.parse(
    rawText.replace(/```json?\n?/g, "").replace(/```/g, "").trim(),
  ) as {
    foods?: Array<{
      selected_name?: string;
      candidates?: Array<{ name?: string; confidence?: number }>;
      macros?: { calories?: number; protein_g?: number; carbs_g?: number; fat_g?: number };
    }>;
  };

  const items = (parsed.foods ?? [])
    .map((food): NutritionChatItem | null => {
      const selectedName = food.selected_name?.trim();
      const fallbackName = food.candidates?.[0]?.name?.trim();
      const name = selectedName || fallbackName || "Food item";

      if (!name) {
        return null;
      }

      const pantryMatch = findBestPantryMatch(name, pantryItems);
      if (pantryMatch) {
        const servingMacros = toServingMacrosFromPantry(pantryMatch);
        return {
          name: pantryMatch.name,
          quantity: 1,
          unit: pantryMatch.serving_unit || "serving",
          calories: servingMacros.calories,
          protein_g: servingMacros.protein_g,
          carbs_g: servingMacros.carbs_g,
          fat_g: servingMacros.fat_g,
          confidence: "high",
          source: "pantry",
        };
      }

      return {
        name,
        quantity: 1,
        unit: "serving",
        calories: Math.max(0, Math.round(food.macros?.calories || 0)),
        protein_g: Math.max(0, Math.round((food.macros?.protein_g || 0) * 10) / 10),
        carbs_g: Math.max(0, Math.round((food.macros?.carbs_g || 0) * 10) / 10),
        fat_g: Math.max(0, Math.round((food.macros?.fat_g || 0) * 10) / 10),
        confidence: (food.candidates?.[0]?.confidence ?? 0) >= 0.8 ? "high" : "medium",
        source: "generic",
      };
    })
    .filter((item): item is NutritionChatItem => item !== null);

  if (items.length === 0) {
    throw new Error("Could not identify food items in the image");
  }

  return items;
}

export async function analyzeNutritionLabelToPantryDraft(
  base64Image: string,
  preferredProvider?: AIProvider,
): Promise<PantryLabelDraft> {
  const rawText = await analyzeImageWithProviderChain(
    base64Image,
    NUTRITION_LABEL_SYSTEM_PROMPT,
    preferredProvider,
  );

  const parsed = JSON.parse(
    rawText.replace(/```json?\n?/g, "").replace(/```/g, "").trim(),
  ) as {
    foods?: Array<{
      selected_name?: string;
      candidates?: Array<{ name?: string }>;
      estimated_weight_g?: number;
      macros?: {
        calories?: number;
        protein_g?: number;
        carbs_g?: number;
        fat_g?: number;
      };
    }>;
  };

  const first = parsed.foods?.[0];

  if (!first) {
    throw new Error("Could not read nutrition label");
  }

  const name =
    first.selected_name?.trim() ||
    first.candidates?.[0]?.name?.trim() ||
    "Unnamed product";

  const servingSize = Math.max(1, Math.round(first.estimated_weight_g || 100));
  const factorTo100g = 100 / servingSize;

  return {
    name,
    brand: null,
    calories_per_100g: Math.max(0, Math.round((first.macros?.calories || 0) * factorTo100g)),
    protein_per_100g:
      Math.max(0, Math.round((first.macros?.protein_g || 0) * factorTo100g * 10) / 10),
    carbs_per_100g:
      Math.max(0, Math.round((first.macros?.carbs_g || 0) * factorTo100g * 10) / 10),
    fat_per_100g:
      Math.max(0, Math.round((first.macros?.fat_g || 0) * factorTo100g * 10) / 10),
    serving_size_g: servingSize,
    serving_unit: "g",
  };
}
