import {
  collection,
  deleteDoc,
  getDoc,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

export interface PantryItem {
  id: string;
  userId: string;
  name: string;
  brand?: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  serving_size_g: number;
  serving_unit: string;
  createdAt: string;
  updatedAt: string;
}

export interface PantryItemInput {
  name: string;
  brand?: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  serving_size_g: number;
  serving_unit: string;
}

function sanitizeNumber(value: number, fallback = 0): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.round(value * 100) / 100);
}

function sanitizeString(value: string, fallback = ""): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function pantryCollection(uid: string) {
  return collection(db, "users", uid, "pantry");
}

export async function listPantryItems(uid: string): Promise<PantryItem[]> {
  const snapshot = await getDocs(
    query(pantryCollection(uid), orderBy("updatedAt", "desc")),
  );

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as Omit<PantryItem, "id">;
    return {
      id: docSnap.id,
      ...data,
    };
  });
}

export async function searchPantryItems(
  uid: string,
  searchText: string,
): Promise<PantryItem[]> {
  const normalized = sanitizeString(searchText).toLowerCase();
  if (!normalized) {
    return listPantryItems(uid);
  }

  const snapshot = await getDocs(
    query(
      pantryCollection(uid),
      where("name", ">=", normalized),
      where("name", "<=", `${normalized}\uf8ff`),
      orderBy("name", "asc"),
    ),
  );

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as Omit<PantryItem, "id">;
    return {
      id: docSnap.id,
      ...data,
    };
  });
}

export async function upsertPantryItem(
  uid: string,
  input: PantryItemInput,
  itemId?: string,
): Promise<PantryItem> {
  const now = new Date().toISOString();
  const reference = itemId
    ? doc(db, "users", uid, "pantry", itemId)
    : doc(pantryCollection(uid));

  const payload: PantryItem = {
    id: reference.id,
    userId: uid,
    name: sanitizeString(input.name, "Unnamed item"),
    brand: sanitizeString(input.brand ?? "") || undefined,
    calories_per_100g: sanitizeNumber(input.calories_per_100g),
    protein_per_100g: sanitizeNumber(input.protein_per_100g),
    carbs_per_100g: sanitizeNumber(input.carbs_per_100g),
    fat_per_100g: sanitizeNumber(input.fat_per_100g),
    serving_size_g: Math.max(1, sanitizeNumber(input.serving_size_g, 100)),
    serving_unit: sanitizeString(input.serving_unit, "g"),
    createdAt: now,
    updatedAt: now,
  };

  await runTransaction(db, async (tx) => {
    const existing = await tx.get(reference);
    if (existing.exists()) {
      const current = existing.data() as PantryItem;
      tx.set(
        reference,
        {
          ...payload,
          createdAt: current.createdAt ?? now,
        },
        { merge: true },
      );
      return;
    }

    tx.set(reference, payload);
  });

  const created = await getDoc(reference);
  const data = created.data() as PantryItem;
  return {
    ...data,
    id: created.id,
  };
}

export async function deletePantryItem(
  uid: string,
  itemId: string,
): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "pantry", itemId));
}
