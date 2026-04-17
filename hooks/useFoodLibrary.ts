import { useCallback, useEffect, useMemo, useState } from "react";

import {
  deletePantryItem,
  listPantryItems,
  upsertPantryItem,
  type PantryItem,
  type PantryItemInput,
} from "@/lib/firestore/pantry";
import { useAuthStore } from "@/stores/auth.store";
import type { NutritionItem } from "@/types";

export interface FoodLibraryViewItem {
  id: string;
  name: string;
  brand?: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  serving_size_g: number;
  serving_unit: string;
  raw: PantryItem;
}

interface UseFoodLibraryResult {
  isLoading: boolean;
  items: FoodLibraryViewItem[];
  query: string;
  setQuery: (query: string) => void;
  refresh: () => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  saveItem: (input: PantryItemInput, itemId?: string) => Promise<void>;
  addFromNutritionItem: (item: NutritionItem) => Promise<void>;
}

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function mapPantryItem(item: PantryItem): FoodLibraryViewItem {
  return {
    id: item.id,
    name: item.name,
    brand: item.brand,
    calories_per_100g: item.calories_per_100g,
    protein_per_100g: item.protein_per_100g,
    carbs_per_100g: item.carbs_per_100g,
    fat_per_100g: item.fat_per_100g,
    serving_size_g: item.serving_size_g,
    serving_unit: item.serving_unit,
    raw: item,
  };
}

function toPer100(value: number, servingSize: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const safeServing = servingSize > 0 ? servingSize : 100;
  return Math.max(0, Math.round((value / safeServing) * 100 * 100) / 100);
}

export function useFoodLibrary(): UseFoodLibraryResult {
  const user = useAuthStore((s) => s.user);

  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);

  const refresh = useCallback(async () => {
    if (!user?.uid) {
      setPantryItems([]);
      return;
    }

    try {
      setIsLoading(true);
      const pantry = await listPantryItems(user.uid);
      setPantryItems(pantry);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const items = useMemo(() => {
    const normalized = normalize(query);

    return pantryItems.map(mapPantryItem).filter((item) => {
      if (!normalized) {
        return true;
      }

      return (
        item.name.toLowerCase().includes(normalized) ||
        (item.brand ?? "").toLowerCase().includes(normalized)
      );
    });
  }, [pantryItems, query]);

  const deleteItem = useCallback(
    async (itemId: string) => {
      if (!user?.uid) {
        return;
      }

      await deletePantryItem(user.uid, itemId);
      setPantryItems((prev) => prev.filter((entry) => entry.id !== itemId));
    },
    [user?.uid],
  );

  const saveItem = useCallback(
    async (input: PantryItemInput, itemId?: string) => {
      if (!user?.uid) {
        return;
      }

      const created = await upsertPantryItem(user.uid, input, itemId);
      setPantryItems((prev) => [
        created,
        ...prev.filter((entry) => entry.id !== created.id),
      ]);
    },
    [user?.uid],
  );

  const addFromNutritionItem = useCallback(
    async (item: NutritionItem) => {
      await saveItem({
        name: item.food_name,
        brand: item.brand,
        calories_per_100g: toPer100(item.calories, item.serving_size_g),
        protein_per_100g: toPer100(item.protein_g, item.serving_size_g),
        carbs_per_100g: toPer100(item.carbs_g, item.serving_size_g),
        fat_per_100g: toPer100(item.fat_g, item.serving_size_g),
        serving_size_g: item.serving_size_g > 0 ? item.serving_size_g : 100,
        serving_unit: "g",
      });
    },
    [saveItem],
  );

  return {
    isLoading,
    items,
    query,
    setQuery,
    refresh,
    deleteItem,
    saveItem,
    addFromNutritionItem,
  };
}
