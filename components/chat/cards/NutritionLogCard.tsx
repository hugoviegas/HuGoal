import { useMemo } from "react";
import { Text, View } from "react-native";
import { CheckCircle2, TriangleAlert } from "lucide-react-native";
import Animated, { Easing, FadeIn, SlideInDown } from "react-native-reanimated";

import { radius, spacing, typography } from "@/constants/design-system";
import { withOpacity } from "@/lib/color";
import type { NutritionChatItem } from "@/lib/ai/nutritionChatAI";
import { useThemeStore } from "@/stores/theme.store";

interface NutritionLogCardProps {
  items: NutritionChatItem[];
}

function sumItems(items: NutritionChatItem[]) {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein_g: acc.protein_g + item.protein_g,
      carbs_g: acc.carbs_g + item.carbs_g,
      fat_g: acc.fat_g + item.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
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

export function NutritionLogCard({ items }: NutritionLogCardProps) {
  const colors = useThemeStore((state) => state.colors);
  const totals = useMemo(() => sumItems(items), [items]);

  return (
    <Animated.View
      entering={FadeIn.duration(200).easing(Easing.out(Easing.cubic))}
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
        entering={SlideInDown.duration(200).easing(Easing.out(Easing.cubic))}
        style={{ gap: spacing.md }}
      >
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
            <Text
              style={[typography.smallMedium, { color: colors.foreground }]}
            >
              Logged
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
          {items.map((item, index) => (
            <View
              key={`${item.name}-${index}`}
              style={{
                borderRadius: radius.lg,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                padding: spacing.sm,
                gap: spacing.xs,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: spacing.sm,
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                  >
                    <Text
                      style={[
                        typography.smallMedium,
                        { color: colors.foreground },
                      ]}
                    >
                      {item.name}
                    </Text>
                    {item.confidence === "low" ? (
                      <TriangleAlert size={14} color={colors.destructive} />
                    ) : null}
                    {item.source === "pantry" ? (
                      <View
                        style={{
                          borderRadius: radius.full,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          backgroundColor: withOpacity(colors.accent, 0.14),
                        }}
                      >
                        <Text
                          style={[
                            typography.caption,
                            {
                              color: colors.accent,
                              fontWeight: "700",
                            },
                          ]}
                        >
                          pantry
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {item.quantity} {item.unit}
                  </Text>
                </View>

                <Text
                  style={[typography.smallMedium, { color: colors.foreground }]}
                >
                  {Math.round(item.calories)} kcal
                </Text>
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                <MacroPill
                  label="P"
                  value={`${item.protein_g}g`}
                  color={colors.primary}
                />
                <MacroPill
                  label="C"
                  value={`${item.carbs_g}g`}
                  color={colors.accent}
                />
                <MacroPill
                  label="F"
                  value={`${item.fat_g}g`}
                  color={colors.destructive}
                />
              </View>
            </View>
          ))}
        </View>

        <View
          style={{
            height: 1,
            backgroundColor: colors.cardBorder,
          }}
        />

        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.smallMedium, { color: colors.foreground }]}>
            Totals
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            <MacroPill
              label="P"
              value={`${Math.round(totals.protein_g)}g`}
              color={colors.primary}
            />
            <MacroPill
              label="C"
              value={`${Math.round(totals.carbs_g)}g`}
              color={colors.accent}
            />
            <MacroPill
              label="F"
              value={`${Math.round(totals.fat_g)}g`}
              color={colors.destructive}
            />
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}
