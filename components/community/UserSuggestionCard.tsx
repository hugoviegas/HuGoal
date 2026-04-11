import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Avatar } from "@/components/ui/Avatar";
import { FollowButton } from "@/components/community/FollowButton";
import { useThemeStore } from "@/stores/theme.store";
import type { PublicProfile } from "@/types";

interface UserSuggestionCardProps {
  profile: PublicProfile;
  mutualCount?: number;
}

export function UserSuggestionCard({ profile, mutualCount }: UserSuggestionCardProps) {
  const colors = useThemeStore((s) => s.colors);
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/user/${profile.id}`)}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
        borderRadius: 14,
        backgroundColor: pressed ? colors.surface : colors.card,
        borderWidth: 1,
        borderColor: colors.cardBorder,
      })}
    >
      <Avatar source={profile.avatar_url} name={profile.name} size="md" />

      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "700" }} numberOfLines={1}>
          {profile.name}
        </Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 13 }} numberOfLines={1}>
          @{profile.username}
        </Text>
        {mutualCount && mutualCount > 0 ? (
          <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 2 }}>
            Followed by {mutualCount} {mutualCount === 1 ? "friend" : "friends"}
          </Text>
        ) : null}
      </View>

      <FollowButton targetUid={profile.id} size="sm" />
    </Pressable>
  );
}
