import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Dumbbell, Plus, X } from "lucide-react-native";

import {
  EQUIPMENT_BY_CATEGORY,
  EQUIPMENT_CATALOG,
  EQUIPMENT_CATEGORY_LABELS,
} from "@/constants/equipmentCatalog";
import { useThemeStore } from "@/stores/theme.store";
import type { EquipmentCategory, EquipmentItemId } from "@/types";

interface EquipmentPickerProps {
  visible: boolean;
  selectedIds: EquipmentItemId[];
  onClose: () => void;
  onConfirm: (ids: EquipmentItemId[]) => void;
}

type CategoryFilter = "all" | EquipmentCategory;

const CATEGORY_TABS: { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "free_weights", label: "Free Weights" },
  { id: "machines_stations", label: "Machines" },
  { id: "bodyweight_functional", label: "Bodyweight" },
  { id: "cardio", label: "Cardio" },
  { id: "accessories", label: "Accessories" },
];

export function EquipmentPicker({
  visible,
  selectedIds,
  onClose,
  onConfirm,
}: EquipmentPickerProps) {
  const colors = useThemeStore((s) => s.colors);
  const isDark = useThemeStore((s) => s.isDark);
  const insets = useSafeAreaInsets();

  const [draftSelectedIds, setDraftSelectedIds] = useState<EquipmentItemId[]>(
    [],
  );
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!visible) return;
    setDraftSelectedIds(selectedIds);
    setActiveCategory("all");
    setSearchQuery("");
  }, [visible, selectedIds]);

  const selectedSet = useMemo(
    () => new Set(draftSelectedIds),
    [draftSelectedIds],
  );

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const source =
      activeCategory === "all"
        ? EQUIPMENT_CATALOG
        : EQUIPMENT_BY_CATEGORY[activeCategory];

    if (!query) return source;

    return source.filter((item) => item.label.toLowerCase().includes(query));
  }, [activeCategory, searchQuery]);

  const toggleSelection = (id: EquipmentItemId) => {
    setDraftSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((itemId) => itemId !== id)
        : [...prev, id],
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: isDark
            ? colors.background + "CC"
            : colors.foreground + "73",
        }}
      >
        <View
          style={{
            height: "88%",
            backgroundColor: colors.background,
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            paddingTop: 14,
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 19,
                  fontWeight: "800",
                }}
              >
                Select Equipment
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                {draftSelectedIds.length} selected
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close equipment picker"
              onPress={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.secondary,
              }}
            >
              <X size={18} color={colors.foreground} />
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              gap: 8,
              paddingTop: 12,
              paddingBottom: 10,
              paddingRight: 2,
            }}
          >
            {CATEGORY_TABS.map((tab) => {
              const active = tab.id === activeCategory;
              return (
                <Pressable
                  key={tab.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${tab.label} category${active ? ", selected" : ""}`}
                  onPress={() => setActiveCategory(tab.id)}
                  style={{
                    borderRadius: 999,
                    borderBottomWidth: 2,
                    borderBottomColor: active ? colors.primary : "transparent",
                    backgroundColor: active
                      ? colors.primary + "16"
                      : colors.secondary,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      color: active ? colors.primary : colors.foreground,
                      fontSize: 13,
                      fontWeight: "700",
                    }}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View
            style={{
              borderWidth: 1,
              borderColor: colors.cardBorder,
              borderRadius: 12,
              backgroundColor: colors.surface,
              paddingHorizontal: 12,
              paddingVertical: 9,
              marginBottom: 8,
            }}
          >
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search equipment"
              placeholderTextColor={colors.mutedForeground}
              style={{
                color: colors.foreground,
                fontSize: 14,
                padding: 0,
              }}
            />
          </View>

          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 14 }}
            ListEmptyComponent={
              <View
                style={{
                  paddingVertical: 30,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontSize: 13,
                  }}
                >
                  No equipment found.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const selected = selectedSet.has(item.id);

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label}${selected ? ", selected" : ""}`}
                  onPress={() => toggleSelection(item.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    minHeight: 68,
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.cardBorder,
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 12,
                      backgroundColor: colors.secondary,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Dumbbell size={22} color={colors.mutedForeground} />
                  </View>

                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text
                      style={{
                        color: colors.foreground,
                        fontSize: 14,
                        fontWeight: "700",
                      }}
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={{
                        color: colors.mutedForeground,
                        fontSize: 12,
                        marginTop: 1,
                      }}
                    >
                      {EQUIPMENT_CATEGORY_LABELS[item.category]}
                    </Text>
                  </View>

                  <View
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      borderWidth: selected ? 0 : 1,
                      borderColor: colors.cardBorder,
                      backgroundColor: selected
                        ? colors.primary
                        : colors.secondary,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {selected ? (
                      <Check size={16} color={colors.primaryForeground} />
                    ) : (
                      <Plus size={16} color={colors.foreground} />
                    )}
                  </View>
                </Pressable>
              );
            }}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Confirm ${draftSelectedIds.length} selected equipment items`}
            onPress={() => onConfirm(draftSelectedIds)}
            style={{
              minHeight: 48,
              borderRadius: 12,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: colors.primaryForeground,
                fontSize: 15,
                fontWeight: "800",
              }}
            >
              Confirm ({draftSelectedIds.length} selected)
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
