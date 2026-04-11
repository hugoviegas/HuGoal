import { Pressable, Text, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useThemeStore } from "@/stores/theme.store";
import { useCommunityStore } from "@/stores/community.store";
import { useAuthStore } from "@/stores/auth.store";

interface FollowButtonProps {
  targetUid: string;
  size?: "sm" | "md";
}

export function FollowButton({ targetUid, size = "md" }: FollowButtonProps) {
  const colors = useThemeStore((s) => s.colors);
  const uid = useAuthStore((s) => s.user?.uid);
  const followingIds = useCommunityStore((s) => s.followingIds);
  const follow = useCommunityStore((s) => s.followUser);
  const unfollow = useCommunityStore((s) => s.unfollowUser);
  const [loading, setLoading] = useState(false);

  if (!uid || uid === targetUid) return null;

  const isFollowing = followingIds.includes(targetUid);

  const handlePress = async () => {
    setLoading(true);
    try {
      if (isFollowing) {
        await unfollow(uid, targetUid);
      } else {
        await follow(uid, targetUid);
      }
    } finally {
      setLoading(false);
    }
  };

  const pad = size === "sm" ? { paddingHorizontal: 14, paddingVertical: 6 } : { paddingHorizontal: 20, paddingVertical: 10 };
  const fontSize = size === "sm" ? 13 : 15;

  return (
    <Pressable
      onPress={handlePress}
      disabled={loading}
      style={({ pressed }) => ({
        ...pad,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: isFollowing
          ? pressed ? colors.surface : colors.secondary
          : pressed ? colors.primary + "CC" : colors.primary,
        borderWidth: isFollowing ? 1 : 0,
        borderColor: colors.cardBorder,
        minWidth: 80,
      })}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isFollowing ? colors.foreground : colors.primaryForeground} />
      ) : (
        <Text
          style={{
            color: isFollowing ? colors.foreground : colors.primaryForeground,
            fontSize,
            fontWeight: "700",
          }}
        >
          {isFollowing ? "Following" : "Follow"}
        </Text>
      )}
    </Pressable>
  );
}
