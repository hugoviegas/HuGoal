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
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
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
  const prefetchedRoutesRef = useRef(new Set<string>());
  const isNavigating = useSharedValue(false);
  const gestureActive = useSharedValue(false);
  const prefetchHintIndex = useSharedValue(-1);

  const prefetchTabRoute = (index: number) => {
    const route = TAB_ROUTES[index];
    if (!route || prefetchedRoutesRef.current.has(route)) {
      return;
    }

    prefetchedRoutesRef.current.add(route);
    router.prefetch(route);
  };

  const navigateToTab = (nextIndex: number) => {
    if (nextIndex === tabIndex || isNavigatingRef.current) {
      isNavigating.value = false;
      return;
    }

    isNavigatingRef.current = true;
    router.navigate(TAB_ROUTES[nextIndex]);
  };

  useEffect(() => {
    isNavigatingRef.current = false;
    isNavigating.value = false;
    gestureActive.value = false;
    prefetchHintIndex.value = -1;
    cancelAnimation(translateX);
    cancelAnimation(progress);
    translateX.value = 0;
    progress.value = withTiming(tabIndex, { duration: 160 });
  }, [gestureActive, isNavigating, prefetchHintIndex, progress, tabIndex, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (Platform.OS === "web" || !isFocused) {
    return <>{children}</>;
  }

  const gesture = Gesture.Pan()
    .enabled(isFocused)
    .activeOffsetX([-12, 12])
    .failOffsetY([-12, 12])
    .minDistance(10)
    .onBegin(() => {
      gestureActive.value = true;
      prefetchHintIndex.value = -1;
      cancelAnimation(translateX);
      cancelAnimation(progress);
    })
    .onUpdate((event) => {
      if (width <= 0 || !Number.isFinite(width) || isNavigating.value) {
        return;
      }

      const absX = Math.abs(event.translationX);
      const absY = Math.abs(event.translationY);

      // Ignore vertical drags to avoid accidental tab changes/crashes.
      if (absY > absX * 1.15) {
        return;
      }

      const dragX = clamp(event.translationX, -width, width);
      if (!Number.isFinite(dragX)) {
        return;
      }

      let candidateIndex = -1;
      if (dragX > 18) {
        candidateIndex = tabIndex - 1;
      } else if (dragX < -18) {
        candidateIndex = tabIndex + 1;
      }

      if (
        candidateIndex >= 0 &&
        candidateIndex < TAB_ROUTES.length &&
        candidateIndex !== prefetchHintIndex.value
      ) {
        prefetchHintIndex.value = candidateIndex;
        runOnJS(prefetchTabRoute)(candidateIndex);
      }

      translateX.value = dragX;
      progress.value = clamp(tabIndex - dragX / width, 0, TAB_ROUTES.length - 1);
    })
    .onEnd((event) => {
      gestureActive.value = false;

      if (width <= 0 || !Number.isFinite(width) || isNavigating.value) {
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
      translateX.value = withSpring(0, {
        stiffness: 280,
        damping: 28,
        mass: 0.8,
      });
      progress.value = withTiming(nextIndex, { duration: 170 });

      if (nextIndex !== tabIndex) {
        isNavigating.value = true;
        runOnJS(navigateToTab)(nextIndex);
      }
    })
    .onFinalize(() => {
      gestureActive.value = false;
      if (!isNavigating.value) {
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
