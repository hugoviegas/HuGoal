import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useThemeStore } from '@/stores/theme.store';
import { useAuthStore } from '@/stores/auth.store';
import { Avatar } from '@/components/ui/Avatar';
import { GlassCard } from '@/components/ui/GlassCard';
import { Settings } from 'lucide-react-native';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const profile = useAuthStore((s) => s.profile);
  const router = useRouter();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 100,
        paddingHorizontal: 16,
      }}
    >
      {/* Header row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.foreground }}>Profile</Text>
        <Pressable
          onPress={() => router.push('/settings')}
          style={{ padding: 8 }}
          hitSlop={8}
        >
          <Settings size={22} color={colors.foreground} />
        </Pressable>
      </View>

      {/* Profile card */}
      <GlassCard style={{ alignItems: 'center', paddingVertical: 24 }}>
        <View style={{ marginBottom: 12 }}>
          <Avatar
            uri={undefined}
            name={profile?.name}
            size="xl"
          />
        </View>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.foreground }}>
          {profile?.name ?? '—'}
        </Text>
        <Text style={{ fontSize: 14, color: colors.mutedForeground, marginTop: 4 }}>
          {profile?.email ?? '—'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 32, marginTop: 16 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.primary }}>
              {profile?.xp ?? 0}
            </Text>
            <Text style={{ fontSize: 11, color: colors.mutedForeground }}>XP</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.accent }}>
              {profile?.streak_current ?? 0}
            </Text>
            <Text style={{ fontSize: 11, color: colors.mutedForeground }}>Streak</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.foreground }}>
              {profile?.streak_longest ?? 0}
            </Text>
            <Text style={{ fontSize: 11, color: colors.mutedForeground }}>Best</Text>
          </View>
        </View>
      </GlassCard>
    </View>
  );
}
