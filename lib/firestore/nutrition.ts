import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  where,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  NutritionLog,
  NutritionItem,
  MealType,
  DietPlan,
  FoodLibraryItem,
  WaterLog,
  MealTemplate,
} from "@/types";

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

function sanitizeNutritionItem(item: NutritionItem): NutritionItem {
  const s = stripUndefined(item as unknown as Record<string, unknown>) as Partial<NutritionItem>;
  return {
    food_name: s.food_name ?? item.food_name ?? "",
    brand: s.brand ?? item.brand,
    notes: s.notes ?? item.notes,
    serving_size_g: s.serving_size_g ?? item.serving_size_g ?? 0,
    calories: s.calories ?? item.calories ?? 0,
    protein_g: s.protein_g ?? item.protein_g ?? 0,
    carbs_g: s.carbs_g ?? item.carbs_g ?? 0,
    fat_g: s.fat_g ?? item.fat_g ?? 0,
    fiber_g: s.fiber_g ?? item.fiber_g,
    sugar_g: s.sugar_g ?? item.sugar_g,
    source: s.source ?? item.source,
  };
}

function nutritionLogsCollection() {
  return collection(db, "nutrition_logs");
}

function dietPlansCollection() {
  return collection(db, "diet_plans");
}

function foodLibraryCollection() {
  return collection(db, "food_library");
}

function waterLogsCollection() {
  return collection(db, "water_logs");
}

function mealTemplatesCollection() {
  return collection(db, "meal_templates");
}

function normalizeFoodSegment(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function buildFoodLibraryId(uid: string, name: string, brand?: string): string {
  const nameSegment = normalizeFoodSegment(name || "food") || "food";
  const brandSegment = normalizeFoodSegment(brand || "generic") || "generic";
  return `${uid}_${nameSegment}_${brandSegment}`.slice(0, 120);
}

// ─── Nutrition Logs ─────────────────────────────────────────

export interface NutritionLogInput {
  meal_type: MealType;
  items: NutritionItem[];
  notes?: string;
  image_url?: string;
}

export async function listNutritionLogs(
  uid: string,
  date?: string, // YYYY-MM-DD optional filter
): Promise<NutritionLog[]> {
  const constraints = [where("user_id", "==", uid)];
  if (date) {
    // Filter logs for a specific day using logged_at prefix
    constraints.push(where("logged_at", ">=", date));
    constraints.push(where("logged_at", "<", date + "T99")); // end of day hack -- ISO strings sort
  }

  const snapshot = await getDocs(query(nutritionLogsCollection(), ...constraints));
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }) as NutritionLog)
    .sort((a, b) => b.logged_at.localeCompare(a.logged_at));
}

export async function getNutritionLog(logId: string): Promise<NutritionLog | null> {
  const snapshot = await getDoc(doc(db, "nutrition_logs", logId));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as NutritionLog;
}

function computeTotals(items: NutritionItem[]) {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + (item.calories ?? 0),
      protein_g: acc.protein_g + (item.protein_g ?? 0),
      carbs_g: acc.carbs_g + (item.carbs_g ?? 0),
      fat_g: acc.fat_g + (item.fat_g ?? 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}

export async function createNutritionLog(
  uid: string,
  input: NutritionLogInput,
): Promise<NutritionLog> {
  const now = new Date().toISOString();
  const reference = doc(nutritionLogsCollection());
  const total = computeTotals(input.items);
  // Sanitize items to remove undefined fields (Firestore rejects undefined anywhere)
  const sanitizedItems = input.items.map((it) => sanitizeNutritionItem(it));

  const payload: NutritionLog = {
    id: reference.id,
    user_id: uid,
    logged_at: now,
    meal_type: input.meal_type,
    items: sanitizedItems,
    total,
    notes: input.notes,
    image_url: input.image_url,
  };

  const writePayload = stripUndefined({ ...payload });

  await runTransaction(db, async (transaction) => {
    transaction.set(reference, writePayload);
  });

  return payload;
}

export async function updateNutritionLog(
  logId: string,
  patch: Partial<NutritionLogInput>,
): Promise<void> {
  const reference = doc(db, "nutrition_logs", logId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) throw new Error("Nutrition log not found");

    const existing = snapshot.data() as NutritionLog;
    const items = patch.items ?? existing.items;
    // sanitize items if provided
    const sanitizedItems = Array.isArray(patch.items)
      ? (patch.items as NutritionItem[]).map((it) => sanitizeNutritionItem(it))
      : items;

    const total = computeTotals(sanitizedItems);

    const writePatchObj: Record<string, unknown> = {
      ...patch,
      total,
      updated_at: new Date().toISOString(),
    };

    if (Array.isArray(patch.items)) writePatchObj.items = sanitizedItems;

    const writePatch = stripUndefined(writePatchObj as Record<string, unknown>);

    transaction.set(reference, writePatch, { merge: true });
  });
}

export async function deleteNutritionLog(logId: string): Promise<void> {
  await deleteDoc(doc(db, "nutrition_logs", logId));
}

