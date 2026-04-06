import React, { createContext, useContext, useMemo } from "react";
import { useSharedValue, type SharedValue } from "react-native-reanimated";

interface TabSwipeContextValue {
  progress: SharedValue<number>;
}

const TabSwipeContext = createContext<TabSwipeContextValue | null>(null);

export function TabSwipeProvider({ children }: { children: React.ReactNode }) {
  const progress = useSharedValue(0);

  const value = useMemo(() => ({ progress }), [progress]);

  return (
    <TabSwipeContext.Provider value={value}>
      {children}
    </TabSwipeContext.Provider>
  );
}

export function useTabSwipeContext() {
  const context = useContext(TabSwipeContext);

  if (!context) {
    throw new Error("useTabSwipeContext must be used within TabSwipeProvider");
  }

  return context;
}
