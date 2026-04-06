import { useEffect } from "react";
import type { ReactNode } from "react";
import { Platform, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
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
  const { width } = useWindowDimensions();
  const { progress } = useTabSwipeContext();
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateX.value = 0;
    progress.value = tabIndex;
  }, [progress, tabIndex, translateX]);

  if (Platform.OS === "web") {
    return <>{children}</>;
  }

  const goToTab = (nextIndex: number) => {
    if (nextIndex === tabIndex) {
      return;
    }

    router.navigate(TAB_ROUTES[nextIndex]);
  };

  const gesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-12, 12])
    .minDistance(8)
    .onUpdate((event) => {
      if (width <= 0) {
        return;
      }

      const dragX = clamp(event.translationX, -width, width);
      translateX.value = dragX;
      progress.value = clamp(tabIndex - dragX / width, 0, TAB_ROUTES.length - 1);
    })
    .onEnd((event) => {
      if (width <= 0) {
        translateX.value = 0;
        progress.value = tabIndex;
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
        runOnJS(goToTab)(nextIndex);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>{children}</Animated.View>
    </GestureDetector>
  );
}
