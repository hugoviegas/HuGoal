import { View, Text } from "react-native";
import { TrendingUp, TrendingDown, Minus, Trophy, Medal } from "lucide-react-native";
import { Avatar } from "@/components/ui/Avatar";
import { useThemeStore } from "@/stores/theme.store";
import type { ChallengeParticipant } from "@/types";

interface LeaderboardRowProps {
  participant: ChallengeParticipant;
  targetValue: number;
  isCurrentUser?: boolean;
}

export function LeaderboardRow({ participant, targetValue, isCurrentUser }: LeaderboardRowProps) {
  const colors = useThemeStore((s) => s.colors);
  const progress = targetValue > 0 ? Math.min(1, participant.score / targetValue) : 0;

  const rankColor =
    participant.rank === 1
      ? "#F59E0B"
      : participant.rank === 2
        ? "#9DA3AD"
        : participant.rank === 3
          ? "#CD7F32"
          : colors.mutedForeground;

  const RankIcon = participant.rank <= 3 ? (participant.rank === 1 ? Trophy : Medal) : null;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        backgroundColor: isCurrentUser ? colors.primary + "14" : "transparent",
        borderRadius: 12,
        borderWidth: isCurrentUser ? 1 : 0,
        borderColor: isCurrentUser ? colors.primary + "30" : "transparent",
      }}
    >
      {/* Rank */}
      <View style={{ width: 28, alignItems: "center" }}>
        {RankIcon ? (
          <RankIcon size={18} color={rankColor} />
        ) : (
          <Text style={{ color: rankColor, fontSize: 14, fontWeight: "700" }}>
            {participant.rank}
          </Text>
        )}
      </View>

      {/* Avatar */}
      <Avatar source={participant.user_avatar} name={participant.user_name} size="sm" />

      {/* Name + progress */}
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text
            style={{
              color: isCurrentUser ? colors.primary : colors.foreground,
              fontSize: 14,
              fontWeight: isCurrentUser ? "800" : "600",
            }}
            numberOfLines={1}
          >
            {participant.user_name}
            {isCurrentUser ? " (you)" : ""}
          </Text>
          <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}>
            {participant.score}
          </Text>
        </View>

        {/* Progress bar */}
        <View
          style={{
            height: 4,
            backgroundColor: colors.surface,
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: "100%",
              width: `${progress * 100}%`,
              backgroundColor:
                participant.rank === 1 ? "#F59E0B" : isCurrentUser ? colors.primary : colors.accent,
              borderRadius: 2,
            }}
          />
        </View>
      </View>

      {/* Trend */}
      <TrendIcon trend={participant.trend} colors={colors} />
    </View>
  );
}

function TrendIcon({
  trend,
  colors,
}: {
  trend: ChallengeParticipant["trend"];
  colors: ReturnType<typeof useThemeStore.getState>["colors"];
}) {
  if (trend === "up") return <TrendingUp size={16} color="#4ADE80" />;
  if (trend === "down") return <TrendingDown size={16} color="#F87171" />;
  return <Minus size={16} color={colors.mutedForeground} />;
}
