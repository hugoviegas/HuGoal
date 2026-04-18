import { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputEndEditingEventData,
  type NativeSyntheticEvent,
} from "react-native";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  TriangleAlert,
  XCircle,
} from "lucide-react-native";
import Animated, { Easing, FadeIn, SlideInDown } from "react-native-reanimated";

import {
  computeMacros,
  type NutritionReviewItem,
} from "@/lib/ai/nutritionChatAI";
import { radius, spacing, typography } from "@/constants/design-system";
import { withOpacity } from "@/lib/color";
import { TypingIndicator } from "@/components/shared/TypingIndicator";
import { useThemeStore } from "@/stores/theme.store";

interface NutritionReviewCardProps {
  messageId: string;
  items: NutritionReviewItem[];
  status: "pending" | "confirmed" | "cancelled";
  onConfirm: (messageId: string) => Promise<void>;
  onCancel: (messageId: string) => void;
  onUpdateItem: (
    messageId: string,
    itemId: string,
    patch: Partial<NutritionReviewItem>,
  ) => void;
  isSubmitting?: boolean;
}

function clampWeight(value: number): number {
  if (!Number.isFinite(value)) {
    return 100;
  }

  return Math.max(1, Math.min(2000, Math.round(value)));
}

function badgeColorForConfidence(
  colors: ReturnType<typeof useThemeStore.getState>["colors"],
  confidence: number,
): string {
  if (confidence >= 0.9) return colors.primary;
  if (confidence >= 0.7) return colors.accent;
  return colors.destructive;
}

function macroValue(value: number, decimals = 1): string {
  if (decimals === 0) {
    return `${Math.round(value)}`;
  }

  return Number.isInteger(value)
    ? `${value.toFixed(1)}`
    : `${Math.round(value * 10) / 10}`;
}

function MacroPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  const colors = useThemeStore((state) => state.colors);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderRadius: radius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        backgroundColor: withOpacity(color, 0.12),
        borderWidth: 1,
        borderColor: withOpacity(color, 0.24),
      }}
    >
      <Text style={[typography.caption, { color, fontWeight: "700" }]}>
        {label}
      </Text>
      <Text style={[typography.caption, { color: colors.foreground }]}>
        {value}
      </Text>
    </View>
  );
}

