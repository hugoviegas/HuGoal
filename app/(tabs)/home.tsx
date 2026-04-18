import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Settings2,
  Flame,
  Dumbbell,
  Zap,
  Droplets,
  Trophy,
  ChevronRight,
  Play,
} from "lucide-react-native";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { HomeCoach } from "@/components/HomeCoach";
import { EditProfileModal } from "@/components/EditProfileModal";
import { useAuthStore } from "@/stores/auth.store";
import { useNutritionStore } from "@/stores/nutrition.store";
import { useWorkoutStore } from "@/stores/workout.store";
import { useThemeStore } from "@/stores/theme.store";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";
import { typography } from "@/constants/typography";
import { withOpacity } from "@/lib/color";

// ─── Helpers ──────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function pct(value: number, goal: number): number {
  if (!goal) return 0;
  return Math.min(1, value / goal);
}

// ─── Sub-components ──────────────────────────────────────────────

function StatCard({
  label,
  value,
  unit,
  icon,
  accent,
  onPress,
  fill,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  accent: string;
  onPress?: () => void;
  fill?: number; // 0-1 progress fraction
}) {
  const colors = useThemeStore((s) => s.colors);
  const isDark = useThemeStore((s) => s.isDark);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: pressed
          ? withOpacity(colors.foreground, isDark ? 0.07 : 0.04)
          : colors.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        padding: spacing.md,
        minHeight: 100,
        overflow: "hidden",
      })}
      accessibilityRole={onPress ? "button" : "none"}
      accessibilityLabel={`${label}: ${value}${unit ? " " + unit : ""}`}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.md,
          backgroundColor: withOpacity(accent, 0.15),
          alignItems: "center",
          justifyContent: "center",
          marginBottom: spacing.sm,
        }}
      >
        {icon}
      </View>

      <Text style={[typography.caption, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          gap: 3,
          marginTop: 2,
        }}
      >
        <Text
          style={[
            typography.h3,
            { color: colors.foreground, fontWeight: "700" },
          ]}
        >
          {value}
        </Text>
        {unit ? (
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>
            {unit}
          </Text>
        ) : null}
      </View>

      {fill !== undefined ? (
        <View
          style={{
            height: 3,
            borderRadius: 2,
            backgroundColor: withOpacity(accent, 0.18),
            marginTop: spacing.xs,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: 3,
              width: `${Math.round(fill * 100)}%`,
              borderRadius: 2,
              backgroundColor: accent,
            }}
          />
        </View>
      ) : null}
    </Pressable>
  );
}

