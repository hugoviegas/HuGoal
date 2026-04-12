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
  const baseCardStyle = {
    backgroundColor: colors.glassBg,
    borderColor: colors.glassBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: isDark ? 0.3 : 0.12,
    shadowRadius: 12,
    elevation: 6,
  } as const;

  if (Platform.OS === "android") {
    return (
      <View style={[styles.container, baseCardStyle, style]} {...props}>
        <SafeView>{children}</SafeView>
      </View>
    );
  }

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
    borderColor: "rgba(255, 255, 255, 0.15)",
    overflow: "hidden",
    padding: 16,
  },
});
