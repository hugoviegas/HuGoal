// CLEANUP: Replaces components/nutrition/FoodRow.tsx

import React, { useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  Animated,
  PanResponder,
  Image,
} from "react-native";
import {
  UtensilsCrossed,
  Sparkles,
  PenLine,
  MoreVertical,
  Trash2,
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

function isAISource(source: string | undefined): boolean {
  if (!source) return false;
  return ["ai", "gemini", "anthropic", "ai_photo", "ai_generated"].includes(
    source,
  );
}

export interface FoodItemCardProps {
  item: NutritionItem;
  index: number;
  onEdit: (item: NutritionItem, index: number) => void;
  onDelete: (index: number) => void;
  onViewTable: (item: NutritionItem) => void;
}

export function FoodItemCard({
  item,
  index,
  onEdit,
  onDelete,
  onViewTable,
}: FoodItemCardProps) {
  const colors = useThemeStore((s) => s.colors);

  const translateX = useRef(new Animated.Value(0)).current;
  const deleteZoneOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;

  // Keep latest callbacks in refs so panResponder stays stable
  const callbacksRef = useRef({ onEdit, onDelete, onViewTable, index, item });
  useEffect(() => {
    callbacksRef.current = { onEdit, onDelete, onViewTable, index, item };
  });

  const macroTotal = item.protein_g + item.carbs_g + item.fat_g;
  const aiSource = isAISource(item.source);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, { dx, dy }) =>
          Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy),
        onPanResponderMove: (_, { dx }) => {
          if (dx < 0) {
            translateX.setValue(dx);
            deleteZoneOpacity.setValue(Math.min(Math.abs(dx) / 80, 1));
          }
        },
        onPanResponderRelease: (_, { dx }) => {
          if (dx < -120) {
            Animated.parallel([
              Animated.timing(translateX, {
                toValue: -400,
                duration: 200,
                useNativeDriver: true,
              }),
              Animated.timing(cardOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }),
            ]).start(() =>
              callbacksRef.current.onDelete(callbacksRef.current.index),
            );
          } else {
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
            Animated.timing(deleteZoneOpacity, {
              toValue: 0,
              duration: 150,
              useNativeDriver: true,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
          Animated.timing(deleteZoneOpacity, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }).start();
        },
      }),
    // translateX, deleteZoneOpacity, cardOpacity are stable Animated.Value refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleMorePress = () => {
    Alert.alert(item.food_name, undefined, [
      {
        text: "Edit",
        onPress: () => callbacksRef.current.onEdit(callbacksRef.current.item, callbacksRef.current.index),
      },
      {
        text: "View nutrition table",
        onPress: () => callbacksRef.current.onViewTable(callbacksRef.current.item),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => callbacksRef.current.onDelete(callbacksRef.current.index),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <View style={{ overflow: "hidden", borderRadius: radius.lg }}>
      {/* Delete zone rendered behind card */}
      <Animated.View
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: 80,
          backgroundColor: MACRO_COLORS.fat,
          alignItems: "center",
          justifyContent: "center",
          opacity: deleteZoneOpacity,
          borderTopRightRadius: radius.lg,
          borderBottomRightRadius: radius.lg,
        }}
      >
        <Trash2 size={22} color="#fff" />
      </Animated.View>

      {/* Swipeable card */}
      <Animated.View
        style={{
          opacity: cardOpacity,
          transform: [{ translateX }],
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          padding: spacing.sm,
          gap: spacing.xs,
        }}
        {...panResponder.panHandlers}
      >
        {/* Top row: photo · name/badge · calories · more */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          {/* Photo or fallback */}
          {item.photo_url ? (
            <Image
              source={{ uri: item.photo_url }}
              style={{ width: 52, height: 52, borderRadius: radius.md }}
            />
          ) : (
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: radius.md,
                backgroundColor: colors.surface,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <UtensilsCrossed size={22} color={colors.muted} />
            </View>
          )}

          {/* Name + serving + badge */}
          <View style={{ flex: 1, gap: 3 }}>
            <Text
              style={[typography.bodyMedium, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {item.food_name}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.xs,
                flexWrap: "wrap",
              }}
            >
              <Text
                style={[typography.caption, { color: colors.mutedForeground }]}
              >
                {item.serving_size_g}g
              </Text>
              {aiSource ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: radius.full,
                    backgroundColor: `${colors.primary}1A`,
                  }}
                >
                  <Sparkles size={11} color={colors.primary} />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      lineHeight: 14,
                      color: colors.primary,
                    }}
                  >
                    AI
                  </Text>
                </View>
              ) : item.source === "manual" ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: radius.full,
                    backgroundColor: colors.surface,
                  }}
                >
                  <PenLine size={11} color={colors.muted} />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      lineHeight: 14,
                      color: colors.mutedForeground,
                    }}
                  >
                    Manual
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Calories */}
          <Text
            style={[
              typography.bodyMedium,
              { color: MACRO_COLORS.calories },
            ]}
          >
            {item.calories} kcal
          </Text>

          {/* Three-dot menu */}
          <Pressable
            onPress={handleMorePress}
            hitSlop={8}
            style={{ padding: 4 }}
            accessibilityRole="button"
            accessibilityLabel="More options"
          >
            <MoreVertical size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* Macro mini-bars */}
        {macroTotal > 0 ? (
          <View style={{ flexDirection: "row", height: 4, gap: 1 }}>
            {[
              { color: MACRO_COLORS.protein, value: item.protein_g },
              { color: MACRO_COLORS.carbs, value: item.carbs_g },
              { color: MACRO_COLORS.fat, value: item.fat_g },
            ].map((seg, i) =>
              seg.value > 0 ? (
                <View
                  key={i}
                  style={{
                    flex: Math.max(4, (seg.value / macroTotal) * 100),
                    height: 4,
                    backgroundColor: seg.color,
                    borderRadius: 2,
                  }}
                />
              ) : null,
            )}
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

// TEST:
// 1. Add multiple food items and verify card layout (photo fallback, name, kcal, badge)
// 2. Swipe left < 80px → delete zone appears but snaps back
// 3. Swipe left > 120px → slide-out animation + item removed from list
// 4. Tap MoreVertical → Alert with Edit / View nutrition table / Delete / Cancel
// 5. AI-sourced item (source="ai_photo") → Sparkles + "AI" badge in primary tint
// 6. Manual-sourced item → PenLine + "Manual" badge in muted tint
// 7. Item with photo_url → thumbnail renders at 52×52 with radius.md
// 8. Item with protein/carbs/fat values → proportional mini-bars below
// 9. Zero-macro item → no bars rendered (no crash)
