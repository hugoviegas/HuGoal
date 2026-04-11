import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Users, Trophy, LogOut, UserPlus, Dumbbell, Utensils, Flame, Calendar } from "lucide-react-native";
import { LeaderboardRow } from "@/components/community/LeaderboardRow";
import { Avatar } from "@/components/ui/Avatar";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useCommunityStore } from "@/stores/community.store";
import { getGroup, getGroupMembers, isMember } from "@/lib/community-groups";
import { getLeaderboard } from "@/lib/community-leaderboard";
import { useToastStore } from "@/stores/toast.store";
import type { CommunityGroup, GroupMember, ChallengeParticipant } from "@/types";

const CHALLENGE_ICONS = {
  workout: Dumbbell,
  nutrition: Utensils,
  activity: Flame,
  streak: Calendar,
};

const CHALLENGE_COLORS = {
  workout: "#22C4D5",
  nutrition: "#4ADE80",
  activity: "#F59E0B",
  streak: "#A78BFA",
};

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useThemeStore((s) => s.colors);
  const uid = useAuthStore((s) => s.user?.uid);
  const profile = useAuthStore((s) => s.profile);
  const showToast = useToastStore((s) => s.show);
  const joinGroupAction = useCommunityStore((s) => s.joinGroup);
  const leaveGroupAction = useCommunityStore((s) => s.leaveGroup);

  const [group, setGroup] = useState<CommunityGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [leaderboard, setLeaderboard] = useState<ChallengeParticipant[]>([]);
  const [memberStatus, setMemberStatus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"leaderboard" | "members">("leaderboard");

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
    loadData();
  }, [id]);

  const handleJoin = async () => {
    if (!uid || !profile || !id) return;
    setActionLoading(true);
    try {
      await joinGroupAction(id, uid, profile.name, profile.avatar_url);
      setMemberStatus(true);
      if (group) setGroup({ ...group, member_count: group.member_count + 1 });
      showToast("Joined group!", "success");
    } catch (e: unknown) {
      showToast((e as Error).message ?? "Failed to join group", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!uid || !id) return;
    setActionLoading(true);
    try {
      await leaveGroupAction(id, uid);
      setMemberStatus(false);
      if (group) setGroup({ ...group, member_count: Math.max(0, group.member_count - 1) });
      showToast("Left group", "success");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.mutedForeground }}>Group not found</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: colors.primary, fontWeight: "700" }}>Go back</Text>
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
    ? Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

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
          {group.name}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.primary} />
        }
      >
        {/* Group Header Card */}
        <View style={{ padding: 16, gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            {group.avatar_url ? (
              <Image source={{ uri: group.avatar_url }} style={{ width: 60, height: 60, borderRadius: 16 }} />
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
              <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "800" }}>
                {group.name}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: iconColor + "20" }}>
                  <Text style={{ color: iconColor, fontSize: 12, fontWeight: "700", textTransform: "capitalize" }}>
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
                  <Text style={{ color: daysLeft <= 3 ? "#F87171" : colors.mutedForeground, fontSize: 12, fontWeight: "600" }}>
                    {daysLeft === 0 ? "Ends today" : `${daysLeft}d left`}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {group.description ? (
            <Text style={{ color: colors.mutedForeground, fontSize: 14, lineHeight: 20 }}>
              {group.description}
            </Text>
          ) : null}

          {/* Challenge goal progress (for current user) */}
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
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}>
                  Your Progress
                </Text>
                <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "800" }}>
                  {myParticipant.score}/{targetValue} {group.challenge_config.unit}
                </Text>
              </View>
              <View style={{ height: 8, backgroundColor: colors.card, borderRadius: 4, overflow: "hidden" }}>
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
                Rank #{myParticipant.rank} • {group.challenge_config.goal}
              </Text>
            </View>
          )}

          {/* Join/Leave button */}
          {uid && (
            <Pressable
              onPress={memberStatus ? handleLeave : handleJoin}
              disabled={actionLoading || (group.membership === "invite_only" && !memberStatus)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: 14,
                borderRadius: 14,
                backgroundColor: memberStatus
                  ? pressed ? colors.surface : colors.card
                  : pressed ? colors.primary + "CC" : colors.primary,
                borderWidth: memberStatus ? 1 : 0,
                borderColor: colors.cardBorder,
                opacity: group.membership === "invite_only" && !memberStatus ? 0.5 : 1,
              })}
            >
              {actionLoading ? (
                <ActivityIndicator color={memberStatus ? colors.foreground : colors.primaryForeground} />
              ) : (
                <>
                  {memberStatus ? (
                    <LogOut size={18} color={colors.foreground} />
                  ) : (
                    <UserPlus size={18} color={colors.primaryForeground} />
                  )}
                  <Text
                    style={{
                      color: memberStatus ? colors.foreground : colors.primaryForeground,
                      fontSize: 15,
                      fontWeight: "700",
                    }}
                  >
                    {memberStatus
                      ? "Leave Group"
                      : group.membership === "invite_only"
                        ? "Invite Only"
                        : "Join Group"}
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
            paddingHorizontal: 16,
            gap: 8,
            borderBottomWidth: 1,
            borderBottomColor: colors.cardBorder,
            paddingBottom: 12,
          }}
        >
          {([
            { key: "leaderboard" as const, label: "Leaderboard", Icon: Trophy },
            { key: "members" as const, label: "Members", Icon: Users },
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
              <Icon size={15} color={activeTab === key ? colors.primaryForeground : colors.mutedForeground} />
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

        <View style={{ padding: 16, gap: 8 }}>
          {activeTab === "leaderboard" ? (
            leaderboard.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 32 }}>
                <Trophy size={36} color={colors.mutedForeground} />
                <Text style={{ color: colors.mutedForeground, fontSize: 14, marginTop: 10 }}>
                  No participants yet
                </Text>
              </View>
            ) : (
              leaderboard.map((p) => (
                <LeaderboardRow
                  key={p.user_id}
                  participant={p}
                  targetValue={targetValue}
                  isCurrentUser={p.user_id === uid}
                />
              ))
            )
          ) : (
            members.map((m) => (
              <View
                key={m.user_id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 8,
                }}
              >
                <Avatar source={m.user_avatar} name={m.user_name} size="sm" />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
                    {m.user_name}
                    {m.user_id === uid ? " (you)" : ""}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                    Score: {m.current_score}
                  </Text>
                </View>
                {m.current_rank > 0 && (
                  <Text style={{ color: colors.mutedForeground, fontSize: 13, fontWeight: "700" }}>
                    #{m.current_rank}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