// ─── Diet Plans ──────────────────────────────────────────────

export interface DietPlanInput {
  name: string;
  is_ai_generated: boolean;
  target_calories: number;
  daily_protein_g: number;
  daily_carbs_g: number;
  daily_fat_g: number;
  meals: DietPlan["meals"];
  dietary_tags?: string[];
}

export async function listDietPlans(uid: string): Promise<DietPlan[]> {
  const snapshot = await getDocs(
    query(dietPlansCollection(), where("user_id", "==", uid)),
  );
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }) as DietPlan)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getDietPlan(planId: string): Promise<DietPlan | null> {
  const snapshot = await getDoc(doc(db, "diet_plans", planId));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as DietPlan;
}

export async function createDietPlan(
  uid: string,
  input: DietPlanInput,
): Promise<DietPlan> {
  const now = new Date().toISOString();
  const reference = doc(dietPlansCollection());
  const payload: DietPlan = {
    id: reference.id,
    user_id: uid,
    name: input.name,
    is_ai_generated: input.is_ai_generated,
    target_calories: input.target_calories,
    daily_protein_g: input.daily_protein_g,
    daily_carbs_g: input.daily_carbs_g,
    daily_fat_g: input.daily_fat_g,
    meals: input.meals,
    dietary_tags: input.dietary_tags ?? [],
    created_at: now,
  };

  await runTransaction(db, async (transaction) => {
    transaction.set(reference, stripUndefined({ ...payload }));
  });
  return payload;
}

export async function deleteDietPlan(planId: string): Promise<void> {
  await deleteDoc(doc(db, "diet_plans", planId));
}

// ─── Food Library ────────────────────────────────────────────

export async function listFoodLibrary(uid: string): Promise<FoodLibraryItem[]> {
  const snapshot = await getDocs(
    query(foodLibraryCollection(), where("user_id", "==", uid)),
  );
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }) as FoodLibraryItem)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function createFoodLibraryItem(
  uid: string,
  item: Omit<FoodLibraryItem, "id" | "user_id" | "created_at">,
): Promise<FoodLibraryItem> {
  const now = new Date().toISOString();
  const reference = doc(foodLibraryCollection());
  const payload: FoodLibraryItem = {
    id: reference.id,
    user_id: uid,
    ...item,
    created_at: now,
  };
  await runTransaction(db, async (transaction) => {
    transaction.set(reference, stripUndefined({ ...payload }));
  });
  return payload;
}

export async function upsertFoodLibraryItemFromNutritionItem(
  uid: string,
  item: NutritionItem,
): Promise<FoodLibraryItem> {
  const now = new Date().toISOString();
  const id = buildFoodLibraryId(uid, item.food_name, item.brand);
  const reference = doc(db, "food_library", id);
  const payload: FoodLibraryItem = {
    id,
    user_id: uid,
    name: item.food_name,
    brand: item.brand,
    serving_size_g: item.serving_size_g,
    calories: item.calories,
    protein_g: item.protein_g,
    carbs_g: item.carbs_g,
    fat_g: item.fat_g,
    created_at: now,
  };

  await runTransaction(db, async (transaction) => {
    transaction.set(reference, stripUndefined({ ...payload }), { merge: true });
  });

  return payload;
}

export async function deleteFoodLibraryItem(itemId: string): Promise<void> {
  await deleteDoc(doc(db, "food_library", itemId));
}

// ─── Water Logs ──────────────────────────────────────────────

export async function listWaterLogs(uid: string, date: string): Promise<WaterLog[]> {
  const snapshot = await getDocs(
    query(
      waterLogsCollection(),
      where("user_id", "==", uid),
      where("date", "==", date),
    ),
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as WaterLog);
}

export async function addWaterLog(uid: string, date: string, amountMl: number): Promise<WaterLog> {
  const now = new Date().toISOString();
  const reference = doc(waterLogsCollection());
  const payload: WaterLog = {
    id: reference.id,
    user_id: uid,
    date,
    amount_ml: amountMl,
    logged_at: now,
  };
  await runTransaction(db, async (transaction) => {
    transaction.set(reference, payload);
  });
  return payload;
}

// ─── Meal Templates ──────────────────────────────────────────

export async function listMealTemplates(uid: string): Promise<MealTemplate[]> {
  const snapshot = await getDocs(
    query(mealTemplatesCollection(), where("user_id", "==", uid)),
  );
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }) as MealTemplate)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function createMealTemplate(
  uid: string,
  input: Omit<MealTemplate, "id" | "user_id" | "created_at">,
): Promise<MealTemplate> {
  const now = new Date().toISOString();
  const reference = doc(mealTemplatesCollection());
  const payload: MealTemplate = {
    id: reference.id,
    user_id: uid,
    ...input,
    created_at: now,
  };
  await runTransaction(db, async (transaction) => {
    transaction.set(reference, payload);
  });
  return payload;
}

export async function deleteMealTemplate(templateId: string): Promise<void> {
  await deleteDoc(doc(db, "meal_templates", templateId));
}
