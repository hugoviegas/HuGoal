import { View, Text, Pressable, Image } from "react-native";
import { Users, Dumbbell, Utensils, Flame, Calendar } from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";
import type { CommunityGroup } from "@/types";

interface GroupCardProps {
  group: CommunityGroup;
  onPress?: () => void;
}

const challengeIcons = {
  workout: Dumbbell,
  nutrition: Utensils,
  activity: Flame,
  streak: Calendar,
};

const challengeColors = {
  workout: "#22C4D5",
  nutrition: "#4ADE80",
  activity: "#F59E0B",
  streak: "#A78BFA",
};

export function GroupCard({ group, onPress }: GroupCardProps) {
  const colors = useThemeStore((s) => s.colors);
  const Icon = challengeIcons[group.challenge_type] ?? Dumbbell;
  const iconColor = challengeColors[group.challenge_type] ?? colors.primary;

  const isActive = group.status === "active";
  const endDate = group.ended_at ? new Date(group.ended_at) : null;
  const daysLeft = endDate
    ? Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? colors.surface : colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        padding: 14,
        gap: 10,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {group.avatar_url ? (
          <Image
            source={{ uri: group.avatar_url }}
            style={{ width: 44, height: 44, borderRadius: 12 }}
          />
        ) : (
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: colors.surface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={22} color={iconColor} />
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "700" }} numberOfLines={1}>
            {group.name}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
            <View
              style={{
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderRadius: 6,
                backgroundColor: iconColor + "20",
              }}
            >
              <Text style={{ color: iconColor, fontSize: 11, fontWeight: "700", textTransform: "capitalize" }}>
                {group.challenge_type}
              </Text>
            </View>
            {!isActive && (
              <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: colors.surface }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: "600" }}>Ended</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {group.description ? (
        <Text style={{ color: colors.mutedForeground, fontSize: 13, lineHeight: 18 }} numberOfLines={2}>
          {group.description}
        </Text>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Users size={14} color={colors.mutedForeground} />
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
            {group.member_count} {group.member_count === 1 ? "member" : "members"}
          </Text>
        </View>

        {daysLeft !== null && isActive && (
          <Text style={{ color: daysLeft <= 3 ? "#F87171" : colors.mutedForeground, fontSize: 12, fontWeight: "600" }}>
            {daysLeft === 0 ? "Ends today" : `${daysLeft}d left`}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
