import React, { useEffect, useRef, useState } from "react";
import {
  Modal as RNModal,
  Platform,
  Pressable,
  Text,
  View,
  useWindowDimensions,
  type ViewStyle,
} from "react-native";
import { SafeView } from "@/components/ui/SafeView";
import { BlurView } from "expo-blur";
import { useThemeStore } from "@/stores/theme.store";
import { blurActiveElementOnWeb, cn, restoreFocusOnWeb } from "@/lib/utils";

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  position?: "bottom" | "center";
  maxWidth?: number;
}

interface ResponsiveBlockProps {
  className?: string;
  children: React.ReactNode;
}

export function ResponsiveModal({
  open,
  onOpenChange,
  children,
  position = "bottom",
  maxWidth,
}: ResponsiveModalProps) {
  const { width } = useWindowDimensions();
  const isDark = useThemeStore((s) => s.isDark);
  const isMobile = width < 768;
  const colors = useThemeStore((s) => s.colors);

  const prevFocusRef = useRef<HTMLElement | null>(null);
  const [internalOpen, setInternalOpen] = useState<boolean>(false);

  const contentStyle: ViewStyle = {
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    borderRadius: isMobile ? 24 : 16,
    width: isMobile ? "100%" : Math.min(width - 48, maxWidth ?? 448),
    maxWidth: maxWidth ?? (isMobile ? undefined : 448),
    maxHeight: isMobile ? "88%" : "82%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDark ? 0.35 : 0.15,
    shadowRadius: 16,
    elevation: 8,
  };

  useEffect(() => {
    if (typeof document === "undefined") {
      setInternalOpen(Boolean(open));
      return;
    }

    if (open) {
      try {
        prevFocusRef.current = document.activeElement as HTMLElement | null;
      } catch {
        prevFocusRef.current = null;
      }

      try {
        blurActiveElementOnWeb();
      } catch {
        // ignore
      }

      setInternalOpen(true);
      return;
    }

    setInternalOpen(false);
    if (prevFocusRef.current) {
      try {
        restoreFocusOnWeb(prevFocusRef.current);
      } catch {
        // ignore
      }
      prevFocusRef.current = null;
    }
  }, [open]);

  return (
    <RNModal
      transparent
      animationType={isMobile ? "slide" : "fade"}
      visible={internalOpen}
      statusBarTranslucent
      hardwareAccelerated
      onRequestClose={() => onOpenChange(false)}
    >
      <Pressable
        style={{
          flex: 1,
          justifyContent:
            position === "center" ? "center" : isMobile ? "flex-end" : "center",
          alignItems: "center",
          paddingHorizontal: isMobile ? 0 : 24,
        }}
        onPress={() => onOpenChange(false)}
      >
        {Platform.OS === "android" ? (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: isDark
                ? "rgba(0, 0, 0, 0.56)"
                : "rgba(15, 23, 42, 0.24)",
            }}
          />
        ) : (
          <BlurView
            intensity={45}
            tint={isDark ? "dark" : "light"}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        )}

        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{ width: "100%", alignItems: "center" }}
        >
          <SafeView style={contentStyle}>{children}</SafeView>
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
  return <SafeView className={cn("px-5 py-4", className)}>{children}</SafeView>;
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
