import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Compass, PenSquare, Users } from "lucide-react-native";
import { FeedPost } from "@/components/community/FeedPost";
import { FeedEmptyState } from "@/components/community/FeedEmptyState";
import { PostActionMenu } from "@/components/community/PostActionMenu";
import { ReportModal } from "@/components/community/ReportModal";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useCommunityStore } from "@/stores/community.store";
import { getSuggestedUsers } from "@/lib/community-follows";
import type { CommunityPost, PublicProfile } from "@/types";

export default function CommunityFeedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useThemeStore((s) => s.colors);
  const uid = useAuthStore((s) => s.user?.uid);
  const profile = useAuthStore((s) => s.profile);

  const feed = useCommunityStore((s) => s.feed);
  const feedLoading = useCommunityStore((s) => s.feedLoading);
  const loadFeed = useCommunityStore((s) => s.loadFeed);
  const startFeedListener = useCommunityStore((s) => s.startFeedListener);
  const stopFeedListener = useCommunityStore((s) => s.stopFeedListener);
  const loadSocialState = useCommunityStore((s) => s.loadSocialState);

  const [refreshing, setRefreshing] = useState(false);
  const [suggestions, setSuggestions] = useState<PublicProfile[]>([]);
  const [menuPost, setMenuPost] = useState<CommunityPost | null>(null);
  const [reportPost, setReportPost] = useState<CommunityPost | null>(null);

  useEffect(() => {
    if (!uid) return;
    loadSocialState(uid);
    startFeedListener(uid);

    getSuggestedUsers(uid).then(setSuggestions).catch(() => {});

    return () => stopFeedListener();
  }, [uid]);

  const handleRefresh = useCallback(async () => {
    if (!uid) return;
    setRefreshing(true);
    await loadFeed(uid);
    setRefreshing(false);
  }, [uid]);

  if (feedLoading && feed.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.cardBorder,
        }}
      >
        <Text style={{ color: colors.foreground, fontSize: 22, fontWeight: "800" }}>
          Community
        </Text>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={() => router.push("/(tabs)/community/discover")}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: pressed ? colors.surface : colors.card,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              alignItems: "center",
              justifyContent: "center",
            })}
          >
            <Compass size={20} color={colors.foreground} />
          </Pressable>

          <Pressable
            onPress={() => router.push("/(tabs)/community/groups")}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: pressed ? colors.surface : colors.card,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              alignItems: "center",
              justifyContent: "center",
            })}
          >
            <Users size={20} color={colors.foreground} />
          </Pressable>

          <Pressable
            onPress={() => router.push("/(tabs)/community/create-post")}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: pressed ? colors.primary + "CC" : colors.primary,
              alignItems: "center",
              justifyContent: "center",
            })}
          >
            <PenSquare size={20} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={feed}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{
          padding: 16,
          gap: 12,
          paddingBottom: insets.bottom + 112,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !feedLoading ? <FeedEmptyState suggestions={suggestions} /> : null
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
