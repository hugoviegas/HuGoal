import React, { useState } from "react";
import * as Haptics from "expo-haptics";
import { Image, Pressable, Text, View } from "react-native";
import DraggableFlatList from "react-native-draggable-flatlist";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
} from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import type { Difficulty, EquipmentType } from "@/types";

const GENERIC_EXERCISE_IMAGE =
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80";

export type ExerciseExecutionMode = "reps" | "time";

export interface BuilderExerciseItem {
  id: string;
  type: "exercise";
  exerciseId: string;
  name: string;
  muscleGroups: string[];
  equipment: EquipmentType;
  difficulty: Difficulty;
  hasWeight: boolean;
  imageUrl: string;
  executionMode: ExerciseExecutionMode;
  reps: string;
  exerciseSeconds?: number;
  prepSeconds?: number;
  weightKg?: number;
  notes?: string;
}

export interface BuilderRestItem {
  id: string;
  type: "rest";
  durationSeconds: number;
  notes?: string;
}

export type BuilderItem = BuilderExerciseItem | BuilderRestItem;

function getExercisePrescription(item: BuilderExerciseItem): string {
  if (item.executionMode === "time") {
    const workSeconds = Math.max(1, Number(item.exerciseSeconds ?? 30));
    const prepSeconds = Math.max(0, Number(item.prepSeconds ?? 0));
    return prepSeconds > 0
      ? `${workSeconds}s + prep ${prepSeconds}s`
      : `${workSeconds}s`;
  }
  return item.reps;
}

interface DraggableExerciseListProps {
  items: BuilderItem[];
  onReorder: (items: BuilderItem[]) => void;
  onUpdateItem: (
    itemId: string,
    patch: Partial<BuilderExerciseItem> | Partial<BuilderRestItem>,
  ) => void;
  onRemoveItem: (itemId: string) => void;
  onDuplicateItem: (itemId: string) => void;
  onMoveItem: (itemIndex: number, direction: -1 | 1) => void;
}

