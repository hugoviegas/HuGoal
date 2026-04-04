import { BlurView } from 'expo-blur';
import { StyleSheet, type ViewProps } from 'react-native';
import { useThemeStore } from '@/stores/theme.store';

interface GlassCardProps extends ViewProps {
  intensity?: number;
  children: React.ReactNode;
}

export function GlassCard({ intensity = 60, style, children, ...props }: GlassCardProps) {
  const isDark = useThemeStore((s) => s.isDark);

  return (
    <BlurView
      intensity={intensity}
      tint={isDark ? 'dark' : 'light'}
      style={[styles.container, style]}
      {...props}
    >
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
    padding: 16,
  },
});
