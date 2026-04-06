import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Platform, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useTabSwipeContext } from "@/components/ui/tab-swipe-context";

const TAB_ROUTES = ["/dashboard", "/workouts", "/nutrition", "/community", "/profile"];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

interface SwipeableTabSceneProps {
  tabIndex: number;
  children: ReactNode;
}

export function SwipeableTabScene({ tabIndex, children }: SwipeableTabSceneProps) {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { width } = useWindowDimensions();
  const { progress } = useTabSwipeContext();
  const translateX = useSharedValue(0);
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    isNavigatingRef.current = false;
    translateX.value = 0;
    progress.value = tabIndex;
  }, [progress, tabIndex, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (Platform.OS === "web" || !isFocused) {
    return <>{children}</>;
  }

  const goToTab = (nextIndex: number) => {
    if (nextIndex === tabIndex) {
      return;
    }

    router.navigate(TAB_ROUTES[nextIndex]);
  };

  const gesture = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-20, 20])
    .failOffsetY([-10, 10])
    .minDistance(10)
    .onUpdate((event) => {
      if (width <= 0 || isNavigatingRef.current) {
        return;
      }

      const absX = Math.abs(event.translationX);
      const absY = Math.abs(event.translationY);

      // Ignore vertical drags to avoid accidental tab changes/crashes.
      if (absY > absX * 1.15) {
        return;
      }

      const dragX = clamp(event.translationX, -width, width);
      translateX.value = dragX;
      progress.value = clamp(tabIndex - dragX / width, 0, TAB_ROUTES.length - 1);
    })
    .onEnd((event) => {
      if (width <= 0 || isNavigatingRef.current) {
        translateX.value = 0;
        progress.value = tabIndex;
        return;
      }

      const absX = Math.abs(event.translationX);
      const absY = Math.abs(event.translationY);

      // Vertical interaction should never trigger tab navigation.
      if (absX < 18 || absY > absX * 1.15) {
        translateX.value = withTiming(0, { duration: 180 });
        progress.value = withTiming(tabIndex, { duration: 180 });
        return;
      }

      const projected = translateX.value + event.velocityX * 0.16;
      const threshold = width * 0.22;
      let nextIndex = tabIndex;

      if (projected > threshold) {
        nextIndex = tabIndex - 1;
      } else if (projected < -threshold) {
        nextIndex = tabIndex + 1;
      }

      nextIndex = clamp(nextIndex, 0, TAB_ROUTES.length - 1);
      // Always snap the current scene back; navigation happens on JS safely.
      translateX.value = withTiming(0, { duration: 180 });
      progress.value = withTiming(nextIndex, { duration: 180 });

      if (nextIndex !== tabIndex) {
        isNavigatingRef.current = true;
        goToTab(nextIndex);
      }
    })
    .onFinalize(() => {
      if (!isNavigatingRef.current) {
        translateX.value = withTiming(0, { duration: 150 });
        progress.value = withTiming(tabIndex, { duration: 150 });
      }
    });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>{children}</Animated.View>
    </GestureDetector>
  );
}
