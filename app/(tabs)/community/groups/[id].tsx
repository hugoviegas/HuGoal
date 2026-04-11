import {
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Users,
  Trophy,
  UserPlus,
  Dumbbell,
  Utensils,
  Flame,
  Calendar,
  Plus,
  CheckCircle,
} from "lucide-react-native";
import { LeaderboardRow } from "@/components/community/LeaderboardRow";
import { CheckInCard } from "@/components/community/CheckInCard";
import { CheckInCommentSheet } from "@/components/community/CheckInCommentSheet";
import { GroupOptionsMenu } from "@/components/community/GroupOptionsMenu";
import { Avatar } from "@/components/ui/Avatar";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useCommunityStore } from "@/stores/community.store";
import { getGroup, getGroupMembers, isMember } from "@/lib/community-groups";
import { getLeaderboard } from "@/lib/community-leaderboard";
import { createCheckInComment } from "@/lib/community-checkins";
import { useToastStore } from "@/stores/toast.store";
import type {
  CommunityGroup,
  GroupMember,
  ChallengeParticipant,
  GroupCheckIn,
} from "@/types";

const CHALLENGE_ICONS = {
  workout: Dumbbell,
  nutrition: Utensils,
  activity: Flame,
  streak: Calendar,
};

const CHALLENGE_COLORS: Record<string, string> = {
  workout: "#22C4D5",
  nutrition: "#4ADE80",
  activity: "#F59E0B",
  streak: "#A78BFA",
};

