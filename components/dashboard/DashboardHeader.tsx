import React from "react";
import { View, Text, Pressable, useWindowDimensions } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Bell, LayoutGrid, Check } from "lucide-react-native";
import { Avatar } from "@/components/ui/Avatar";
import { useThemeStore } from "@/stores/theme.store";
import { typography } from "@/constants/typography";
import { spacing } from "@/constants/spacing";
import type { UserProfile } from "@/types";

interface DashboardHeaderProps {
  profile: UserProfile | null;
  unreadCount: number;
  isEditMode: boolean;
  onToggleEditMode: () => void;
}

const TIPS = [
  "Consistência é mais importante do que perfeição.",
  "Cada treino conta. Não deixa para amanhã.",
  "Hidratação é a base de tudo.",
  "Descanso também é parte do treino.",
  "Pequenas melhorias diárias criam grandes resultados.",
  "O teu futuro eu vai agradecer.",
  "Foca no processo, os resultados seguem.",
  "Um dia de cada vez, um objetivo de cada vez.",
  "Não compares o teu capítulo 1 com o capítulo 10 de outro.",
  "Progresso, não perfeição.",
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

function getDailyTip(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
      86400000,
  );
  return TIPS[dayOfYear % TIPS.length];
}

export function DashboardHeader({
  profile,
  unreadCount,
  isEditMode,
  onToggleEditMode,
}: DashboardHeaderProps) {
  const { width } = useWindowDimensions();
  const colors = useThemeStore((s) => s.colors);
  const firstName = profile?.name?.split(" ")[0] ?? "Atleta";
  const isCompact = width < 390;

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={{
        gap: spacing.sm,
        paddingVertical: spacing.lg,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
        }}
      >
        <Avatar
          uri={profile?.avatar_url}
          name={profile?.name}
          size="lg"
          mode="view"
        />

        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: typography.small.fontSize,
              fontWeight: "500",
            }}
          >
            {getGreeting()}
          </Text>
          <Text
            style={{
              color: colors.foreground,
              fontSize: typography.h2.fontSize,
              fontWeight: "700",
              letterSpacing: -0.3,
            }}
            numberOfLines={1}
          >
            {firstName}
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.xs,
          }}
        >
          <View style={{ position: "relative" }}>
            <Pressable
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: pressed ? colors.surface : "transparent",
                alignItems: "center",
                justifyContent: "center",
              })}
            >
              <Bell size={20} color={colors.mutedForeground} />
            </Pressable>
            {unreadCount > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </View>

          <Pressable
            onPress={onToggleEditMode}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: isCompact ? 0 : 4,
              paddingHorizontal: isCompact ? 10 : spacing.sm,
              paddingVertical: 7,
              borderRadius: 20,
              minHeight: 40,
              backgroundColor: isEditMode
                ? colors.primary
                : pressed
                  ? colors.surface
                  : colors.secondary,
            })}
          >
            {isEditMode ? (
              <Check size={14} color="#fff" />
            ) : (
              <LayoutGrid size={14} color={colors.mutedForeground} />
            )}
            {!isCompact && (
              <Text
                style={{
                  color: isEditMode ? "#fff" : colors.mutedForeground,
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                {isEditMode ? "Concluir" : "Editar"}
              </Text>
            )}
          </Pressable>
        </View>
      </View>

      <Text
        style={{
          color: colors.mutedForeground,
          fontSize: typography.caption.fontSize,
          fontWeight: "400",
          marginTop: 2,
        }}
        numberOfLines={isCompact ? 3 : 2}
      >
        {getDailyTip()}
      </Text>
    </Animated.View>
  );
}
