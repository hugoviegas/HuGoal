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

// ─── Design tokens ───────────────────────────────────────────────────────────
const MACRO_COLORS = {
  calories: "#f97316",
  protein: "#3b82f6",
  carbs: "#eab308",
  fat: "#ef4444",
  fiber: "#22c55e",
  sugar: "#a855f7",
} as const;

type MacroKey = "calories" | "protein" | "carbs" | "fat" | "fiber" | "sugar";

// ─── Scaling helpers ─────────────────────────────────────────────────────────
function scaleValue(base: number | undefined, ratio: number): number {
  if (typeof base !== "number" || !Number.isFinite(base)) return 0;
  return Math.max(0, Math.round(base * ratio));
}

function buildScaledItem(base: NutritionItem, newServing: number): NutritionItem {
  const baseServing = base.serving_size_g > 0 ? base.serving_size_g : 100;
  const ratio = newServing > 0 ? newServing / baseServing : 0;
  return {
    ...base,
    serving_size_g: newServing,
    calories: scaleValue(base.calories, ratio),
    protein_g: scaleValue(base.protein_g, ratio),
    carbs_g: scaleValue(base.carbs_g, ratio),
    fat_g: scaleValue(base.fat_g, ratio),
    fiber_g: typeof base.fiber_g === "number" ? scaleValue(base.fiber_g, ratio) : undefined,
    sugar_g: typeof base.sugar_g === "number" ? scaleValue(base.sugar_g, ratio) : undefined,
  };
}

function parsePositive(text: string, fallback = 0): number {
  const n = parseFloat(text.replace(",", "."));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(n * 100) / 100);
}

// ─── Row definition ──────────────────────────────────────────────────────────
interface MacroRowDef {
  key: MacroKey;
  label: string;
  unit: string;
  icon: React.ReactElement;
  color: string;
  getValue: (item: NutritionItem) => number | undefined;
}

const ICON_SIZE = 18;

const MACRO_ROWS: MacroRowDef[] = [
  {
    key: "calories",
    label: "Calories",
    unit: "kcal",
    icon: <Flame size={ICON_SIZE} color={MACRO_COLORS.calories} />,
    color: MACRO_COLORS.calories,
    getValue: (i) => i.calories,
  },
  {
    key: "protein",
    label: "Protein",
    unit: "g",
    icon: <Zap size={ICON_SIZE} color={MACRO_COLORS.protein} />,
    color: MACRO_COLORS.protein,
    getValue: (i) => i.protein_g,
  },
  {
    key: "carbs",
    label: "Carbs",
    unit: "g",
    icon: <Wheat size={ICON_SIZE} color={MACRO_COLORS.carbs} />,
    color: MACRO_COLORS.carbs,
    getValue: (i) => i.carbs_g,
  },
  {
    key: "fat",
    label: "Fat",
    unit: "g",
    icon: <Droplets size={ICON_SIZE} color={MACRO_COLORS.fat} />,
    color: MACRO_COLORS.fat,
    getValue: (i) => i.fat_g,
  },
  {
    key: "fiber",
    label: "Fiber",
    unit: "g",
    icon: <Leaf size={ICON_SIZE} color={MACRO_COLORS.fiber} />,
    color: MACRO_COLORS.fiber,
    getValue: (i) => i.fiber_g,
  },
  {
    key: "sugar",
    label: "Sugar",
    unit: "g",
    icon: <Candy size={ICON_SIZE} color={MACRO_COLORS.sugar} />,
    color: MACRO_COLORS.sugar,
    getValue: (i) => i.sugar_g,
  },
];

// ─── Props ───────────────────────────────────────────────────────────────────
export interface NutritionTableModalProps {
  visible: boolean;
  item: NutritionItem | null;
  itemIndex: number | null;
  onClose: () => void;
  onSave: (item: NutritionItem, index: number) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────
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
  const [editValues, setEditValues] = useState<Record<MacroKey, string>>({
    calories: "0",
    protein: "0",
    carbs: "0",
    fat: "0",
    fiber: "0",
    sugar: "0",
  });

  // Keep original item as scaling reference
  const baseRef = useRef<NutritionItem | null>(null);

  // Reset state when modal opens with a new item
  useEffect(() => {
    if (!visible || !item) return;
    baseRef.current = item;
    setDraft(item);
    setIsEditing(false);
    setServingText(String(item.serving_size_g));
    resetEditValues(item);
  }, [visible, item]);

