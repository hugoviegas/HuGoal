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
  const { progress, isSwiping } = useTabSwipeContext();
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

    router.replace(TAB_ROUTES[nextIndex]);
  };

  const gesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-12, 12])
    .onBegin(() => {
      isSwiping.value = true;
    })
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
        isSwiping.value = false;
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
      const targetOffset = (tabIndex - nextIndex) * width;

      translateX.value = withTiming(targetOffset, { duration: 220 }, (finished) => {
        if (finished) {
          runOnJS(goToTab)(nextIndex);
        }
        isSwiping.value = false;
      });

      progress.value = withTiming(nextIndex, { duration: 220 });
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
