import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useToastStore } from "@/stores/toast.store";
import {
  ArrowLeft,
  Moon,
  Sun,
  Smartphone,
  Globe,
  Info,
  LogOut,
  ChevronRight,
  User,
  RefreshCw,
  KeyRound,
} from "lucide-react-native";
import { useState } from "react";

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const isDark = useThemeStore((s) => s.isDark);
  const setMode = useThemeStore((s) => s.setMode);
  const logout = useAuthStore((s) => s.logout);
  const showToast = useToastStore((s) => s.show);
  const [checkingForUpdate, setCheckingForUpdate] = useState(false);
  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/logout-feedback");
  };

  const handleCheckForUpdates = async () => {
    if (checkingForUpdate) return;

    if (__DEV__) {
      showToast(
        "OTA updates funcionam apenas em build de preview/producao.",
        "info",
      );
      return;
    }

    setCheckingForUpdate(true);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        showToast("Seu app ja esta atualizado.", "success");
        return;
      }

      await Updates.fetchUpdateAsync();
      showToast("Atualizacao baixada. Reiniciando app...", "success");
      await Updates.reloadAsync();
    } catch {
      showToast("Falha ao verificar atualizacoes. Tente novamente.", "error");
    } finally {
      setCheckingForUpdate(false);
    }
  };

  const Row = ({
    icon,
    label,
    onPress,
    right,
    disabled,
  }: {
    icon: React.ReactNode;
    label: string;
    onPress?: () => void;
    right?: React.ReactNode;
    disabled?: boolean;
  }) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: colors.secondary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </View>
      <Text style={{ flex: 1, fontSize: 16, color: colors.foreground }}>
        {label}
      </Text>
      {right ?? <ChevronRight size={18} color={colors.muted} />}
    </Pressable>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <Text
      style={{
        fontSize: 12,
        fontWeight: "600",
        color: colors.mutedForeground,
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 0.8,
      }}
    >
      {title}
    </Text>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 32,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 16,
          marginBottom: 8,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{ padding: 4, marginLeft: -4 }}
        >
          <ArrowLeft size={24} color={colors.foreground} />
        </Pressable>
        <Text
          style={{ fontSize: 22, fontWeight: "800", color: colors.foreground }}
        >
          Settings
        </Text>
      </View>

      {/* Appearance */}
      <SectionHeader title="Appearance" />
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 16,
          marginHorizontal: 16,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.cardBorder,
        }}
      >
        <Row
          icon={
            isDark ? (
              <Moon size={18} color={colors.primary} />
            ) : (
              <Sun size={18} color={colors.primary} />
            )
          }
          label="Theme"
          right={
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Pressable
                onPress={() => setMode("light")}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor:
                    mode === "light" ? colors.primary : colors.cardBorder,
                  backgroundColor:
                    mode === "light" ? colors.secondary : colors.background,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Sun
                  size={16}
                  color={mode === "light" ? colors.primary : colors.mutedForeground}
                />
              </Pressable>

              <Pressable
                onPress={() => setMode("dark")}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: mode === "dark" ? colors.primary : colors.cardBorder,
                  backgroundColor:
                    mode === "dark" ? colors.secondary : colors.background,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Moon
                  size={16}
                  color={mode === "dark" ? colors.primary : colors.mutedForeground}
                />
              </Pressable>

              <Pressable
                onPress={() => setMode("system")}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor:
                    mode === "system" ? colors.primary : colors.cardBorder,
                  backgroundColor:
                    mode === "system" ? colors.secondary : colors.background,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Smartphone
                  size={16}
                  color={mode === "system" ? colors.primary : colors.mutedForeground}
                />
              </Pressable>
            </View>
          }
        />
      </View>

      {/* Language */}
      <SectionHeader title="Language" />
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 16,
          marginHorizontal: 16,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.cardBorder,
        }}
      >
        <Row
          icon={<Globe size={18} color={colors.accent} />}
          label="Language"
          onPress={() => {
            /* Phase 10 */
          }}
        />
        <Row
          icon={<KeyRound size={18} color={colors.primary} />}
          label="AI Provider Keys"
          onPress={() => router.push("/settings/ai-keys")}
        />
      </View>

      {/* Updates */}
      <SectionHeader title="App Updates" />
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 16,
          marginHorizontal: 16,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.cardBorder,
        }}
      >
        <Row
          icon={<RefreshCw size={18} color={colors.primary} />}
          label={
            checkingForUpdate ? "Checking for updates..." : "Check for updates"
          }
          onPress={handleCheckForUpdates}
          disabled={checkingForUpdate}
          right={
            checkingForUpdate ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <ChevronRight size={18} color={colors.muted} />
            )
          }
        />
      </View>

      {/* About */}
      <SectionHeader title="About" />
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 16,
          marginHorizontal: 16,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.cardBorder,
        }}
      >
        <Row
          icon={<User size={18} color={colors.foreground} />}
          label="Edit Profile"
          onPress={() => router.push("/settings/profile-edit")}
        />
        <Row
          icon={<Info size={18} color={colors.foreground} />}
          label="About HuGoal"
          onPress={() => router.push("/settings/about")}
        />
        <Row
          icon={<Info size={18} color={colors.mutedForeground} />}
          label="App Version"
          right={
            <Text style={{ color: colors.mutedForeground }}>{appVersion}</Text>
          }
          disabled
        />
      </View>

      {/* Account */}
      <SectionHeader title="Account" />
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 16,
          marginHorizontal: 16,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.cardBorder,
        }}
      >
        <Row
          icon={<LogOut size={18} color={colors.destructive} />}
          label="Log Out"
          onPress={handleLogout}
          right={null}
        />
      </View>
    </ScrollView>
  );
}