  function resetEditValues(src: NutritionItem) {
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
      resetEditValues(scaled);
    }
  };

  const handleMacroChange = (key: MacroKey, text: string) => {
    setEditValues((prev) => ({ ...prev, [key]: text }));
    const numVal = parsePositive(text, 0);
    setDraft((prev): NutritionItem | null => {
      if (!prev) return prev;
      switch (key) {
        case "calories": return { ...prev, calories: numVal };
        case "protein":  return { ...prev, protein_g: numVal };
        case "carbs":    return { ...prev, carbs_g: numVal };
        case "fat":      return { ...prev, fat_g: numVal };
        case "fiber":    return { ...prev, fiber_g: numVal };
        case "sugar":    return { ...prev, sugar_g: numVal };
        default:         return prev;
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

  if (!visible || !item || !draft) return null;

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
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
          }}
          onPress={handleClose}
        />

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: "90%",
            }}
          >
            {/* Drag handle */}
            <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
              <View
                style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.muted }}
              />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: spacing.xl }}
            >
              {/* ── Header: photo + name + edit toggle ── */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  gap: spacing.md,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.cardBorder,
                  marginBottom: spacing.sm,
                }}
              >
                {/* Photo */}
                <Pressable
                  onPress={isEditing ? handlePickPhoto : undefined}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: radius.md,
                    overflow: "hidden",
                    backgroundColor: colors.surface,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: isEditing ? 1.5 : 0,
                    borderColor: isEditing ? colors.primary : "transparent",
                    borderStyle: "dashed",
                  }}
                >
                  {draft.photo_url ? (
                    <Image source={{ uri: draft.photo_url }} style={{ width: 60, height: 60 }} />
                  ) : (
                    <ImagePlus size={22} color={isEditing ? colors.primary : colors.muted} />
                  )}
                </Pressable>

                {/* Name + brand/serving */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={[typography.bodyMedium, { color: colors.foreground }]}
                    numberOfLines={2}
                  >
                    {draft.food_name}
                  </Text>
                  <Text
                    style={[typography.caption, { color: colors.mutedForeground, marginTop: 2 }]}
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
                    paddingVertical: 7,
                    borderRadius: radius.full,
                    backgroundColor: isEditing ? `${colors.primary}1A` : colors.surface,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={isEditing ? "Cancel edit" : "Edit values"}
                >
                  <PenLine size={14} color={isEditing ? colors.primary : colors.muted} />
                  <Text
                    style={[
                      typography.smallMedium,
                      { color: isEditing ? colors.primary : colors.mutedForeground },
                    ]}
                  >
                    {isEditing ? "Editing" : "Edit"}
                  </Text>
                </Pressable>
              </View>

              {/* ── Serving size (edit mode) ── */}
              {isEditing ? (
                <View
                  style={{
                    marginHorizontal: spacing.md,
                    marginBottom: spacing.sm,
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.primary,
                    borderRadius: radius.md,
                    paddingHorizontal: spacing.md,
                    minHeight: 48,
                    gap: spacing.sm,
                  }}
                >
                  <Text
                    style={[typography.smallMedium, { color: colors.mutedForeground }]}
                  >
                    Serving (g)
                  </Text>
                  <TextInput
                    value={servingText}
                    onChangeText={handleServingChange}
                    keyboardType="decimal-pad"
                    style={[typography.bodyMedium, { flex: 1, color: colors.foreground, textAlign: "right" }]}
                    accessibilityLabel="Serving size"
                  />
                </View>
              ) : null}

              {/* ── Macro table ── */}
              <View
                style={{
                  marginHorizontal: spacing.md,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  overflow: "hidden",
                }}
              >
                {MACRO_ROWS.map((row, rowIndex) => {
                  const isEven = rowIndex % 2 === 0;
                  const displayValue = row.getValue(draft);
                  const inputVal = editValues[row.key];

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
                      {/* Icon */}
                      {row.icon}

                      {/* Label */}
                      <Text
                        style={[
                          typography.smallMedium,
                          { color: colors.foreground, flex: 1 },
                        ]}
                      >
                        {row.label}
                      </Text>

                      {/* Value — editable or read-only */}
                      {isEditing ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <TextInput
                            value={inputVal}
                            onChangeText={(t) => handleMacroChange(row.key, t)}
                            keyboardType="decimal-pad"
                            style={[
                              typography.bodyMedium,
                              {
                                color: colors.foreground,
                                textAlign: "right",
                                minWidth: 60,
                                borderBottomWidth: 1,
                                borderBottomColor: row.color,
                                paddingBottom: 2,
                              },
                            ]}
                            accessibilityLabel={row.label}
                          />
                          <Text style={[typography.caption, { color: colors.mutedForeground, width: 28 }]}>
                            {row.unit}
                          </Text>
                        </View>
                      ) : (
                        <Text style={[typography.bodyMedium, { color: colors.foreground }]}>
                          {displayValue !== undefined ? displayValue : "—"}
                          <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                            {" "}{row.unit}
                          </Text>
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* ── Save button (edit mode only) ── */}
              {isEditing && itemIndex !== null ? (
                <Pressable
                  onPress={handleSave}
                  style={{
                    marginHorizontal: spacing.md,
                    marginTop: spacing.md,
                    minHeight: 50,
                    borderRadius: radius.md,
                    backgroundColor: colors.primary,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Save changes"
                >
                  <Text style={[typography.bodyMedium, { color: colors.primaryForeground }]}>
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

// TEST:
// 1. Tap "View nutrition table" on any FoodItemCard → modal slides up
// 2. Read-only: icons + colored left borders + correct values for all macros
// 3. Tap "Edit" → serving size field + editable inputs appear; button turns blue
// 4. Change serving size → all macros recalculate proportionally
// 5. Manually edit a macro → value updates independently
// 6. Tap photo in edit mode → library picker; selected image fills the 60px square
// 7. Save changes → onSave called, modal closes, item updates in log list
// 8. Tap backdrop → modal closes without saving
// 9. Item with no fiber/sugar → shows "—" without crashing
