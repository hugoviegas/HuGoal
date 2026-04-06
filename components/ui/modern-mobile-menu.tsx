import React, { useState, useRef, useEffect } from "react";
import { View, Pressable, Animated, Platform } from "react-native";
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
  profile: UserCircle,
};

const TAB_LABELS: Record<string, string> = {
  dashboard: "Home",
  workouts: "Workouts",
  nutrition: "Nutrition",
  community: "Community",
  profile: "Profile",
};

/**
 * ModernMobileMenu - Modern animated bottom tab bar with smooth color transition
 * Features:
 * - Smooth animations with fluid color transitions
 * - Modern material design
 * - Dark/light theme support
 * - Accessible (ARIA labels)
 * - Icon-only layout with animated background
 */
export function ModernMobileMenu({
  state,
  descriptors,
  navigation,
  items,
  accentColor,
}: ModernMobileMenuProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const isDark = useThemeStore((s) => s.isDark);
  const navbarVisible = useNavigationStore((s) => s.navbarVisible);

  // Animation setup
  const slideAnim = useRef(new Animated.Value(navbarVisible ? 0 : 120)).current;
  const opacityAnim = useRef(new Animated.Value(navbarVisible ? 1 : 0)).current;
  const activeIndexAnim = useRef(new Animated.Value(state.index)).current;

  const [activeIndex, setActiveIndex] = useState(state.index);

  // Handle navbar visibility
  useEffect(() => {
    const shouldUseNativeDriver = Platform.OS !== "web";

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: navbarVisible ? 0 : 120,
        duration: 300,
        useNativeDriver: shouldUseNativeDriver,
      }),
      Animated.timing(opacityAnim, {
        toValue: navbarVisible ? 1 : 0,
        duration: 250,
        useNativeDriver: shouldUseNativeDriver,
      }),
    ]).start();
  }, [navbarVisible, opacityAnim, slideAnim]);

  // Handle active tab changes with smooth animation
  useEffect(() => {
    if (state.index !== activeIndex) {
      setActiveIndex(state.index);
      const shouldUseNativeDriver = Platform.OS !== "web";

      Animated.timing(activeIndexAnim, {
        toValue: state.index,
        duration: 400,
        useNativeDriver: shouldUseNativeDriver,
      }).start();
    }
  }, [state.index, activeIndex, activeIndexAnim]);

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

  const borderColor = isDark ? "#333333" : "#e5e5e5";
  const inactiveColor = isDark ? "#888888" : "#666666";
  const activeColor = accentColor || colors.primary;

  // Measure container to calculate exact tab width for animation alignment
  const [containerWidth, setContainerWidth] = useState(0);
  const containerPaddingHorizontal = 8; // matches View paddingHorizontal
  const containerPaddingVertical = 8; // matches View paddingVertical
  const indicatorHorizontalInset = 6; // inner inset inside each tab for indicator

  const contentWidth = Math.max(
    0,
    containerWidth - containerPaddingHorizontal * 2,
  );
  const tabWidth = contentWidth > 0 ? contentWidth / state.routes.length : 0;
  const indicatorWidth =
    tabWidth > 0 ? Math.max(28, tabWidth - indicatorHorizontalInset * 2) : 0;
  const indicatorLeftBase =
    containerPaddingHorizontal + (tabWidth - indicatorWidth) / 2;

  return (
    <Animated.View
      style={{
        position: "absolute",
        bottom: insets.bottom + 12,
        left: 16,
        right: 16,
        pointerEvents: navbarVisible ? "auto" : "none",
        transform: [{ translateY: slideAnim }],
        opacity: opacityAnim,
      }}
    >
      <BlurView intensity={90} tint={isDark ? "dark" : "light"}>
        <View
          onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
          style={{
            flexDirection: "row",
            paddingHorizontal: 8,
            paddingVertical: 8,
            borderRadius: 24,
            borderWidth: 1,
            borderColor,
            backgroundColor: isDark
              ? "rgba(26, 26, 26, 0.8)"
              : "rgba(255, 255, 255, 0.8)",
            gap: 0,
            elevation: 12,
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowRadius: 12,
          }}
        >
          {/* Animated background indicator (render after we measured the container) */}
          {containerWidth > 0 && (
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: indicatorLeftBase,
                top: containerPaddingVertical,
                bottom: containerPaddingVertical,
                borderRadius: 16,
                backgroundColor: `${activeColor}12`,
                width: indicatorWidth,
                transform: [
                  {
                    translateX: activeIndexAnim.interpolate({
                      inputRange: Array.from(
                        { length: state.routes.length },
                        (_, i) => i,
                      ),
                      outputRange: Array.from(
                        { length: state.routes.length },
                        (_, i) => i * tabWidth,
                      ),
                    }),
                  },
                ],
              }}
            />
          )}
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const routeName = route.name.toLowerCase();
            const routeBase = routeName.split("/")[0];
            const label = TAB_LABELS[routeBase] ?? routeBase;
            const IconComponent = TAB_ICONS[routeBase];
            const itemColor = isFocused ? activeColor : inactiveColor;

            return (
              <Pressable
                key={route.key}
                onPress={() => handleItemPress(route, index)}
                onLongPress={() => handleItemLongPress(route)}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={`${label} tab`}
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 8,
                  paddingHorizontal: 4,
                  borderRadius: 16,
                  zIndex: 1,
                }}
              >
                {IconComponent && <IconComponent size={24} color={itemColor} />}
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </Animated.View>
  );
}

// Export as default for navigation config
export { ModernMobileMenu as TabBar };
export default ModernMobileMenu;