function ReviewRow({
  messageId,
  item,
  onUpdateItem,
}: {
  messageId: string;
  item: NutritionReviewItem;
  onUpdateItem: NutritionReviewCardProps["onUpdateItem"];
}) {
  const colors = useThemeStore((state) => state.colors);
  const [weightText, setWeightText] = useState(String(item.weight_g));

  useEffect(() => {
    setWeightText(String(item.weight_g));
  }, [item.id, item.weight_g]);

  const visibleCandidates = useMemo(
    () => item.candidates.filter((candidate) => candidate.confidence >= 0.7),
    [item.candidates],
  );

  const selectedVisibleIndex = Math.max(
    0,
    visibleCandidates.findIndex(
      (candidate) =>
        candidate.name ===
        (item.candidates[item.selectedCandidateIndex] ?? item.candidates[0])
          ?.name,
    ),
  );

  const selectedCandidate =
    item.candidates[item.selectedCandidateIndex] ?? item.candidates[0];
  const showPicker =
    visibleCandidates.length > 1 && visibleCandidates[0]?.confidence < 0.9;
  const macros = computeMacros(
    selectedCandidate.per100g,
    clampWeight(Number(weightText.replace(",", ".")) || item.weight_g),
  );

  const commitWeight = (nextValue: string) => {
    const parsed = Number(nextValue.replace(",", "."));
    if (!Number.isFinite(parsed)) {
      return;
    }

    const clamped = clampWeight(parsed);
    setWeightText(String(clamped));
    onUpdateItem(messageId, item.id, { weight_g: clamped });
  };

  const moveCandidate = (direction: -1 | 1) => {
    if (!showPicker) {
      return;
    }

    const current = Math.max(0, selectedVisibleIndex);
    const nextIndex =
      (current + direction + visibleCandidates.length) %
      visibleCandidates.length;
    const nextCandidate = visibleCandidates[nextIndex];
    const actualIndex = item.candidates.findIndex(
      (candidate) => candidate.name === nextCandidate.name,
    );

    if (actualIndex >= 0) {
      onUpdateItem(messageId, item.id, { selectedCandidateIndex: actualIndex });
    }
  };

  const confidenceBadgeColor = badgeColorForConfidence(
    colors,
    selectedCandidate.confidence,
  );

  return (
    <View
      style={{
        borderRadius: radius.lg,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        padding: spacing.sm,
        gap: spacing.sm,
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
        <View style={{ flex: 1, gap: 6 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {showPicker ? (
              <>
                <Pressable
                  onPress={() => moveCandidate(-1)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Previous candidate"
                >
                  <ChevronLeft size={18} color={colors.mutedForeground} />
                </Pressable>
                <Text
                  style={[typography.smallMedium, { color: colors.foreground }]}
                >
                  {selectedCandidate.name}
                </Text>
                <Pressable
                  onPress={() => moveCandidate(1)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Next candidate"
                >
                  <ChevronRight size={18} color={colors.mutedForeground} />
                </Pressable>
              </>
            ) : (
              <Text
                style={[typography.smallMedium, { color: colors.foreground }]}
              >
                {selectedCandidate.name}
              </Text>
            )}

            <View
              style={{
                borderRadius: radius.full,
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
                backgroundColor: withOpacity(confidenceBadgeColor, 0.14),
                borderWidth: 1,
                borderColor: withOpacity(confidenceBadgeColor, 0.24),
              }}
            >
              <Text
                style={[
                  typography.caption,
                  { color: confidenceBadgeColor, fontWeight: "700" },
                ]}
              >
                {Math.round(selectedCandidate.confidence * 100)}%
              </Text>
            </View>

            {selectedCandidate.source === "pantry" ? (
              <View
                style={{
                  borderRadius: radius.full,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 2,
                  backgroundColor: withOpacity(colors.accent, 0.14),
                }}
              >
                <Text
                  style={[
                    typography.caption,
                    { color: colors.accent, fontWeight: "700" },
                  ]}
                >
                  Pantry
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderRadius: radius.full,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            backgroundColor: colors.surface,
            paddingHorizontal: spacing.sm,
          }}
        >
          <TextInput
            value={weightText}
            onChangeText={(nextValue) => {
              setWeightText(nextValue);
              const parsed = Number(nextValue.replace(",", "."));
              if (Number.isFinite(parsed)) {
                onUpdateItem(messageId, item.id, {
                  weight_g: clampWeight(parsed),
                });
              }
            }}
            keyboardType="numeric"
            onBlur={() => commitWeight(weightText)}
            onEndEditing={
              Platform.OS === "android"
                ? (
                    event: NativeSyntheticEvent<TextInputEndEditingEventData>,
                  ) => {
                    commitWeight(event.nativeEvent.text);
                  }
                : undefined
            }
            placeholder="100"
            placeholderTextColor={colors.mutedForeground}
            style={{
              minWidth: 56,
              paddingVertical: 8,
              color: colors.foreground,
              ...typography.smallMedium,
              textAlign: "right",
            }}
          />
          <Text
            style={[
              typography.caption,
              { color: colors.mutedForeground, marginLeft: 4 },
            ]}
          >
            g
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        <MacroPill
          label="P"
          value={`${macroValue(macros.protein_g)}g`}
          color={colors.primary}
        />
        <MacroPill
          label="C"
          value={`${macroValue(macros.carbs_g)}g`}
          color={colors.accent}
        />
        <MacroPill
          label="F"
          value={`${macroValue(macros.fat_g)}g`}
          color={colors.destructive}
        />
        <MacroPill
          label="Kcal"
          value={`${Math.round(macros.calories)}`}
          color={colors.mutedForeground}
        />
      </View>
    </View>
  );
}

export function NutritionReviewCard({
  messageId,
  items,
  status,
  onConfirm,
  onCancel,
  onUpdateItem,
  isSubmitting = false,
}: NutritionReviewCardProps) {
  const colors = useThemeStore((state) => state.colors);

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const selectedCandidate =
          item.candidates[item.selectedCandidateIndex] ?? item.candidates[0];
        const macros = computeMacros(selectedCandidate.per100g, item.weight_g);

        return {
          calories: acc.calories + macros.calories,
          protein_g: acc.protein_g + macros.protein_g,
          carbs_g: acc.carbs_g + macros.carbs_g,
          fat_g: acc.fat_g + macros.fat_g,
        };
      },
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    );
  }, [items]);

  if (status === "cancelled") {
    return (
      <View
        style={{
          alignSelf: "flex-start",
          maxWidth: "95%",
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          backgroundColor: colors.surface,
          padding: spacing.sm,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <XCircle size={16} color={colors.mutedForeground} />
        <Text style={[typography.caption, { color: colors.mutedForeground }]}>
          Cancelled
        </Text>
      </View>
    );
  }

  const content = (
    <View style={{ gap: spacing.md }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.sm,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={18} color={colors.primary} />
          <Text style={[typography.smallMedium, { color: colors.foreground }]}>
            {status === "confirmed" ? "Logged" : "Review"}
          </Text>
        </View>

        <View
          style={{
            borderRadius: radius.full,
            paddingHorizontal: spacing.sm,
            paddingVertical: 4,
            backgroundColor: colors.primary,
          }}
        >
          <Text
            style={[
              typography.caption,
              { color: colors.primaryForeground, fontWeight: "700" },
            ]}
          >
            {Math.round(totals.calories)} kcal
          </Text>
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        {items.map((item) => (
          <ReviewRow
            key={item.id}
            messageId={messageId}
            item={item}
            onUpdateItem={onUpdateItem}
          />
        ))}
      </View>

      <View style={{ height: 1, backgroundColor: colors.cardBorder }} />

      <View style={{ gap: spacing.sm }}>
        <Text style={[typography.smallMedium, { color: colors.foreground }]}>
          Totals
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          <MacroPill
            label="P"
            value={`${macroValue(totals.protein_g)}g`}
            color={colors.primary}
          />
          <MacroPill
            label="C"
            value={`${macroValue(totals.carbs_g)}g`}
            color={colors.accent}
          />
          <MacroPill
            label="F"
            value={`${macroValue(totals.fat_g)}g`}
            color={colors.destructive}
          />
        </View>
      </View>

      {status === "pending" ? (
        <View style={{ gap: spacing.sm }}>
          {isSubmitting ? <TypingIndicator /> : null}

          <Pressable
            onPress={() => {
              void onConfirm(messageId);
            }}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Confirm and log nutrition review"
            style={{
              borderRadius: radius.full,
              backgroundColor: colors.primary,
              paddingVertical: 12,
              alignItems: "center",
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            <Text
              style={[
                typography.smallMedium,
                { color: colors.primaryForeground, fontWeight: "700" },
              ]}
            >
              Confirm & Log
            </Text>
          </Pressable>

          <Pressable
            onPress={() => onCancel(messageId)}
            accessibilityRole="button"
            accessibilityLabel="Cancel nutrition review"
            style={{
              borderRadius: radius.full,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              paddingVertical: 11,
              alignItems: "center",
              backgroundColor: colors.background,
            }}
          >
            <Text
              style={[
                typography.smallMedium,
                { color: colors.mutedForeground, fontWeight: "700" },
              ]}
            >
              Cancel
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  return (
    <Animated.View
      entering={FadeIn.duration(220).easing(Easing.out(Easing.cubic))}
      style={{
        alignSelf: "flex-start",
        maxWidth: "95%",
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        backgroundColor: colors.surface,
        padding: spacing.md,
        gap: spacing.md,
      }}
    >
      <Animated.View
        entering={SlideInDown.duration(220).easing(Easing.out(Easing.cubic))}
      >
        {content}
      </Animated.View>
    </Animated.View>
  );
}
