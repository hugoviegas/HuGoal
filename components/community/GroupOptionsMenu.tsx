import {
  View,
  Text,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
  Share,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import {
  MoreVertical,
  Edit2,
  Share2,
  LogOut,
  Trash2,
  X,
} from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";
import { useCommunityStore } from "@/stores/community.store";
import { useToastStore } from "@/stores/toast.store";

interface Props {
  groupId: string;
  groupName: string;
  creatorId: string;
  currentUid: string;
  onDeleted?: () => void;
}

export function GroupOptionsMenu({
  groupId,
  groupName,
  creatorId,
  currentUid,
  onDeleted,
}: Props) {
  const router = useRouter();
  const colors = useThemeStore((s) => s.colors);
  const leaveGroup = useCommunityStore((s) => s.leaveGroup);
  const showToast = useToastStore((s) => s.show);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const isCreator = currentUid === creatorId;

  const handleShare = async () => {
    setOpen(false);
    await Share.share({
      message: `Junte-se ao grupo "${groupName}" no HuGoal!`,
      title: groupName,
    });
  };

  const handleLeave = () => {
    setOpen(false);
    if (isCreator) {
      Alert.alert(
        "Sair do grupo",
        "Você é o criador. Ao sair, o grupo será deletado permanentemente para todos os membros. Deseja continuar?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Deletar e sair",
            style: "destructive",
            onPress: confirmLeave,
          },
        ],
      );
    } else {
      Alert.alert("Sair do grupo", `Deseja sair de "${groupName}"?`, [
        { text: "Cancelar", style: "cancel" },
        { text: "Sair", style: "destructive", onPress: confirmLeave },
      ]);
    }
  };

  const handleDelete = () => {
    setOpen(false);
    Alert.alert(
      "Deletar grupo",
      `Tem certeza que deseja deletar "${groupName}"? Esta ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Deletar",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await leaveGroup(groupId, currentUid, true);
              showToast("Grupo deletado", "success");
              onDeleted?.();
              router.back();
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : "Erro ao deletar";
              showToast(msg, "error");
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const confirmLeave = async () => {
    setLoading(true);
    try {
      await leaveGroup(groupId, currentUid, isCreator);
      if (isCreator) {
        showToast("Grupo deletado", "success");
      } else {
        showToast("Você saiu do grupo", "success");
      }
      onDeleted?.();
      router.back();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao sair";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
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
        {loading ? (
          <ActivityIndicator size="small" color={colors.mutedForeground} />
        ) : (
          <MoreVertical size={18} color={colors.foreground} />
        )}
      </Pressable>

      <Modal
        visible={open}
        animationType="fade"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
          onPress={() => setOpen(false)}
        />
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingBottom: 32,
          }}
        >
          {/* Handle + header */}
          <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 8 }}>
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.muted,
              }}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.cardBorder,
            }}
          >
            <Text
              style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}
            >
              {groupName}
            </Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={8}>
              <X size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {/* Options */}
          {isCreator && (
            <Pressable
              onPress={() => {
                setOpen(false);
                router.push(
                  `/(tabs)/community/groups/edit/${groupId}` as never,
                );
              }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                paddingHorizontal: 20,
                paddingVertical: 16,
                backgroundColor: pressed ? colors.surface : "transparent",
              })}
            >
              <Edit2 size={20} color={colors.foreground} />
              <Text style={{ color: colors.foreground, fontSize: 16 }}>
                Editar grupo
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleShare}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              paddingHorizontal: 20,
              paddingVertical: 16,
              backgroundColor: pressed ? colors.surface : "transparent",
            })}
          >
            <Share2 size={20} color={colors.foreground} />
            <Text style={{ color: colors.foreground, fontSize: 16 }}>
              Compartilhar
            </Text>
          </Pressable>

          <Pressable
            onPress={handleLeave}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              paddingHorizontal: 20,
              paddingVertical: 16,
              backgroundColor: pressed ? colors.surface : "transparent",
            })}
          >
            <LogOut size={20} color="#F59E0B" />
            <Text style={{ color: "#F59E0B", fontSize: 16 }}>
              {isCreator ? "Sair e deletar grupo" : "Sair do grupo"}
            </Text>
          </Pressable>

          {isCreator && (
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                paddingHorizontal: 20,
                paddingVertical: 16,
                backgroundColor: pressed ? colors.surface : "transparent",
              })}
            >
              <Trash2 size={20} color="#EF4444" />
              <Text style={{ color: "#EF4444", fontSize: 16 }}>
                Deletar grupo
              </Text>
            </Pressable>
          )}
        </View>
      </Modal>
    </>
  );
}
