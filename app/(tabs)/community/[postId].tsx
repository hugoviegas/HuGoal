import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  TextInput,
  Pressable,
  Image,
  Dimensions,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useEffect, useState, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Send, MessageCircle } from "lucide-react-native";
import { Avatar } from "@/components/ui/Avatar";
import { LikeButton } from "@/components/community/LikeButton";
import { CommentThread } from "@/components/community/CommentThread";
import { PostActionMenu } from "@/components/community/PostActionMenu";
import { ReportModal } from "@/components/community/ReportModal";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useCommunityStore } from "@/stores/community.store";
import { getPost, getComments, createComment, likeComment } from "@/lib/community-posts";
import { formatDistanceToNow } from "@/lib/community-time";
import { useToastStore } from "@/stores/toast.store";
import type { CommunityPost, CommunityComment } from "@/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function PostDetailScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useThemeStore((s) => s.colors);
  const uid = useAuthStore((s) => s.user?.uid);
  const profile = useAuthStore((s) => s.profile);
  const showToast = useToastStore((s) => s.show);
  const likePostAction = useCommunityStore((s) => s.likePost);
  const unlikePostAction = useCommunityStore((s) => s.unlikePost);

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<CommunityComment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!postId) return;
    loadPostAndComments();
  }, [postId]);

  const loadPostAndComments = async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        getPost(postId!),
        getComments(postId!),
      ]);
      setPost(p);
      setComments(c);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = () => {
    if (!uid || !post) return;
    const isLiked = post.liked_by.includes(uid);
    if (isLiked) {
      unlikePostAction(post.id, uid);
      setPost((p) => p ? { ...p, like_count: p.like_count - 1, liked_by: p.liked_by.filter((id) => id !== uid) } : p);
    } else {
      likePostAction(post.id, uid);
      setPost((p) => p ? { ...p, like_count: p.like_count + 1, liked_by: [...p.liked_by, uid] } : p);
    }
  };

  const handleSubmitComment = async () => {
    if (!uid || !profile || !commentText.trim() || !postId) return;
    setSubmitting(true);
    try {
      await createComment({
        postId,
        uid,
        author_name: profile.name,
        author_avatar_url: profile.avatar_url,
        content: commentText.trim(),
        reply_to: replyingTo?.id,
      });
      setCommentText("");
      setReplyingTo(null);
      const updated = await getComments(postId);
      setComments(updated);
      if (post) setPost({ ...post, comment_count: post.comment_count + 1 });
    } catch {
      showToast("Failed to post comment", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = (comment: CommunityComment) => {
    setReplyingTo(comment);
    setCommentText(`@${comment.author_name} `);
    inputRef.current?.focus();
  };

  const handleLikeComment = async (commentId: string) => {
    if (!postId) return;
    await likeComment(postId, commentId);
    const updated = await getComments(postId);
    setComments(updated);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", paddingTop: insets.top }}>
        <Text style={{ color: colors.mutedForeground }}>Post not found</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: colors.primary, fontWeight: "700" }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const isLiked = uid ? post.liked_by.includes(uid) : false;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.cardBorder,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: pressed ? colors.surface : colors.card,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            alignItems: "center",
            justifyContent: "center",
          })}
        >
          <ArrowLeft size={18} color={colors.foreground} />
        </Pressable>
        <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "800" }}>
          Post
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Post content */}
        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.cardBorder }}>
          {/* Author row */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <Pressable onPress={() => uid !== post.author_id && router.push(`/user/${post.author_id}`)}>
              <Avatar source={post.author_avatar_url} name={post.author_name} size="md" />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>
                {post.author_name}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                {formatDistanceToNow(post.created_at)}
              </Text>
            </View>
            <Pressable onPress={() => setShowMenu(true)} hitSlop={8}>
              <Text style={{ color: colors.mutedForeground, fontSize: 20, fontWeight: "700" }}>···</Text>
            </Pressable>
          </View>

          {/* Text */}
          <Text style={{ color: colors.foreground, fontSize: 16, lineHeight: 24 }}>
            {post.content}
          </Text>

          {/* Images */}
          {post.media.length > 0 && (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 12, borderRadius: 12, overflow: "hidden" }}
            >
              {post.media
                .sort((a, b) => a.order - b.order)
                .map((m, idx) => (
                  <Image
                    key={idx}
                    source={{ uri: m.storage_url }}
                    style={{ width: SCREEN_WIDTH - 32, height: 280 }}
                    resizeMode="cover"
                  />
                ))}
            </ScrollView>
          )}

          {/* Engagement counts */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
              marginTop: 16,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: colors.cardBorder,
            }}
          >
            <LikeButton count={post.like_count} liked={isLiked} onPress={handleLike} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <MessageCircle size={20} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
                {post.comment_count} comments
              </Text>
            </View>
          </View>
        </View>

        {/* Comments */}
        <View style={{ padding: 16, gap: 16 }}>
          <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>
            Comments
          </Text>

          {comments.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 24 }}>
              <MessageCircle size={32} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, fontSize: 14, marginTop: 8 }}>
                No comments yet. Be the first!
              </Text>
            </View>
          ) : (
            <CommentThread
              comments={comments}
              onReply={handleReply}
              onLike={handleLikeComment}
            />
          )}
        </View>
      </ScrollView>

      {/* Comment Input */}
      <View
        style={{
          paddingBottom: insets.bottom + 8,
          paddingHorizontal: 16,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: colors.cardBorder,
          backgroundColor: colors.background,
          gap: 8,
        }}
      >
        {replyingTo && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: colors.surface,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 6,
            }}
          >
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
              Replying to <Text style={{ fontWeight: "700", color: colors.primary }}>@{replyingTo.author_name}</Text>
            </Text>
            <Pressable onPress={() => { setReplyingTo(null); setCommentText(""); }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 16 }}>×</Text>
            </Pressable>
          </View>
        )}

        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
          <Avatar source={profile?.avatar_url} name={profile?.name} size="sm" />
          <View
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              paddingHorizontal: 14,
              paddingVertical: 10,
              minHeight: 42,
              maxHeight: 100,
            }}
          >
            <TextInput
              ref={inputRef}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Write a comment..."
              placeholderTextColor={colors.mutedForeground}
              style={{ color: colors.foreground, fontSize: 14, padding: 0 }}
              multiline
              returnKeyType="send"
              onSubmitEditing={handleSubmitComment}
            />
          </View>

          <Pressable
            onPress={handleSubmitComment}
            disabled={!commentText.trim() || submitting}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor:
                !commentText.trim() || submitting
                  ? colors.surface
                  : pressed
                    ? colors.primary + "CC"
                    : colors.primary,
              alignItems: "center",
              justifyContent: "center",
            })}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Send size={18} color={!commentText.trim() ? colors.mutedForeground : colors.primaryForeground} />
            )}
          </Pressable>
        </View>
      </View>

      {showMenu && (
        <PostActionMenu
          visible={showMenu}
          post={post}
          onClose={() => setShowMenu(false)}
          onReport={() => {
            setShowMenu(false);
            setShowReport(true);
          }}
        />
      )}

      {showReport && (
        <ReportModal
          visible={showReport}
          onClose={() => setShowReport(false)}
          targetId={post.id}
          targetType="post"
        />
      )}
    </KeyboardAvoidingView>
  );
}
