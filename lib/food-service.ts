import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NutritionItem, FoodSource } from "@/types";
import { listFoodLibrary } from "@/lib/firestore/nutrition";

export interface FoodSearchResult {
  id: string;
  name: string;
  brand?: string;
  serving_size_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source: "library" | "edamam" | "usda";
}

const EDAMAM_CACHE_PREFIX = "nutrition:edamam:query:";
const EDAMAM_USAGE_KEY = "nutrition:edamam:usage";
const EDAMAM_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

interface EdamamUsageState {
  date: string;
  count: number;
}

interface CachedFoodSearch {
  savedAt: number;
  results: FoodSearchResult[];
}

function isFoodSearchResult(item: FoodSearchResult | null): item is FoodSearchResult {
  return item !== null;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeKey(name: string, brand?: string): string {
  return `${name}__${brand ?? ""}`.trim().toLowerCase();
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function isLikelyEnglishQuery(query: string): boolean {
  const text = query.trim().toLowerCase();
  if (!text) return false;
  const nonAscii = /[^\x00-\x7f]/.test(text);
  const ptHints = /\b(de|com|sem|integral|frango|arroz|feijao|queijo|leite|ovo|banana)\b/.test(
    text,
  );
  return !nonAscii && !ptHints;
}

async function getCachedEdamamResult(query: string): Promise<FoodSearchResult[] | null> {
  const key = `${EDAMAM_CACHE_PREFIX}${query.toLowerCase()}`;
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CachedFoodSearch;
    if (Date.now() - parsed.savedAt > EDAMAM_CACHE_TTL_MS) return null;
    if (!Array.isArray(parsed.results)) return null;
    return parsed.results;
  } catch {
    return null;
  }
}

async function setCachedEdamamResult(query: string, results: FoodSearchResult[]): Promise<void> {
  const key = `${EDAMAM_CACHE_PREFIX}${query.toLowerCase()}`;
  const payload: CachedFoodSearch = {
    savedAt: Date.now(),
    results,
  };
  await AsyncStorage.setItem(key, JSON.stringify(payload));
}

async function canUseEdamam(): Promise<boolean> {
  const dailyLimit = Number(process.env.EXPO_PUBLIC_EDAMAM_DAILY_LIMIT ?? "80");
  if (!Number.isFinite(dailyLimit) || dailyLimit <= 0) return true;

  const raw = await AsyncStorage.getItem(EDAMAM_USAGE_KEY);
  if (!raw) return true;

  try {
    const usage = JSON.parse(raw) as EdamamUsageState;
    if (usage.date !== getTodayKey()) return true;
    return usage.count < dailyLimit;
  } catch {
    return true;
  }
}

async function incrementEdamamUsage(): Promise<void> {
  const raw = await AsyncStorage.getItem(EDAMAM_USAGE_KEY);
  const today = getTodayKey();
  let usage: EdamamUsageState = { date: today, count: 0 };

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as EdamamUsageState;
      usage = parsed.date === today ? parsed : { date: today, count: 0 };
    } catch {
      usage = { date: today, count: 0 };
    }
  }

  usage.count += 1;
  await AsyncStorage.setItem(EDAMAM_USAGE_KEY, JSON.stringify(usage));
}

async function searchEdamam(query: string, limit: number): Promise<FoodSearchResult[]> {
  const appId = process.env.EXPO_PUBLIC_EDAMAM_APP_ID;
  const appKey = process.env.EXPO_PUBLIC_EDAMAM_APP_KEY;
  if (!appId || !appKey) return [];

  const cached = await getCachedEdamamResult(query);
  if (cached) return cached.slice(0, limit);

  const allowed = await canUseEdamam();
  if (!allowed) return [];

  const url =
    "https://api.edamam.com/api/food-database/v2/parser?" +
    new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      ingr: query,
    }).toString();

  const response = await fetch(url);
  if (!response.ok) return [];

  await incrementEdamamUsage();

  const data = (await response.json()) as {
    parsed?: Array<{
      food?: {
        foodId?: string;
        label?: string;
        brand?: string;
        nutrients?: {
          ENERC_KCAL?: number;
          PROCNT?: number;
          CHOCDF?: number;
          FAT?: number;
        };
      };
    }>;
    hints?: Array<{
      food?: {
        foodId?: string;
        label?: string;
        brand?: string;
        nutrients?: {
          ENERC_KCAL?: number;
          PROCNT?: number;
          CHOCDF?: number;
          FAT?: number;
        };
      };
    }>;
  };

  const entries = [...(data.parsed ?? []), ...(data.hints ?? [])];
  const normalized: FoodSearchResult[] = entries
    .map((entry): FoodSearchResult | null => {
      const food = entry.food;
      if (!food?.label) return null;
      const nutrients = food.nutrients ?? {};
      return {
        id: food.foodId ?? `${food.label}-${Math.random()}`,
        name: food.label,
        brand: food.brand || undefined,
        serving_size_g: 100,
        calories: Math.round(toNumber(nutrients.ENERC_KCAL, 0)),
        protein_g: Math.round(toNumber(nutrients.PROCNT, 0)),
        carbs_g: Math.round(toNumber(nutrients.CHOCDF, 0)),
        fat_g: Math.round(toNumber(nutrients.FAT, 0)),
        source: "edamam" as const,
      };
    })
    .filter(isFoodSearchResult)
    .filter((item) => item.calories > 0 || item.protein_g > 0 || item.carbs_g > 0 || item.fat_g > 0)
    .slice(0, limit);

  await setCachedEdamamResult(query, normalized);
  return normalized;
}

