import { Pressable, Text } from "react-native";
import { Heart } from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";

interface LikeButtonProps {
  count: number;
  liked: boolean;
  onPress: () => void;
  size?: "sm" | "md";
}

export function LikeButton({
  count,
  liked,
  onPress,
  size = "md",
}: LikeButtonProps) {
  const colors = useThemeStore((s) => s.colors);
  const iconSize = size === "sm" ? 16 : 20;
  const fontSize = size === "sm" ? 12 : 14;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: pressed
          ? liked
            ? "rgba(239,68,68,0.15)"
            : colors.surface
          : liked
            ? "rgba(239,68,68,0.10)"
            : "transparent",
      })}
    >
      <Heart
        size={iconSize}
        color={liked ? "#EF4444" : colors.mutedForeground}
        fill={liked ? "#EF4444" : "transparent"}
      />
      <Text
        style={{
          color: liked ? "#EF4444" : colors.mutedForeground,
          fontSize,
          fontWeight: liked ? "700" : "500",
        }}
      >
        {count}
      </Text>
    </Pressable>
  );
}
