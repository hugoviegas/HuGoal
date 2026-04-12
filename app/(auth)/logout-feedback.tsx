import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Hand } from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";

export default function LogoutFeedbackScreen() {
  const router = useRouter();
  const colors = useThemeStore((s) => s.colors);

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/(auth)/login");
    }, 2000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.background,
      }}
    >
      <Hand size={42} color={colors.primary} style={{ marginBottom: 16 }} />
      <Text
        style={{ fontSize: 22, fontWeight: "700", color: colors.foreground }}
      >
        Logged out
      </Text>
      <Text
        style={{ marginTop: 8, fontSize: 15, color: colors.mutedForeground }}
      >
        See you soon!
      </Text>
    </View>
  );
}
