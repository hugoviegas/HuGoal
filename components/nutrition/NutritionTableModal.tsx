import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  Flame,
  Zap,
  Wheat,
  Droplets,
  Leaf,
  Candy,
  PenLine,
  ImagePlus,
  X,
} from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { radius } from "@/constants/radius";
import type { NutritionItem } from "@/types";

const MACRO_COLORS = {
  calories: "#f97316",
  protein: "#3b82f6",
  carbs: "#eab308",
  fat: "#ef4444",
  fiber: "#22c55e",
  sugar: "#a855f7",
} as const;

// ─── Scaling helpers (same logic as add-food.tsx) ───────────────────────────
function scaleValue(base: number | undefined, ratio: number): number {
  if (typeof base !== "number" || !Number.isFinite(base)) return 0;
  return Math.max(0, Math.round(base * ratio));
}

function buildScaledItem(
  base: NutritionItem,
  newServing: number,
): NutritionItem {
  const baseServing = base.serving_size_g > 0 ? base.serving_size_g : 100;
  const ratio = newServing > 0 ? newServing / baseServing : 0;
  return {
    ...base,
    serving_size_g: newServing,
    calories: scaleValue(base.calories, ratio),
    protein_g: scaleValue(base.protein_g, ratio),
    carbs_g: scaleValue(base.carbs_g, ratio),
    fat_g: scaleValue(base.fat_g, ratio),
    fiber_g:
      typeof base.fiber_g === "number"
        ? scaleValue(base.fiber_g, ratio)
        : undefined,
    sugar_g:
      typeof base.sugar_g === "number"
        ? scaleValue(base.sugar_g, ratio)
        : undefined,
  };
}

function parsePositive(text: string, fallback = 0): number {
  const n = parseFloat(text.replace(",", "."));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(n * 100) / 100);
}

// ─── Row types ──────────────────────────────────────────────────────────────
type MacroKey = "calories" | "protein" | "carbs" | "fat" | "fiber" | "sugar";

interface MacroRow {
  key: MacroKey;
  label: string;
  unit: string;
  icon: React.ReactNode;
  color: string;
  getValue: (item: NutritionItem) => number | undefined;
  setValue: (item: NutritionItem, v: number) => NutritionItem;
}

function buildRows(iconSize: number): MacroRow[] {
  // Icons are rendered inline; colors applied by the caller
  return [
    {
      key: "calories",
      label: "Calories",
      unit: "kcal",
      icon: null, // filled below
      color: MACRO_COLORS.calories,
      getValue: (i) => i.calories,
      setValue: (i, v) => ({ ...i, calories: v }),
    },
    {
      key: "protein",
      label: "Protein",
      unit: "g",
      icon: null,
      color: MACRO_COLORS.protein,
      getValue: (i) => i.protein_g,
      setValue: (i, v) => ({ ...i, protein_g: v }),
    },
    {
      key: "carbs",
      label: "Carbs",
      unit: "g",
      icon: null,
      color: MACRO_COLORS.carbs,
      getValue: (i) => i.carbs_g,
      setValue: (i, v) => ({ ...i, carbs_g: v }),
    },
    {
      key: "fat",
      label: "Fat",
      unit: "g",
      icon: null,
      color: MACRO_COLORS.fat,
      getValue: (i) => i.fat_g,
      setValue: (i, v) => ({ ...i, fat_g: v }),
    },
    {
      key: "fiber",
      label: "Fiber",
      unit: "g",
      icon: null,
      color: MACRO_COLORS.fiber,
      getValue: (i) => i.fiber_g,
      setValue: (i, v) => ({ ...i, fiber_g: v }),
    },
    {
      key: "sugar",
      label: "Sugar",
      unit: "g",
      icon: null,
      color: MACRO_COLORS.sugar,
      getValue: (i) => i.sugar_g,
      setValue: (i, v) => ({ ...i, sugar_g: v }),
    },
  ];
}