export function DraggableExerciseList({
  items,
  onReorder,
  onUpdateItem,
  onRemoveItem,
  onDuplicateItem,
  onMoveItem,
}: DraggableExerciseListProps) {
  const { isDark, colors } = useThemeStore();
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const renderItem = (
    item: BuilderItem,
    itemIndex: number,
    totalItems: number,
    drag?: () => void,
    isActive = false,
  ) => (
    <View
      className={cn(
        "pb-3 mb-3 border-b border-light-border dark:border-dark-border",
        isActive ? "opacity-80" : "opacity-100",
      )}
    >
      <View className="flex-row items-start justify-between gap-2">
        <Pressable
          onLongPress={() => {
            void Haptics.selectionAsync();
            drag?.();
          }}
          delayLongPress={170}
          className="flex-row items-center gap-3 flex-1 pr-1"
        >
          {item.type === "exercise" ? (
            <Image
              source={{ uri: item.imageUrl || GENERIC_EXERCISE_IMAGE }}
              style={{ width: 42, height: 42, borderRadius: 10 }}
              resizeMode="cover"
            />
          ) : (
            <View className="h-[42px] w-[42px] rounded-full items-center justify-center bg-amber-100 dark:bg-amber-900/30">
              <Text className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                Rest
              </Text>
            </View>
          )}

          <View className="flex-1">
            <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {item.type === "exercise"
                ? item.name
                : `Rest ${item.durationSeconds}s`}
            </Text>
            <Text className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              {item.type === "exercise"
                ? `${getExercisePrescription(item)}${item.hasWeight ? ` • ${item.weightKg ?? 0}kg` : ""}`
                : "Recovery block"}
            </Text>
          </View>
        </Pressable>

        <View className="flex-row items-center gap-0.5">
          <View className="h-8 w-8 items-center justify-center">
            <GripVertical size={14} color={colors.muted} />
          </View>
          <Pressable
            onPress={() => onMoveItem(itemIndex, -1)}
            disabled={itemIndex === 0}
            className="h-8 w-8 items-center justify-center"
          >
            <ArrowUp
              size={14}
              color={itemIndex === 0 ? colors.cardBorder : colors.foreground}
            />
          </Pressable>
          <Pressable
            onPress={() => onMoveItem(itemIndex, 1)}
            disabled={itemIndex === totalItems - 1}
            className="h-8 w-8 items-center justify-center"
          >
            <ArrowDown
              size={14}
              color={
                itemIndex === totalItems - 1
                  ? colors.cardBorder
                  : colors.foreground
              }
            />
          </Pressable>
          <Pressable
            onPress={() =>
              setEditingItemId((prev) => (prev === item.id ? null : item.id))
            }
            className="h-8 w-8 items-center justify-center"
          >
            <Text className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">
              Edit
            </Text>
          </Pressable>
        </View>
      </View>

      {editingItemId === item.id ? (
        <View className="mt-3 gap-2">
          {item.type === "exercise" ? (
            <>
              {!item.hasWeight ? (
                <View className="flex-row gap-2">
                  <Badge
                    variant={
                      item.executionMode === "reps" ? "primary" : "secondary"
                    }
                    size="sm"
                    onPress={() =>
                      onUpdateItem(item.id, { executionMode: "reps" })
                    }
                  >
                    Reps
                  </Badge>
                  <Badge
                    variant={
                      item.executionMode === "time" ? "primary" : "secondary"
                    }
                    size="sm"
                    onPress={() =>
                      onUpdateItem(item.id, {
                        executionMode: "time",
                        exerciseSeconds: item.exerciseSeconds ?? 30,
                        prepSeconds: item.prepSeconds ?? 3,
                      })
                    }
                  >
                    Time
                  </Badge>
                </View>
              ) : null}

              {item.executionMode === "time" && !item.hasWeight ? (
                <View className="flex-row gap-2">
                  <Input
                    label="Execution (seconds)"
                    keyboardType="number-pad"
                    value={String(item.exerciseSeconds ?? 30)}
                    onChangeText={(text) =>
                      onUpdateItem(item.id, {
                        exerciseSeconds: Math.max(1, Number(text || "0") || 0),
                      })
                    }
                    containerClassName="flex-1"
                  />
                  <Input
                    label="Prep (seconds)"
                    keyboardType="number-pad"
                    value={String(item.prepSeconds ?? 3)}
                    onChangeText={(text) =>
                      onUpdateItem(item.id, {
                        prepSeconds: Math.max(0, Number(text || "0") || 0),
                      })
                    }
                    containerClassName="flex-1"
                  />
                </View>
              ) : (
                <View className="flex-row gap-2">
                  <Input
                    label="Reps"
                    value={item.reps}
                    onChangeText={(text) =>
                      onUpdateItem(item.id, { reps: text })
                    }
                    containerClassName="flex-1"
                  />
                  {item.hasWeight ? (
                    <Input
                      label="Weight (kg)"
                      keyboardType="decimal-pad"
                      value={String(item.weightKg ?? 0)}
                      onChangeText={(text) =>
                        onUpdateItem(item.id, {
                          weightKg: Number(text || "0") || 0,
                        })
                      }
                      containerClassName="flex-1"
                    />
                  ) : null}
                </View>
              )}
            </>
          ) : (
            <Input
              label="Rest Duration (seconds)"
              keyboardType="number-pad"
              value={String(item.durationSeconds)}
              onChangeText={(text) =>
                onUpdateItem(item.id, {
                  durationSeconds: Number(text || "0") || 0,
                })
              }
              containerClassName="mb-0"
            />
          )}

          <Input
            label="Notes"
            value={item.notes ?? ""}
            onChangeText={(text) => onUpdateItem(item.id, { notes: text })}
          />

          <View className="flex-row gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onPress={() => onDuplicateItem(item.id)}
            >
              Duplicate
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onPress={() => onRemoveItem(item.id)}
            >
              Delete
            </Button>
          </View>
        </View>
      ) : null}
    </View>
  );

  return (
    <DraggableFlatList
      data={items}
      keyExtractor={(item) => item.id}
      onDragBegin={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      onDragEnd={({ data }) => {
        onReorder(data);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }}
      scrollEnabled={false}
      activationDistance={8}
      renderItem={({ item, getIndex, drag, isActive }) => {
        const itemIndex = getIndex() ?? 0;
        return renderItem(item, itemIndex, items.length, drag, isActive);
      }}
    />
  );
}
