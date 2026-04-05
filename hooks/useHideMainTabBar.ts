import { useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigationStore } from "@/stores/navigation.store";

/**
 * Hides the main tab bar while the current screen is focused.
 * Restores visibility when the screen loses focus.
 */
export function useHideMainTabBar() {
  const setNavbarVisible = useNavigationStore((s) => s.setNavbarVisible);

  useFocusEffect(
    useCallback(() => {
      setNavbarVisible(false);
      return () => setNavbarVisible(true);
    }, [setNavbarVisible]),
  );
}
