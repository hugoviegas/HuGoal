import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plus } from "lucide-react-native";
import { PageHeader } from "@/components/shared/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { FeedPost } from "@/components/community/FeedPost";
import { FeedEmptyState } from "@/components/community/FeedEmptyState";
import { PostActionMenu } from "@/components/community/PostActionMenu";
import { ReportModal } from "@/components/community/ReportModal";
import { NewPostCard } from "@/components/community/NewPostCard";
import { GroupsList } from "@/components/community/GroupsList";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useCommunityStore } from "@/stores/community.store";
import { getPublicGroups } from "@/lib/community-groups";
import { getSuggestedUsers } from "@/lib/community-follows";
import type { CommunityPost, PublicProfile, CommunityGroup } from "@/types";

type Tab = "community" | "grupos";

export default function CommunityFeedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useThemeStore((s) => s.colors);
  const uid = useAuthStore((s) => s.user?.uid);

  const feed = useCommunityStore((s) => s.feed);
  const feedLoading = useCommunityStore((s) => s.feedLoading);
  const feedSyncing = useCommunityStore((s) => s.feedSyncing);
  const loadFeed = useCommunityStore((s) => s.loadFeed);
  const startFeedListener = useCommunityStore((s) => s.startFeedListener);
  const stopFeedListener = useCommunityStore((s) => s.stopFeedListener);
  const loadSocialState = useCommunityStore((s) => s.loadSocialState);
  const groups = useCommunityStore((s) => s.groups);
  const groupsLoading = useCommunityStore((s) => s.groupsLoading);
  const loadGroups = useCommunityStore((s) => s.loadGroups);

  const [activeTab, setActiveTab] = useState<Tab>("community");
  const [refreshing, setRefreshing] = useState(false);
  const [suggestions, setSuggestions] = useState<PublicProfile[]>([]);
  const [menuPost, setMenuPost] = useState<CommunityPost | null>(null);
  const [reportPost, setReportPost] = useState<CommunityPost | null>(null);
  const [discoverGroups, setDiscoverGroups] = useState<CommunityGroup[]>([]);
  const [groupTab, setGroupTab] = useState<"mine" | "discover">("mine");

  useEffect(() => {
    if (!uid) return;
    loadSocialState(uid);
    startFeedListener(uid);
    loadGroups(uid);
    getSuggestedUsers(uid)
      .then(setSuggestions)
      .catch(() => {});
    getPublicGroups()
      .then(setDiscoverGroups)
      .catch(() => {});
    return () => stopFeedListener();
  }, [uid, loadSocialState, startFeedListener, loadGroups, stopFeedListener]);

  const handleRefresh = useCallback(async () => {
    if (!uid) return;
    setRefreshing(true);
    if (activeTab === "community") {
      await loadFeed(uid);
    } else {
      await loadGroups(uid);
      const pub = await getPublicGroups().catch(() => []);
      setDiscoverGroups(pub);
    }
    setRefreshing(false);
  }, [uid, activeTab, loadFeed, loadGroups]);

  const displayedGroups = groupTab === "mine" ? groups : discoverGroups;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <PageHeader
        title="Community"
        streakCount={0}
        onSettingsPress={() => {
          /* TODO: community settings */
        }}
        // TODO: wire group streak from community store
        // TODO: group check-in calendarSlot
      />

      {/* Tab row */}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.cardBorder,
        }}
      >
        {(["community", "grupos"] as Tab[]).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{
              flex: 1,
              alignItems: "center",
              paddingVertical: 10,
              borderBottomWidth: 2,
              borderBottomColor:
                activeTab === tab ? colors.primary : "transparent",
            }}
          >
            <Text
              style={{
                color:
                  activeTab === tab ? colors.primary : colors.mutedForeground,
                fontSize: 15,
                fontWeight: "700",
                textTransform: "capitalize",
              }}
            >
              {tab === "community" ? "Community" : "Grupos"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Community tab */}
      {activeTab === "community" && (
        <>
          {feedSyncing ? (
            <View
              style={{
                paddingHorizontal: 16,
                paddingTop: 8,
                paddingBottom: 2,
              }}
            >
              <Text
                style={{
                  color: colors.primary,
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                Syncing latest posts...
              </Text>
            </View>
          ) : null}

          {feedLoading && feed.length === 0 ? (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* SHARED LOADING — use <Spinner size="lg" /> for full-screen loading states */}
              <Spinner size="lg" />
            </View>
          ) : (
            <FlatList
              data={feed}
              keyExtractor={(p) => p.id}
              contentContainerStyle={{
                paddingTop: 0,
                paddingHorizontal: 16,
                gap: 12,
                paddingBottom: insets.bottom + 88,
              }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.primary}
                />
              }
              ListEmptyComponent={
                !feedLoading ? (
                  <FeedEmptyState suggestions={suggestions} />
                ) : null
              }
              renderItem={({ item }) => (
                <FeedPost
                  post={item}
                  onMenuPress={() => setMenuPost(item)}
                  onCommentPress={() =>
                    router.push(`/(tabs)/community/${item.id}`)
                  }
                />
              )}
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* SHARED BOTTOM BAR STYLE — sync across: home, workouts, nutrition, community */}
          <View
            style={{
              paddingBottom: insets.bottom + 8,
              paddingTop: 8,
              paddingHorizontal: 16,
              borderTopWidth: 1,
              borderTopColor: colors.cardBorder,
              backgroundColor: colors.card,
            }}
          >
            <NewPostCard />
          </View>

          {menuPost && (
            <PostActionMenu
              visible={!!menuPost}
              post={menuPost}
              onClose={() => setMenuPost(null)}
              onReport={() => {
                setReportPost(menuPost);
                setMenuPost(null);
              }}
            />
          )}

          {reportPost && (
            <ReportModal
              visible={!!reportPost}
              onClose={() => setReportPost(null)}
              targetId={reportPost.id}
              targetType="post"
            />
          )}
        </>
      )}

      {/* Grupos tab */}
      {activeTab === "grupos" && (
        <View style={{ flex: 1 }}>
          {/* Sub-tabs: My Groups / Discover */}
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: colors.cardBorder,
            }}
          >
            {[
              { key: "mine" as const, label: "Meus Grupos" },
              { key: "discover" as const, label: "Descobrir" },
            ].map(({ key, label }) => (
              <Pressable
                key={key}
                onPress={() => setGroupTab(key)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 20,
                  backgroundColor:
                    groupTab === key ? colors.primary : colors.surface,
                }}
              >
                <Text
                  style={{
                    color:
                      groupTab === key
                        ? colors.primaryForeground
                        : colors.mutedForeground,
                    fontSize: 14,
                    fontWeight: "700",
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          <GroupsList
            groups={displayedGroups}
            loading={groupsLoading}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            onPress={(g) =>
              router.push(`/(tabs)/community/groups/${g.id}` as never)
            }
            emptyMessage={
              groupTab === "mine"
                ? "Você ainda não entrou em nenhum grupo"
                : "Nenhum grupo público disponível"
            }
            emptyAction={
              groupTab === "mine"
                ? {
                    label: "Criar grupo",
                    onPress: () =>
                      router.push("/(tabs)/community/groups/create" as never),
                  }
                : undefined
            }
            contentPaddingBottom={insets.bottom + 120}
          />

          {/* FAB */}
          <Pressable
            onPress={() =>
              router.push("/(tabs)/community/groups/create" as never)
            }
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
      )}
    </View>
  );
}
