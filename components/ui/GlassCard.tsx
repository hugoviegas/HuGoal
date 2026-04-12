import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View, type ViewProps } from "react-native";
import { useThemeStore } from "@/stores/theme.store";
import { SafeView } from "@/components/ui/SafeView";

interface GlassCardProps extends ViewProps {
  intensity?: number;
  children: React.ReactNode;
}

export function GlassCard({
  intensity = 60,
  style,
  children,
  ...props
}: GlassCardProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = useThemeStore((s) => s.colors);

  if (Platform.OS === "android") {
    // Android: use opaque card color — semi-transparent glassBg without blur
    // renders poorly over dynamic content on Android
    const androidStyle = {
      backgroundColor: colors.card,
      borderColor: colors.cardBorder,
      elevation: 4,
      shadowColor: "#000",
    } as const;
    return (
      <View style={[styles.container, androidStyle, style]} {...props}>
        {children}
      </View>
    );
  }

  const baseCardStyle = {
    backgroundColor: colors.glassBg,
    borderColor: colors.glassBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: isDark ? 0.3 : 0.12,
    shadowRadius: 12,
  } as const;

  return (
    <BlurView
      intensity={intensity}
      tint={isDark ? "dark" : "light"}
      style={[styles.container, baseCardStyle, style]}
      {...props}
    >
      <SafeView>{children}</SafeView>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    padding: 16,
  },
});
