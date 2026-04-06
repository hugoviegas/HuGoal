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
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";

import {
  listFoodLibrary,
  createFoodLibraryItem,
  deleteFoodLibraryItem,
} from "@/lib/firestore/nutrition";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { radius } from "@/constants/radius";
import type { FoodLibraryItem } from "@/types";

function AddFoodLibraryModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (item: Omit<FoodLibraryItem, "id" | "user_id" | "created_at">) => void;
}) {
  const colors = useThemeStore((s) => s.colors);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [serving, setServing] = useState("100");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  const reset = () => {
    setName("");
    setBrand("");
    setServing("100");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      brand: brand.trim() || undefined,
      serving_size_g: Number(serving) || 100,
      calories: Number(calories) || 0,
      protein_g: Number(protein) || 0,
      carbs_g: Number(carbs) || 0,
      fat_g: Number(fat) || 0,
    });
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <Text
        style={[
          typography.h3,
          { color: colors.foreground, marginBottom: spacing.md },
        ]}
      >
        Add to My Foods
      </Text>
      <View style={{ gap: spacing.sm }}>
        <Input
          label="Food name"
          placeholder="e.g. Chicken breast"
          value={name}
          onChangeText={setName}
        />
        <Input
          label="Brand (optional)"
          placeholder="e.g. Tyson"
          value={brand}
          onChangeText={setBrand}
        />
        <Input
          label="Serving size (g)"
          keyboardType="numeric"
          placeholder="100"
          value={serving}
          onChangeText={setServing}
        />
        <View style={{ flexDirection: "row", gap: spacing.xs }}>
          <View style={{ flex: 1 }}>
            <Input
              label="Calories"
              keyboardType="numeric"
              placeholder="0"
              value={calories}
              onChangeText={setCalories}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Protein (g)"
              keyboardType="numeric"
              placeholder="0"
              value={protein}
              onChangeText={setProtein}
            />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: spacing.xs }}>
          <View style={{ flex: 1 }}>
            <Input
              label="Carbs (g)"
              keyboardType="numeric"
              placeholder="0"
              value={carbs}
              onChangeText={setCarbs}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Fat (g)"
              keyboardType="numeric"
              placeholder="0"
              value={fat}
              onChangeText={setFat}
            />
          </View>
        </View>
      </View>
      <View
        style={{
          flexDirection: "row",
          gap: spacing.xs,
          marginTop: spacing.lg,
        }}
      >
        <View style={{ flex: 1 }}>
          <Button variant="outline" size="md" onPress={onClose}>
            Cancel
          </Button>
        </View>
        <View style={{ flex: 1 }}>
          <Button
            size="md"
            onPress={handleSave}
            disabled={!name.trim()}
          >
            Save
          </Button>
        </View>
      </View>
    </Modal>
  );
}

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
  const [addModalVisible, setAddModalVisible] = useState(false);

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

  const handleAdd = async (
    item: Omit<FoodLibraryItem, "id" | "user_id" | "created_at">,
  ) => {
    if (!user?.uid) return;
    try {
      const created = await createFoodLibraryItem(user.uid, item);
      setFoods((prev) => [created, ...prev]);
      showToast("Food saved to library", "success");
    } catch {
      showToast("Failed to save food", "error");
    }
  };

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
          onPress={() => setAddModalVisible(true)}
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

      <AddFoodLibraryModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSave={handleAdd}
      />
    </View>
  );
}
