import { useState } from "react";
import { Image, View, Text, Pressable, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { cn } from "@/lib/utils";
import { storage } from "@/lib/firebase";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";

interface AvatarProps {
  uri?: string | null;
  name?: string;
  source?: string | null;
  tone?: "default" | "primary" | "accent";
  mode?: "view" | "upload";
  userId?: string;
  onUpload?: (url: string) => void;
  isUploading?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
  xl: "h-24 w-24",
};

const textSizeMap = {
  sm: "text-xs",
  md: "text-base",
  lg: "text-xl",
  xl: "text-3xl",
};

export function Avatar({
  uri,
  source,
  name,
  tone = "primary",
  mode = "view",
  userId,
  onUpload,
  isUploading,
  size = "md",
  className,
}: AvatarProps) {
  const colors = useThemeStore((s) => s.colors);
  const showToast = useToastStore((s) => s.show);
  const [uploading, setUploading] = useState(false);
  const imageUri = source ?? uri;

  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const toneColor =
    tone === "accent"
      ? colors.accent
      : tone === "default"
        ? colors.secondary
        : colors.primary;

  const uploadImage = async () => {
    if (mode !== "upload" || !userId || !onUpload) return;

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showToast("Media permission is required to upload avatar", "warning");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.7,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      setUploading(true);
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      const path = `avatars/${userId}/${Date.now()}.jpg`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      onUpload(url);
      showToast("Avatar uploaded", "success");
    } catch {
      showToast("Failed to upload avatar", "error");
    } finally {
      setUploading(false);
    }
  };

  if (imageUri) {
    const image = (
      <Image
        source={{ uri: imageUri }}
        className={cn("rounded-full", sizeMap[size], className)}
      />
    );

    if (mode === "upload") {
      return (
        <Pressable onPress={uploadImage}>
          {image}
          {uploading || isUploading ? (
            <View className="absolute inset-0 items-center justify-center rounded-full bg-black/35">
              <ActivityIndicator color="#fff" />
            </View>
          ) : null}
        </Pressable>
      );
    }

    return image;
  }

  const fallback = (
    <View
      className={cn(
        "rounded-full items-center justify-center",
        sizeMap[size],
        className,
      )}
      style={{ backgroundColor: toneColor }}
    >
      <Text className={cn("text-white font-bold", textSizeMap[size])}>
        {initials}
      </Text>
    </View>
  );

  if (mode === "upload") {
    return (
      <Pressable onPress={uploadImage}>
        {fallback}
        {uploading || isUploading ? (
          <View className="absolute inset-0 items-center justify-center rounded-full bg-black/35">
            <ActivityIndicator color="#fff" />
          </View>
        ) : null}
      </Pressable>
    );
  }

  return fallback;
}
