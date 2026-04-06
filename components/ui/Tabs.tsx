import React, { useState } from "react";
import { View, Pressable, Text, type ViewProps } from "react-native";
import { SafeView } from "@/components/ui/SafeView";
import { cn } from "@/lib/utils";

interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps extends ViewProps {
  items: TabItem[];
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  variant?: "default" | "line" | "button";
  size?: "sm" | "md" | "lg";
  children: React.ReactElement | React.ReactElement[];
  contentClassName?: string;
}

interface TabContentProps {
  value: string;
  children: React.ReactNode;
}

const tabSizeMap = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-2.5 text-base",
  lg: "px-5 py-3 text-lg",
};

const textSizeMap = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

const gapMap = {
  sm: "gap-1",
  md: "gap-2",
  lg: "gap-3",
};

/**
 * Tabs - Tabbed content component
 *
 * @example
 * <Tabs items={[{id: 'saved', label: 'Saved'}, {id: 'recent', label: 'Recent'}]}>
 *   <TabContent value="saved"><Text>Saved workouts</Text></TabContent>
 *   <TabContent value="recent"><Text>Recent workouts</Text></TabContent>
 * </Tabs>
 */
export function Tabs({
  items,
  defaultValue,
  onValueChange,
  variant = "default",
  size = "md",
  children,
  contentClassName,
  className,
  ...props
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(
    defaultValue || items[0]?.id || "",
  );

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    onValueChange?.(value);
  };

  const childArray = React.Children.toArray(children);

  const tabListClass = cn(
    "flex-row",
    variant === "default" && "bg-gray-100 dark:bg-gray-800 p-1 rounded-lg",
    variant === "line" && "border-b border-gray-200 dark:border-gray-700",
    variant === "button" && "",
    gapMap[size],
  );

  const tabTriggerClass = (isActive: boolean) =>
    cn(
      "flex-row items-center justify-center transition flex-shrink-0",
      tabSizeMap[size],
      variant === "default" && "rounded-md",
      variant === "button" && "rounded-md",
      variant === "line" && "rounded-none border-b-2",
      variant === "default" &&
        (isActive ? "bg-white dark:bg-gray-900" : "bg-transparent"),
      variant === "button" &&
        (isActive ? "bg-gray-100 dark:bg-gray-800" : "bg-transparent"),
      variant === "line" &&
        (isActive
          ? "border-cyan-500 dark:border-cyan-400"
          : "border-transparent"),
    );

  return (
    <View className={className} {...props}>
      {/* Tabs header (horizontally scrollable) */}
      <View className="overflow-x-auto whitespace-nowrap hide-scrollbar">
        <View className={tabListClass}>
          {items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => handleTabChange(item.id)}
              className={tabTriggerClass(activeTab === item.id)}
            >
              {item.icon ? (
                <View className="flex-row items-center gap-1.5">
                  {item.icon}
                  <Text
                    className={cn(
                      textSizeMap[size],
                      "font-medium",
                      activeTab === item.id
                        ? "text-cyan-600 dark:text-cyan-400"
                        : "text-gray-600 dark:text-gray-400",
                    )}
                  >
                    {item.label}
                  </Text>
                </View>
              ) : (
                <Text
                  className={cn(
                    textSizeMap[size],
                    "font-medium",
                    activeTab === item.id
                      ? "text-cyan-600 dark:text-cyan-400"
                      : "text-gray-600 dark:text-gray-400",
                  )}
                >
                  {item.label}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      </View>

      {/* Tabs content */}
      <View className={cn(contentClassName, "flex-1")} style={{ minHeight: 0 }}>
        {childArray.map((child) => {
          if (!React.isValidElement(child)) return null;
          const childProps = (child as React.ReactElement<any>).props;
          return childProps.value === activeTab ? child : null;
        })}
      </View>
    </View>
  );
}

/**
 * TabContent - Wrapper for tab content
 */
export function TabContent({ value, children }: TabContentProps) {
  return (
    <SafeView className="flex-1" style={{ minHeight: 0 }}>
      {children}
    </SafeView>
  );
}
