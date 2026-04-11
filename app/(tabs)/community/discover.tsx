import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, TrendingUp, Users } from "lucide-react-native";
import { FeedPost } from "@/components/community/FeedPost";
import { UserSuggestionCard } from "@/components/community/UserSuggestionCard";
import { PostActionMenu } from "@/components/community/PostActionMenu";
import { ReportModal } from "@/components/community/ReportModal";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useCommunityStore } from "@/stores/community.store";
import { loadTrendingPosts } from "@/lib/community-feed";
import { getSuggestedUsers } from "@/lib/community-follows";
import type { CommunityPost, PublicProfile } from "@/types";

type Tab = "trending" | "people";

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useThemeStore((s) => s.colors);
  const uid = useAuthStore((s) => s.user?.uid);

  const [activeTab, setActiveTab] = useState<Tab>("trending");
  const [trendingPosts, setTrendingPosts] = useState<CommunityPost[]>([]);
  const [suggestions, setSuggestions] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuPost, setMenuPost] = useState<CommunityPost | null>(null);
  const [reportPost, setReportPost] = useState<CommunityPost | null>(null);

  const loadData = useCallback(async () => {
    if (!uid) return;
    try {
      const [trending, people] = await Promise.all([
        loadTrendingPosts(uid),
        getSuggestedUsers(uid),
      ]);
      setTrendingPosts(trending);
      setSuggestions(people);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [uid]);

  useEffect(() => {
    loadData();
  }, [uid]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.cardBorder,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
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
          <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: "800" }}>
            Discover
          </Text>
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {([
            { key: "trending" as Tab, label: "Trending", Icon: TrendingUp },
            { key: "people" as Tab, label: "People", Icon: Users },
          ] as const).map(({ key, label, Icon }) => (
            <Pressable
              key={key}
              onPress={() => setActiveTab(key)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: activeTab === key ? colors.primary : colors.surface,
              }}
            >
              <Icon
                size={15}
                color={activeTab === key ? colors.primaryForeground : colors.mutedForeground}
              />
              <Text
                style={{
                  color: activeTab === key ? colors.primaryForeground : colors.mutedForeground,
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

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : activeTab === "trending" ? (
        <FlatList
          data={trendingPosts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{
            padding: 16,
            gap: 12,
            paddingBottom: insets.bottom + 112,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 40 }}>
              <TrendingUp size={40} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, fontSize: 16, fontWeight: "600", marginTop: 12 }}>
                No trending posts today
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 4, textAlign: "center" }}>
                Come back later or be the first to post!
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <FeedPost
              post={item}
              onMenuPress={() => setMenuPost(item)}
              onCommentPress={() => router.push(`/(tabs)/community/${item.id}`)}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={suggestions}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{
            padding: 16,
            gap: 10,
            paddingBottom: insets.bottom + 112,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 40 }}>
              <Users size={40} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, fontSize: 16, fontWeight: "600", marginTop: 12 }}>
                No suggestions yet
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 4, textAlign: "center" }}>
                Follow more people to get personalized suggestions.
              </Text>
            </View>
          }
          renderItem={({ item }) => <UserSuggestionCard profile={item} />}
          showsVerticalScrollIndicator={false}
        />
      )}

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
    </View>
  );
}
