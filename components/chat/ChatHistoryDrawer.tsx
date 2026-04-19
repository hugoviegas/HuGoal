import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { formatDistanceToNow } from "date-fns";
import { X, Plus, RefreshCw, Trash2 } from "lucide-react-native";

import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import {
  listSessions,
  listArchivedSessions,
  unarchiveSession,
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
  onNewChat: () => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onRefreshContext: () => Promise<void>;
}

type SessionGroup = {
  label: string;
  sessions: ChatSessionDocument[];
};

type ConfirmAction =
  | { type: "new-chat" }
  | { type: "delete-chat"; sessionId: string; preview: string }
  | { type: "restore-chat"; sessionId: string; preview: string };

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
  onDeleteSession,
  onRefreshContext,
}: ChatHistoryDrawerProps) {
  const colors = useThemeStore((state) => state.colors);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSessionDocument[]>([]);
  const [busySessionId, setBusySessionId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null,
  );
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const groupedSessions = useMemo(() => groupByDate(sessions), [sessions]);

  useEffect(() => {
    if (!visible || !uid) {
      return;
    }

    setLoading(true);
    const loader = showArchived
      ? listArchivedSessions(uid, context, 50)
      : listSessions(uid, context, 20);

    loader
      .then((result) => {
        setSessions(result);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [context, uid, visible, showArchived]);

  if (!visible) {
    return null;
  }
  const confirmTitle =
    confirmAction?.type === "delete-chat"
      ? "Delete this chat?"
      : confirmAction?.type === "restore-chat"
        ? "Restore this chat?"
        : "Start a new chat?";
  const confirmMessage =
    confirmAction?.type === "delete-chat"
      ? `This will permanently remove \"${confirmAction.preview || "Conversation"}\" from history and cloud storage.`
      : confirmAction?.type === "restore-chat"
        ? `This will restore \"${confirmAction.preview || "Conversation"}\" to your chat history.`
        : "A new conversation will be started and your previous chat will remain in history.";
  const confirmCta =
    confirmAction?.type === "delete-chat"
      ? "Delete Chat"
      : confirmAction?.type === "restore-chat"
        ? "Restore Chat"
        : "Start New Chat";

  return (
    <View
      style={{
        position: "absolute",
        top: 84,
        right: 0,
        bottom: 96,
        width: "88%",
        maxWidth: 360,
        borderTopLeftRadius: 18,
        borderBottomLeftRadius: 18,
        borderLeftWidth: 1,
        borderLeftColor: colors.cardBorder,
        backgroundColor: colors.card,
        zIndex: 60,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 18,
        elevation: 20,
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
          onPress={() => setShowArchived((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel="Toggle archived sessions"
          style={{
            marginLeft: spacing.xs,
            paddingHorizontal: 8,
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor: showArchived
              ? `${colors.primary}12`
              : "transparent",
          }}
        >
          <Text
            style={[
              typography.caption,
              { color: showArchived ? colors.primary : colors.mutedForeground },
            ]}
          >
            Archived
          </Text>
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
        onPress={() => setConfirmAction({ type: "new-chat" })}
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
                  <View
                    key={session.sessionId}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.cardBorder,
                      borderRadius: 12,
                      backgroundColor: colors.background,
                      opacity: busySessionId === session.sessionId ? 0.7 : 1,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Pressable
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
                        flex: 1,
                        paddingVertical: spacing.xs,
                        paddingLeft: spacing.sm,
                        paddingRight: spacing.xs,
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

                    {showArchived ? (
                      <Pressable
                        onPress={() => {
                          setConfirmAction({
                            type: "restore-chat",
                            sessionId: session.sessionId,
                            preview: session.preview || "Conversation",
                          });
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Restore session ${session.preview || "without preview"}`}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          marginRight: spacing.xs,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: `${colors.primary}20`,
                        }}
                      >
                        <RefreshCw size={15} color={colors.primary} />
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => {
                          setConfirmAction({
                            type: "delete-chat",
                            sessionId: session.sessionId,
                            preview: session.preview || "Conversation",
                          });
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete session ${session.preview || "without preview"}`}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          marginRight: spacing.xs,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: `${colors.destructive}20`,
                        }}
                      >
                        <Trash2 size={15} color={colors.destructive} />
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={confirmAction !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!confirmBusy) {
            setConfirmAction(null);
          }
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: spacing.lg,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 360,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              backgroundColor: colors.card,
              padding: spacing.md,
              gap: spacing.sm,
            }}
          >
            <Text style={[typography.bodyMedium, { color: colors.foreground }]}>
              {confirmTitle}
            </Text>
            <Text style={[typography.small, { color: colors.mutedForeground }]}>
              {confirmMessage}
            </Text>

            <View
              style={{
                marginTop: spacing.xs,
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: spacing.xs,
              }}
            >
              <Pressable
                disabled={confirmBusy}
                onPress={() => setConfirmAction(null)}
                style={{
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  paddingVertical: spacing.xs,
                  paddingHorizontal: spacing.md,
                }}
              >
                <Text
                  style={[typography.smallMedium, { color: colors.foreground }]}
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                disabled={confirmBusy}
                onPress={() => {
                  if (!confirmAction) {
                    return;
                  }

                  setConfirmBusy(true);

                  let actionPromise: Promise<unknown>;
                  if (confirmAction.type === "delete-chat") {
                    actionPromise = onDeleteSession(
                      confirmAction.sessionId,
                    ).then(() => {
                      setSessions((current) =>
                        current.filter(
                          (session) =>
                            session.sessionId !== confirmAction.sessionId,
                        ),
                      );
                    });
                  } else if (confirmAction.type === "restore-chat") {
                    if (!uid) {
                      actionPromise = Promise.reject(new Error("Missing uid"));
                    } else {
                      actionPromise = unarchiveSession(
                        uid,
                        confirmAction.sessionId,
                      ).then(() => {
                        setSessions((current) =>
                          current.filter(
                            (session) =>
                              session.sessionId !== confirmAction.sessionId,
                          ),
                        );
                      });
                    }
                  } else {
                    actionPromise = onNewChat();
                  }

                  void actionPromise.finally(() => {
                    setConfirmBusy(false);
                    setConfirmAction(null);
                  });
                }}
                style={{
                  borderRadius: 10,
                  paddingVertical: spacing.xs,
                  paddingHorizontal: spacing.md,
                  backgroundColor:
                    confirmAction?.type === "delete-chat"
                      ? colors.destructive
                      : colors.primary,
                  minWidth: 112,
                  alignItems: "center",
                }}
              >
                {confirmBusy ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[typography.smallMedium, { color: "#fff" }]}>
                    {confirmCta}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
