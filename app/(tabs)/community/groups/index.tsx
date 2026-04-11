import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Plus, Globe } from "lucide-react-native";
import { GroupCard } from "@/components/community/GroupCard";
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
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.cardBorder,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
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
          <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: "800", flex: 1 }}>
            Challenge Groups
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/community/groups/create")}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: pressed ? colors.primary + "CC" : colors.primary,
              alignItems: "center",
              justifyContent: "center",
            })}
          >
            <Plus size={20} color={colors.primaryForeground} />
          </Pressable>
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[
            { key: "mine" as const, label: "My Groups" },
            { key: "discover" as const, label: "Discover", Icon: Globe },
          ].map(({ key, label }) => (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 20,
                backgroundColor: tab === key ? colors.primary : colors.surface,
              }}
            >
              <Text
                style={{
                  color: tab === key ? colors.primaryForeground : colors.mutedForeground,
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

      {groupsLoading && groups.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={displayedGroups}
          keyExtractor={(g) => g.id}
          contentContainerStyle={{
            padding: 16,
            gap: 12,
            paddingBottom: insets.bottom + 112,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 40, gap: 12 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 16, fontWeight: "600" }}>
                {tab === "mine" ? "You haven't joined any groups yet" : "No public groups available"}
              </Text>
              {tab === "mine" && (
                <Pressable
                  onPress={() => router.push("/(tabs)/community/groups/create")}
                  style={({ pressed }) => ({
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    borderRadius: 14,
                    backgroundColor: pressed ? colors.primary + "CC" : colors.primary,
                  })}
                >
                  <Text style={{ color: colors.primaryForeground, fontSize: 15, fontWeight: "700" }}>
                    Create a Group
                  </Text>
                </Pressable>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <GroupCard
              group={item}
              onPress={() => router.push(`/(tabs)/community/groups/${item.id}`)}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
