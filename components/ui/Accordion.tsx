import { ReactNode, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";
import { cn } from "@/lib/utils";

export interface AccordionItem {
  id: string;
  title: string;
  subtitle?: string;
  content: ReactNode;
  accessory?: ReactNode;
  disabled?: boolean;
}

interface AccordionProps {
  items: AccordionItem[];
  defaultOpenIds?: string[];
  openIds?: string[];
  onOpenIdsChange?: (ids: string[]) => void;
  allowMultiple?: boolean;
  className?: string;
  itemClassName?: string;
}

export function Accordion({
  items,
  defaultOpenIds = [],
  openIds,
  onOpenIdsChange,
  allowMultiple = true,
  className,
  itemClassName,
}: AccordionProps) {
  const colors = useThemeStore((state) => state.colors);
  const [internalOpenIds, setInternalOpenIds] =
    useState<string[]>(defaultOpenIds);

  const activeOpenIds = openIds ?? internalOpenIds;

  const toggleItem = (itemId: string) => {
    const nextIds = allowMultiple
      ? activeOpenIds.includes(itemId)
        ? activeOpenIds.filter((id) => id !== itemId)
        : [...activeOpenIds, itemId]
      : activeOpenIds.includes(itemId)
        ? []
        : [itemId];

    if (openIds === undefined) {
      setInternalOpenIds(nextIds);
    }

    onOpenIdsChange?.(nextIds);
  };

  const renderedItems = useMemo(() => items, [items]);

  return (
    <View className={className}>
      {renderedItems.map((item) => {
        const isOpen = activeOpenIds.includes(item.id);

        return (
          <View
            key={item.id}
            className={cn(
              "overflow-hidden rounded-2xl border",
              itemClassName,
              isOpen
                ? "border-primary-400/50 bg-light-surface dark:bg-dark-surface"
                : "border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface",
            )}
          >
            <Pressable
              onPress={() => !item.disabled && toggleItem(item.id)}
              disabled={item.disabled}
              className="flex-row items-center justify-between gap-3 px-4 py-4"
            >
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {item.title}
                </Text>
                {item.subtitle ? (
                  <Text className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
                    {item.subtitle}
                  </Text>
                ) : null}
              </View>

              <View className="flex-row items-center gap-2">
                {item.accessory}
                <View
                  className={cn(
                    "h-8 w-8 items-center justify-center rounded-full border",
                    isOpen
                      ? "border-primary-400 bg-primary-50 dark:bg-primary-500/10"
                      : "border-light-border dark:border-dark-border",
                  )}
                >
                  <ChevronDown
                    size={16}
                    color={isOpen ? colors.primary : colors.muted}
                    style={{
                      transform: [{ rotate: isOpen ? "180deg" : "0deg" }],
                    }}
                  />
                </View>
              </View>
            </Pressable>

            {isOpen ? <View className="px-4 pb-4">{item.content}</View> : null}
          </View>
        );
      })}
    </View>
  );
}
