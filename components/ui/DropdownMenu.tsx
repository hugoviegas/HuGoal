import React, { useRef, useState } from "react";
import {
  View,
  Pressable,
  Text,
  Modal,
  useWindowDimensions,
} from "react-native";
import { ChevronDown } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { useThemeStore } from "@/stores/theme.store";
import { cn } from "@/lib/utils";
import { blurActiveElementOnWeb } from "@/lib/utils";

interface DropdownItem {
  id: string;
  label: string;
  badge?: number;
  destructive?: boolean;
}

interface DropdownMenuProps {
  items: DropdownItem[];
  onSelect: (id: string) => void;
  trigger?: React.ReactNode;
  triggerClassName?: string;
  variant?: "default" | "outline";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  align?: "left" | "center" | "right";
  className?: string;
}

const sizeMap = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-2.5 text-base",
  lg: "px-5 py-3 text-lg",
};

/**
 * DropdownMenu - Context menu dropdown
 *
 * @example
 * <DropdownMenu
 *   items={[{id: 'edit', label: 'Edit'}, {id: 'delete', label: 'Delete', destructive: true}]}
 *   onSelect={handleSelect}
 *   trigger={<Text>Options</Text>}
 * />
 */
export function DropdownMenu({
  items,
  onSelect,
  trigger,
  triggerClassName,
  variant = "default",
  size = "md",
  disabled = false,
  align = "left",
  className,
}: DropdownMenuProps) {
  const triggerRef = useRef<View>(null);
  const { width: screenWidth } = useWindowDimensions();
  const [isOpen, setIsOpen] = useState(false);
  const [menuWidth, setMenuWidth] = useState(224);
  const [anchor, setAnchor] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const isDark = useThemeStore((s) => s.isDark);
  const mutedColor = isDark ? "#9ca3af" : "#6b7280";
  const textColor = isDark ? "#f3f4f6" : "#111827";
  const borderColor = isDark ? "#374151" : "#e5e7eb";

  const handleSelect = (id: string) => {
    onSelect(id);
    setIsOpen(false);
  };

  const openMenu = () => {
    // Ensure nothing in the background remains focused on web
    blurActiveElementOnWeb();
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setIsOpen(true);
    });
  };

  const menuTop = anchor.y + anchor.height + 8;
  const desiredLeft =
    align === "left"
      ? anchor.x
      : align === "center"
        ? anchor.x + anchor.width / 2 - menuWidth / 2
        : anchor.x + anchor.width - menuWidth;
  const menuLeft = Math.max(
    12,
    Math.min(desiredLeft, screenWidth - menuWidth - 12),
  );

  return (
    <View className={className}>
      <View ref={triggerRef} collapsable={false}>
        <Pressable
          disabled={disabled}
          onPress={openMenu}
          className={cn(
            "flex-row items-center justify-center gap-2",
            variant === "outline" &&
              "border border-gray-300 dark:border-gray-600 rounded-lg",
            sizeMap[size],
            disabled && "opacity-50",
            triggerClassName,
          )}
        >
          {trigger || (
            <>
              <Text style={{ color: textColor, fontWeight: "500" }}>Menu</Text>
              <ChevronDown size={14} color={mutedColor} />
            </>
          )}
        </Pressable>
      </View>

      <Modal transparent visible={isOpen} animationType="fade">
        <Pressable className="flex-1" onPress={() => setIsOpen(false)}>
          <BlurView
            intensity={30}
            tint={isDark ? "dark" : "light"}
            className="absolute inset-0"
          />
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: menuTop,
              left: menuLeft,
            }}
          >
            <View
              onLayout={(event) => {
                const measuredWidth = event.nativeEvent.layout.width;
                if (measuredWidth && measuredWidth !== menuWidth) {
                  setMenuWidth(measuredWidth);
                }
              }}
              style={{
                borderRadius: 16,
                overflow: "hidden",
                width: 224,
                backgroundColor: isDark ? "#111111" : "#ffffff",
                borderWidth: 1,
                borderColor,
                boxShadow: isDark
                  ? "0px 10px 24px rgba(0, 0, 0, 0.3)"
                  : "0px 10px 24px rgba(0, 0, 0, 0.12)",
                elevation: 8,
              }}
            >
              {items.map((item, idx) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleSelect(item.id)}
                  className={cn(
                    "flex-row items-center gap-3 px-4 py-3",
                    idx !== items.length - 1 && "border-b",
                    item.destructive
                      ? "bg-red-50 dark:bg-red-900/20"
                      : "bg-transparent",
                  )}
                  style={
                    idx !== items.length - 1
                      ? { borderBottomColor: borderColor }
                      : undefined
                  }
                >
                  <Text
                    className="flex-1 font-medium"
                    style={{
                      color: item.destructive
                        ? isDark
                          ? "#f87171"
                          : "#dc2626"
                        : textColor,
                    }}
                  >
                    {item.label}
                  </Text>
                  {item.badge !== undefined && (
                    <View className="bg-cyan-500 dark:bg-cyan-600 rounded-full px-2 py-1">
                      <Text className="text-white text-xs font-semibold">
                        {item.badge}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
