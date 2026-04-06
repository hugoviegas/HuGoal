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
  source: "library" | "openfoodfacts" | "usda";
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

async function searchOpenFoodFacts(
  query: string,
  limit: number,
): Promise<FoodSearchResult[]> {
  const url =
    "https://world.openfoodfacts.org/cgi/search.pl?" +
    new URLSearchParams({
      search_terms: query,
      search_simple: "1",
      action: "process",
      json: "1",
      page_size: String(limit),
      fields:
        "_id,code,product_name,brands,serving_size,nutriments,product_quantity",
    }).toString();

  const response = await fetch(url);
  if (!response.ok) return [];

  const data = (await response.json()) as {
    products?: Array<{
      _id?: string;
      code?: string;
      product_name?: string;
      brands?: string;
      serving_size?: string;
      product_quantity?: string;
      nutriments?: Record<string, unknown>;
    }>;
  };

  return (data.products ?? [])
    .filter((p) => Boolean(p.product_name))
    .map((p) => {
      const nutriments = p.nutriments ?? {};
      const servingSize =
        toNumber((p.serving_size ?? "").match(/\d+(\.\d+)?/)?.[0], 0) ||
        toNumber((p.product_quantity ?? "").match(/\d+(\.\d+)?/)?.[0], 100) ||
        100;

      return {
        id: p.code ?? p._id ?? `${p.product_name}-${Math.random()}`,
        name: p.product_name?.trim() ?? "Unknown food",
        brand: p.brands?.split(",")?.[0]?.trim() || undefined,
        serving_size_g: servingSize,
        calories: Math.round(toNumber(nutriments["energy-kcal_100g"], 0)),
        protein_g: Math.round(toNumber(nutriments.proteins_100g, 0)),
        carbs_g: Math.round(toNumber(nutriments.carbohydrates_100g, 0)),
        fat_g: Math.round(toNumber(nutriments.fat_100g, 0)),
        source: "openfoodfacts" as const,
      };
    })
    .filter(
      (f) => f.calories > 0 || f.protein_g > 0 || f.carbs_g > 0 || f.fat_g > 0,
    );
}

async function searchUsda(
  query: string,
  limit: number,
): Promise<FoodSearchResult[]> {
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
        nutrients.find(
          (n) => n.nutrientName?.toLowerCase() === name.toLowerCase(),
        )?.value ?? 0,
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
): Promise<FoodSearchResult[]> {
  const query = rawQuery.trim();
  if (query.length < 2) return [];

  const [library, openFoodFacts, usda] = await Promise.all([
    uid
      ? listFoodLibrary(uid)
          .then((items) =>
            items
              .filter(
                (item) =>
                  item.name.toLowerCase().includes(query.toLowerCase()) ||
                  (item.brand ?? "")
                    .toLowerCase()
                    .includes(query.toLowerCase()),
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
      : Promise.resolve([]),
    searchOpenFoodFacts(query, limit).catch(() => []),
    searchUsda(query, limit).catch(() => []),
  ]);

  const combined = [...library, ...openFoodFacts, ...usda];
  const deduped = new Map<string, FoodSearchResult>();

  for (const item of combined) {
    const key = normalizeKey(item.name, item.brand);
    if (!deduped.has(key)) deduped.set(key, item);
  }

  return Array.from(deduped.values()).slice(0, limit);
}

export function toNutritionItemFromSearch(
  result: FoodSearchResult,
): NutritionItem {
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
