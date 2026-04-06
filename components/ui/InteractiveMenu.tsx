import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Pressable,
  Text,
  Animated,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { useThemeStore } from "@/stores/theme.store";
import { useNavigationStore } from "@/stores/navigation.store";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import {
  LayoutDashboard,
  Dumbbell,
  Utensils,
  Users,
  UserCircle,
} from "lucide-react-native";

const TAB_ICONS: Record<string, (color: string) => React.ReactNode> = {
  dashboard: (color) => <LayoutDashboard size={22} color={color} />,
  workouts: (color) => <Dumbbell size={22} color={color} />,
  nutrition: (color) => <Utensils size={22} color={color} />,
  community: (color) => <Users size={22} color={color} />,
  profile: (color) => <UserCircle size={22} color={color} />,
};

const TAB_LABELS: Record<string, string> = {
  dashboard: "Home",
  workouts: "Workouts",
  nutrition: "Nutrition",
  community: "Community",
  profile: "Profile",
};

/**
 * InteractiveMenu - An animated, interactive bottom tab bar component
 * Features:
 * - Smooth slide up/down animations
 * - Dynamic icon and label display
 * - Customizable accent color
 * - Dark/light theme support
 * - Mobile-optimized (iOS/Android)
 * - Accessibility support
 */
export function InteractiveMenu({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const isDark = useThemeStore((s) => s.isDark);
  const navbarVisible = useNavigationStore((s) => s.navbarVisible);

  // Animation references
  const slideAnim = useRef(new Animated.Value(navbarVisible ? 0 : 110)).current;
  const opacityAnim = useRef(new Animated.Value(navbarVisible ? 1 : 0)).current;
  const activeIndicatorAnim = useRef(new Animated.Value(0)).current;

  // State for active item
  const [activeIndex, setActiveIndex] = useState(state.index);

  // Handle navbar visibility animation
  useEffect(() => {
    const shouldUseNativeDriver = Platform.OS !== "web";

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: navbarVisible ? 0 : 110,
        duration: 260,
        useNativeDriver: shouldUseNativeDriver,
      }),
      Animated.timing(opacityAnim, {
        toValue: navbarVisible ? 1 : 0,
        duration: 220,
        useNativeDriver: shouldUseNativeDriver,
      }),
    ]).start();
  }, [navbarVisible, opacityAnim, slideAnim]);

  // Handle active index changes with smooth animation
  useEffect(() => {
    if (state.index !== activeIndex) {
      setActiveIndex(state.index);
      const shouldUseNativeDriver = Platform.OS !== "web";

      Animated.timing(activeIndicatorAnim, {
        toValue: state.index,
        duration: 300,
        useNativeDriver: shouldUseNativeDriver,
      }).start();
    }
  }, [state.index, activeIndex, activeIndicatorAnim]);

  const handleItemPress = (route: any, index: number) => {
    const isFocused = state.index === index;
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  const handleItemLongPress = (route: any) => {
    navigation.emit({ type: "tabLongPress", target: route.key });
  };

  return (
    <Animated.View
      style={{
        pointerEvents: navbarVisible ? "auto" : "none",
        position: "absolute",
        bottom: insets.bottom + 12,
        left: 16,
        right: 16,
        borderRadius: 24,
        overflow: "hidden",
        elevation: 8,
        transform: [{ translateY: slideAnim }],
        opacity: opacityAnim,
        shadowColor: isDark ? "#000000" : "#000000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.4 : 0.12,
        shadowRadius: 12,
      }}
    >
      <BlurView intensity={80} tint={isDark ? "dark" : "light"}>
        <View
          style={{
            flexDirection: "row",
            paddingVertical: 10,
            paddingHorizontal: 4,
            borderWidth: 1,
            borderColor: colors.tabBarBorder,
            borderRadius: 24,
            backgroundColor: isDark ? "rgba(10, 10, 10, 0.5)" : "rgba(255, 255, 255, 0.5)",
          }}
        >
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const routeName = route.name.toLowerCase();
            const routeBase = routeName.split("/")[0];
            const color = isFocused ? colors.primary : colors.muted;
            const label = TAB_LABELS[routeBase] ?? routeBase;
            const icon = TAB_ICONS[routeBase]?.(color);

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : { selected: false }}
                accessibilityLabel={`${TAB_LABELS[routeBase] ?? routeBase} tab`}
                onPress={() => handleItemPress(route, index)}
                onLongPress={() => handleItemLongPress(route)}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 4,
                  gap: 3,
                  minHeight: 60,
                  justifyContent: "center",
                }}
              >
                {/* Icon Container */}
                <View
                  style={{
                    width: 28,
                    height: 28,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 8,
                    backgroundColor: isFocused
                      ? `${colors.primary}25`
                      : "transparent",
                  }}
                >
                  {icon}
                </View>

                {/* Label */}
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: isFocused ? "600" : "400",
                    color,
                    textTransform: "capitalize",
                  }}
                  numberOfLines={1}
                >
                  {label}
                </Text>

                {/* Active Indicator Dot */}
                {isFocused && (
                  <View
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: colors.primary,
                      marginTop: 2,
                    }}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </Animated.View>
  );
}

// Export for use in bottom tab navigator configuration
export { InteractiveMenu as TabBar };
