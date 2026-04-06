import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Plus, Search, Trash2 } from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Spinner } from "@/components/ui/Spinner";

import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";

import {
  listFoodLibrary,
  deleteFoodLibraryItem,
} from "@/lib/firestore/nutrition";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { radius } from "@/constants/radius";
import type { FoodLibraryItem } from "@/types";

function LibraryItemCard({
  item,
  onDelete,
}: {
  item: FoodLibraryItem;
  onDelete: () => void;
}) {
  const colors = useThemeStore((s) => s.colors);

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        padding: spacing.md,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={[typography.bodyMedium, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        {item.brand ? (
          <Text
            style={[typography.caption, { color: colors.mutedForeground }]}
          >
            {item.brand}
          </Text>
        ) : null}
        <Text style={[typography.caption, { color: colors.mutedForeground }]}>
          {item.serving_size_g}g · {item.calories} kcal · P {item.protein_g}g
          · C {item.carbs_g}g · F {item.fat_g}g
        </Text>
      </View>

      <Pressable
        onPress={onDelete}
        hitSlop={8}
        style={{
          padding: 4,
          minWidth: 44,
          minHeight: 44,
          alignItems: "center",
          justifyContent: "center",
        }}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${item.name}`}
      >
        <Trash2 size={16} color={colors.destructive} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

export default function LibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.show);
  const colors = useThemeStore((s) => s.colors);

  const [foods, setFoods] = useState<FoodLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const loadLibrary = useCallback(async () => {
    if (!user?.uid) return;
    try {
      setLoading(true);
      setFoods(await listFoodLibrary(user.uid));
    } catch {
      showToast("Failed to load food library", "error");
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  useFocusEffect(
    useCallback(() => {
      loadLibrary();
    }, [loadLibrary]),
  );

  const handleDelete = async (itemId: string) => {
    try {
      await deleteFoodLibraryItem(itemId);
      setFoods((prev) => prev.filter((f) => f.id !== itemId));
      showToast("Food removed", "success");
    } catch {
      showToast("Failed to remove food", "error");
    }
  };

  const filtered = search.trim()
    ? foods.filter(
        (f) =>
          f.name.toLowerCase().includes(search.toLowerCase()) ||
          (f.brand ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : foods;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.sm,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.cardBorder,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={{
            width: 36,
            height: 36,
            alignItems: "center",
            justifyContent: "center",
          }}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <ArrowLeft size={22} color={colors.foreground} strokeWidth={2} />
        </Pressable>
        <Text style={[typography.h3, { color: colors.foreground, flex: 1 }]}>
          My Foods
        </Text>
        <Pressable
          onPress={() =>
            router.push({ pathname: "/nutrition/add-food", params: { mode: "library" } })
          }
          style={{
            width: 36,
            height: 36,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.primary,
            borderRadius: radius.sm,
          }}
          accessibilityRole="button"
          accessibilityLabel="Add new food"
        >
          <Plus size={20} color="#fff" strokeWidth={2.5} />
        </Pressable>
      </View>

      {/* Search bar */}
      <View
        style={{
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.cardBorder,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
        }}
      >
        <Search size={16} color={colors.muted} strokeWidth={2} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search foods…"
          placeholderTextColor={colors.muted}
          style={[
            typography.body,
            { flex: 1, color: colors.foreground, minHeight: 36 },
          ]}
          accessibilityLabel="Search foods"
          returnKeyType="search"
        />
      </View>

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Spinner size="lg" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <LibraryItemCard
              item={item}
              onDelete={() => handleDelete(item.id)}
            />
          )}
          contentContainerStyle={{
            paddingHorizontal: spacing.md,
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + 40,
            gap: spacing.sm,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View
              style={{
                alignItems: "center",
                paddingVertical: spacing.xl * 2,
              }}
            >
              <Text
                style={[
                  typography.body,
                  { color: colors.mutedForeground, textAlign: "center" },
                ]}
              >
                {search.trim()
                  ? `No foods match "${search}"`
                  : "No foods saved yet.\nTap + to add your first food."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
