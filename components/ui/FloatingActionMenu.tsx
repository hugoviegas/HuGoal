import React, { useRef, useState } from "react";
import {
  Animated,
  Pressable,
  Text,
  View,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plus } from "lucide-react-native";

type FloatingActionOption = {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
};

interface FloatingActionMenuProps {
  options: FloatingActionOption[];
  className?: string;
}

/**
 * FloatingActionMenu (refatorado)
 * - animação simples e robusta com Animated API
 * - evita interpolations complexas no useMemo
 * - fecha o menu após ação
 */
export function FloatingActionMenu({ options = [] }: FloatingActionMenuProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const toValue = open ? 0 : 1;
    Animated.spring(anim, {
      toValue,
      useNativeDriver: true,
      friction: 8,
      tension: 70,
    }).start();
    setOpen(!open);
  };

  const handleOptionPress = (fn: () => void) => {
    try {
      fn();
    } finally {
      Animated.timing(anim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }).start(() => setOpen(false));
    }
  };

  const rotation = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });
  const OFFSET = 64; // vertical gap between items

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: insets.bottom + 96 }]}
    >
      {/* Options stacked above the FAB */}
      {options.map((opt, i) => {
        const translateY = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -OFFSET * (i + 1)],
        });
        const opacity = anim.interpolate({
          inputRange: [0, 0.6, 1],
          outputRange: [0, 0.6, 1],
        });

        return (
          <Animated.View
            key={`${opt.label}-${i}`}
            pointerEvents={open ? "auto" : "none"}
            style={[styles.option, { transform: [{ translateY }], opacity }]}
          >
            <Pressable
              onPress={() => handleOptionPress(opt.onPress)}
              style={styles.optionButton}
            >
              <View style={styles.optionIcon}>{opt.icon}</View>
              <Text
                style={styles.optionLabel}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {opt.label}
              </Text>
            </Pressable>
          </Animated.View>
        );
      })}

      {/* FAB */}
      <View style={styles.fabContainer}>
        <Pressable
          onPress={toggle}
          style={styles.fabTouchable}
          accessibilityRole="button"
          accessibilityLabel="Open menu"
        >
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Plus size={24} color="#fff" />
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    right: 20,
    alignItems: "flex-end",
    zIndex: 1000,
  },
  option: {
    position: "absolute",
    right: 0,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Platform.OS === "ios" ? "rgba(17,17,17,0.9)" : "#111",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  optionLabel: {
    color: "#fff",
    marginLeft: 8,
    fontWeight: "600",
    maxWidth: 180,
  },
  optionIcon: {
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  fabContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  fabTouchable: {
    height: 56,
    width: 56,
    borderRadius: 28,
    backgroundColor: Platform.OS === "ios" ? "rgba(17,17,17,0.95)" : "#111",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
