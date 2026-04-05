import React, { useState } from "react";
import { View, Pressable, Text, Modal } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { useThemeStore } from "@/stores/theme.store";
import { cn } from "@/lib/utils";

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
  const [isOpen, setIsOpen] = useState(false);
  const isDark = useThemeStore((s) => s.isDark);
  const mutedColor = isDark ? "#9ca3af" : "#6b7280";

  const handleSelect = (id: string) => {
    onSelect(id);
    setIsOpen(false);
  };

  return (
    <View className={className}>
      <Pressable
        disabled={disabled}
        onPress={() => setIsOpen(true)}
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
            <Text className="font-medium text-gray-900 dark:text-gray-100">
              Menu
            </Text>
            <ChevronDown size={14} color={mutedColor} />
          </>
        )}
      </Pressable>

      <Modal transparent visible={isOpen} animationType="fade">
        <Pressable className="flex-1" onPress={() => setIsOpen(false)}>
          <BlurView
            intensity={30}
            tint={isDark ? "dark" : "light"}
            className="absolute inset-0"
          />
          <View
            className={cn(
              "flex-1 justify-center",
              align === "left" && "items-start px-4",
              align === "center" && "items-center",
              align === "right" && "items-end px-4",
            )}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View
                style={{
                  borderRadius: 16,
                  overflow: 'hidden',
                  width: 224,
                  backgroundColor: isDark ? '#111111' : '#ffffff',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: isDark ? 0.3 : 0.12,
                  shadowRadius: 24,
                  elevation: 8,
                }}
              >
                {items.map((item, idx) => (
                  <Pressable
                    key={item.id}
                    onPress={() => handleSelect(item.id)}
                    className={cn(
                      "flex-row items-center gap-3 px-4 py-3",
                      idx !== items.length - 1 &&
                        "border-b border-gray-200 dark:border-gray-700",
                      item.destructive
                        ? "bg-red-50 dark:bg-red-900/20"
                        : "bg-transparent",
                    )}
                  >
                    <Text
                      className={cn(
                        "flex-1 font-medium",
                        item.destructive
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-900 dark:text-gray-100",
                      )}
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
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
