import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, MoreHorizontal, Flame, Trophy, Users, FileText } from "lucide-react-native";
import { Avatar } from "@/components/ui/Avatar";
import { FollowButton } from "@/components/community/FollowButton";
import { FeedPost } from "@/components/community/FeedPost";
import { PostActionMenu } from "@/components/community/PostActionMenu";
import { ReportModal } from "@/components/community/ReportModal";
import { GlassCard } from "@/components/ui/GlassCard";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useCommunityStore } from "@/stores/community.store";
import { getDocument } from "@/lib/firestore";
import { getPostsByAuthor } from "@/lib/community-posts";
import { getFollowerIds, isFollowing, isBlocked } from "@/lib/community-follows";
import { useToastStore } from "@/stores/toast.store";
import type { CommunityPost, PublicProfile } from "@/types";

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useThemeStore((s) => s.colors);
  const uid = useAuthStore((s) => s.user?.uid);
  const showToast = useToastStore((s) => s.show);
  const blockUserAction = useCommunityStore((s) => s.blockUser);
  const loadSocialState = useCommunityStore((s) => s.loadSocialState);

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [following, setFollowing] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPost, setMenuPost] = useState<CommunityPost | null>(null);
  const [reportPost, setReportPost] = useState<CommunityPost | null>(null);
  const [reportUser, setReportUser] = useState(false);

  const loadData = useCallback(async () => {
    if (!id || !uid) return;
    try {
      const rawProfile = await getDocument<Record<string, unknown>>("profiles", id);
      if (!rawProfile) return;

      const pub: PublicProfile = {
        id,
        name: rawProfile.name as string,
        username: rawProfile.username as string,
        avatar_url: rawProfile.avatar_url as string | undefined,
        bio: rawProfile.bio as string | undefined,
        xp: rawProfile.xp as number ?? 0,
        streak_current: rawProfile.streak_current as number ?? 0,
        follower_count: rawProfile.follower_count as number ?? 0,
        following_count: rawProfile.following_count as number ?? 0,
        public_post_count: rawProfile.public_post_count as number ?? 0,
        network_visibility: (rawProfile.network_visibility as "public" | "private") ?? "public",
        profile_visibility: (rawProfile.profile_visibility as "public" | "private") ?? "public",
      };
      setProfile(pub);

      const [userPosts, isFollow, isBlock] = await Promise.all([
        getPostsByAuthor(id),
        isFollowing(uid, id),
        isBlocked(uid, id),
      ]);

      // Filter to public posts only (or followers-only if following)
      const visiblePosts = userPosts.filter(
        (p) => p.visibility === "public" || (p.visibility === "followers" && isFollow),
      );

      setPosts(visiblePosts);
      setFollowing(isFollow);
      setBlocked(isBlock);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, uid]);

  useEffect(() => {
    loadData();
  }, [id]);

  const handleBlock = async () => {
    if (!uid || !id) return;
    await blockUserAction(uid, id);
    if (uid) loadSocialState(uid);
    showToast("User blocked", "success");
    router.back();
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!profile || blocked) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", paddingTop: insets.top }}>
        <Text style={{ color: colors.mutedForeground, marginBottom: 12 }}>
          {blocked ? "User blocked" : "User not found"}
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: colors.primary, fontWeight: "700" }}>Go back</Text>
        </Pressable>
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
          gap: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.cardBorder,
        }}
      >
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
        <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "800", flex: 1 }} numberOfLines={1}>
          @{profile.username}
        </Text>
        <Pressable
          onPress={() => setShowMenu(true)}
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
          <MoreHorizontal size={18} color={colors.foreground} />
        </Pressable>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{
          padding: 16,
          gap: 12,
          paddingBottom: insets.bottom + 80,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 16 }}>
            {/* Profile card */}
            <GlassCard style={{ padding: 18 }}>
              <View style={{ alignItems: "center", gap: 12 }}>
                <Avatar source={profile.avatar_url} name={profile.name} size="xl" />
                <View style={{ alignItems: "center", gap: 3 }}>
                  <Text style={{ color: colors.foreground, fontSize: 22, fontWeight: "800" }}>
                    {profile.name}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
                    @{profile.username}
                  </Text>
                  {profile.bio ? (
                    <Text style={{ color: colors.mutedForeground, fontSize: 14, textAlign: "center", marginTop: 4 }}>
                      {profile.bio}
                    </Text>
                  ) : null}
                </View>

                {/* Follower/following counts */}
                {profile.network_visibility === "public" && (
                  <View style={{ flexDirection: "row", gap: 24 }}>
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "800" }}>
                        {profile.follower_count}
                      </Text>
                      <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Followers</Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: colors.cardBorder }} />
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "800" }}>
                        {profile.following_count}
                      </Text>
                      <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Following</Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: colors.cardBorder }} />
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "800" }}>
                        {profile.public_post_count}
                      </Text>
                      <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Posts</Text>
                    </View>
                  </View>
                )}

                <FollowButton targetUid={id!} size="md" />
              </View>
            </GlassCard>

            {/* Stats */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              {[
                { label: "XP", value: String(profile.xp), Icon: Flame, color: colors.primary },
                { label: "Streak", value: String(profile.streak_current), Icon: Trophy, color: colors.accent },
              ].map((item) => {
                const Icon = item.Icon;
                return (
                  <GlassCard key={item.label} style={{ flex: 1, padding: 14 }}>
                    <View style={{ gap: 8 }}>
                      <View
                        style={{
                          height: 36,
                          width: 36,
                          borderRadius: 10,
                          backgroundColor: colors.surface,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon size={18} color={item.color} />
                      </View>
                      <View>
                        <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "800" }}>
                          {item.value}
                        </Text>
                        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{item.label}</Text>
                      </View>
                    </View>
                  </GlassCard>
                );
              })}
            </View>

            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>
              Posts
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 32, gap: 8 }}>
            <FileText size={32} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
              {following || profile.visibility === "public"
                ? "No posts yet"
                : "Follow to see their posts"}
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

      {/* User options menu */}
      {showMenu && (
        <View
          style={{
            position: "absolute",
            top: insets.top + 60,
            right: 16,
            backgroundColor: colors.card,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 12,
            elevation: 8,
            overflow: "hidden",
            minWidth: 180,
            zIndex: 100,
          }}
        >
          <Pressable
            onPress={() => { setShowMenu(false); setReportUser(true); }}
            style={({ pressed }) => ({
              padding: 14,
              backgroundColor: pressed ? colors.surface : "transparent",
            })}
          >
            <Text style={{ color: "#F59E0B", fontSize: 15, fontWeight: "600" }}>Report user</Text>
          </Pressable>
          <View style={{ height: 1, backgroundColor: colors.cardBorder }} />
          <Pressable
            onPress={() => { setShowMenu(false); handleBlock(); }}
            style={({ pressed }) => ({
              padding: 14,
              backgroundColor: pressed ? colors.surface : "transparent",
            })}
          >
            <Text style={{ color: "#F87171", fontSize: 15, fontWeight: "600" }}>Block user</Text>
          </Pressable>
          <View style={{ height: 1, backgroundColor: colors.cardBorder }} />
          <Pressable
            onPress={() => setShowMenu(false)}
            style={({ pressed }) => ({
              padding: 14,
              backgroundColor: pressed ? colors.surface : "transparent",
            })}
          >
            <Text style={{ color: colors.mutedForeground, fontSize: 15 }}>Cancel</Text>
          </Pressable>
        </View>
      )}

      {showMenu && (
        <Pressable
          style={{ position: "absolute", inset: 0, zIndex: 99 }}
          onPress={() => setShowMenu(false)}
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

      {reportUser && (
        <ReportModal
          visible={reportUser}
          onClose={() => setReportUser(false)}
          targetId={id!}
          targetType="post"
        />
      )}
    </View>
  );
}
