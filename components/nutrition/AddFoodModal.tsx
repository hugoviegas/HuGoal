/**
 * AddFoodModal -- Modal form for manual food entry
 */
import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useThemeStore } from "@/stores/theme.store";
import {
  searchFoods,
  toNutritionItemFromSearch,
  type FoodSearchResult,
} from "@/lib/food-service";
import { typography } from "@/constants/typography";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";
import type { NutritionItem } from "@/types";

interface AddFoodModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (item: NutritionItem) => void;
  userId?: string;
  /** Pre-fill from AI/OCR results */
  initialValues?: Partial<NutritionItem>;
}

export function AddFoodModal({
  visible,
  onClose,
  onSave,
  userId,
  initialValues,
}: AddFoodModalProps) {
  const colors = useThemeStore((s) => s.colors);
  const { width } = useWindowDimensions();
  const compact = width < 390;

  const [foodName, setFoodName] = useState(initialValues?.food_name ?? "");
  const [brand, setBrand] = useState(initialValues?.brand ?? "");
  const [servingSize, setServingSize] = useState(
    String(initialValues?.serving_size_g ?? "100"),
  );
  const [calories, setCalories] = useState(
    String(initialValues?.calories ?? ""),
  );
  const [protein, setProtein] = useState(
    String(initialValues?.protein_g ?? ""),
  );
  const [carbs, setCarbs] = useState(String(initialValues?.carbs_g ?? ""));
  const [fat, setFat] = useState(String(initialValues?.fat_g ?? ""));
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<FoodSearchResult[]>([]);

  useEffect(() => {
    if (!visible) return;
    setFoodName(initialValues?.food_name ?? "");
    setBrand(initialValues?.brand ?? "");
    setServingSize(String(initialValues?.serving_size_g ?? "100"));
    setCalories(String(initialValues?.calories ?? ""));
    setProtein(String(initialValues?.protein_g ?? ""));
    setCarbs(String(initialValues?.carbs_g ?? ""));
    setFat(String(initialValues?.fat_g ?? ""));
    setSearchQuery("");
    setResults([]);
  }, [visible, initialValues]);

  useEffect(() => {
    if (!visible || searchQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const response = await searchFoods(userId, searchQuery, 8);
        if (!cancelled) setResults(response);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [visible, userId, searchQuery]);

  const sourceLabel = useMemo(
    () => ({
      library: "My library",
      openfoodfacts: "OpenFoodFacts",
      usda: "USDA",
    }),
    [],
  );

  const handleSave = () => {
    if (!foodName.trim()) return;

    const item: NutritionItem = {
      food_name: foodName.trim(),
      brand: brand.trim() || undefined,
      serving_size_g: Number(servingSize) || 100,
      calories: Number(calories) || 0,
      protein_g: Number(protein) || 0,
      carbs_g: Number(carbs) || 0,
      fat_g: Number(fat) || 0,
      source: initialValues?.source ?? "manual",
    };
    onSave(item);
    resetForm();
    onClose();
  };

  const applySearchResult = (result: FoodSearchResult) => {
    const item = toNutritionItemFromSearch(result);
    setFoodName(item.food_name);
    setBrand(item.brand ?? "");
    setServingSize(String(item.serving_size_g));
    setCalories(String(item.calories));
    setProtein(String(item.protein_g));
    setCarbs(String(item.carbs_g));
    setFat(String(item.fat_g));
  };

  const resetForm = () => {
    setFoodName("");
    setBrand("");
    setServingSize("100");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={[
            typography.h3,
            { color: colors.foreground, marginBottom: spacing.md },
          ]}
        >
          Add Food
        </Text>

        <View
          style={{
            backgroundColor: colors.background,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: spacing.sm,
            gap: spacing.xs,
            marginBottom: spacing.md,
          }}
        >
          <Input
            label="Search food database"
            placeholder="Type at least 2 letters"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searching ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <ActivityIndicator size="small" color={colors.primary} />
              <Text
                style={[typography.caption, { color: colors.mutedForeground }]}
              >
                Searching foods…
              </Text>
            </View>
          ) : null}

          {results.length > 0 ? (
            <View style={{ gap: spacing.xs }}>
              {results.map((result) => (
                <Pressable
                  key={`${result.source}-${result.id}`}
                  onPress={() => applySearchResult(result)}
                  style={{
                    borderRadius: radius.sm,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    backgroundColor: colors.card,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                    gap: 2,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: spacing.sm,
                    }}
                  >
                    <Text
                      style={[
                        typography.smallMedium,
                        { color: colors.foreground, flex: 1 },
                      ]}
                      numberOfLines={1}
                    >
                      {result.name}
                    </Text>
                    <Text
                      style={[typography.caption, { color: colors.primary }]}
                    >
                      {sourceLabel[result.source]}
                    </Text>
                  </View>
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.mutedForeground },
                    ]}
                    numberOfLines={1}
                  >
                    {result.brand ?? "No brand"} · {result.calories} kcal · P{" "}
                    {result.protein_g}g · C {result.carbs_g}g · F {result.fat_g}
                    g
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : searchQuery.trim().length >= 2 && !searching ? (
            <Text
              style={[typography.caption, { color: colors.mutedForeground }]}
            >
              No foods found. Fill values manually.
            </Text>
          ) : null}
        </View>

        <View style={{ gap: spacing.sm }}>
          <Input
            label="Food name"
            placeholder="e.g. Chicken breast"
            value={foodName}
            onChangeText={setFoodName}
          />
          <Input
            label="Brand (optional)"
            placeholder="e.g. Tyson"
            value={brand}
            onChangeText={setBrand}
          />
          <Input
            label="Serving size (g)"
            keyboardType="numeric"
            placeholder="100"
            value={servingSize}
            onChangeText={setServingSize}
          />

          <View
            style={{
              flexDirection: compact ? "column" : "row",
              gap: spacing.xs,
            }}
          >
            <View style={{ flex: 1 }}>
              <Input
                label="Calories"
                keyboardType="numeric"
                placeholder="0"
                value={calories}
                onChangeText={setCalories}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Protein (g)"
                keyboardType="numeric"
                placeholder="0"
                value={protein}
                onChangeText={setProtein}
              />
            </View>
          </View>

          <View
            style={{
              flexDirection: compact ? "column" : "row",
              gap: spacing.xs,
            }}
          >
            <View style={{ flex: 1 }}>
              <Input
                label="Carbs (g)"
                keyboardType="numeric"
                placeholder="0"
                value={carbs}
                onChangeText={setCarbs}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Fat (g)"
                keyboardType="numeric"
                placeholder="0"
                value={fat}
                onChangeText={setFat}
              />
            </View>
          </View>
        </View>

        <View
          style={{
            flexDirection: compact ? "column" : "row",
            gap: spacing.xs,
            marginTop: spacing.lg,
          }}
        >
          <View style={{ flex: 1 }}>
            <Button variant="outline" size="md" onPress={onClose}>
              Cancel
            </Button>
          </View>
          <View style={{ flex: 1 }}>
            <Button
              variant="primary"
              size="md"
              onPress={handleSave}
              disabled={!foodName.trim()}
            >
              Save
            </Button>
          </View>
        </View>
      </ScrollView>
    </Modal>
  );
}
