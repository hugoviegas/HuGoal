import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "@react-navigation/native";
import {
  Camera,
  ChevronLeft,
  Plus,
  Search,
  Sparkles,
  Sun,
  Trash2,
  UtensilsCrossed,
} from "lucide-react-native";

import { Spinner } from "@/components/ui/Spinner";
import { NutritionTableModal } from "@/components/nutrition/NutritionTableModal";
import { radius } from "@/constants/radius";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import {
  useFoodLibrary,
  type FoodLibraryViewItem,
} from "@/hooks/useFoodLibrary";
import { analyzeMealPhoto } from "@/lib/nutrition-ai";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import type { NutritionItem } from "@/types";

function toPerServing(per100: number, servingSize: number): number {
  const serving = servingSize > 0 ? servingSize : 100;
  if (!Number.isFinite(per100)) {
    return 0;
  }

  return Math.round((per100 / 100) * serving);
}

function toPer100(servingValue: number, servingSize: number): number {
  const serving = servingSize > 0 ? servingSize : 100;
  if (!Number.isFinite(servingValue)) {
    return 0;
  }

  return Math.max(0, Math.round((servingValue / serving) * 100 * 100) / 100);
}

function toNutritionItem(item: FoodLibraryViewItem): NutritionItem {
  return {
    food_name: item.name,
    brand: item.brand,
    source: "manual",
    serving_size_g: item.serving_size_g,
    calories: toPerServing(item.calories_per_100g, item.serving_size_g),
    protein_g: toPerServing(item.protein_per_100g, item.serving_size_g),
    carbs_g: toPerServing(item.carbs_per_100g, item.serving_size_g),
    fat_g: toPerServing(item.fat_per_100g, item.serving_size_g),
    fiber_g: 0,
    sugar_g: 0,
  };
}

