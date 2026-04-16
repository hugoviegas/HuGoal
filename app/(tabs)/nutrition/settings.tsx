import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Bell,
  Flame,
  Scale,
  Target,
} from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";
import { typography } from "@/constants/typography";

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const colors = useThemeStore((s) => s.colors);

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        padding: 16,
        gap: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.surface,
          }}
        >
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.smallMedium, { color: colors.foreground }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[typography.caption, { color: colors.mutedForeground }]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {children}
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function NutritionSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 32,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace("/(tabs)/nutrition");
            }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.secondary,
            }}
          >
            <ArrowLeft size={18} color={colors.foreground} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.foreground,
                fontSize: 22,
                fontWeight: "800",
              }}
            >
              Nutrition Settings
            </Text>
            <Text style={[typography.caption, { color: colors.mutedForeground }]}>
              Manage your calorie goal, macros, and preferences
            </Text>
          </View>
        </View>

        {/* Section: Daily calorie goal */}
        <SectionCard
          icon={<Target size={16} color={colors.primary} />}
          title="Daily calorie goal"
          subtitle="Set your target calories per day"
        >
          {/* TODO: wire to nutrition store dailyGoal and allow editing */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 14,
              alignItems: "center",
            }}
          >
            <Text style={[typography.caption, { color: colors.mutedForeground }]}>
              Coming soon — edit your goal here
            </Text>
          </View>
        </SectionCard>

        {/* Section: Macro split */}
        <SectionCard
          icon={<Flame size={16} color={colors.primary} />}
          title="Macro split"
          subtitle="Protein, carbs, and fat percentages"
        >
          {/* TODO: wire to nutrition store macroGoal and allow editing */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 14,
              alignItems: "center",
            }}
          >
            <Text style={[typography.caption, { color: colors.mutedForeground }]}>
              Coming soon — configure your macro split
            </Text>
          </View>
        </SectionCard>

        {/* Section: Units */}
        <SectionCard
          icon={<Scale size={16} color={colors.primary} />}
          title="Units"
          subtitle="Choose how food quantities are displayed"
        >
          {/* TODO: wire to user preferences for g vs oz */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 14,
              alignItems: "center",
            }}
          >
            <Text style={[typography.caption, { color: colors.mutedForeground }]}>
              Coming soon — grams or ounces
            </Text>
          </View>
        </SectionCard>

        {/* Section: Meal reminders */}
        <SectionCard
          icon={<Bell size={16} color={colors.primary} />}
          title="Meal reminders"
          subtitle="Notifications to log your meals on time"
        >
          {/* TODO: wire to notifications/reminders settings */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 14,
              alignItems: "center",
            }}
          >
            <Text style={[typography.caption, { color: colors.mutedForeground }]}>
              Coming soon — configure meal reminders
            </Text>
          </View>
        </SectionCard>
      </ScrollView>
    </View>
  );
}
