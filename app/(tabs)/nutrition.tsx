import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '@/stores/theme.store';

export default function NutritionScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + 16,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 48, marginBottom: 16 }}>🥗</Text>
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.foreground, marginBottom: 8 }}>
        Nutrition
      </Text>
      <Text style={{ fontSize: 15, color: colors.mutedForeground, textAlign: 'center' }}>
        Macro tracking, food logging, OCR scan, and AI meal analysis coming in Phase 5.
      </Text>
    </View>
  );
}
