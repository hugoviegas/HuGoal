/**
 * AddFoodModal -- Modal form for manual food entry
 */
import { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useThemeStore } from "@/stores/theme.store";
import { typography } from "@/constants/typography";
import { spacing } from "@/constants/spacing";
import type { NutritionItem } from "@/types";

interface AddFoodModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (item: NutritionItem) => void;
  /** Pre-fill from AI/OCR results */
  initialValues?: Partial<NutritionItem>;
}

export function AddFoodModal({
  visible,
  onClose,
  onSave,
  initialValues,
}: AddFoodModalProps) {
  const colors = useThemeStore((s) => s.colors);
  const [foodName, setFoodName] = useState(initialValues?.food_name ?? "");
  const [brand, setBrand] = useState(initialValues?.brand ?? "");
  const [servingSize, setServingSize] = useState(
    String(initialValues?.serving_size_g ?? "100")
  );
  const [calories, setCalories] = useState(
    String(initialValues?.calories ?? "")
  );
  const [protein, setProtein] = useState(
    String(initialValues?.protein_g ?? "")
  );
  const [carbs, setCarbs] = useState(
    String(initialValues?.carbs_g ?? "")
  );
  const [fat, setFat] = useState(String(initialValues?.fat_g ?? ""));

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

          <View style={{ flexDirection: "row", gap: spacing.xs }}>
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

          <View style={{ flexDirection: "row", gap: spacing.xs }}>
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
            flexDirection: "row",
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
