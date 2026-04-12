import {
  View,
  Text,
  Modal,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { X, Send } from "lucide-react-native";
import { Avatar } from "@/components/ui/Avatar";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import {
  getCheckInComments,
  createCheckInComment,
} from "@/lib/community-checkins";
import { formatDistanceToNow } from "@/lib/community-time";
import type { CheckInComment } from "@/types";

const QUICK_EMOJIS = ["🔥", "💪", "👏", "🏆", "❤️"] as const;

interface Props {
  visible: boolean;
  groupId: string;
  checkInId: string;
  onClose: () => void;
  onCommentAdded?: () => void;
}

export function CheckInCommentSheet({
  visible,
  groupId,
  checkInId,
  onClose,
  onCommentAdded,
}: Props) {
  const colors = useThemeStore((s) => s.colors);
  const profile = useAuthStore((s) => s.profile);
  const uid = useAuthStore((s) => s.user?.uid);

  const [comments, setComments] = useState<CheckInComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCheckInComments(groupId, checkInId);
      setComments(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [groupId, checkInId]);

  useEffect(() => {
    if (visible && checkInId) {
      loadComments();
    }
  }, [visible, checkInId, loadComments]);

  const sendComment = async (content: string, emoji?: string) => {
    if (!uid || !profile || sending) return;
    setSending(true);
    try {
      await createCheckInComment(groupId, checkInId, {
        uid,
        author_name: profile.name,
        author_avatar: profile.avatar_url,
        content,
        emoji_reaction: emoji,
      });
      setText("");
      await loadComments();
      onCommentAdded?.();
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  const handleSendText = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendComment(trimmed);
  };

  const handleEmoji = (emoji: string) => {
    sendComment(emoji, emoji);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
        onPress={onClose}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{
          backgroundColor: colors.background,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxHeight: "75%",
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.cardBorder,
          }}
        >
          <Text
            style={{
              color: colors.foreground,
              fontSize: 16,
              fontWeight: "700",
            }}
          >
            Comentários
          </Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <X size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* Comments list */}
        {loading ? (
          <View style={{ padding: 32, alignItems: "center" }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(c) => c.id}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text
                style={{
                  color: colors.mutedForeground,
                  textAlign: "center",
                  paddingVertical: 20,
                }}
              >
                Nenhum comentário ainda. Seja o primeiro!
              </Text>
            }
            renderItem={({ item }) => (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Avatar
                  source={item.author_avatar}
                  name={item.author_name}
                  size="sm"
                />
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 6,
                      alignItems: "baseline",
                    }}
                  >
                    <Text
                      style={{
                        color: colors.foreground,
                        fontSize: 13,
                        fontWeight: "700",
                      }}
                    >
                      {item.author_name}
                    </Text>
                    <Text
                      style={{ color: colors.mutedForeground, fontSize: 11 }}
                    >
                      {formatDistanceToNow(item.created_at)}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontSize: 14,
                      marginTop: 2,
                    }}
                  >
                    {item.content}
                  </Text>
                </View>
              </View>
            )}
          />
        )}

        {/* Emoji quick reactions */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 16,
            paddingVertical: 8,
            gap: 8,
            borderTopWidth: 1,
            borderTopColor: colors.cardBorder,
          }}
        >
          {QUICK_EMOJIS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => handleEmoji(emoji)}
              disabled={sending}
              style={({ pressed }) => ({
                width: 42,
                height: 42,
                borderRadius: 21,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed ? colors.surface : colors.card,
                borderWidth: 1,
                borderColor: colors.cardBorder,
              })}
            >
              <Text style={{ fontSize: 20 }}>{emoji}</Text>
            </Pressable>
          ))}
        </View>

        {/* Text input */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingBottom: Platform.OS === "ios" ? 20 : 12,
            paddingTop: 8,
            gap: 10,
          }}
        >
          <Avatar source={profile?.avatar_url} name={profile?.name} size="sm" />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Adicionar comentário..."
            placeholderTextColor={colors.mutedForeground}
            style={{
              flex: 1,
              color: colors.foreground,
              backgroundColor: colors.surface,
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 8,
              fontSize: 14,
              borderWidth: 1,
              borderColor: colors.cardBorder,
            }}
            multiline={false}
            returnKeyType="send"
            onSubmitEditing={handleSendText}
          />
          <Pressable
            onPress={handleSendText}
            disabled={!text.trim() || sending}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor:
                !text.trim() || sending
                  ? colors.muted
                  : pressed
                    ? colors.primary + "CC"
                    : colors.primary,
              alignItems: "center",
              justifyContent: "center",
            })}
          >
            <Send size={16} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
