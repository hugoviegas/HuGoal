import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Users, Compass } from "lucide-react-native";
import { UserSuggestionCard } from "@/components/community/UserSuggestionCard";
import { useThemeStore } from "@/stores/theme.store";
import type { PublicProfile } from "@/types";

interface FeedEmptyStateProps {
  suggestions: PublicProfile[];
}

export function FeedEmptyState({ suggestions }: FeedEmptyStateProps) {
  const colors = useThemeStore((s) => s.colors);
  const router = useRouter();

  return (
    <View
      style={{
        alignItems: "center",
        gap: 20,
        paddingTop: 24,
        paddingHorizontal: 4,
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: colors.surface,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Users size={32} color={colors.primary} />
      </View>

      <View style={{ alignItems: "center", gap: 6 }}>
        <Text
          style={{ color: colors.foreground, fontSize: 20, fontWeight: "800" }}
        >
          Your feed is empty
        </Text>
        <Text
          style={{
            color: colors.mutedForeground,
            fontSize: 14,
            textAlign: "center",
            lineHeight: 20,
          }}
        >
          Follow people to see their posts here. Get started by exploring the
          community!
        </Text>
      </View>

      {suggestions.length > 0 && (
        <View style={{ width: "100%", gap: 10 }}>
          <Text
            style={{
              color: colors.foreground,
              fontSize: 15,
              fontWeight: "700",
            }}
          >
            Suggested people
          </Text>
          {suggestions.slice(0, 5).map((p) => (
            <UserSuggestionCard key={p.id} profile={p} />
          ))}
        </View>
      )}

      <Pressable
        onPress={() => router.push("/(tabs)/community/discover")}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderRadius: 14,
          backgroundColor: pressed ? colors.primary + "CC" : colors.primary,
        })}
      >
        <Compass size={18} color={colors.primaryForeground} />
        <Text
          style={{
            color: colors.primaryForeground,
            fontSize: 15,
            fontWeight: "700",
          }}
        >
          Discover Community
        </Text>
      </Pressable>
    </View>
  );
}
