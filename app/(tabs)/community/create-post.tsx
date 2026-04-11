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
import { useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { X, Image as ImageIcon, Globe, Users, ChevronDown } from "lucide-react-native";
import { Avatar } from "@/components/ui/Avatar";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useCommunityStore } from "@/stores/community.store";
import { useToastStore } from "@/stores/toast.store";
import type { PostVisibility } from "@/types";
import AsyncStorage from "@react-native-async-storage/async-storage";

const MAX_CHARS = 500;

export default function CreatePostScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useThemeStore((s) => s.colors);
  const profile = useAuthStore((s) => s.profile);
  const uid = useAuthStore((s) => s.user?.uid);
  const createPost = useCommunityStore((s) => s.createPost);
  const showToast = useToastStore((s) => s.show);

  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<PostVisibility>("followers");
  const [publishing, setPublishing] = useState(false);

  const charCount = content.length;
  const canPublish = content.trim().length > 0 || images.length > 0;

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast("Media permission required", "warning");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 4,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...uris].slice(0, 4));
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handlePublish = async () => {
    if (!uid || !profile || !canPublish) return;
    setPublishing(true);
    try {
      await createPost({
        uid,
        author_name: profile.name,
        author_avatar_url: profile.avatar_url,
        content: content.trim(),
        mediaUris: images.length > 0 ? images : undefined,
        visibility,
      });
      showToast("Post published!", "success");
      router.back();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Upload failed";
      console.error("[community][create-post] Publish failed", e);
      // Save as draft
      const draft = { content, images, visibility, saved_at: new Date().toISOString() };
      await AsyncStorage.setItem(`post_draft:${uid}`, JSON.stringify(draft));
      showToast(`${message}. Draft saved.`, "warning");
    } finally {
      setPublishing(false);
    }
  };

  const toggleVisibility = () => {
    setVisibility((v) => (v === "followers" ? "public" : "followers"));
  };

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
          hitSlop={8}
          style={({ pressed }) => ({
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 10,
            backgroundColor: pressed ? colors.surface : "transparent",
          })}
        >
          <Text style={{ color: colors.mutedForeground, fontSize: 16 }}>Cancel</Text>
        </Pressable>

        <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: "700" }}>New Post</Text>

        <Pressable
          onPress={handlePublish}
          disabled={!canPublish || publishing}
          style={({ pressed }) => ({
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor:
              !canPublish || publishing
                ? colors.muted
                : pressed
                  ? colors.primary + "CC"
                  : colors.primary,
          })}
        >
          {publishing ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text
              style={{
                color: !canPublish ? colors.mutedForeground : colors.primaryForeground,
                fontSize: 15,
                fontWeight: "700",
              }}
            >
              Publish
            </Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Author row */}
        <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
          <Avatar source={profile?.avatar_url} name={profile?.name} size="md" />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "700" }}>
              {profile?.name}
            </Text>

            {/* Visibility toggle */}
            <Pressable
              onPress={toggleVisibility}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 20,
                backgroundColor: pressed ? colors.surface : colors.surface + "80",
                borderWidth: 1,
                borderColor: colors.cardBorder,
                alignSelf: "flex-start",
              })}
            >
              {visibility === "public" ? (
                <Globe size={13} color={colors.primary} />
              ) : (
                <Users size={13} color={colors.mutedForeground} />
              )}
              <Text
                style={{
                  color: visibility === "public" ? colors.primary : colors.mutedForeground,
                  fontSize: 12,
                  fontWeight: "700",
                }}
              >
                {visibility === "public" ? "Public" : "Followers only"}
              </Text>
              <ChevronDown size={11} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        {/* Text input */}
        <TextInput
          value={content}
          onChangeText={(t) => t.length <= MAX_CHARS && setContent(t)}
          placeholder="What's on your mind? Share your workout, progress, or inspiration..."
          placeholderTextColor={colors.mutedForeground}
          style={{
            color: colors.foreground,
            fontSize: 16,
            lineHeight: 24,
            minHeight: 120,
            textAlignVertical: "top",
          }}
          multiline
          autoFocus
        />

        {/* Character count */}
        <Text
          style={{
            color: charCount > MAX_CHARS * 0.9 ? "#F59E0B" : colors.mutedForeground,
            fontSize: 12,
            textAlign: "right",
          }}
        >
          {charCount}/{MAX_CHARS}
        </Text>

        {/* Image previews */}
        {images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {images.map((uri, idx) => (
                <View key={idx} style={{ position: "relative" }}>
                  <Image
                    source={{ uri }}
                    style={{ width: 100, height: 100, borderRadius: 12 }}
                    resizeMode="cover"
                  />
                  <Pressable
                    onPress={() => removeImage(idx)}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: "rgba(0,0,0,0.7)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <X size={12} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </ScrollView>

      {/* Bottom toolbar */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          paddingBottom: insets.bottom + 12,
          borderTopWidth: 1,
          borderTopColor: colors.cardBorder,
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
        }}
      >
        <Pressable
          onPress={pickImage}
          disabled={images.length >= 4}
          hitSlop={8}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            padding: 8,
            borderRadius: 10,
            backgroundColor: pressed ? colors.surface : "transparent",
            opacity: images.length >= 4 ? 0.4 : 1,
          })}
        >
          <ImageIcon size={22} color={colors.primary} />
          <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "600" }}>
            Photo {images.length > 0 ? `(${images.length}/4)` : ""}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
