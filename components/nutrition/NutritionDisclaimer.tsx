/**
 * NutritionDisclaimer -- Info banner for AI nutrition estimates
 */
import { View, Text, Pressable } from "react-native";
import { Info, X } from "lucide-react-native";
import { useState } from "react";
import { useThemeStore } from "@/stores/theme.store";
import { typography } from "@/constants/typography";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";

interface NutritionDisclaimerProps {
  dismissible?: boolean;
}

export function NutritionDisclaimer({
  dismissible = true,
}: NutritionDisclaimerProps) {
  const colors = useThemeStore((s) => s.colors);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: spacing.xs,
        backgroundColor: colors.primary + "14",
        borderRadius: radius.md,
        padding: spacing.sm,
        borderWidth: 1,
        borderColor: colors.primary + "30",
      }}
    >
      <Info
        size={16}
        color={colors.primary}
        strokeWidth={2}
        style={{ marginTop: 2 }}
      />
      <Text
        style={[
          typography.caption,
          { color: colors.foreground, flex: 1, lineHeight: 18 },
        ]}
      >
        AI estimates are approximate and should not replace professional
        dietary advice.
      </Text>
      {dismissible ? (
        <Pressable
          onPress={() => setVisible(false)}
          hitSlop={8}
          style={{ padding: 2, minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
          accessibilityLabel="Dismiss disclaimer"
        >
          <X size={14} color={colors.muted} strokeWidth={2} />
        </Pressable>
      ) : null}
    </View>
  );
}
