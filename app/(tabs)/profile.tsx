import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalendarDays, Flame, PencilLine, Settings, Trophy } from "lucide-react-native";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { calculateAgeFromBirthDate, formatBirthDate } from "@/lib/profile-dates";
import { SwipeableTabScene } from "@/components/ui/SwipeableTabScene";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useThemeStore((s) => s.colors);
  const profile = useAuthStore((s) => s.profile);

  const age = calculateAgeFromBirthDate(profile?.birth_date);

  return (
    <SwipeableTabScene tabIndex={4}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 112,
          paddingHorizontal: 16,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View>
          <Text style={{ color: colors.foreground, fontSize: 24, fontWeight: "800" }}>
            Profile
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 2 }}>
            Your current profile summary.
          </Text>
        </View>

        <Pressable
          onPress={() => router.push("/settings")}
          accessibilityLabel="Open settings"
          style={({ pressed }) => ({
            height: 44,
            width: 44,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 14,
            backgroundColor: pressed ? colors.surface : colors.card,
            borderWidth: 1,
            borderColor: colors.cardBorder,
          })}
        >
          <Settings size={20} color={colors.foreground} />
        </Pressable>
      </View>

      <GlassCard style={{ padding: 18 }}>
        <View style={{ alignItems: "center", gap: 12 }}>
          <Avatar source={profile?.avatar_url} name={profile?.name} size="xl" />

          <View style={{ alignItems: "center", gap: 4 }}>
            <Text style={{ color: colors.foreground, fontSize: 22, fontWeight: "800" }}>
              {profile?.name ?? "Your profile"}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
              @{profile?.username ?? "username"}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
              {profile?.email ?? "Email not available"}
            </Text>
          </View>

          <Button
            variant="outline"
            size="sm"
            onPress={() => router.push("/settings/profile-edit")}
            className="mt-1"
          >
            Edit Profile
          </Button>
        </View>
      </GlassCard>

      <View style={{ flexDirection: "row", gap: 12 }}>
        {[
          { label: "XP", value: String(profile?.xp ?? 0), icon: Flame, color: colors.primary },
          { label: "Streak", value: String(profile?.streak_current ?? 0), icon: Trophy, color: colors.accent },
          { label: "Best", value: String(profile?.streak_longest ?? 0), icon: CalendarDays, color: colors.foreground },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <GlassCard key={item.label} style={{ flex: 1, padding: 14 }}>
              <View style={{ gap: 10 }}>
                <View
                  style={{
                    height: 38,
                    width: 38,
                    borderRadius: 12,
                    backgroundColor: colors.surface,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon size={18} color={item.color} />
                </View>
                <View>
                  <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: "800" }}>
                    {item.value}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 2 }}>
                    {item.label}
                  </Text>
                </View>
              </View>
            </GlassCard>
          );
        })}
      </View>

      <GlassCard style={{ padding: 16 }}>
        <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700", marginBottom: 12 }}>
          Profile details
        </Text>

        <View style={{ gap: 12 }}>
          <DetailRow label="Birth date" value={formatBirthDate(profile?.birth_date) || "Not set"} />
          <DetailRow label="Age" value={age !== null ? `${age} years old` : "Not set"} />
          <DetailRow label="Sex" value={profile?.sex ? profile.sex : "Not set"} />
          <DetailRow label="Goal" value={profile?.goal ? profile.goal : "Not set"} />
          <DetailRow label="Level" value={profile?.level ? profile.level : "Not set"} />
        </View>
      </GlassCard>

      <Pressable
        onPress={() => router.push("/settings/profile-edit")}
        style={({ pressed }) => ({
          borderRadius: 18,
          paddingVertical: 16,
          paddingHorizontal: 18,
          backgroundColor: pressed ? colors.primary + "1A" : colors.card,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        })}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              height: 38,
              width: 38,
              borderRadius: 12,
              backgroundColor: colors.surface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PencilLine size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "700" }}>
              Edit profile details
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 2 }}>
              Update your personal information and preferences.
            </Text>
          </View>
        </View>
      </Pressable>
      </ScrollView>
    </SwipeableTabScene>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const colors = useThemeStore((s) => s.colors);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <Text style={{ color: colors.mutedForeground, fontSize: 13, flex: 1 }}>{label}</Text>
      <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "700", textAlign: "right", flex: 1 }}>
        {value}
      </Text>
    </View>
  );
}