function AITipsModal({
  visible,
  onClose,
  onCamera,
  onGallery,
  insetBottom,
}: {
  visible: boolean;
  onClose: () => void;
  onCamera: () => void;
  onGallery: () => void;
  insetBottom: number;
}) {
  const colors = useThemeStore((s) => s.colors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
          }}
          onPress={onClose}
        />

        <View
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: spacing.xl,
            paddingBottom: insetBottom + spacing.xl,
            gap: spacing.lg,
          }}
        >
          <View style={{ alignItems: "center", marginTop: -spacing.md }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.muted,
              }}
            />
          </View>

          <Text style={[typography.h3, { color: colors.foreground }]}>
            Photo tips for best results
          </Text>

          {[
            {
              icon: <Camera size={20} color={colors.primary} />,
              tip: "Lay food flat or at eye level",
            },
            {
              icon: <Sun size={20} color={colors.primary} />,
              tip: "Good lighting, no blur",
            },
            {
              icon: <UtensilsCrossed size={20} color={colors.primary} />,
              tip: "One plate at a time",
            },
          ].map((row, index) => (
            <View
              key={index}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.md,
              }}
            >
              {row.icon}
              <Text
                style={[typography.body, { color: colors.foreground, flex: 1 }]}
              >
                {row.tip}
              </Text>
            </View>
          ))}

          <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
            <Pressable
              onPress={onCamera}
              style={{
                minHeight: 48,
                borderRadius: radius.md,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={[
                  typography.bodyMedium,
                  { color: colors.primaryForeground },
                ]}
              >
                Take photo
              </Text>
            </Pressable>
            <Pressable
              onPress={onGallery}
              style={{
                minHeight: 48,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                backgroundColor: colors.card,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={[typography.bodyMedium, { color: colors.foreground }]}
              >
                Choose from gallery
              </Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              style={{ alignItems: "center", paddingVertical: spacing.sm }}
            >
              <Text
                style={[typography.body, { color: colors.mutedForeground }]}
              >
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function FoodCard({
  item,
  onOpen,
  onDelete,
}: {
  item: FoodLibraryViewItem;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const colors = useThemeStore((s) => s.colors);

  return (
    <Pressable
      onPress={onOpen}
      style={{
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        padding: spacing.sm,
        gap: spacing.xs,
      }}
    >
      <View
        style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}
      >
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <UtensilsCrossed size={22} color={colors.muted} />
        </View>

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
              numberOfLines={1}
            >
              {item.brand}
            </Text>
          ) : null}
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>
            Per 100g: {Math.round(item.calories_per_100g)} kcal
          </Text>
        </View>

        <Pressable
          onPress={onDelete}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.destructive,
            backgroundColor: `${colors.destructive}11`,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Trash2 size={16} color={colors.destructive} />
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <View
          style={{
            flex: 1,
            borderRadius: radius.md,
            backgroundColor: `${colors.primary}14`,
            paddingVertical: 8,
            alignItems: "center",
          }}
        >
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>
            Protein
          </Text>
          <Text style={[typography.smallMedium, { color: colors.foreground }]}>
            {item.protein_per_100g}g
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            borderRadius: radius.md,
            backgroundColor: `${colors.primary}14`,
            paddingVertical: 8,
            alignItems: "center",
          }}
        >
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>
            Carbs
          </Text>
          <Text style={[typography.smallMedium, { color: colors.foreground }]}>
            {item.carbs_per_100g}g
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            borderRadius: radius.md,
            backgroundColor: `${colors.primary}14`,
            paddingVertical: 8,
            alignItems: "center",
          }}
        >
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>
            Fat
          </Text>
          <Text style={[typography.smallMedium, { color: colors.foreground }]}>
            {item.fat_per_100g}g
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function FoodLibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const showToast = useToastStore((s) => s.show);
  const profile = useAuthStore((s) => s.profile);

  const [aiTipsVisible, setAiTipsVisible] = useState(false);
  const [analyzingAI, setAnalyzingAI] = useState(false);

  const [tableModal, setTableModal] = useState<{
    visible: boolean;
    item: NutritionItem | null;
    selected: FoodLibraryViewItem | null;
  }>({ visible: false, item: null, selected: null });

  const {
    isLoading,
    items,
    query,
    setQuery,
    refresh,
    deleteItem,
    saveItem,
    addFromNutritionItem,
  } = useFoodLibrary();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories_per_100g,
      }),
      { calories: 0 },
    );
  }, [items]);

  const runAIAnalysis = async (source: "camera" | "library") => {
    setAiTipsVisible(false);

    try {
      let base64: string | null | undefined = null;

      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          showToast("Camera permission denied", "error");
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          allowsEditing: false,
          quality: 0.85,
          base64: true,
        });

        if (result.canceled || !result.assets[0]) {
          return;
        }

        base64 = result.assets[0].base64;
      } else {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          showToast("Gallery permission denied", "error");
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: false,
          quality: 0.85,
          base64: true,
        });

        if (result.canceled || !result.assets[0]) {
          return;
        }

        base64 = result.assets[0].base64;
      }

      if (!base64) {
        showToast("Could not read selected image", "error");
        return;
      }

      setAnalyzingAI(true);
      const provider = profile?.preferred_ai_provider ?? "gemini";
      const detected = await analyzeMealPhoto(provider, base64);

      if (!detected.length) {
        showToast("No foods detected in image", "info");
        return;
      }

      await Promise.all(detected.map((item) => addFromNutritionItem(item)));
      showToast(
        `${detected.length} AI item(s) added to your library`,
        "success",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to analyze meal image";
      showToast(message, "error");
    } finally {
      setAnalyzingAI(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
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
        >
          <ChevronLeft size={22} color={colors.foreground} />
        </Pressable>

        <Text style={[typography.h3, { color: colors.foreground, flex: 1 }]}>
          Food Library
        </Text>

        <Pressable
          onPress={() => setAiTipsVisible(true)}
          style={{
            minHeight: 36,
            paddingHorizontal: 10,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.primary,
            backgroundColor: `${colors.primary}18`,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Sparkles size={14} color={colors.primary} />
          <Text style={[typography.smallMedium, { color: colors.primary }]}>
            AI
          </Text>
        </Pressable>
      </View>

      <View
        style={{
          paddingHorizontal: spacing.md,
          paddingTop: spacing.md,
          gap: spacing.sm,
        }}
      >
        <View
          style={{
            minHeight: 44,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            backgroundColor: colors.card,
            paddingHorizontal: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Search size={16} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search your foods"
            placeholderTextColor={colors.muted}
            style={{ flex: 1, color: colors.foreground }}
          />
        </View>

        <Pressable
          onPress={() =>
            router.push({
              pathname: "/nutrition/add-food",
              params: { mode: "manual" },
            })
          }
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: spacing.xs,
            minHeight: 52,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: colors.cardBorder,
            backgroundColor: colors.card,
          }}
        >
          <Plus size={18} color={colors.primary} />
          <Text style={[typography.bodyMedium, { color: colors.primary }]}>
            Add food manually
          </Text>
        </Pressable>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <View
            style={{
              flex: 1,
              borderRadius: radius.md,
              backgroundColor: colors.surface,
              paddingVertical: 8,
              alignItems: "center",
            }}
          >
            <Text
              style={[typography.caption, { color: colors.mutedForeground }]}
            >
              Foods
            </Text>
            <Text
              style={[typography.smallMedium, { color: colors.foreground }]}
            >
              {items.length}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              borderRadius: radius.md,
              backgroundColor: colors.surface,
              paddingVertical: 8,
              alignItems: "center",
            }}
          >
            <Text
              style={[typography.caption, { color: colors.mutedForeground }]}
            >
              Avg kcal/100g
            </Text>
            <Text
              style={[typography.smallMedium, { color: colors.foreground }]}
            >
              {items.length ? Math.round(totals.calories / items.length) : 0}
            </Text>
          </View>
        </View>
      </View>

      {isLoading || analyzingAI ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Spinner size="lg" />
          <Text style={[typography.body, { color: colors.mutedForeground }]}>
            {analyzingAI
              ? "Analyzing food photo..."
              : "Loading your food library..."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FoodCard
              item={item}
              onOpen={() =>
                setTableModal({
                  visible: true,
                  item: toNutritionItem(item),
                  selected: item,
                })
              }
              onDelete={async () => {
                try {
                  await deleteItem(item.id);
                  showToast("Food removed", "success");
                } catch {
                  showToast("Failed to remove food", "error");
                }
              }}
            />
          )}
          contentContainerStyle={{
            paddingHorizontal: spacing.md,
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + 40,
            gap: spacing.sm,
          }}
          ListEmptyComponent={
            <View
              style={{ alignItems: "center", paddingVertical: spacing.xl * 2 }}
            >
              <Text
                style={[
                  typography.body,
                  { color: colors.mutedForeground, textAlign: "center" },
                ]}
              >
                You have no foods yet. Add one manually or use AI photo
                detection.
              </Text>
            </View>
          }
        />
      )}

      <NutritionTableModal
        visible={tableModal.visible}
        item={tableModal.item}
        itemIndex={0}
        onClose={() =>
          setTableModal({ visible: false, item: null, selected: null })
        }
        onSave={async (updatedItem) => {
          const selected = tableModal.selected;
          if (!selected) {
            return;
          }

          const serving =
            updatedItem.serving_size_g > 0 ? updatedItem.serving_size_g : 100;

          try {
            await saveItem(
              {
                name: updatedItem.food_name.trim() || selected.name,
                brand: updatedItem.brand?.trim() || undefined,
                calories_per_100g: toPer100(updatedItem.calories, serving),
                protein_per_100g: toPer100(updatedItem.protein_g, serving),
                carbs_per_100g: toPer100(updatedItem.carbs_g, serving),
                fat_per_100g: toPer100(updatedItem.fat_g, serving),
                serving_size_g: serving,
                serving_unit: selected.serving_unit || "g",
              },
              selected.id,
            );
            showToast("Food updated", "success");
          } catch {
            showToast("Failed to update food", "error");
          } finally {
            setTableModal({ visible: false, item: null, selected: null });
          }
        }}
      />

      <AITipsModal
        visible={aiTipsVisible}
        onClose={() => setAiTipsVisible(false)}
        onCamera={() => void runAIAnalysis("camera")}
        onGallery={() => void runAIAnalysis("library")}
        insetBottom={insets.bottom}
      />
    </View>
  );
}
