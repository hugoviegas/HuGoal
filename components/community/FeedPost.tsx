import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  Dimensions,
  Share,
} from "react-native";
import { useRouter } from "expo-router";
import {
  MessageCircle,
  Share2,
  MoreHorizontal,
  Dumbbell,
  UtensilsCrossed,
  Trophy,
} from "lucide-react-native";
import { Avatar } from "@/components/ui/Avatar";
import { LikeButton } from "@/components/community/LikeButton";
import { useThemeStore } from "@/stores/theme.store";
import { useCommunityStore } from "@/stores/community.store";
import { useAuthStore } from "@/stores/auth.store";
import type { CommunityPost } from "@/types";

import { formatDistanceToNow } from "@/lib/community-time";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface FeedPostProps {
  post: CommunityPost;
  onCommentPress?: () => void;
  onMenuPress?: () => void;
}

export function FeedPost({ post, onCommentPress, onMenuPress }: FeedPostProps) {
  const colors = useThemeStore((s) => s.colors);
  const router = useRouter();
  const uid = useAuthStore((s) => s.user?.uid);
  const likePostAction = useCommunityStore((s) => s.likePost);
  const unlikePostAction = useCommunityStore((s) => s.unlikePost);

  const isLiked = uid ? post.liked_by.includes(uid) : false;

  const handleLike = () => {
    if (!uid) return;
    if (isLiked) {
      unlikePostAction(post.id, uid);
    } else {
      likePostAction(post.id, uid);
    }
  };

  const handleShare = async () => {
    await Share.share({
      message: `Check out this post on HuGoal: ${post.content}`,
    });
  };

  const handleOpenPost = () => {
    router.push(`/(tabs)/community/${post.id}`);
  };

  const handleOpenProfile = () => {
    if (uid === post.author_id) {
      router.push("/(tabs)/profile");
    } else {
      router.push(`/user/${post.author_id}`);
    }
  };

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 14,
          paddingTop: 14,
          paddingBottom: 10,
          gap: 10,
        }}
      >
        <Pressable onPress={handleOpenProfile}>
          <Avatar
            source={post.author_avatar_url}
            name={post.author_name}
            size="md"
          />
        </Pressable>

        <Pressable onPress={handleOpenProfile} style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.foreground,
              fontSize: 15,
              fontWeight: "700",
            }}
          >
            {post.author_name}
          </Text>
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 12,
              marginTop: 1,
            }}
          >
            {formatDistanceToNow(post.created_at)}
          </Text>
        </Pressable>

        <Pressable onPress={onMenuPress} hitSlop={8} style={{ padding: 4 }}>
          <MoreHorizontal size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {/* Content */}
      <Pressable onPress={handleOpenPost}>
        {post.content.length > 0 && (
          <Text
            style={{
              color: colors.foreground,
              fontSize: 15,
              lineHeight: 22,
              paddingHorizontal: 14,
              paddingBottom:
                post.media.length > 0 || post.linked_content ? 10 : 0,
            }}
          >
            {post.content}
          </Text>
        )}

        {/* Image carousel */}
        {post.media.length > 0 && (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={{ width: "100%" }}
          >
            {post.media
              .sort((a, b) => a.order - b.order)
              .map((m, idx) => (
                <Image
                  key={idx}
                  source={{ uri: m.storage_url }}
                  style={{
                    width: SCREEN_WIDTH - 32,
                    height: 240,
                  }}
                  resizeMode="cover"
                />
              ))}
          </ScrollView>
        )}

        {/* Linked content card */}
        {post.linked_content && (
          <LinkedContentCard content={post.linked_content} colors={colors} />
        )}
      </Pressable>

      {/* Actions */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 8,
          paddingVertical: 8,
          borderTopWidth: 1,
          borderTopColor: colors.cardBorder,
          marginTop: 8,
          gap: 4,
        }}
      >
        <LikeButton
          count={post.like_count}
          liked={isLiked}
          onPress={handleLike}
        />

        <Pressable
          onPress={onCommentPress ?? handleOpenPost}
          hitSlop={8}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 20,
            backgroundColor: pressed ? colors.surface : "transparent",
          })}
        >
          <MessageCircle size={20} color={colors.mutedForeground} />
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 14,
              fontWeight: "500",
            }}
          >
            {post.comment_count}
          </Text>
        </Pressable>

        <View style={{ flex: 1 }} />

        <Pressable
          onPress={handleShare}
          hitSlop={8}
          style={({ pressed }) => ({
            padding: 6,
            borderRadius: 20,
            backgroundColor: pressed ? colors.surface : "transparent",
          })}
        >
          <Share2 size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>
    </View>
  );
}

function LinkedContentCard({
  content,
  colors,
}: {
  content: NonNullable<CommunityPost["linked_content"]>;
  colors: ReturnType<typeof useThemeStore.getState>["colors"];
}) {
  const Icon =
    content.type === "workout"
      ? Dumbbell
      : content.type === "nutrition"
        ? UtensilsCrossed
        : Trophy;

  const iconColor =
    content.type === "workout"
      ? colors.primary
      : content.type === "nutrition"
        ? colors.accent
        : "#F59E0B";

  return (
    <View
      style={{
        margin: 12,
        borderRadius: 12,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      }}
    >
      <View
        style={{
          height: 40,
          width: 40,
          borderRadius: 10,
          backgroundColor: colors.card,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.mutedForeground,
            fontSize: 11,
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {content.type}
        </Text>
        <Text
          style={{
            color: colors.foreground,
            fontSize: 14,
            fontWeight: "700",
            marginTop: 1,
          }}
          numberOfLines={1}
        >
          {content.title}
        </Text>
      </View>
    </View>
  );
}
