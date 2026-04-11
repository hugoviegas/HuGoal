import { View, Text, Pressable, Modal } from "react-native";
import { Flag, Trash2, Volume2, VolumeX, UserMinus, UserX, X } from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useCommunityStore } from "@/stores/community.store";
import { useToastStore } from "@/stores/toast.store";
import type { CommunityPost } from "@/types";

interface PostActionMenuProps {
  visible: boolean;
  post: CommunityPost;
  onClose: () => void;
  onReport: () => void;
}

export function PostActionMenu({ visible, post, onClose, onReport }: PostActionMenuProps) {
  const colors = useThemeStore((s) => s.colors);
  const uid = useAuthStore((s) => s.user?.uid);
  const showToast = useToastStore((s) => s.show);
  const deletePostAction = useCommunityStore((s) => s.deletePost);
  const muteUserAction = useCommunityStore((s) => s.muteUser);
  const blockUserAction = useCommunityStore((s) => s.blockUser);
  const mutedIds = useCommunityStore((s) => s.mutedIds);

  const isOwn = uid === post.author_id;
  const isMuted = mutedIds.includes(post.author_id);

  const actions = isOwn
    ? [
        {
          icon: Trash2,
          label: "Delete post",
          color: "#F87171",
          onPress: async () => {
            await deletePostAction(post.id);
            showToast("Post deleted", "success");
            onClose();
          },
        },
      ]
    : [
        {
          icon: Flag,
          label: "Report post",
          color: "#F59E0B",
          onPress: () => {
            onClose();
            onReport();
          },
        },
        {
          icon: isMuted ? Volume2 : VolumeX,
          label: isMuted ? "Unmute user" : "Mute user",
          color: colors.foreground,
          onPress: async () => {
            if (!uid) return;
            if (isMuted) {
              await muteUserAction(uid, post.author_id);
            } else {
              await muteUserAction(uid, post.author_id);
              showToast("User muted", "success");
            }
            onClose();
          },
        },
        {
          icon: UserX,
          label: "Block user",
          color: "#F87171",
          onPress: async () => {
            if (!uid) return;
            await blockUserAction(uid, post.author_id);
            showToast("User blocked", "success");
            onClose();
          },
        },
      ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            paddingBottom: 36,
            gap: 8,
          }}
          onPress={() => {}}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>Post options</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={22} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Pressable
                key={action.label}
                onPress={action.onPress}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: pressed ? colors.surface : "transparent",
                })}
              >
                <Icon size={20} color={action.color} />
                <Text style={{ color: action.color, fontSize: 15, fontWeight: "600" }}>
                  {action.label}
                </Text>
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
