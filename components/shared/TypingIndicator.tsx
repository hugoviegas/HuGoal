import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { Sparkles } from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";
import { spacing } from "@/constants/spacing";

export function TypingIndicator() {
  const colors = useThemeStore((s) => s.colors);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dotAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    const loops = dotAnims.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 150),
          Animated.timing(anim, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
      ),
    );

    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [dotAnims, fadeAnim]);

  return (
    <Animated.View
      style={{ opacity: fadeAnim, flexDirection: "row", alignItems: "flex-end", gap: spacing.xs }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: `${colors.primary}22`,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Sparkles size={14} color={colors.primary} />
      </View>

      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 18,
          borderBottomLeftRadius: 4,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
        }}
      >
        {dotAnims.map((anim, idx) => (
          <Animated.View
            key={`typing-dot-${idx}`}
            style={{
              width: 7,
              height: 7,
              borderRadius: 3.5,
              backgroundColor: colors.mutedForeground,
              transform: [{ translateY: anim }],
            }}
          />
        ))}
      </View>
    </Animated.View>
  );
}
