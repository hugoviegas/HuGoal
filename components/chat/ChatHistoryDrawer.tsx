import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { formatDistanceToNow } from "date-fns";
import { X, Plus, RefreshCw } from "lucide-react-native";

import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import {
  listSessions,
  type ChatSessionDocument,
} from "@/lib/chat/chatHistoryService";
import type { ChatContext } from "@/stores/chat.store";
import { useThemeStore } from "@/stores/theme.store";

interface ChatHistoryDrawerProps {
  visible: boolean;
  uid?: string;
  context: ChatContext;
  onClose: () => void;
  onLoadSession: (sessionId: string) => Promise<void>;
  onNewChat: () => void;
  onRefreshContext: () => Promise<void>;
}

type SessionGroup = {
  label: string;
  sessions: ChatSessionDocument[];
};

function contextLabel(context: ChatContext): string {
  if (context === "home") return "Home";
  if (context === "workouts") return "Workouts";
  if (context === "nutrition") return "Nutrition";
  return "Community";
}

function groupByDate(sessions: ChatSessionDocument[]): SessionGroup[] {
  const today = new Date();
  const groups: Record<string, ChatSessionDocument[]> = {
    Today: [],
    Yesterday: [],
    "This Week": [],
    Older: [],
  };

  sessions.forEach((session) => {
    const updatedAt = session.updatedAt?.toDate();
    if (!updatedAt) {
      groups.Older.push(session);
      return;
    }

    const diffMs = today.getTime() - updatedAt.getTime();
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (days <= 0) {
      groups.Today.push(session);
    } else if (days === 1) {
      groups.Yesterday.push(session);
    } else if (days <= 7) {
      groups["This Week"].push(session);
    } else {
      groups.Older.push(session);
    }
  });

  return Object.entries(groups)
    .map(([label, items]) => ({ label, sessions: items }))
    .filter((group) => group.sessions.length > 0);
}

export function ChatHistoryDrawer({
  visible,
  uid,
  context,
  onClose,
  onLoadSession,
  onNewChat,
  onRefreshContext,
}: ChatHistoryDrawerProps) {
  const colors = useThemeStore((state) => state.colors);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSessionDocument[]>([]);
  const [busySessionId, setBusySessionId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const groupedSessions = useMemo(() => groupByDate(sessions), [sessions]);

  useEffect(() => {
    if (!visible || !uid) {
      return;
    }

    setLoading(true);
    listSessions(uid, context, 20)
      .then((result) => {
        setSessions(result);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [context, uid, visible]);

  if (!visible) {
    return null;
  }

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        width: "88%",
        maxWidth: 360,
        borderLeftWidth: 1,
        borderLeftColor: colors.cardBorder,
        backgroundColor: colors.card,
        zIndex: 60,
      }}
    >
      <View
        style={{
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.cardBorder,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.xs,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={[typography.smallMedium, { color: colors.foreground }]}>
            Chat History
          </Text>
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>
            {contextLabel(context)} context
          </Text>
        </View>

        <Pressable
          onPress={() => {
            setRefreshing(true);
            void onRefreshContext().finally(() => {
              setRefreshing(false);
            });
          }}
          accessibilityRole="button"
          accessibilityLabel="Refresh from cloud"
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: `${colors.primary}22`,
          }}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <RefreshCw size={16} color={colors.primary} />
          )}
        </Pressable>

        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close history drawer"
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.background,
          }}
        >
          <X size={16} color={colors.foreground} />
        </Pressable>
      </View>

      <Pressable
        onPress={onNewChat}
        accessibilityRole="button"
        accessibilityLabel="Start a new chat"
        style={{
          marginHorizontal: spacing.md,
          marginTop: spacing.md,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.primary,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.sm,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: spacing.xs,
        }}
      >
        <Plus size={16} color={colors.primary} />
        <Text style={[typography.smallMedium, { color: colors.primary }]}>
          New Chat
        </Text>
      </Pressable>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingTop: spacing.md,
          paddingBottom: spacing.xl,
          gap: spacing.md,
        }}
      >
        {loading ? (
          <View style={{ paddingVertical: spacing.lg }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : groupedSessions.length === 0 ? (
          <Text style={[typography.small, { color: colors.mutedForeground }]}>
            No past sessions yet.
          </Text>
        ) : (
          groupedSessions.map((group) => (
            <View key={group.label} style={{ gap: spacing.xs }}>
              <Text
                style={[typography.caption, { color: colors.mutedForeground }]}
              >
                {group.label}
              </Text>
              {group.sessions.map((session) => {
                const updatedAt = session.updatedAt?.toDate();
                const relative = updatedAt
                  ? formatDistanceToNow(updatedAt, { addSuffix: true })
                  : "just now";

                return (
                  <Pressable
                    key={session.sessionId}
                    onPress={() => {
                      setBusySessionId(session.sessionId);
                      void onLoadSession(session.sessionId)
                        .then(() => {
                          onClose();
                        })
                        .finally(() => {
                          setBusySessionId(null);
                        });
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Load session ${session.preview || "without preview"}`}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.cardBorder,
                      borderRadius: 12,
                      paddingVertical: spacing.xs,
                      paddingHorizontal: spacing.sm,
                      backgroundColor: colors.background,
                      opacity: busySessionId === session.sessionId ? 0.7 : 1,
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        typography.smallMedium,
                        { color: colors.foreground },
                      ]}
                    >
                      {session.preview || "Conversation"}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[
                        typography.caption,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {contextLabel(session.context)} • {session.messageCount}{" "}
                      messages • {relative}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
