import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useThemeStore } from "@/stores/theme.store";

export default function EditWorkoutRedirectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isDark, colors } = useThemeStore();

  useEffect(() => {
    if (!id) {
      router.replace("/workouts");
      return;
    }

    router.replace({
      pathname: "/workouts/create",
      params: {
        mode: "edit",
        templateId: String(id),
      },
    });
  }, [id, router]);

  return (
    <View
      className="flex-1 items-center justify-center"
      style={{
        backgroundColor: isDark ? colors.background : colors.background,
      }}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      <Text className="mt-3 text-sm text-gray-600 dark:text-gray-400">
        Opening editor...
      </Text>
    </View>
  );
}
