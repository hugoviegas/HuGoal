import { View, Text, Pressable } from "react-native";
import { useState } from "react";
import { Heart, Reply } from "lucide-react-native";
import { Avatar } from "@/components/ui/Avatar";
import { useThemeStore } from "@/stores/theme.store";
import { formatDistanceToNow } from "@/lib/community-time";
import type { CommunityComment } from "@/types";

interface CommentThreadProps {
  comments: CommunityComment[];
  onReply?: (comment: CommunityComment) => void;
  onLike?: (commentId: string) => void;
  depth?: number;
}

export function CommentThread({ comments, onReply, onLike, depth = 0 }: CommentThreadProps) {
  return (
    <View style={{ gap: 12 }}>
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          onReply={onReply}
          onLike={onLike}
          depth={depth}
        />
      ))}
    </View>
  );
}

function CommentItem({
  comment,
  onReply,
  onLike,
  depth,
}: {
  comment: CommunityComment;
  onReply?: (comment: CommunityComment) => void;
  onLike?: (commentId: string) => void;
  depth: number;
}) {
  const colors = useThemeStore((s) => s.colors);
  const [showReplies, setShowReplies] = useState(true);

  const replies = comment.replies ?? [];
  const MAX_DEPTH = 3;

  return (
    <View style={{ marginLeft: depth > 0 ? 20 : 0 }}>
      {depth > 0 && (
        <View
          style={{
            position: "absolute",
            left: -12,
            top: 0,
            bottom: 0,
            width: 1.5,
            backgroundColor: colors.cardBorder,
          }}
        />
      )}

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Avatar source={comment.author_avatar_url} name={comment.author_name} size="sm" />

        <View style={{ flex: 1, gap: 4 }}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 10,
            }}
          >
            <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "700" }}>
              {comment.author_name}
            </Text>
            <Text style={{ color: colors.foreground, fontSize: 14, lineHeight: 20, marginTop: 2 }}>
              {comment.content}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 4 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
              {formatDistanceToNow(comment.created_at)}
            </Text>

            {onLike && (
              <Pressable
                onPress={() => onLike(comment.id)}
                hitSlop={8}
                style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
              >
                <Heart size={12} color={colors.mutedForeground} />
                {comment.like_count > 0 && (
                  <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
                    {comment.like_count}
                  </Text>
                )}
              </Pressable>
            )}

            {onReply && depth < MAX_DEPTH && (
              <Pressable
                onPress={() => onReply(comment)}
                hitSlop={8}
                style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
              >
                <Reply size={12} color={colors.mutedForeground} />
                <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: "600" }}>
                  Reply
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* Nested replies */}
      {replies.length > 0 && (
        <View style={{ marginTop: 8, marginLeft: 10 }}>
          {showReplies ? (
            <>
              <CommentThread
                comments={replies}
                onReply={onReply}
                onLike={onLike}
                depth={depth + 1}
              />
              <Pressable
                onPress={() => setShowReplies(false)}
                style={{ marginTop: 4, paddingLeft: 20 }}
              >
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "600" }}>
                  Hide replies
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={() => setShowReplies(true)}
              style={{ paddingLeft: 20, paddingTop: 4 }}
            >
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "600" }}>
                Show {replies.length} {replies.length === 1 ? "reply" : "replies"}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
