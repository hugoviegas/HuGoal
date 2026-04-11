import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { ArrowLeft, Camera } from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useToastStore } from "@/stores/toast.store";
import { getGroup, editGroup } from "@/lib/community-groups";
import type { CommunityGroup } from "@/types";

export default function EditGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useThemeStore((s) => s.colors);
  const uid = useAuthStore((s) => s.user?.uid);
  const showToast = useToastStore((s) => s.show);

  const [group, setGroup] = useState<CommunityGroup | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    getGroup(id)
      .then((g) => {
        if (!g) return;
        setGroup(g);
        setName(g.name);
        setDescription(g.description ?? "");
      })
      .catch(() => showToast("Erro ao carregar grupo", "error"))
      .finally(() => setLoading(false));
  }, [id]);

  // Guard: only creator can edit
  useEffect(() => {
    if (group && uid && group.creator_id !== uid) {
      showToast("Sem permissão para editar", "error");
      router.back();
    }
  }, [group, uid]);

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast("Permissão de mídia necessária", "warning");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!uid || !id || !name.trim()) return;
    setSaving(true);
    try {
      await editGroup(id, uid, {
        name: name.trim(),
        description: description.trim(),
        avatarUri: avatarUri ?? undefined,
      });
      showToast("Grupo atualizado!", "success");
      router.back();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar";
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const avatarSource = avatarUri ?? group?.avatar_url;

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
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
        <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "700" }}>
          Editar Grupo
        </Text>
        <Pressable
          onPress={handleSave}
          disabled={!name.trim() || saving}
          style={({ pressed }) => ({
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor:
              !name.trim() || saving
                ? colors.muted
                : pressed
                  ? colors.primary + "CC"
                  : colors.primary,
          })}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text
              style={{
                color:
                  !name.trim() ? colors.mutedForeground : colors.primaryForeground,
                fontSize: 15,
                fontWeight: "700",
              }}
            >
              Salvar
            </Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar picker */}
        <View style={{ alignItems: "center" }}>
          <Pressable onPress={pickAvatar} style={{ position: "relative" }}>
            {avatarSource ? (
              <Image
                source={{ uri: avatarSource }}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  borderWidth: 2,
                  borderColor: colors.primary,
                }}
              />
            ) : (
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  backgroundColor: colors.surface,
                  borderWidth: 2,
                  borderColor: colors.cardBorder,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Camera size={32} color={colors.mutedForeground} />
              </View>
            )}
            <View
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: colors.background,
              }}
            >
              <Camera size={14} color={colors.primaryForeground} />
            </View>
          </Pressable>
          <Text
            style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 8 }}
          >
            Toque para alterar a foto do grupo
          </Text>
        </View>

        {/* Name */}
        <View style={{ gap: 8 }}>
          <Text
            style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}
          >
            Nome do grupo *
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ex: Turma Fit Janeiro"
            placeholderTextColor={colors.mutedForeground}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              paddingHorizontal: 14,
              paddingVertical: 12,
              color: colors.foreground,
              fontSize: 15,
            }}
          />
        </View>

        {/* Description */}
        <View style={{ gap: 8 }}>
          <Text
            style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}
          >
            Descrição
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Descreva o objetivo do grupo..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={4}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              paddingHorizontal: 14,
              paddingVertical: 12,
              color: colors.foreground,
              fontSize: 15,
              minHeight: 100,
              textAlignVertical: "top",
            }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
