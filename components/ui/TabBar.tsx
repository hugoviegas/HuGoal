import React, { useEffect, useRef } from "react";
import { View, Pressable, Text, Animated } from "react-native";
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

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const isDark = useThemeStore((s) => s.isDark);
  const navbarVisible = useNavigationStore((s) => s.navbarVisible);
  const slideAnim = useRef(new Animated.Value(navbarVisible ? 0 : 110)).current;
  const opacityAnim = useRef(new Animated.Value(navbarVisible ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: navbarVisible ? 0 : 110,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: navbarVisible ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [navbarVisible, opacityAnim, slideAnim]);

  return (
    <Animated.View
      pointerEvents={navbarVisible ? "auto" : "none"}
      style={{
        position: "absolute",
        bottom: insets.bottom + 12,
        left: 16,
        right: 16,
        borderRadius: 24,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.4 : 0.12,
        shadowRadius: 12,
        elevation: 8,
        transform: [{ translateY: slideAnim }],
        opacity: opacityAnim,
      }}
    >
      <BlurView
        intensity={80}
        tint={isDark ? "dark" : "light"}
        style={{
          flexDirection: "row",
          paddingVertical: 10,
          paddingHorizontal: 4,
          borderWidth: 1,
          borderColor: colors.tabBarBorder,
          borderRadius: 24,
        }}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const routeName = route.name.toLowerCase();
          const routeBase = routeName.split("/")[0];
          const color = isFocused ? colors.primary : colors.muted;
          const label = TAB_LABELS[routeBase] ?? routeBase;
          const icon = TAB_ICONS[routeBase]?.(color);

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: "tabLongPress", target: route.key });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: 4,
                gap: 3,
              }}
            >
              {icon}
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: isFocused ? "600" : "400",
                  color,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </BlurView>
    </Animated.View>
  );
}
