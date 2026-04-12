import { View, Text, Pressable, Modal, ActivityIndicator } from "react-native";
import { useState } from "react";
import { X, AlertTriangle } from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import { reportPost, reportComment } from "@/lib/community-posts";
import { useAuthStore } from "@/stores/auth.store";
import type { ReportReason } from "@/types";

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  targetId: string;
  targetType: "post" | "comment";
  postId?: string;
}

const REASONS: { key: ReportReason; label: string }[] = [
  { key: "spam", label: "Spam or self-promotion" },
  { key: "harassment", label: "Harassment or bullying" },
  { key: "inappropriate", label: "Inappropriate content" },
  { key: "other", label: "Other" },
];

export function ReportModal({
  visible,
  onClose,
  targetId,
  targetType,
  postId,
}: ReportModalProps) {
  const colors = useThemeStore((s) => s.colors);
  const showToast = useToastStore((s) => s.show);
  const uid = useAuthStore((s) => s.user?.uid);
  const [selected, setSelected] = useState<ReportReason | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!uid || !selected) return;
    setLoading(true);
    try {
      if (targetType === "post") {
        await reportPost(targetId, uid, selected);
      } else if (targetType === "comment" && postId) {
        await reportComment(targetId, postId, uid, selected);
      }
      showToast("Report submitted. Thank you.", "success");
      onClose();
      setSelected(null);
    } catch {
      showToast("Failed to submit report", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
        }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            paddingBottom: 36,
            gap: 16,
          }}
          onPress={() => {}}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <AlertTriangle size={20} color="#F59E0B" />
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 18,
                  fontWeight: "800",
                }}
              >
                Report {targetType}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={22} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
            Why are you reporting this {targetType}?
          </Text>

          <View style={{ gap: 8 }}>
            {REASONS.map((r) => (
              <Pressable
                key={r.key}
                onPress={() => setSelected(r.key)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor:
                    selected === r.key
                      ? colors.primary + "20"
                      : pressed
                        ? colors.surface
                        : colors.surface + "80",
                  borderWidth: 1.5,
                  borderColor:
                    selected === r.key ? colors.primary : colors.cardBorder,
                })}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor:
                      selected === r.key
                        ? colors.primary
                        : colors.mutedForeground,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {selected === r.key && (
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: colors.primary,
                      }}
                    />
                  )}
                </View>
                <Text
                  style={{
                    color: colors.foreground,
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  {r.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={!selected || loading}
            style={({ pressed }) => ({
              backgroundColor:
                !selected || loading
                  ? colors.muted
                  : pressed
                    ? "#EF4444CC"
                    : "#EF4444",
              borderRadius: 14,
              padding: 16,
              alignItems: "center",
            })}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
                Submit Report
              </Text>
            )}
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
