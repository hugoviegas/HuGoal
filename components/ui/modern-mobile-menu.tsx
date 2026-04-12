import React, { useEffect, useState } from "react";
import { View, Pressable, Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { useThemeStore } from "@/stores/theme.store";
import { withOpacity } from "@/lib/color";
import { useNavigationStore } from "@/stores/navigation.store";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import {
  LayoutDashboard,
  Dumbbell,
  Utensils,
  Users,
} from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type IconComponentType = React.ElementType<{ size?: number; color?: string }>;

export interface ModernMenuItemProps {
  label: string;
  icon: IconComponentType;
}

export interface ModernMobileMenuProps extends BottomTabBarProps {
  items?: ModernMenuItemProps[];
  accentColor?: string;
}

const TAB_ICONS: Record<string, IconComponentType> = {
  dashboard: LayoutDashboard,
  workouts: Dumbbell,
  nutrition: Utensils,
  community: Users,
};

const TAB_LABELS: Record<string, string> = {
  dashboard: "Home",
  workouts: "Workouts",
  nutrition: "Nutrition",
  community: "Community",
};

const CORE_TABS = new Set(["dashboard", "workouts", "nutrition", "community"]);

export function ModernMobileMenu({
  state,
  descriptors,
  navigation,
  accentColor,
}: ModernMobileMenuProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const isDark = useThemeStore((s) => s.isDark);
  const navbarVisible = useNavigationStore((s) => s.navbarVisible);

  const slideAnim = useSharedValue(navbarVisible ? 0 : 120);
  const opacityAnim = useSharedValue(navbarVisible ? 1 : 0);
  const indicatorIndex = useSharedValue(state.index);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    slideAnim.value = withTiming(navbarVisible ? 0 : 120, { duration: 300 });
    opacityAnim.value = withTiming(navbarVisible ? 1 : 0, { duration: 250 });
  }, [navbarVisible, opacityAnim, slideAnim]);

  const visibleRoutes = state.routes.filter((route) => {
    const options = descriptors[route.key]?.options;
    const href = (options as { href?: string | null } | undefined)?.href;
    const routeBase = route.name.toLowerCase().split("/")[0];
    return href !== null && CORE_TABS.has(routeBase);
  });

  const activeRouteKey = state.routes[state.index]?.key;
  const activeVisibleIndex = Math.max(
    0,
    visibleRoutes.findIndex((route) => route.key === activeRouteKey),
  );

  useEffect(() => {
    indicatorIndex.value = withTiming(activeVisibleIndex, { duration: 220 });
  }, [activeVisibleIndex, indicatorIndex]);

  const handleItemPress = (
    route: BottomTabBarProps["state"]["routes"][number],
  ) => {
    const isFocused = activeRouteKey === route.key;
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  const handleItemLongPress = (
    route: BottomTabBarProps["state"]["routes"][number],
  ) => {
    navigation.emit({ type: "tabLongPress", target: route.key });
  };

  const borderColor = colors.tabBarBorder;
  const inactiveColor = colors.muted;
  const activeColor = accentColor || colors.primary;
  const surfaceBackground = colors.tabBar;
  const blurEnabled = Platform.OS !== "android";

  const containerPaddingHorizontal = 8;
  const containerPaddingVertical = 8;

  const contentWidth = Math.max(
    0,
    containerWidth - containerPaddingHorizontal * 2,
  );
  const tabCount = Math.max(1, visibleRoutes.length);
  const normalizedTabWidth = contentWidth > 0 ? contentWidth / tabCount : 0;
  const indicatorWidth =
    normalizedTabWidth > 0 ? Math.max(28, normalizedTabWidth - 12) : 0;
  const indicatorLeftBase =
    containerPaddingHorizontal + (normalizedTabWidth - indicatorWidth) / 2;

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideAnim.value }],
    opacity: opacityAnim.value,
  }));

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorIndex.value * normalizedTabWidth }],
  }));

  if (!navbarVisible) {
    return null;
  }

  const shadowStyle =
    Platform.OS === "web"
      ? ({
          boxShadow: isDark
            ? "0px 10px 24px rgba(0, 0, 0, 0.45)"
            : "0px 10px 24px rgba(15, 23, 42, 0.18)",
        } as const)
      : {
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0.36 : 0.16,
          shadowRadius: 16,
          elevation: 14,
        };

  const menuContent = (
    <View
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      style={[
        styles.menuRow,
        {
          borderColor,
          backgroundColor: surfaceBackground,
        },
      ]}
    >
      {containerWidth > 0 && (
        <Animated.View
          style={[
            {
              position: "absolute",
              left: indicatorLeftBase,
              top: containerPaddingVertical,
              bottom: containerPaddingVertical,
              borderRadius: 16,
              backgroundColor: withOpacity(activeColor, 0.07),
              width: indicatorWidth,
              pointerEvents: "none",
            },
            indicatorStyle,
          ]}
        />
      )}

      {visibleRoutes.map((route, index) => {
        const isFocused = activeRouteKey === route.key;
        const routeName = route.name.toLowerCase();
        const routeBase = routeName.split("/")[0];
        const label = TAB_LABELS[routeBase] ?? routeBase;
        const IconComponent = TAB_ICONS[routeBase];
        const itemColor = isFocused ? activeColor : inactiveColor;

        return (
          <Pressable
            key={route.key}
            onPress={() => handleItemPress(route)}
            onLongPress={() => handleItemLongPress(route)}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={`${label} tab`}
            style={styles.tabItem}
          >
            {IconComponent && <IconComponent size={24} color={itemColor} />}
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <Animated.View
      style={[
        styles.animatedContainer,
        {
          bottom: insets.bottom + 12,
          pointerEvents: navbarVisible ? "auto" : "none",
        },
        containerStyle,
      ]}
    >
      <View style={[styles.shadowShell, shadowStyle]}>
        {blurEnabled ? (
          <BlurView
            intensity={isDark ? 72 : 86}
            tint={isDark ? "dark" : "light"}
            style={styles.surfaceClip}
          >
            {menuContent}
          </BlurView>
        ) : (
          // Android: opaque background instead of blur — avoids semi-transparent rendering issues
          <View
            style={[
              styles.surfaceClip,
              { backgroundColor: colors.card },
            ]}
          >
            {menuContent}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  animatedContainer: {
    position: "absolute",
    left: 16,
    right: 16,
  },
  shadowShell: {
    borderRadius: 24,
    overflow: "visible",
  },
  surfaceClip: {
    borderRadius: 24,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    gap: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 16,
    zIndex: 1,
  },
});

export { ModernMobileMenu as TabBar };
export default ModernMobileMenu;
