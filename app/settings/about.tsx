import { View, Text, ScrollView, Pressable, Linking } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { useThemeStore } from "@/stores/theme.store";
import { ArrowLeft, ExternalLink } from "lucide-react-native";
import { GlassCard } from "@/components/ui/GlassCard";

const version = Constants.expoConfig?.version ?? "1.0.0";

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: 16,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          marginBottom: 32,
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
          About BetterU
        </Text>
      </View>

      {/* App identity */}
      <View style={{ alignItems: "center", marginBottom: 32 }}>
        <Text style={{ fontSize: 56, marginBottom: 12 }}>💪</Text>
        <Text
          style={{ fontSize: 28, fontWeight: "900", color: colors.foreground }}
        >
          BetterU
        </Text>
        <Text
          style={{ fontSize: 14, color: colors.mutedForeground, marginTop: 4 }}
        >
          Version {version}
        </Text>
      </View>

      {/* Description */}
      <GlassCard style={{ marginBottom: 16 }}>
        <Text
          style={{ fontSize: 15, color: colors.foreground, lineHeight: 22 }}
        >
          BetterU is your AI-powered fitness companion — helping you train
          smarter, eat better, and track your progress with the power of Claude,
          Gemini, and GPT-4.
        </Text>
      </GlassCard>

      {/* License */}
      <GlassCard style={{ marginBottom: 16 }}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: colors.mutedForeground,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginBottom: 8,
          }}
        >
          License
        </Text>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "600",
            color: colors.foreground,
            marginBottom: 6,
          }}
        >
          Business Source License 1.1 (BUSL-1.1)
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: colors.mutedForeground,
            lineHeight: 20,
          }}
        >
          Free for personal and non-commercial use. Commercial use requires a
          license from the author. Automatically converts to Apache 2.0 after 4
          years from each release date.
        </Text>
      </GlassCard>

      {/* Links */}
      <GlassCard>
        <Text
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: colors.mutedForeground,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginBottom: 12,
          }}
        >
          Links
        </Text>
        <Pressable
          onPress={() => Linking.openURL("https://github.com/hugovntr/BetterU")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingVertical: 8,
          }}
        >
          <ExternalLink size={16} color={colors.primary} />
          <Text style={{ fontSize: 15, color: colors.primary }}>
            View on GitHub
          </Text>
        </Pressable>
      </GlassCard>
    </ScrollView>
  );
}
