import { View, Text, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Flame, Hand, Zap } from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { GlassCard } from "@/components/ui/GlassCard";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const profile = useAuthStore((s) => s.profile);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 100,
        paddingHorizontal: 16,
        gap: 16,
      }}
    >
      <View style={{ marginBottom: 8 }}>
        <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
          Good morning,
        </Text>
        <Text
          style={{ fontSize: 26, fontWeight: "800", color: colors.foreground }}
        >
          {profile?.name ?? "Athlete"}
        </Text>
        <View style={{ marginTop: 4, flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Hand size={16} color={colors.primary} />
          <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
            Keep your momentum today
          </Text>
        </View>
      </View>

      {/* Streak + XP */}
      <GlassCard style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            style={{ fontSize: 28, fontWeight: "800", color: colors.primary }}
          >
            {profile?.streak_current ?? 0}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: colors.mutedForeground,
              marginTop: 2,
            }}
          >
            Day Streak
          </Text>
          <Flame size={14} color={colors.primary} />
        </View>
        <View style={{ width: 1, backgroundColor: colors.cardBorder }} />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            style={{ fontSize: 28, fontWeight: "800", color: colors.accent }}
          >
            {profile?.xp ?? 0}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: colors.mutedForeground,
              marginTop: 2,
            }}
          >
            XP Total
          </Text>
          <Zap size={14} color={colors.accent} />
        </View>
      </GlassCard>

      {/* Today's workout placeholder */}
      <GlassCard>
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: colors.mutedForeground,
            marginBottom: 8,
          }}
        >
          TODAY&apos;S WORKOUT
        </Text>
        <Text style={{ fontSize: 16, color: colors.foreground }}>
          No workout scheduled — Phase 4 coming soon.
        </Text>
      </GlassCard>

      {/* Macros placeholder */}
      <GlassCard>
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: colors.mutedForeground,
            marginBottom: 8,
          }}
        >
          TODAY&apos;S NUTRITION
        </Text>
        <Text style={{ fontSize: 16, color: colors.foreground }}>
          Log your meals — Phase 5 coming soon.
        </Text>
      </GlassCard>
    </ScrollView>
  );
}
