import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Flame, Dumbbell, Zap, ChevronRight, Send } from "lucide-react-native";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";
import { typography } from "@/constants/typography";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useThemeStore((s) => s.colors);
  const { profile, isLoading } = useAuthStore();

  const todayStats = {
    calories: 1800,
    calorieGoal: 2200,
    workouts: 1,
    streak: 7,
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const todayDate = format(new Date(), "EEEE, d 'de' MMMM", {
    locale: ptBR,
  });

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
        {/* SHARED LOADING — use <Spinner size="lg" /> for full-screen loading states */}
        <Spinner size="lg" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.md,
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header: Greeting + Avatar */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: spacing.xl,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              ...typography.h2,
              color: colors.foreground,
              marginBottom: spacing.xs,
            }}
          >
            {getGreeting()}, {profile?.name?.split(" ")[0] || "User"}
          </Text>
          <Text
            style={{
              ...typography.small,
              color: colors.mutedForeground,
              textTransform: "capitalize",
            }}
          >
            {todayDate}
          </Text>
        </View>

        <Pressable
          onPress={() => router.push("/(tabs)/profile")}
          style={{ marginLeft: spacing.md }}
        >
          <Avatar source={profile?.avatar_url} name={profile?.name} size="lg" />
        </Pressable>
      </View>

      {/* Stats Cards */}
      <View style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
        {/* Calories Card - Full Width */}
        <Pressable
          onPress={() => router.push("/(tabs)/nutrition")}
          style={{
            backgroundColor: colors.card,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: spacing.md,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.md,
              flex: 1,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: radius.md,
                backgroundColor: colors.surface,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Flame size={24} color="#F59E0B" />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  ...typography.small,
                  color: colors.mutedForeground,
                  marginBottom: spacing.xxs,
                }}
              >
                Calorias de hoje
              </Text>
              <Text
                style={{
                  ...typography.h3,
                  color: colors.foreground,
                }}
              >
                {todayStats.calories} / {todayStats.calorieGoal}
              </Text>
            </View>
          </View>

          <ChevronRight size={20} color={colors.muted} />
        </Pressable>

        {/* Stats Grid: Workouts + Streak */}
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {/* Workouts Card */}
          <Pressable
            onPress={() => router.push("/(tabs)/workouts")}
            style={{
              flex: 1,
              backgroundColor: colors.card,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              padding: spacing.md,
              alignItems: "center",
              justifyContent: "center",
              minHeight: 100,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.md,
                backgroundColor: colors.surface,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: spacing.sm,
              }}
            >
              <Dumbbell size={20} color={colors.primary} />
            </View>
            <Text
              style={{
                ...typography.caption,
                color: colors.mutedForeground,
                marginBottom: spacing.xxs,
              }}
            >
              Treinos
            </Text>
            <Text
              style={{
                ...typography.h2,
                color: colors.foreground,
              }}
            >
              {todayStats.workouts}
            </Text>
          </Pressable>

          {/* Streak Card */}
          <Pressable
            style={{
              flex: 1,
              backgroundColor: colors.card,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              padding: spacing.md,
              alignItems: "center",
              justifyContent: "center",
              minHeight: 100,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.md,
                backgroundColor: colors.surface,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: spacing.sm,
              }}
            >
              <Zap size={20} color="#EF4444" />
            </View>
            <Text
              style={{
                ...typography.caption,
                color: colors.mutedForeground,
                marginBottom: spacing.xxs,
              }}
            >
              Sequência
            </Text>
            <Text
              style={{
                ...typography.h2,
                color: colors.foreground,
              }}
            >
              {todayStats.streak}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Quick Actions Section */}
      <View style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
        <Text
          style={{
            ...typography.h3,
            color: colors.foreground,
            marginBottom: spacing.sm,
          }}
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
          Log de Nutrição
        </Button>
      </View>

      {/* Phase 3 Placeholder */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.md,
          alignItems: "center",
          gap: spacing.sm,
          borderWidth: 1,
          borderColor: colors.cardBorder,
        }}
      >
        <Text
          style={{
            ...typography.small,
            color: colors.mutedForeground,
            textAlign: "center",
          }}
        >
          Widgets personalizáveis em breve
        </Text>
        <Text
          style={{
            ...typography.caption,
            color: colors.mutedForeground,
            textAlign: "center",
          }}
        >
          (Phase 3)
        </Text>
      </View>
    </ScrollView>

      {/* Coach chat bottom bar scaffold */}
      {/* SHARED BOTTOM BAR STYLE — sync across: home, workouts, nutrition, community */}
      <View
        style={{
          paddingBottom: insets.bottom + 8,
          paddingTop: 8,
          paddingHorizontal: 16,
          borderTopWidth: 1,
          borderTopColor: colors.cardBorder,
          backgroundColor: colors.card,
        }}
      >
        {/* TODO: Coach chat logic */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TextInput
            placeholder="Ask your coach..."
            placeholderTextColor={colors.mutedForeground}
            editable={false}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 12,
              paddingHorizontal: 14,
              backgroundColor: colors.surface,
              color: colors.foreground,
            }}
          />
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Send size={18} color={colors.mutedForeground} />
          </View>
        </View>
      </View>
    </View>
  );
}
