import { View, Text, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Globe, Plus } from "lucide-react-native";
import { GroupsList } from "@/components/community/GroupsList";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useCommunityStore } from "@/stores/community.store";
import { getPublicGroups } from "@/lib/community-groups";
import type { CommunityGroup } from "@/types";

export default function GroupsIndexScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useThemeStore((s) => s.colors);
  const uid = useAuthStore((s) => s.user?.uid);
  const groups = useCommunityStore((s) => s.groups);
  const groupsLoading = useCommunityStore((s) => s.groupsLoading);
  const loadGroups = useCommunityStore((s) => s.loadGroups);

  const [discoverGroups, setDiscoverGroups] = useState<CommunityGroup[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"mine" | "discover">("mine");

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)/community");
  };

  useEffect(() => {
    if (!uid) return;
    loadGroups(uid);
    getPublicGroups().then(setDiscoverGroups).catch(() => {});
  }, [uid]);

  const handleRefresh = async () => {
    if (!uid) return;
    setRefreshing(true);
    await loadGroups(uid);
    const pub = await getPublicGroups().catch(() => []);
    setDiscoverGroups(pub);
    setRefreshing(false);
  };

  const displayedGroups = tab === "mine" ? groups : discoverGroups;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.cardBorder,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <Pressable
            onPress={handleBack}
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
          <Text
            style={{
              color: colors.foreground,
              fontSize: 20,
              fontWeight: "800",
              flex: 1,
            }}
          >
            Grupos de Desafio
          </Text>
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: "row", gap: 0 }}>
          {[
            { key: "mine" as const, label: "Meus Grupos" },
            { key: "discover" as const, label: "Descobrir", Icon: Globe },
          ].map(({ key, label }) => (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: 10,
                borderBottomWidth: 2,
                borderBottomColor:
                  tab === key ? colors.primary : "transparent",
              }}
            >
              <Text
                style={{
                  color: tab === key ? colors.primary : colors.mutedForeground,
                  fontSize: 14,
                  fontWeight: "700",
                }}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <GroupsList
        groups={displayedGroups}
        loading={groupsLoading}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onPress={(g) => router.push(`/(tabs)/community/groups/${g.id}` as never)}
        emptyMessage={
          tab === "mine"
            ? "Você ainda não entrou em nenhum grupo"
            : "Nenhum grupo público disponível"
        }
        emptyAction={
          tab === "mine"
            ? {
                label: "Criar grupo",
                onPress: () =>
                  router.push("/(tabs)/community/groups/create" as never),
              }
            : undefined
        }
        contentPaddingBottom={insets.bottom + 120}
      />

      {/* Bottom FAB */}
      <Pressable
        onPress={() => router.push("/(tabs)/community/groups/create" as never)}
        style={({ pressed }) => ({
          position: "absolute",
          right: 20,
          bottom: insets.bottom + 96,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: pressed ? colors.primary + "CC" : colors.primary,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        })}
      >
        <Plus size={28} color={colors.primaryForeground} />
      </Pressable>
    </View>
  );
}
