import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Keyboard, PanResponder, Platform } from "react-native";

interface UseWorkoutChatPanelParams {
  insetsBottom: number;
  windowHeight: number;
}

interface UseWorkoutChatPanelResult {
  COLLAPSED_H: number;
  EXPANDED_H: number;
  panelHeight: Animated.Value;
  keyboardOffset: Animated.Value;
  composerBottomPadding: Animated.Value;
  panelExpanded: boolean;
  backdropOpacity: Animated.AnimatedInterpolation<number>;
  panelContentOpacity: Animated.AnimatedInterpolation<number>;
  panelPanHandlers: ReturnType<typeof PanResponder.create>["panHandlers"];
  openPanel: () => void;
  closePanel: () => void;
}

// SHARED PANEL HOOK PATTERN - mirrors useNutritionChatPanel. If panel behavior changes, update both hooks.
export function useWorkoutChatPanel({
  insetsBottom,
  windowHeight,
}: UseWorkoutChatPanelParams): UseWorkoutChatPanelResult {
  const COLLAPSED_H = insetsBottom + 160;
  const EXPAND_CONTENT_H = Math.min(420, Math.max(300, windowHeight * 0.48));
  const EXPANDED_H = COLLAPSED_H + EXPAND_CONTENT_H;

  const panelHeight = useRef(new Animated.Value(COLLAPSED_H)).current;
  const keyboardOffset = useRef(new Animated.Value(0)).current;
  const composerBottomPadding = useRef(new Animated.Value(80)).current;
  const [panelExpanded, setPanelExpanded] = useState(false);
  const panelExpandedRef = useRef(false);
  const panelBaseHRef = useRef(COLLAPSED_H);

  useEffect(() => {
    const nextHeight = panelExpandedRef.current ? EXPANDED_H : COLLAPSED_H;
    panelHeight.setValue(nextHeight);
  }, [COLLAPSED_H, EXPANDED_H, panelHeight]);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        const keyboardHeight = event.endCoordinates?.height ?? 0;
        const nextOffset = Math.max(0, keyboardHeight - insetsBottom);

        Animated.timing(keyboardOffset, {
          toValue: nextOffset,
          duration: Platform.OS === "ios" ? (event.duration ?? 250) : 220,
          useNativeDriver: false,
        }).start();

        Animated.timing(composerBottomPadding, {
          toValue: insetsBottom + 10,
          duration: Platform.OS === "ios" ? (event.duration ?? 250) : 220,
          useNativeDriver: false,
        }).start();

        if (!panelExpandedRef.current) {
          panelExpandedRef.current = true;
          setPanelExpanded(true);
          Animated.spring(panelHeight, {
            toValue: EXPANDED_H,
            useNativeDriver: false,
            bounciness: 4,
            speed: 12,
          }).start();
        }
      },
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        Animated.timing(keyboardOffset, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start();

        Animated.timing(composerBottomPadding, {
          toValue: 80,
          duration: 200,
          useNativeDriver: false,
        }).start();
      },
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [
    EXPANDED_H,
    insetsBottom,
    composerBottomPadding,
    keyboardOffset,
    panelHeight,
  ]);

  const backdropOpacity = panelHeight.interpolate({
    inputRange: [COLLAPSED_H, EXPANDED_H],
    outputRange: [0, 0.5],
    extrapolate: "clamp",
  });

  const panelContentOpacity = panelHeight.interpolate({
    inputRange: [
      COLLAPSED_H,
      COLLAPSED_H + EXPAND_CONTENT_H * 0.25,
      COLLAPSED_H + EXPAND_CONTENT_H * 0.65,
    ],
    outputRange: [0, 0, 1],
    extrapolate: "clamp",
  });

  const openPanel = useCallback(() => {
    panelExpandedRef.current = true;
    setPanelExpanded(true);
    Animated.spring(panelHeight, {
      toValue: EXPANDED_H,
      useNativeDriver: false,
      bounciness: 4,
      speed: 12,
    }).start();
  }, [EXPANDED_H, panelHeight]);

  const closePanel = useCallback(() => {
    panelExpandedRef.current = false;
    setPanelExpanded(false);
    Animated.spring(panelHeight, {
      toValue: COLLAPSED_H,
      useNativeDriver: false,
      bounciness: 4,
      speed: 12,
    }).start();
  }, [COLLAPSED_H, panelHeight]);

  const panelPanResponder = useMemo(() => {
    const CH = COLLAPSED_H;
    const EH = EXPANDED_H;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderGrant: () => {
        panelBaseHRef.current = panelExpandedRef.current ? EH : CH;
      },
      onPanResponderMove: (_, g) => {
        const newH = Math.max(CH, Math.min(EH, panelBaseHRef.current - g.dy));
        panelHeight.setValue(newH);
      },
      onPanResponderRelease: (_, g) => {
        const THRESHOLD = (EH - CH) * 0.3;
        let willExpand: boolean;

        if (panelExpandedRef.current) {
          willExpand = g.dy < THRESHOLD;
          if (g.vy > 0.5) {
            willExpand = false;
          }
        } else {
          willExpand = -g.dy > THRESHOLD;
          if (g.vy < -0.5) {
            willExpand = true;
          }
        }

        panelExpandedRef.current = willExpand;
        setPanelExpanded(willExpand);
        Animated.spring(panelHeight, {
          toValue: willExpand ? EH : CH,
          useNativeDriver: false,
          bounciness: 4,
          speed: 12,
        }).start();
      },
    });
  }, [COLLAPSED_H, EXPANDED_H, panelHeight]);

  return {
    COLLAPSED_H,
    EXPANDED_H,
    panelHeight,
    keyboardOffset,
    composerBottomPadding,
    panelExpanded,
    backdropOpacity,
    panelContentOpacity,
    panelPanHandlers: panelPanResponder.panHandlers,
    openPanel,
    closePanel,
  };
}
