import { Text, View } from "react-native";

import { NutritionReviewCard } from "@/components/chat/cards/NutritionReviewCard";
import { NutritionLogCard } from "@/components/chat/cards/NutritionLogCard";
import { WorkoutResultCard } from "@/components/chat/cards/WorkoutResultCard";
import { radius, spacing, typography } from "@/constants/design-system";
import type { ChatMessage } from "@/stores/chat.store";
import { useThemeStore } from "@/stores/theme.store";

interface MessageRendererProps {
  message: ChatMessage;
  onConfirmNutritionReview?: (messageId: string) => Promise<void>;
  onCancelNutritionReview?: (messageId: string) => void;
  onUpdateNutritionReviewItem?: (
    messageId: string,
    itemId: string,
    patch: Partial<import("@/lib/ai/nutritionChatAI").NutritionReviewItem>,
  ) => void;
  isReviewSubmitting?: boolean;
}

export function MessageRenderer({
  message,
  onConfirmNutritionReview,
  onCancelNutritionReview,
  onUpdateNutritionReviewItem,
  isReviewSubmitting = false,
}: MessageRendererProps) {
  const colors = useThemeStore((state) => state.colors);

  if (message.type === "nutrition_card") {
    return <NutritionLogCard items={message.payload} />;
  }

  if (message.type === "nutrition_review") {
    return (
      <NutritionReviewCard
        messageId={message.id}
        items={message.items}
        status={message.status}
        onConfirm={async (messageId) => {
          if (!onConfirmNutritionReview) {
            return;
          }

          await onConfirmNutritionReview(messageId);
        }}
        onCancel={(messageId) => {
          onCancelNutritionReview?.(messageId);
        }}
        onUpdateItem={(messageId, itemId, patch) => {
          onUpdateNutritionReviewItem?.(messageId, itemId, patch);
        }}
        isSubmitting={isReviewSubmitting}
      />
    );
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
