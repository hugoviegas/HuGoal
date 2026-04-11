import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import {
  Paperclip,
  Image as ImageIcon,
  Dumbbell,
  UtensilsCrossed,
  Apple,
  Users,
} from "lucide-react-native";
import { Avatar } from "@/components/ui/Avatar";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useToastStore } from "@/stores/toast.store";

const ACTIONS = [
  { icon: Paperclip, label: "Arquivo", route: null },
  { icon: ImageIcon, label: "Foto", route: "/(tabs)/community/create-post" as const },
  { icon: Dumbbell, label: "Treino", route: null },
  { icon: UtensilsCrossed, label: "Dieta", route: null },
  { icon: Apple, label: "Refeição", route: null },
  { icon: Users, label: "Grupo", route: "/(tabs)/community/groups" as const },
] as const;

export function NewPostCard() {
  const router = useRouter();
  const colors = useThemeStore((s) => s.colors);
  const profile = useAuthStore((s) => s.profile);
  const showToast = useToastStore((s) => s.show);

  const handleAction = (route: string | null, label: string) => {
    if (!route) {
      showToast(`${label} em breve!`, "info");
      return;
    }
    router.push(route as never);
  };

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 4,
        overflow: "hidden",
      }}
    >
      {/* Top row — avatar + input placeholder */}
      <Pressable
        onPress={() => router.push("/(tabs)/community/create-post" as never)}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 14,
          paddingVertical: 14,
          backgroundColor: pressed ? colors.surface : "transparent",
        })}
      >
        <Avatar source={profile?.avatar_url} name={profile?.name} size="sm" />
        <Text
          style={{
            flex: 1,
            color: colors.mutedForeground,
            fontSize: 15,
          }}
        >
          O que está pensando?
        </Text>
      </Pressable>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: colors.cardBorder }} />

      {/* Action icons row */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-around",
          paddingVertical: 10,
          paddingHorizontal: 8,
        }}
      >
        {ACTIONS.map(({ icon: Icon, label, route }) => (
          <Pressable
            key={label}
            onPress={() => handleAction(route, label)}
            style={({ pressed }) => ({
              alignItems: "center",
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 10,
              backgroundColor: pressed ? colors.surface : "transparent",
            })}
          >
            <Icon size={20} color={colors.primary} />
            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: 10,
                fontWeight: "600",
              }}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
