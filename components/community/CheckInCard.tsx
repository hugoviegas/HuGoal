import { View, Text, Image, Pressable } from "react-native";
import { MessageCircle } from "lucide-react-native";
import { Avatar } from "@/components/ui/Avatar";
import { LikeButton } from "@/components/community/LikeButton";
import { useThemeStore } from "@/stores/theme.store";
import { formatDistanceToNow } from "@/lib/community-time";
import { likeCheckIn, unlikeCheckIn } from "@/lib/community-checkins";
import type { GroupCheckIn } from "@/types";

const EMOJIS = ["🔥", "💪", "👏", "🏆", "❤️"] as const;

interface Props {
  checkIn: GroupCheckIn;
  currentUid: string;
  onCommentPress: () => void;
  onEmojiPress: (emoji: string) => void;
}

export function CheckInCard({ checkIn, currentUid, onCommentPress, onEmojiPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const isLiked = checkIn.liked_by.includes(currentUid);
  const hasImage = checkIn.media && checkIn.media.length > 0;

  const handleLike = async () => {
    if (isLiked) {
      await unlikeCheckIn(checkIn.group_id, checkIn.id, currentUid);
    } else {
      await likeCheckIn(checkIn.group_id, checkIn.id, currentUid);
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
        marginBottom: 12,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 14,
          paddingTop: 12,
          paddingBottom: 10,
          gap: 10,
        }}
      >
        <Avatar source={checkIn.user_avatar} name={checkIn.user_name} size="sm" />
        <View style={{ flex: 1 }}>
          <Text
            style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}
          >
            {checkIn.user_name}
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
            {formatDistanceToNow(checkIn.checked_in_at)}
          </Text>
        </View>

        {/* Metric badge */}
        <View
          style={{
            backgroundColor: colors.primary + "20",
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingVertical: 5,
          }}
        >
          <Text
            style={{
              color: colors.primary,
              fontSize: 13,
              fontWeight: "800",
            }}
          >
            {checkIn.metric_value} {checkIn.metric_unit}
          </Text>
        </View>
      </View>

      {/* Image */}
      {hasImage && checkIn.media![0].storage_url ? (
        <Image
          source={{ uri: checkIn.media![0].storage_url }}
          style={{ width: "100%", aspectRatio: 4 / 3 }}
          resizeMode="cover"
        />
      ) : null}

      {/* Notes */}
      {checkIn.notes ? (
        <View style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
          <Text style={{ color: colors.foreground, fontSize: 14, lineHeight: 20 }}>
            {checkIn.notes}
          </Text>
        </View>
      ) : null}

      {/* Action row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 14,
          paddingBottom: 12,
          paddingTop: hasImage || checkIn.notes ? 8 : 0,
          gap: 12,
        }}
      >
        <LikeButton
          liked={isLiked}
          count={checkIn.like_count}
          onPress={handleLike}
          size="sm"
        />

        <Pressable
          onPress={onCommentPress}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            padding: 4,
            borderRadius: 8,
            backgroundColor: pressed ? colors.surface : "transparent",
          })}
        >
          <MessageCircle size={18} color={colors.mutedForeground} />
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
            {checkIn.comment_count}
          </Text>
        </Pressable>

        {/* Emoji reaction shortcuts */}
        <View style={{ flex: 1, flexDirection: "row", justifyContent: "flex-end", gap: 4 }}>
          {EMOJIS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => onEmojiPress(emoji)}
              style={({ pressed }) => ({
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed ? colors.surface : colors.surface + "80",
              })}
            >
              <Text style={{ fontSize: 16 }}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
