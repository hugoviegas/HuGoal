import { View, Text, ScrollView, Pressable, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '@/stores/theme.store';
import { useAuthStore } from '@/stores/auth.store';
import { ArrowLeft, Moon, Sun, Globe, Info, LogOut, ChevronRight } from 'lucide-react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const isDark = useThemeStore((s) => s.isDark);
  const setMode = useThemeStore((s) => s.setMode);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/logout-feedback');
  };

  const Row = ({
    icon,
    label,
    onPress,
    right,
  }: {
    icon: React.ReactNode;
    label: string;
    onPress?: () => void;
    right?: React.ReactNode;
  }) => (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
      }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </View>
      <Text style={{ flex: 1, fontSize: 16, color: colors.foreground }}>{label}</Text>
      {right ?? <ChevronRight size={18} color={colors.muted} />}
    </Pressable>
  );

  const Separator = () => (
    <View style={{ height: 1, backgroundColor: colors.cardBorder, marginHorizontal: 16 }} />
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.mutedForeground, paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
      {title}
    </Text>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, marginBottom: 8 }}>
        <Pressable onPress={() => router.back()} style={{ padding: 4, marginLeft: -4 }}>
          <ArrowLeft size={24} color={colors.foreground} />
        </Pressable>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.foreground }}>Settings</Text>
      </View>

      {/* Appearance */}
      <SectionHeader title="Appearance" />
      <View style={{ backgroundColor: colors.card, borderRadius: 16, marginHorizontal: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder }}>
        <Row
          icon={isDark ? <Moon size={18} color={colors.primary} /> : <Sun size={18} color={colors.primary} />}
          label="Dark Mode"
          right={
            <Switch
              value={isDark}
              onValueChange={(v) => setMode(v ? 'dark' : 'light')}
              trackColor={{ true: colors.primary, false: colors.muted }}
              thumbColor="#fff"
            />
          }
        />
      </View>

      {/* Language */}
      <SectionHeader title="Language" />
      <View style={{ backgroundColor: colors.card, borderRadius: 16, marginHorizontal: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder }}>
        <Row
          icon={<Globe size={18} color={colors.accent} />}
          label="Language"
          onPress={() => {/* Phase 10 */}}
        />
      </View>

      {/* About */}
      <SectionHeader title="About" />
      <View style={{ backgroundColor: colors.card, borderRadius: 16, marginHorizontal: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder }}>
        <Row
          icon={<Info size={18} color={colors.foreground} />}
          label="About BetterU"
          onPress={() => router.push('/settings/about')}
        />
      </View>

      {/* Account */}
      <SectionHeader title="Account" />
      <View style={{ backgroundColor: colors.card, borderRadius: 16, marginHorizontal: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder }}>
        <Row
          icon={<LogOut size={18} color={colors.destructive} />}
          label="Log Out"
          onPress={handleLogout}
          right={null}
        />
      </View>
    </ScrollView>
  );
}
