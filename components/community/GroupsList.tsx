import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useThemeStore } from "@/stores/theme.store";
import { GroupCard } from "@/components/community/GroupCard";
import type { CommunityGroup } from "@/types";

interface Props {
  groups: CommunityGroup[];
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onPress: (group: CommunityGroup) => void;
  emptyMessage?: string;
  emptyAction?: { label: string; onPress: () => void };
  contentPaddingBottom?: number;
}

export function GroupsList({
  groups,
  loading = false,
  refreshing = false,
  onRefresh,
  onPress,
  emptyMessage = "Nenhum grupo encontrado",
  emptyAction,
  contentPaddingBottom = 120,
}: Props) {
  const colors = useThemeStore((s) => s.colors);

  if (loading && groups.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={groups}
      keyExtractor={(g) => g.id}
      contentContainerStyle={{
        padding: 16,
        gap: 12,
        paddingBottom: contentPaddingBottom,
      }}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        ) : undefined
      }
      ListEmptyComponent={
        <View style={{ alignItems: "center", paddingTop: 48, gap: 12 }}>
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 16,
              fontWeight: "600",
              textAlign: "center",
            }}
          >
            {emptyMessage}
          </Text>
          {emptyAction && (
            <Pressable
              onPress={emptyAction.onPress}
              style={({ pressed }) => ({
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 14,
                backgroundColor: pressed
                  ? colors.primary + "CC"
                  : colors.primary,
              })}
            >
              <Text
                style={{
                  color: colors.primaryForeground,
                  fontSize: 15,
                  fontWeight: "700",
                }}
              >
                {emptyAction.label}
              </Text>
            </Pressable>
          )}
        </View>
      }
      renderItem={({ item }) => (
        <GroupCard group={item} onPress={() => onPress(item)} />
      )}
      showsVerticalScrollIndicator={false}
    />
  );
}
