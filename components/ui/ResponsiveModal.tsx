import {
  Modal as RNModal,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/theme.store";

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface ResponsiveBlockProps {
  className?: string;
  children: React.ReactNode;
}

export function ResponsiveModal({
  open,
  onOpenChange,
  children,
}: ResponsiveModalProps) {
  const { width } = useWindowDimensions();
  const isDark = useThemeStore((s) => s.isDark);
  const isMobile = width < 768;
  const colors = useThemeStore((s) => s.colors);

  const contentStyle = {
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: isDark ? colors.border : colors.border,
    backgroundColor: isDark ? colors.card : colors.card,
    borderRadius: isMobile ? 24 : 16,
    marginHorizontal: isMobile ? 0 : 24,
    width: '100%',
    maxWidth: isMobile ? undefined : 448,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: isDark ? 0.35 : 0.15,
    shadowRadius: 24,
    elevation: 8,
  };

  return (
    <RNModal
      transparent
      animationType={isMobile ? 'slide' : 'fade'}
      visible={open}
      onRequestClose={() => onOpenChange(false)}
    >
      <Pressable
        style={{
          flex: 1,
          justifyContent: isMobile ? 'flex-end' : 'center',
          alignItems: isMobile ? 'center' : 'center',
        }}
        onPress={() => onOpenChange(false)}
      >
        <BlurView
          intensity={45}
          tint={isDark ? 'dark' : 'light'}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />

        <Pressable onPress={(event) => event.stopPropagation()}>
          <View style={contentStyle}>{children}</View>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

export function ResponsiveModalHeader({
  className,
  children,
}: ResponsiveBlockProps) {
  return (
    <View
      className={cn(
        "px-5 pt-5 pb-3 border-b border-light-border dark:border-dark-border",
        className,
      )}
    >
      {children}
    </View>
  );
}

export function ResponsiveModalTitle({
  className,
  children,
}: ResponsiveBlockProps) {
  return (
    <Text
      className={cn(
        "text-lg font-semibold text-gray-900 dark:text-gray-100",
        className,
      )}
    >
      {children}
    </Text>
  );
}

export function ResponsiveModalDescription({
  className,
  children,
}: ResponsiveBlockProps) {
  return (
    <View className={cn("mt-1", className)}>
      <View>
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          {children}
        </Text>
      </View>
    </View>
  );
}

export function ResponsiveModalBody({
  className,
  children,
}: ResponsiveBlockProps) {
  return <View className={cn("px-5 py-4", className)}>{children}</View>;
}

export function ResponsiveModalFooter({
  className,
  children,
}: ResponsiveBlockProps) {
  return (
    <View
      className={cn(
        "flex-row gap-3 border-t border-light-border dark:border-dark-border px-5 py-4",
        className,
      )}
    >
      {children}
    </View>
  );
}