async function searchUsda(query: string, limit: number): Promise<FoodSearchResult[]> {
  const apiKey = process.env.EXPO_PUBLIC_USDA_API_KEY;
  if (!apiKey) return [];

  const response = await fetch(
    `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        pageSize: limit,
      }),
    },
  );

  if (!response.ok) return [];

  const data = (await response.json()) as {
    foods?: Array<{
      fdcId?: number;
      description?: string;
      brandOwner?: string;
      foodNutrients?: Array<{
        nutrientName?: string;
        value?: number;
      }>;
    }>;
  };

  return (data.foods ?? []).map((food) => {
    const nutrients = food.foodNutrients ?? [];
    const getNutrient = (name: string) =>
      Math.round(
        nutrients.find((n) => n.nutrientName?.toLowerCase() === name.toLowerCase())?.value ?? 0,
      );

    return {
      id: String(food.fdcId ?? `${food.description}-${Math.random()}`),
      name: food.description?.trim() ?? "Unknown food",
      brand: food.brandOwner?.trim() || undefined,
      serving_size_g: 100,
      calories: getNutrient("Energy"),
      protein_g: getNutrient("Protein"),
      carbs_g: getNutrient("Carbohydrate, by difference"),
      fat_g: getNutrient("Total lipid (fat)"),
      source: "usda" as const,
    };
  });
}

export async function searchFoods(
  uid: string | undefined,
  rawQuery: string,
  limit = 12,
  options?: { forceRemote?: boolean },
): Promise<FoodSearchResult[]> {
  const query = rawQuery.trim();
  if (query.length < 2) return [];

  const library = await (uid
    ? listFoodLibrary(uid)
        .then((items) =>
          items
            .filter(
              (item) =>
                item.name.toLowerCase().includes(query.toLowerCase()) ||
                (item.brand ?? "").toLowerCase().includes(query.toLowerCase()),
            )
            .slice(0, limit)
            .map((item) => ({
              id: item.id,
              name: item.name,
              brand: item.brand,
              serving_size_g: item.serving_size_g,
              calories: item.calories,
              protein_g: item.protein_g,
              carbs_g: item.carbs_g,
              fat_g: item.fat_g,
              source: "library" as const,
            })),
        )
        .catch(() => [])
    : Promise.resolve([]));

  if (!options?.forceRemote || library.length > 0) {
    return library.slice(0, limit);
  }

  const [edamam, usda] = await Promise.all([
    searchEdamam(query, limit).catch(() => []),
    isLikelyEnglishQuery(query) ? searchUsda(query, limit).catch(() => []) : Promise.resolve([]),
  ]);

  const combined = [...library, ...edamam, ...usda];
  const deduped = new Map<string, FoodSearchResult>();

  for (const item of combined) {
    const key = normalizeKey(item.name, item.brand);
    if (!deduped.has(key)) deduped.set(key, item);
  }

  return Array.from(deduped.values()).slice(0, limit);
}

export async function getEdamamUsageToday(): Promise<{
  count: number;
  limit: number;
  remaining: number | null;
}> {
  const dailyLimit = Number(process.env.EXPO_PUBLIC_EDAMAM_DAILY_LIMIT ?? "80");
  const raw = await AsyncStorage.getItem(EDAMAM_USAGE_KEY);
  if (!raw) {
    return {
      count: 0,
      limit: dailyLimit,
      remaining: Number.isFinite(dailyLimit) && dailyLimit > 0 ? dailyLimit : null,
    };
  }

  try {
    const usage = JSON.parse(raw) as EdamamUsageState;
    const todayCount = usage.date === getTodayKey() ? usage.count : 0;
    return {
      count: todayCount,
      limit: dailyLimit,
      remaining:
        Number.isFinite(dailyLimit) && dailyLimit > 0
          ? Math.max(dailyLimit - todayCount, 0)
          : null,
    };
  } catch {
    return {
      count: 0,
      limit: dailyLimit,
      remaining: Number.isFinite(dailyLimit) && dailyLimit > 0 ? dailyLimit : null,
    };
  }
}

export function toNutritionItemFromSearch(result: FoodSearchResult): NutritionItem {
  const source: FoodSource = "manual";

  return {
    food_name: result.name,
    brand: result.brand,
    serving_size_g: result.serving_size_g,
    calories: result.calories,
    protein_g: result.protein_g,
    carbs_g: result.carbs_g,
    fat_g: result.fat_g,
    source,
  };
}
