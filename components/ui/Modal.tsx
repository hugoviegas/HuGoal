import React, { useEffect, useRef, useState } from "react";
import {
  Modal as RNModal,
  Pressable,
  type ModalProps as RNModalProps,
} from "react-native";
import { SafeView } from "@/components/ui/SafeView";
import { BlurView } from "expo-blur";
import { useThemeStore } from "@/stores/theme.store";
import { blurActiveElementOnWeb, restoreFocusOnWeb } from "@/lib/utils";

interface ModalProps extends Omit<RNModalProps, "children"> {
  children: React.ReactNode;
  onClose: () => void;
}

export function Modal({ children, onClose, visible, ...props }: ModalProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const [internalVisible, setInternalVisible] = useState<boolean>(false);

  useEffect(() => {
    if (typeof document === "undefined") {
      // Not running in browser — just mirror prop
      setInternalVisible(Boolean(visible));
      return;
    }

    if (visible) {
      try {
        prevFocusRef.current = document.activeElement as HTMLElement | null;
      } catch {
        prevFocusRef.current = null;
      }

      // Best-effort: blur before making the modal visible so that
      // any `aria-hidden` toggles will not hide a focused element.
      try {
        blurActiveElementOnWeb();
      } catch {
        // ignore
      }

      // Now reveal the underlying RN modal
      setInternalVisible(true);
      return;
    }

    // Closing: hide internal modal then restore focus
    setInternalVisible(false);
    if (prevFocusRef.current) {
      try {
        restoreFocusOnWeb(prevFocusRef.current);
      } catch {
        // ignore
      }
      prevFocusRef.current = null;
    }
  }, [visible]);

  return (
    <RNModal
      transparent
      animationType="fade"
      visible={internalVisible}
      {...props}
    >
      <Pressable
        className="flex-1 items-center justify-center"
        onPress={onClose}
      >
        <BlurView
          intensity={40}
          tint={isDark ? "dark" : "light"}
          className="absolute inset-0"
        />
        <Pressable onPress={(e) => e.stopPropagation()}>
          <SafeView
            style={{
              marginHorizontal: 24,
              maxWidth: 384,
              borderRadius: 16,
              backgroundColor: isDark ? "#1a1a1a" : "#ffffff",
              padding: 24,
              boxShadow: isDark
                ? "0px 10px 24px rgba(0, 0, 0, 0.35)"
                : "0px 10px 24px rgba(0, 0, 0, 0.15)",
              elevation: 8,
            }}
          >
            {children}
          </SafeView>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}
