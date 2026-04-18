import { Text, View } from "react-native";

import { NutritionLogCard } from "@/components/chat/cards/NutritionLogCard";
import { WorkoutResultCard } from "@/components/chat/cards/WorkoutResultCard";
import { radius, spacing, typography } from "@/constants/design-system";
import type { ChatMessage } from "@/stores/chat.store";
import { useThemeStore } from "@/stores/theme.store";

interface MessageRendererProps {
  message: ChatMessage;
}

export function MessageRenderer({ message }: MessageRendererProps) {
  const colors = useThemeStore((state) => state.colors);

  if (message.type === "nutrition_card") {
    return <NutritionLogCard items={message.payload} />;
  }

  if (message.type === "workout_card") {
    return <WorkoutResultCard template={message.payload} />;
  }

  const isUser = message.role === "user";

  return (
    <View
      style={{
        maxWidth: "88%",
        alignSelf: isUser ? "flex-end" : "flex-start",
        borderRadius: radius.lg,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderWidth: 1,
        borderColor: isUser ? colors.primary : colors.cardBorder,
        backgroundColor: isUser ? colors.primary : colors.background,
      }}
    >
      <Text
        style={{
          ...typography.small,
          color: isUser ? colors.primaryForeground : colors.foreground,
        }}
      >
        {message.text}
      </Text>
    </View>
  );
}