type DetailTab = "hoje" | "ranking" | "membros";

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useThemeStore((s) => s.colors);
  const uid = useAuthStore((s) => s.user?.uid);
  const profile = useAuthStore((s) => s.profile);
  const showToast = useToastStore((s) => s.show);
  const joinGroupAction = useCommunityStore((s) => s.joinGroup);
  const checkIns = useCommunityStore((s) => s.checkIns);
  const checkInsLoading = useCommunityStore((s) => s.checkInsLoading);
  const todayCheckIn = useCommunityStore((s) => s.todayCheckIn);
  const loadCheckIns = useCommunityStore((s) => s.loadCheckIns);
  const loadTodayCheckIn = useCommunityStore((s) => s.loadTodayCheckIn);

  const [group, setGroup] = useState<CommunityGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [leaderboard, setLeaderboard] = useState<ChallengeParticipant[]>([]);
  const [memberStatus, setMemberStatus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>("hoje");

  // Comment sheet state
  const [commentCheckIn, setCommentCheckIn] = useState<GroupCheckIn | null>(null);

  const groupCheckIns = id ? checkIns[id] ?? [] : [];
  const myTodayCheckIn = id ? todayCheckIn[id] : undefined;

  const loadData = useCallback(async () => {
    if (!id || !uid) return;
    try {
      const [g, m, lb, mem] = await Promise.all([
        getGroup(id),
        getGroupMembers(id),
        getLeaderboard(id),
        isMember(id, uid),
      ]);
      setGroup(g);
      setMembers(m);
      setLeaderboard(lb);
      setMemberStatus(mem);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, uid]);

  useEffect(() => {
    if (!id || !uid) return;
    loadData();
    loadCheckIns(id);
    loadTodayCheckIn(id, uid);
  }, [id, uid]);

  const handleRefresh = () => {
    setRefreshing(true);
    if (id && uid) {
      loadData();
      loadCheckIns(id);
      loadTodayCheckIn(id, uid);
    }
  };

  const handleJoin = async () => {
    if (!uid || !profile || !id) return;
    setActionLoading(true);
    try {
      await joinGroupAction(id, uid, profile.name, profile.avatar_url);
      setMemberStatus(true);
      if (group) setGroup({ ...group, member_count: group.member_count + 1 });
      showToast("Entrou no grupo!", "success");
    } catch (e: unknown) {
      showToast((e as Error).message ?? "Erro ao entrar no grupo", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEmojiReaction = async (checkIn: GroupCheckIn, emoji: string) => {
    if (!uid || !profile) return;
    try {
      await createCheckInComment(checkIn.group_id, checkIn.id, {
        uid,
        author_name: profile.name,
        author_avatar: profile.avatar_url,
        content: emoji,
        emoji_reaction: emoji,
      });
      await loadCheckIns(id!);
    } catch {
      // silent
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!group) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
        }}
      >
        <Text style={{ color: colors.mutedForeground }}>Grupo não encontrado</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: colors.primary, fontWeight: "700" }}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  const ChallengeIcon = CHALLENGE_ICONS[group.challenge_type] ?? Dumbbell;
  const iconColor = CHALLENGE_COLORS[group.challenge_type] ?? colors.primary;
  const targetValue = group.challenge_config.target_value;
  const myParticipant = leaderboard.find((p) => p.user_id === uid);
  const myProgress = myParticipant ? (myParticipant.score / targetValue) * 100 : 0;

  const endDate = group.ended_at ? new Date(group.ended_at) : null;
  const daysLeft = endDate
    ? Math.max(
        0,
        Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      )
    : null;

  const TABS: { key: DetailTab; label: string }[] = [
    { key: "hoje", label: "Hoje" },
    { key: "ranking", label: "Ranking" },
    { key: "membros", label: "Membros" },
  ];

  // Shared header + group card as FlatList header
  const ListHeaderContent = (
    <View>
      {/* Group Header Card */}
      <View style={{ padding: 16, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          {group.avatar_url ? (
            <Image
              source={{ uri: group.avatar_url }}
              style={{ width: 60, height: 60, borderRadius: 16 }}
            />
          ) : (
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 16,
                backgroundColor: iconColor + "20",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChallengeIcon size={28} color={iconColor} />
            </View>
          )}

          <View style={{ flex: 1, gap: 4 }}>
            <Text
              style={{ color: colors.foreground, fontSize: 18, fontWeight: "800" }}
            >
              {group.name}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 8,
                  backgroundColor: iconColor + "20",
                }}
              >
                <Text
                  style={{
                    color: iconColor,
                    fontSize: 12,
                    fontWeight: "700",
                    textTransform: "capitalize",
                  }}
                >
                  {group.challenge_type}
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Users size={13} color={colors.mutedForeground} />
                <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                  {group.member_count}
                </Text>
              </View>
              {daysLeft !== null && group.status === "active" && (
                <Text
                  style={{
                    color: daysLeft <= 3 ? "#F87171" : colors.mutedForeground,
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  {daysLeft === 0 ? "Termina hoje" : `${daysLeft}d restantes`}
                </Text>
              )}
            </View>
          </View>
        </View>

        {group.description ? (
          <Text
            style={{ color: colors.mutedForeground, fontSize: 14, lineHeight: 20 }}
          >
            {group.description}
          </Text>
        ) : null}

        {/* My progress */}
        {memberStatus && myParticipant && (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 14,
              padding: 14,
              gap: 8,
              borderWidth: 1,
              borderColor: colors.cardBorder,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}
              >
                Meu Progresso
              </Text>
              <Text
                style={{ color: colors.primary, fontSize: 14, fontWeight: "800" }}
              >
                {myParticipant.score}/{targetValue} {group.challenge_config.unit}
              </Text>
            </View>
            <View
              style={{
                height: 8,
                backgroundColor: colors.card,
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: "100%",
                  width: `${Math.min(100, myProgress)}%`,
                  backgroundColor: colors.primary,
                  borderRadius: 4,
                }}
              />
            </View>
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
              #{myParticipant.rank} no ranking • {group.challenge_config.goal}
            </Text>
          </View>
        )}

        {/* Join button for non-members */}
        {uid && !memberStatus && (
          <Pressable
            onPress={handleJoin}
            disabled={
              actionLoading || group.membership === "invite_only"
            }
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: 14,
              borderRadius: 14,
              backgroundColor:
                group.membership === "invite_only"
                  ? colors.surface
                  : pressed
                    ? colors.primary + "CC"
                    : colors.primary,
              borderWidth: group.membership === "invite_only" ? 1 : 0,
              borderColor: colors.cardBorder,
              opacity: group.membership === "invite_only" ? 0.6 : 1,
            })}
          >
            {actionLoading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <>
                <UserPlus
                  size={18}
                  color={
                    group.membership === "invite_only"
                      ? colors.mutedForeground
                      : colors.primaryForeground
                  }
                />
                <Text
                  style={{
                    color:
                      group.membership === "invite_only"
                        ? colors.mutedForeground
                        : colors.primaryForeground,
                    fontSize: 15,
                    fontWeight: "700",
                  }}
                >
                  {group.membership === "invite_only"
                    ? "Somente por convite"
                    : "Entrar no Grupo"}
                </Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      {/* Tabs */}
      <View
        style={{
          flexDirection: "row",
          borderBottomWidth: 1,
          borderBottomColor: colors.cardBorder,
        }}
      >
        {TABS.map(({ key, label }) => (
          <Pressable
            key={key}
            onPress={() => setActiveTab(key)}
            style={{
              flex: 1,
              alignItems: "center",
              paddingVertical: 12,
              borderBottomWidth: 2,
              borderBottomColor:
                activeTab === key ? colors.primary : "transparent",
            }}
          >
            <Text
              style={{
                color:
                  activeTab === key ? colors.primary : colors.mutedForeground,
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
  );

  // Content for each tab
  const hoje_data = activeTab === "hoje" ? groupCheckIns : [];
  const ranking_data = activeTab === "ranking" ? leaderboard : [];
  const membros_data = activeTab === "membros" ? members : [];

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
        <Text
          style={{
            color: colors.foreground,
            fontSize: 18,
            fontWeight: "800",
            flex: 1,
          }}
          numberOfLines={1}
        >
          {group.name}
        </Text>
        {uid && (
          <GroupOptionsMenu
            groupId={id!}
            groupName={group.name}
            creatorId={group.creator_id}
            currentUid={uid}
          />
        )}
      </View>

      {/* Hoje tab */}
      {activeTab === "hoje" && (
        <FlatList
          data={hoje_data}
          keyExtractor={(ci) => ci.id}
          ListHeaderComponent={ListHeaderContent}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 120,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            checkInsLoading ? (
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <View style={{ alignItems: "center", paddingVertical: 40, gap: 8 }}>
                <Text
                  style={{ color: colors.mutedForeground, fontSize: 15, fontWeight: "600" }}
                >
                  Nenhum check-in hoje
                </Text>
                {memberStatus && (
                  <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                    Seja o primeiro a registrar!
                  </Text>
                )}
              </View>
            )
          }
          renderItem={({ item }) => (
            <CheckInCard
              checkIn={item}
              currentUid={uid ?? ""}
              onCommentPress={() => setCommentCheckIn(item)}
              onEmojiPress={(emoji) => handleEmojiReaction(item, emoji)}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Ranking tab */}
      {activeTab === "ranking" && (
        <FlatList
          data={ranking_data}
          keyExtractor={(p) => p.user_id}
          ListHeaderComponent={ListHeaderContent}
          contentContainerStyle={{
            padding: 16,
            gap: 8,
            paddingBottom: insets.bottom + 100,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingVertical: 32 }}>
              <Trophy size={36} color={colors.mutedForeground} />
              <Text
                style={{ color: colors.mutedForeground, fontSize: 14, marginTop: 10 }}
              >
                Nenhum participante ainda
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <LeaderboardRow
              participant={item}
              targetValue={targetValue}
              isCurrentUser={item.user_id === uid}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Membros tab */}
      {activeTab === "membros" && (
        <FlatList
          data={membros_data}
          keyExtractor={(m) => m.user_id}
          ListHeaderComponent={ListHeaderContent}
          contentContainerStyle={{
            padding: 16,
            gap: 4,
            paddingBottom: insets.bottom + 100,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item: m }) => (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: colors.cardBorder + "60",
              }}
            >
              <Avatar source={m.user_avatar} name={m.user_name} size="sm" />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.foreground,
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  {m.user_name}
                  {m.user_id === uid ? " (você)" : ""}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                  {m.current_score} {group.challenge_config.unit}
                </Text>
              </View>
              {m.current_rank > 0 && (
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontSize: 13,
                    fontWeight: "700",
                  }}
                >
                  #{m.current_rank}
                </Text>
              )}
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Check-in FAB — only on Hoje tab for members */}
      {activeTab === "hoje" && memberStatus && uid && (
        <Pressable
          onPress={() => {
            if (myTodayCheckIn) {
              showToast("Já fez check-in hoje!", "info");
              return;
            }
            router.push(
              `/(tabs)/community/groups/check-in/${id}` as never,
            );
          }}
          style={({ pressed }) => ({
            position: "absolute",
            right: 20,
            bottom: insets.bottom + 96,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: myTodayCheckIn
              ? colors.surface
              : pressed
                ? colors.primary + "CC"
                : colors.primary,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOpacity: 0.25,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
            borderWidth: myTodayCheckIn ? 1 : 0,
            borderColor: colors.cardBorder,
          })}
        >
          {myTodayCheckIn ? (
            <CheckCircle size={26} color={colors.primary} />
          ) : (
            <Plus size={28} color={colors.primaryForeground} />
          )}
        </Pressable>
      )}

      {/* Comment Sheet */}
      {commentCheckIn && (
        <CheckInCommentSheet
          visible={!!commentCheckIn}
          groupId={commentCheckIn.group_id}
          checkInId={commentCheckIn.id}
          onClose={() => setCommentCheckIn(null)}
          onCommentAdded={() => id && loadCheckIns(id)}
        />
      )}
    </View>
  );
}
