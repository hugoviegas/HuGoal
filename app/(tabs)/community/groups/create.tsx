import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, ChevronRight, Dumbbell, Utensils, Flame, Calendar, Lock, Globe, Users } from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useCommunityStore } from "@/stores/community.store";
import { createGroup } from "@/lib/community-groups";
import { useToastStore } from "@/stores/toast.store";
import type { ChallengeType, GroupMembership, GroupVisibility } from "@/types";

type Step = 1 | 2 | 3 | 4;

const CHALLENGE_TYPES: Array<{ key: ChallengeType; label: string; Icon: typeof Dumbbell; color: string; unit: string }> = [
  { key: "workout", label: "Workout", Icon: Dumbbell, color: "#22C4D5", unit: "sessions" },
  { key: "nutrition", label: "Nutrition", Icon: Utensils, color: "#4ADE80", unit: "days" },
  { key: "activity", label: "Activity", Icon: Flame, color: "#F59E0B", unit: "calories" },
  { key: "streak", label: "Streak", Icon: Calendar, color: "#A78BFA", unit: "days" },
];

export default function CreateGroupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useThemeStore((s) => s.colors);
  const uid = useAuthStore((s) => s.user?.uid);
  const profile = useAuthStore((s) => s.profile);
  const showToast = useToastStore((s) => s.show);
  const loadGroups = useCommunityStore((s) => s.loadGroups);

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [challengeType, setChallengeType] = useState<ChallengeType>("workout");
  const [goal, setGoal] = useState("");
  const [targetValue, setTargetValue] = useState("30");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [membership, setMembership] = useState<GroupMembership>("open");
  const [visibility, setVisibility] = useState<GroupVisibility>("public");
  const [creating, setCreating] = useState(false);

  const selectedType = CHALLENGE_TYPES.find((t) => t.key === challengeType)!;

  const canNext = () => {
    if (step === 1) return name.trim().length >= 3;
    if (step === 2) return !!challengeType;
    if (step === 3) return goal.trim().length > 0 && Number(targetValue) > 0;
    return true;
  };

  const handleCreate = async () => {
    if (!uid || !profile) return;
    setCreating(true);
    try {
      await createGroup({
        uid,
        user_name: profile.name,
        user_avatar: profile.avatar_url,
        name: name.trim(),
        description: description.trim() || undefined,
        challenge_type: challengeType,
        challenge_config: {
          goal: goal.trim(),
          target_value: Number(targetValue),
          unit: selectedType.unit,
        },
        membership,
        visibility,
        started_at: startDate || new Date().toISOString(),
        ended_at: endDate || undefined,
      });
      await loadGroups(uid);
      showToast("Group created!", "success");
      router.back();
    } catch {
      showToast("Failed to create group", "error");
    } finally {
      setCreating(false);
    }
  };

  const steps = ["Info", "Type", "Goal", "Settings"];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottomWidth: 1,
          borderBottomColor: colors.cardBorder,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <X size={22} color={colors.foreground} />
        </Pressable>
        <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: "800" }}>Create Group</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Step indicators */}
      <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, gap: 6 }}>
        {steps.map((s, idx) => (
          <View key={s} style={{ flex: 1, alignItems: "center", gap: 4 }}>
            <View
              style={{
                height: 3,
                borderRadius: 2,
                backgroundColor: idx + 1 <= step ? colors.primary : colors.surface,
              }}
            />
            <Text
              style={{
                color: idx + 1 <= step ? colors.primary : colors.mutedForeground,
                fontSize: 10,
                fontWeight: "600",
              }}
            >
              {s}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 1 && (
          <>
            <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: "800" }}>
              Basic Info
            </Text>

            <View style={{ gap: 12 }}>
              <View>
                <Text style={{ color: colors.mutedForeground, fontSize: 13, fontWeight: "600", marginBottom: 6 }}>
                  Group Name *
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. 30-Day Squat Challenge"
                  placeholderTextColor={colors.mutedForeground}
                  style={{
                    color: colors.foreground,
                    fontSize: 16,
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                  }}
                />
              </View>

              <View>
                <Text style={{ color: colors.mutedForeground, fontSize: 13, fontWeight: "600", marginBottom: 6 }}>
                  Description (optional)
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe the challenge..."
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  style={{
                    color: colors.foreground,
                    fontSize: 15,
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    minHeight: 80,
                    textAlignVertical: "top",
                  }}
                />
              </View>
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: "800" }}>
              Challenge Type
            </Text>
            <View style={{ gap: 10 }}>
              {CHALLENGE_TYPES.map(({ key, label, Icon, color }) => (
                <Pressable
                  key={key}
                  onPress={() => setChallengeType(key)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    padding: 16,
                    borderRadius: 14,
                    backgroundColor:
                      challengeType === key
                        ? color + "20"
                        : pressed
                          ? colors.surface
                          : colors.card,
                    borderWidth: 1.5,
                    borderColor: challengeType === key ? color : colors.cardBorder,
                  })}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: color + "20",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={22} color={color} />
                  </View>
                  <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>
                    {label}
                  </Text>
                  {challengeType === key && (
                    <View
                      style={{
                        marginLeft: "auto",
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: color,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: "#fff", fontSize: 12, fontWeight: "800" }}>✓</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: "800" }}>
              Goal & Dates
            </Text>

            <View style={{ gap: 12 }}>
              <View>
                <Text style={{ color: colors.mutedForeground, fontSize: 13, fontWeight: "600", marginBottom: 6 }}>
                  Goal Description *
                </Text>
                <TextInput
                  value={goal}
                  onChangeText={setGoal}
                  placeholder={`e.g. Complete 30 ${selectedType.unit}`}
                  placeholderTextColor={colors.mutedForeground}
                  style={{
                    color: colors.foreground,
                    fontSize: 15,
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                  }}
                />
              </View>

              <View>
                <Text style={{ color: colors.mutedForeground, fontSize: 13, fontWeight: "600", marginBottom: 6 }}>
                  Target Value * ({selectedType.unit})
                </Text>
                <TextInput
                  value={targetValue}
                  onChangeText={setTargetValue}
                  keyboardType="numeric"
                  placeholder="30"
                  placeholderTextColor={colors.mutedForeground}
                  style={{
                    color: colors.foreground,
                    fontSize: 15,
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                  }}
                />
              </View>

              <View>
                <Text style={{ color: colors.mutedForeground, fontSize: 13, fontWeight: "600", marginBottom: 6 }}>
                  End Date (optional, YYYY-MM-DD)
                </Text>
                <TextInput
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="2026-05-31"
                  placeholderTextColor={colors.mutedForeground}
                  style={{
                    color: colors.foreground,
                    fontSize: 15,
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                  }}
                />
              </View>
            </View>
          </>
        )}

        {step === 4 && (
          <>
            <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: "800" }}>
              Group Settings
            </Text>

            <View style={{ gap: 14 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 13, fontWeight: "600" }}>
                Membership
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {([
                  { key: "open" as GroupMembership, label: "Open Join", Icon: Users },
                  { key: "invite_only" as GroupMembership, label: "Invite Only", Icon: Lock },
                ] as const).map(({ key, label, Icon }) => (
                  <Pressable
                    key={key}
                    onPress={() => setMembership(key)}
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: membership === key ? colors.primary + "20" : colors.surface,
                      borderWidth: 1.5,
                      borderColor: membership === key ? colors.primary : colors.cardBorder,
                    }}
                  >
                    <Icon size={16} color={membership === key ? colors.primary : colors.mutedForeground} />
                    <Text
                      style={{
                        color: membership === key ? colors.primary : colors.foreground,
                        fontSize: 13,
                        fontWeight: "700",
                      }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={{ color: colors.mutedForeground, fontSize: 13, fontWeight: "600" }}>
                Visibility
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {([
                  { key: "public" as GroupVisibility, label: "Public", Icon: Globe },
                  { key: "private" as GroupVisibility, label: "Private", Icon: Lock },
                ] as const).map(({ key, label, Icon }) => (
                  <Pressable
                    key={key}
                    onPress={() => setVisibility(key)}
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: visibility === key ? colors.primary + "20" : colors.surface,
                      borderWidth: 1.5,
                      borderColor: visibility === key ? colors.primary : colors.cardBorder,
                    }}
                  >
                    <Icon size={16} color={visibility === key ? colors.primary : colors.mutedForeground} />
                    <Text
                      style={{
                        color: visibility === key ? colors.primary : colors.foreground,
                        fontSize: 13,
                        fontWeight: "700",
                      }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Summary */}
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 14,
                padding: 14,
                gap: 8,
              }}
            >
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}>Summary</Text>
              <SummaryRow label="Name" value={name} colors={colors} />
              <SummaryRow label="Type" value={selectedType.label} colors={colors} />
              <SummaryRow label="Goal" value={`${targetValue} ${selectedType.unit} — ${goal}`} colors={colors} />
              <SummaryRow label="Membership" value={membership === "open" ? "Open" : "Invite only"} colors={colors} />
              <SummaryRow label="Visibility" value={visibility === "public" ? "Public" : "Private"} colors={colors} />
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom nav */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          paddingBottom: insets.bottom + 12,
          borderTopWidth: 1,
          borderTopColor: colors.cardBorder,
          flexDirection: "row",
          gap: 12,
        }}
      >
        {step > 1 && (
          <Pressable
            onPress={() => setStep((s) => (s - 1) as Step)}
            style={({ pressed }) => ({
              flex: 1,
              padding: 16,
              borderRadius: 14,
              alignItems: "center",
              backgroundColor: pressed ? colors.surface : colors.card,
              borderWidth: 1,
              borderColor: colors.cardBorder,
            })}
          >
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>Back</Text>
          </Pressable>
        )}

        {step < 4 ? (
          <Pressable
            onPress={() => canNext() && setStep((s) => (s + 1) as Step)}
            disabled={!canNext()}
            style={({ pressed }) => ({
              flex: 1,
              padding: 16,
              borderRadius: 14,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 6,
              backgroundColor:
                !canNext()
                  ? colors.muted
                  : pressed
                    ? colors.primary + "CC"
                    : colors.primary,
            })}
          >
            <Text
              style={{
                color: !canNext() ? colors.mutedForeground : colors.primaryForeground,
                fontSize: 16,
                fontWeight: "700",
              }}
            >
              Next
            </Text>
            <ChevronRight size={18} color={!canNext() ? colors.mutedForeground : colors.primaryForeground} />
          </Pressable>
        ) : (
          <Pressable
            onPress={handleCreate}
            disabled={creating}
            style={({ pressed }) => ({
              flex: 1,
              padding: 16,
              borderRadius: 14,
              alignItems: "center",
              backgroundColor: pressed ? colors.primary + "CC" : colors.primary,
            })}
          >
            {creating ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={{ color: colors.primaryForeground, fontSize: 16, fontWeight: "700" }}>
                Create Group
              </Text>
            )}
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function SummaryRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
      <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600", textAlign: "right", flex: 1 }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