// ─── Props ──────────────────────────────────────────────────────────────────
export interface NutritionTableModalProps {
  visible: boolean;
  item: NutritionItem | null;
  itemIndex: number | null;
  onClose: () => void;
  onSave: (item: NutritionItem, index: number) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────
export function NutritionTableModal({
  visible,
  item,
  itemIndex,
  onClose,
  onSave,
}: NutritionTableModalProps) {
  const colors = useThemeStore((s) => s.colors);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<NutritionItem | null>(null);
  const [servingText, setServingText] = useState("");
  // String states for each macro input in edit mode
  const [editValues, setEditValues] = useState<Record<MacroKey, string>>({
    calories: "0",
    protein: "0",
    carbs: "0",
    fat: "0",
    fiber: "0",
    sugar: "0",
  });
  const baseRef = useRef<NutritionItem | null>(null);

  // Sync state whenever the source item changes (new modal open)
  useEffect(() => {
    if (!visible || !item) return;
    baseRef.current = item;
    setDraft(item);
    setIsEditing(false);
    setServingText(String(item.serving_size_g));
    syncEditValues(item);
  }, [visible, item]);

  function syncEditValues(src: NutritionItem) {
    setEditValues({
      calories: String(src.calories),
      protein: String(src.protein_g),
      carbs: String(src.carbs_g),
      fat: String(src.fat_g),
      fiber: String(src.fiber_g ?? 0),
      sugar: String(src.sugar_g ?? 0),
    });
  }

  const handleServingChange = (text: string) => {
    setServingText(text);
    const newServing = parsePositive(text, 0);
    if (newServing > 0 && baseRef.current) {
      const scaled = buildScaledItem(baseRef.current, newServing);
      setDraft(scaled);
      syncEditValues(scaled);
    }
  };

  const handleMacroChange = (key: MacroKey, text: string) => {
    setEditValues((prev) => ({ ...prev, [key]: text }));
    const numVal = parsePositive(text, 0);
    setDraft((prev) => {
      if (!prev) return prev;
      switch (key) {
        case "calories": return { ...prev, calories: numVal };
        case "protein":  return { ...prev, protein_g: numVal };
        case "carbs":    return { ...prev, carbs_g: numVal };
        case "fat":      return { ...prev, fat_g: numVal };
        case "fiber":    return { ...prev, fiber_g: numVal };
        case "sugar":    return { ...prev, sugar_g: numVal };
      }
    });
  };

  const handlePickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      // TODO: upload to Firebase Storage
      setDraft((prev) => (prev ? { ...prev, photo_url: uri } : prev));
    }
  };

  const handleSave = () => {
    if (!draft || itemIndex === null) return;
    onSave(draft, itemIndex);
    onClose();
  };

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  if (!item || !draft) return null;

  const ICON_SIZE = 18;
  const macroRows: MacroRow[] = [
    {
      key: "calories",
      label: "Calories",
      unit: "kcal",
      icon: <Flame size={ICON_SIZE} color={MACRO_COLORS.calories} />,
      color: MACRO_COLORS.calories,
      getValue: (i) => i.calories,
      setValue: (i, v) => ({ ...i, calories: v }),
    },
    {
      key: "protein",
      label: "Protein",
      unit: "g",
      icon: <Zap size={ICON_SIZE} color={MACRO_COLORS.protein} />,
      color: MACRO_COLORS.protein,
      getValue: (i) => i.protein_g,
      setValue: (i, v) => ({ ...i, protein_g: v }),
    },
    {
      key: "carbs",
      label: "Carbs",
      unit: "g",
      icon: <Wheat size={ICON_SIZE} color={MACRO_COLORS.carbs} />,
      color: MACRO_COLORS.carbs,
      getValue: (i) => i.carbs_g,
      setValue: (i, v) => ({ ...i, carbs_g: v }),
    },
    {
      key: "fat",
      label: "Fat",
      unit: "g",
      icon: <Droplets size={ICON_SIZE} color={MACRO_COLORS.fat} />,
      color: MACRO_COLORS.fat,
      getValue: (i) => i.fat_g,
      setValue: (i, v) => ({ ...i, fat_g: v }),
    },
    {
      key: "fiber",
      label: "Fiber",
      unit: "g",
      icon: <Leaf size={ICON_SIZE} color={MACRO_COLORS.fiber} />,
      color: MACRO_COLORS.fiber,
      getValue: (i) => i.fiber_g,
      setValue: (i, v) => ({ ...i, fiber_g: v }),
    },
    {
      key: "sugar",
      label: "Sugar",
      unit: "g",
      icon: <Candy size={ICON_SIZE} color={MACRO_COLORS.sugar} />,
      color: MACRO_COLORS.sugar,
      getValue: (i) => i.sugar_g,
      setValue: (i, v) => ({ ...i, sugar_g: v }),
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        {/* Backdrop */}
        <Pressable
          style={{ ...styleAbsoluteFill, backgroundColor: "rgba(0,0,0,0.4)" }}
          onPress={handleClose}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: "88%",
              overflow: "hidden",
            }}
          >
            {/* Drag handle */}
            <View
              style={{ alignItems: "center", paddingTop: spacing.sm, paddingBottom: spacing.xs }}
            >
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: colors.muted,
                }}
              />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Header: photo + name + edit toggle */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: spacing.md,
                  paddingBottom: spacing.md,
                  gap: spacing.md,
                }}
              >
                {/* Photo (tappable in edit mode) */}
                <Pressable
                  onPress={isEditing ? handlePickPhoto : undefined}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: radius.md,
                    overflow: "hidden",
                    backgroundColor: colors.surface,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {draft.photo_url ? (
                    <Image
                      source={{ uri: draft.photo_url }}
                      style={{ width: 64, height: 64 }}
                    />
                  ) : (
                    <View style={{ alignItems: "center", gap: 4 }}>
                      <ImagePlus size={22} color={colors.muted} />
                      {isEditing ? (
                        <Text
                          style={[
                            typography.caption,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          Add photo
                        </Text>
                      ) : null}
                    </View>
                  )}
                  {/* TODO: upload to Firebase Storage */}
                </Pressable>

                {/* Name + brand/serving */}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={[
                      typography.bodyMedium,
                      { color: colors.foreground },
                    ]}
                    numberOfLines={2}
                  >
                    {draft.food_name}
                  </Text>
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {draft.brand ? `${draft.brand} · ` : ""}
                    {draft.serving_size_g}g
                  </Text>
                </View>

                {/* Edit toggle */}
                <Pressable
                  onPress={() => setIsEditing((v) => !v)}
                  hitSlop={8}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 6,
                    borderRadius: radius.full,
                    backgroundColor: isEditing
                      ? `${colors.primary}1A`
                      : colors.surface,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={isEditing ? "Viewing mode" : "Edit item"}
                >
                  <PenLine
                    size={15}
                    color={isEditing ? colors.primary : colors.muted}
                  />
                  <Text
                    style={[
                      typography.smallMedium,
                      {
                        color: isEditing
                          ? colors.primary
                          : colors.mutedForeground,
                      },
                    ]}
                  >
                    Edit
                  </Text>
                </Pressable>
              </View>

              {/* Serving size field (edit mode only) */}
              {isEditing ? (
                <View
                  style={{
                    marginHorizontal: spacing.md,
                    marginBottom: spacing.sm,
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: colors.primary,
                    borderRadius: radius.md,
                    backgroundColor: colors.card,
                    paddingHorizontal: spacing.sm,
                    minHeight: 44,
                  }}
                >
                  <Text
                    style={[
                      typography.smallMedium,
                      { color: colors.mutedForeground, marginRight: spacing.xs },
                    ]}
                  >
                    Serving (g)
                  </Text>
                  <TextInput
                    value={servingText}
                    onChangeText={handleServingChange}
                    keyboardType="decimal-pad"
                    style={[
                      typography.bodyMedium,
                      { flex: 1, color: colors.foreground },
                    ]}
                    accessibilityLabel="Serving size in grams"
                  />
                </View>
              ) : null}

              {/* Macro table */}
              <View
                style={{
                  marginHorizontal: spacing.md,
                  borderRadius: radius.lg,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  marginBottom: isEditing ? spacing.sm : spacing.xl,
                }}
              >
                {macroRows.map((row, rowIndex) => {
                  const isEven = rowIndex % 2 === 0;
                  const displayValue = row.getValue(draft);
                  const inputValue = editValues[row.key];

                  return (
                    <View
                      key={row.key}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.sm,
                        backgroundColor: isEven ? colors.card : colors.surface,
                        borderLeftWidth: 3,
                        borderLeftColor: row.color,
                        gap: spacing.sm,
                      }}
                    >
                      {row.icon}
                      <Text
                        style={[
                          typography.smallMedium,
                          { color: colors.foreground, flex: 1 },
                        ]}
                      >
                        {row.label}
                      </Text>
                      {isEditing ? (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <TextInput
                            value={inputValue}
                            onChangeText={(t) => handleMacroChange(row.key, t)}
                            keyboardType="decimal-pad"
                            style={[
                              typography.bodyMedium,
                              {
                                color: colors.foreground,
                                textAlign: "right",
                                minWidth: 64,
                                borderBottomWidth: 1,
                                borderBottomColor: row.color,
                                paddingBottom: 2,
                              },
                            ]}
                            accessibilityLabel={`${row.label} value`}
                          />
                          <Text
                            style={[
                              typography.caption,
                              { color: colors.mutedForeground },
                            ]}
                          >
                            {row.unit}
                          </Text>
                        </View>
                      ) : (
                        <Text
                          style={[
                            typography.bodyMedium,
                            { color: colors.foreground },
                          ]}
                        >
                          {displayValue !== undefined ? displayValue : "—"}{" "}
                          <Text
                            style={[
                              typography.caption,
                              { color: colors.mutedForeground },
                            ]}
                          >
                            {row.unit}
                          </Text>
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Save button (edit mode only) */}
              {isEditing && itemIndex !== null ? (
                <Pressable
                  onPress={handleSave}
                  style={{
                    marginHorizontal: spacing.md,
                    marginBottom: spacing.xl,
                    minHeight: 48,
                    borderRadius: radius.md,
                    backgroundColor: colors.primary,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Save changes"
                >
                  <Text
                    style={[typography.bodyMedium, { color: colors.primaryForeground }]}
                  >
                    Save changes
                  </Text>
                </Pressable>
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// Inline style object for absolute fill (avoids importing StyleSheet)
const styleAbsoluteFill = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

// TEST:
// 1. Open modal from log screen → read-only table shows all macros with correct icons/colors
// 2. Tap Edit → serving size field appears, inputs become editable
// 3. Change serving size → all macros recalculate proportionally from base values
// 4. Manually edit a macro in edit mode → value updates independently
// 5. Tap photo area in edit mode → image picker opens; selected URI renders in header
// 6. Tap Save changes → onSave called with updated item + itemIndex; modal closes
// 7. Tap backdrop or X → modal closes without saving
// 8. Zebra striping: even rows = colors.card, odd rows = colors.surface
// 9. Verify no crash when item.fiber_g or item.sugar_g is undefined (shows "—")
