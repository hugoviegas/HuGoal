import { generateText, analyzeImage } from "@/lib/ai-provider";
import type { AIProvider, NutritionItem, MealType, UserProfile } from "@/types";

const SYSTEM_PROMPT_DIET_PLAN = `You are a certified sports nutritionist AI assistant for the BetterU fitness app.
Generate a daily meal plan based on the user's profile and goals.
Return ONLY valid JSON with no markdown formatting.
The JSON structure must be an array of meals:
[
  {
    "meal_type": "breakfast" | "lunch" | "dinner" | "snack" | "pre_workout" | "post_workout",
    "items": [
      {
        "food_name": "string",
        "serving_size_g": number,
        "calories": number,
        "protein_g": number,
        "carbs_g": number,
        "fat_g": number
      }
    ],
    "notes": "optional string"
  }
]
Keep meals practical, with common foods. Respect allergies and dietary restrictions.
All values must be realistic and nutritionally sound.`;

export async function generateDietPlan(
  provider: AIProvider,
  profile: Partial<UserProfile>,
  targetCalories: number,
): Promise<{ meal_type: MealType; items: NutritionItem[]; notes?: string }[]> {
  const userPrompt = `Generate a daily meal plan for:
- Goal: ${profile.goal ?? "maintain"}
- Target calories: ${targetCalories} kcal
- Age: ${profile.age ?? "unknown"}
- Weight: ${profile.weight_kg ?? "unknown"} kg
- Height: ${profile.height_cm ?? "unknown"} cm
- Sex: ${profile.sex ?? "unknown"}
- Fitness level: ${profile.level ?? "beginner"}
- Allergies: ${(profile.allergies ?? []).join(", ") || "none"}
- Dietary restrictions: ${(profile.dietary_restrictions ?? []).join(", ") || "none"}
- Preferred cuisines: ${(profile.preferred_cuisines ?? []).join(", ") || "any"}

Include 4-5 meals (breakfast, lunch, dinner, and 1-2 snacks).
Make the plan balanced and practical with common foods.`;

  const response = await generateText(provider, SYSTEM_PROMPT_DIET_PLAN, userPrompt);

  try {
    // Strip potential markdown code fences
    const clean = response.text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    throw new Error("AI returned invalid meal plan format. Please try again.");
  }
}

const SYSTEM_PROMPT_MEAL_PHOTO = `You are a food recognition AI for the BetterU fitness app.
Analyze the meal photo and identify each food item with estimated quantities.
Return ONLY valid JSON with no markdown formatting.
The JSON structure must be an array of items:
[
  {
    "food_name": "string",
    "serving_size_g": number,
    "calories": number,
    "protein_g": number,
    "carbs_g": number,
    "fat_g": number
  }
]
Be conservative with estimates. If unsure, provide a reasonable middle-ground estimate.
All nutritional values should be realistic.`;

export async function analyzeMealPhoto(
  provider: AIProvider,
  base64Image: string,
): Promise<NutritionItem[]> {
  const prompt = SYSTEM_PROMPT_MEAL_PHOTO +
    "\n\nAnalyze this meal photo. Identify all visible food items with estimated quantities in grams and their nutritional values (calories, protein, carbs, fat). Be as accurate as possible.";

  const response = await analyzeImage(provider, base64Image, prompt);

  try {
    const clean = response.text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const items = JSON.parse(clean);
    // Ensure source field is set
    return items.map((item: Partial<NutritionItem>) => ({
      ...item,
      food_name: item.food_name ?? "Unknown food",
      serving_size_g: item.serving_size_g ?? 100,
      calories: item.calories ?? 0,
      protein_g: item.protein_g ?? 0,
      carbs_g: item.carbs_g ?? 0,
      fat_g: item.fat_g ?? 0,
      source: "ai_photo" as const,
    }));
  } catch {
    throw new Error("AI could not analyze the meal photo. Please try again.");
  }
}

const SYSTEM_PROMPT_OCR_PARSE = `You are a nutrition label parser for the BetterU fitness app.
Parse the OCR text from a nutrition label and extract the food information.
Return ONLY valid JSON with no markdown formatting.
The JSON structure must be:
{
  "food_name": "string (brand + product name if visible)",
  "serving_size_g": number,
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "fiber_g": number | null,
  "sugar_g": number | null
}
If a value is unclear or missing, use 0. Extract the most likely values.`;

export async function parseNutritionLabel(
  provider: AIProvider,
  ocrText: string,
): Promise<NutritionItem> {
  const userPrompt = `Parse this nutrition label text and extract the nutritional information:\n\n${ocrText}`;

  const response = await generateText(provider, SYSTEM_PROMPT_OCR_PARSE, userPrompt);

  try {
    const clean = response.text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(clean);
    return {
      food_name: parsed.food_name ?? "Unknown food",
      serving_size_g: parsed.serving_size_g ?? 100,
      calories: parsed.calories ?? 0,
      protein_g: parsed.protein_g ?? 0,
      carbs_g: parsed.carbs_g ?? 0,
      fat_g: parsed.fat_g ?? 0,
      fiber_g: parsed.fiber_g ?? undefined,
      sugar_g: parsed.sugar_g ?? undefined,
      source: "ocr" as const,
    };
  } catch {
    throw new Error("Could not parse the nutrition label. Please enter values manually.");
  }
}