function MacroPill({
  label,
  value,
  goal,
  color,
}: {
  label: string;
  value: number;
  goal: number;
  color: string;
}) {
  const colors = useThemeStore((s) => s.colors);
  const fraction = pct(value, goal);

  return (
    <View style={{ flex: 1, gap: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={[typography.caption, { color: colors.mutedForeground }]}>
          {label}
        </Text>
        <Text
          style={[
            typography.caption,
            { color: colors.foreground, fontWeight: "600" },
          ]}
        >
          {Math.round(value)}g
        </Text>
      </View>
      <View
        style={{
          height: 5,
          borderRadius: 3,
          backgroundColor: withOpacity(color, 0.18),
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: 5,
            width: `${Math.round(fraction * 100)}%`,
            borderRadius: 3,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useThemeStore((s) => s.colors);
  const isDark = useThemeStore((s) => s.isDark);

  const { profile, isLoading } = useAuthStore();
  const todayTotals = useNutritionStore((s) => s.todayTotals);
  const dailyGoal = useNutritionStore((s) => s.dailyGoal);
  const waterMl = useNutritionStore((s) => s.waterMl);
  const workoutActive = useWorkoutStore((s) => s.isActive);
  const workoutName = useWorkoutStore((s) => s.templateName);

  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [coachFullscreen, setCoachFullscreen] = useState(false);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spinner size="lg" />
      </View>
    );
  }

  const firstName = profile?.name?.split(" ")[0] ?? "Atleta";
  const todayDate = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });
  const calorieFraction = pct(todayTotals.calories, dailyGoal.calories);
  const waterGoalMl = 2000;
  const waterFraction = pct(waterMl, waterGoalMl);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Scrollable content ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingHorizontal: spacing.md,
          // Clear the collapsed chat panel consistently with nutrition/workouts.
          paddingBottom: insets.bottom + 160,
          gap: spacing.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
          }}
        >
          <Pressable
            onPress={() => setEditProfileVisible(true)}
            style={{ borderRadius: 999 }}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
          >
            <Avatar
              uri={profile?.avatar_url}
              name={profile?.name}
              size="lg"
              mode="view"
            />
          </Pressable>

          <View style={{ flex: 1, gap: 2 }}>
            <Text
              style={[
                typography.caption,
                { color: colors.mutedForeground, fontWeight: "500" },
              ]}
            >
              {getGreeting()}
            </Text>
            <Text
              style={[
                typography.h2,
                {
                  color: colors.foreground,
                  fontWeight: "700",
                  letterSpacing: -0.3,
                },
              ]}
              numberOfLines={1}
            >
              {firstName}
            </Text>
            <Text
              style={[
                typography.caption,
                { color: colors.mutedForeground, textTransform: "capitalize" },
              ]}
            >
              {todayDate}
            </Text>
          </View>

          <Pressable
            onPress={() => router.push("/settings")}
            style={({ pressed }) => ({
              width: 38,
              height: 38,
              borderRadius: radius.full,
              backgroundColor: pressed
                ? withOpacity(colors.foreground, isDark ? 0.12 : 0.06)
                : withOpacity(colors.foreground, isDark ? 0.06 : 0.04),
              alignItems: "center",
              justifyContent: "center",
            })}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Settings2 size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* Active workout banner */}
        {workoutActive && workoutName ? (
          <Pressable
            onPress={() => router.push("/(tabs)/workouts")}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
              backgroundColor: pressed
                ? withOpacity(colors.primary, 0.12)
                : withOpacity(colors.primary, 0.08),
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: withOpacity(colors.primary, 0.3),
              padding: spacing.sm,
            })}
            accessibilityRole="button"
            accessibilityLabel={`Active workout: ${workoutName}`}
          >
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: radius.md,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Play size={16} color={colors.primaryForeground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.smallMedium, { color: colors.primary }]}>
                Treino em andamento
              </Text>
              <Text
                style={[typography.caption, { color: colors.mutedForeground }]}
                numberOfLines={1}
              >
                {workoutName}
              </Text>
            </View>
            <ChevronRight size={16} color={colors.primary} />
          </Pressable>
        ) : null}

        {/* ── Calories card (full width) ── */}
        <Pressable
          onPress={() => router.push("/(tabs)/nutrition")}
          style={({ pressed }) => ({
            backgroundColor: pressed
              ? withOpacity(colors.foreground, isDark ? 0.07 : 0.04)
              : colors.card,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: spacing.md,
            gap: spacing.sm,
          })}
          accessibilityRole="button"
          accessibilityLabel={`Calories today: ${Math.round(todayTotals.calories)} of ${dailyGoal.calories}`}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.md,
                backgroundColor: withOpacity("#F59E0B", 0.15),
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Flame size={22} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[typography.caption, { color: colors.mutedForeground }]}
              >
                Calorias hoje
              </Text>
              <View
                style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}
              >
                <Text
                  style={[
                    typography.h2,
                    { color: colors.foreground, fontWeight: "700" },
                  ]}
                >
                  {Math.round(todayTotals.calories)}
                </Text>
                <Text
                  style={[typography.small, { color: colors.mutedForeground }]}
                >
                  / {dailyGoal.calories} kcal
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.mutedForeground} />
          </View>

          {/* Progress bar */}
          <View
            style={{
              height: 6,
              borderRadius: 3,
              backgroundColor: withOpacity("#F59E0B", 0.18),
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: 6,
                width: `${Math.round(calorieFraction * 100)}%`,
                borderRadius: 3,
                backgroundColor:
                  calorieFraction >= 1 ? colors.destructive : "#F59E0B",
              }}
            />
          </View>

          {/* Macro pills */}
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <MacroPill
              label="Prot"
              value={todayTotals.protein_g}
              goal={dailyGoal.protein_g}
              color="#22C55E"
            />
            <MacroPill
              label="Carb"
              value={todayTotals.carbs_g}
              goal={dailyGoal.carbs_g}
              color="#3B82F6"
            />
            <MacroPill
              label="Gord"
              value={todayTotals.fat_g}
              goal={dailyGoal.fat_g}
              color="#A855F7"
            />
          </View>
        </Pressable>

        {/* ── Stat grid ── */}
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <StatCard
            label="Sequência"
            value={profile?.streak_current ?? 0}
            unit="dias"
            icon={<Zap size={18} color="#EF4444" />}
            accent="#EF4444"
          />
          <StatCard
            label="XP total"
            value={profile?.xp ?? 0}
            unit="xp"
            icon={<Trophy size={18} color="#F59E0B" />}
            accent="#F59E0B"
          />
        </View>

        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <StatCard
            label="Água"
            value={Math.round(waterMl / 100) / 10}
            unit={`/ ${waterGoalMl / 1000}L`}
            icon={<Droplets size={18} color="#0EA5E9" />}
            accent="#0EA5E9"
            fill={waterFraction}
            onPress={() => router.push("/(tabs)/nutrition")}
          />
          <StatCard
            label="Treinos"
            value={workoutActive ? "Ativo" : "0"}
            icon={<Dumbbell size={18} color={colors.primary} />}
            accent={colors.primary}
            onPress={() => router.push("/(tabs)/workouts")}
          />
        </View>

        {/* ── Quick actions ── */}
        <View style={{ gap: spacing.sm }}>
          <Text
            style={[
              typography.h3,
              { color: colors.foreground, fontWeight: "700" },
            ]}
          >
            Ações rápidas
          </Text>
          <Button
            size="lg"
            variant="primary"
            onPress={() => router.push("/(tabs)/workouts/create")}
          >
            Iniciar Treino
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onPress={() => router.push("/(tabs)/nutrition")}
          >
            Registar Nutrição
          </Button>
        </View>
      </ScrollView>

      {/* ── Home Coach (bottom panel, position: absolute like workout/nutrition) ── */}
      <HomeCoach
        isFullscreen={coachFullscreen}
        onEnterFullscreen={() => setCoachFullscreen(true)}
        onExitFullscreen={() => setCoachFullscreen(false)}
      />

      {/* ── Edit Profile Modal ── */}
      <EditProfileModal
        visible={editProfileVisible}
        onClose={() => setEditProfileVisible(false)}
      />
    </View>
  );
}
