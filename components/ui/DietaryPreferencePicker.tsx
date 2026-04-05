import { useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Input } from "@/components/ui/Input";
import { useThemeStore } from "@/stores/theme.store";

const OPTIONS = {
  allergies: ["nuts", "shellfish", "lactose", "soy", "eggs"],
  restrictions: ["vegan", "vegetarian", "gluten-free", "keto", "halal"],
  cuisines: ["italian", "japanese", "mediterranean", "brazilian", "mexican"],
} as const;

interface DietaryPreferencePickerProps {
  value: string[];
  onChange: (value: string[]) => void;
  category: "allergies" | "restrictions" | "cuisines";
  label: string;
}

export function DietaryPreferencePicker({
  value,
  onChange,
  category,
  label,
}: DietaryPreferencePickerProps) {
  const colors = useThemeStore((s) => s.colors);
  const [custom, setCustom] = useState("");

  const options = useMemo(() => OPTIONS[category], [category]);

  const toggle = (item: string) => {
    if (value.includes(item)) {
      onChange(value.filter((v) => v !== item));
    } else {
      onChange([...value, item]);
    }
  };

  const addCustom = () => {
    const normalized = custom.trim().toLowerCase();
    if (!normalized) return;
    if (!value.includes(normalized)) {
      onChange([...value, normalized]);
    }
    setCustom("");
  };

  return (
    <View style={{ gap: 10 }}>
      <Text
        style={{ color: colors.foreground, fontSize: 15, fontWeight: "600" }}
      >
        {label}
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map((item) => {
          const selected = value.includes(item);
          return (
            <Pressable
              key={item}
              onPress={() => toggle(item)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: selected ? colors.primary : colors.cardBorder,
                backgroundColor: selected ? colors.primary : colors.card,
              }}
            >
              <Text
                style={{
                  color: selected
                    ? colors.primaryForeground
                    : colors.foreground,
                  fontSize: 12,
                }}
              >
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Input
        label="Add custom"
        placeholder="Type and press Add"
        value={custom}
        onChangeText={setCustom}
      />
      <Pressable
        onPress={addCustom}
        style={{
          alignSelf: "flex-start",
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 8,
          backgroundColor: colors.secondary,
        }}
      >
        <Text style={{ color: colors.foreground, fontWeight: "600" }}>Add</Text>
      </Pressable>
    </View>
  );
}
