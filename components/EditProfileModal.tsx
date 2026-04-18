import { useState, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { X, ChevronRight, UserCircle } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import { updateProfileInFirestore } from "@/lib/firestore/profile";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";
import { typography } from "@/constants/typography";

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

const GOAL_LABELS: Record<string, string> = {
  lose_fat: "Lose Fat",
  gain_muscle: "Build Muscle",
  maintain: "Maintain",
  recomp: "Recomposition",
};

export function EditProfileModal({ visible, onClose }: EditProfileModalProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const showToast = useToastStore((s) => s.show);

  const [name, setName] = useState(profile?.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? undefined);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!user?.uid) return;
    setIsSaving(true);
    try {
      await updateProfileInFirestore(user.uid, { name: name.trim(), avatar_url: avatarUrl });
      await fetchProfile(user.uid).catch(() => {});
      showToast("Profile updated", "success");
      onClose();
    } catch {
      showToast("Could not update profile. Try again.", "error");
    } finally {
      setIsSaving(false);
    }
  }, [user?.uid, name, avatarUrl, fetchProfile, showToast, onClose]);

  const handleFullEdit = useCallback(() => {
    onClose();
    router.push("/settings/profile-edit");
  }, [onClose, router]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.xl,
            paddingHorizontal: spacing.md,
            gap: spacing.md,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: spacing.xs,
            }}
          >
            <Text
              style={{
                flex: 1,
                ...typography.h3,
                color: colors.foreground,
                fontWeight: "700",
              }}
            >
              Edit Profile
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={{
                width: 36,
                height: 36,
                borderRadius: radius.full,
                backgroundColor: colors.surface,
                alignItems: "center",
                justifyContent: "center",
              }}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {/* Avatar */}
          <View style={{ alignItems: "center", gap: spacing.xs }}>
            <Avatar
              mode="upload"
              userId={user?.uid}
              source={avatarUrl}
              name={name || profile?.name}
              size="xl"
              onUpload={setAvatarUrl}
            />
            <Text style={[typography.caption, { color: colors.mutedForeground }]}>
              Tap to change photo
            </Text>
          </View>

          {/* Username (read-only) */}
          {profile?.username ? (
            <Text
              style={[
                typography.caption,
                { color: colors.mutedForeground, textAlign: "center" },
              ]}
            >
              @{profile.username}
            </Text>
          ) : null}

          {/* Name */}
          <Input
            label="Display Name"
            placeholder="Your name"
            value={name}
            onChangeText={setName}
          />

          {/* Current goal (read-only display) */}
          {profile?.goal ? (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: radius.lg,
                padding: spacing.sm,
                borderWidth: 1,
                borderColor: colors.cardBorder,
              }}
            >
              <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                Current goal
              </Text>
              <Text style={[typography.small, { color: colors.foreground, marginTop: 2 }]}>
                {GOAL_LABELS[profile.goal] ?? profile.goal}
              </Text>
            </View>
          ) : null}

          {/* Save */}
          <Button
            variant="primary"
            size="lg"
            isLoading={isSaving}
            onPress={handleSave}
          >
            Save Changes
          </Button>

          {/* Full profile edit link */}
          <Pressable
            onPress={handleFullEdit}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.xs,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.sm,
              borderRadius: radius.lg,
              backgroundColor: pressed ? colors.surface : "transparent",
              borderWidth: 1,
              borderColor: colors.cardBorder,
            })}
            accessibilityRole="button"
            accessibilityLabel="Open full profile editor"
          >
            <UserCircle size={18} color={colors.mutedForeground} />
            <Text
              style={[
                typography.small,
                { color: colors.foreground, flex: 1 },
              ]}
            >
              Full profile settings
            </Text>
            <Text style={[typography.caption, { color: colors.mutedForeground }]}>
              Weight, height, goal, diet
            </Text>
            <ChevronRight size={16} color={colors.mutedForeground} />
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
