import { View, Text, Pressable } from "react-native";
import { useThemeStore } from "@/stores/theme.store";

export interface OptionItem<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  icon?: string; // emoji
}

interface OptionPickerProps<T extends string = string> {
  label?: string;
  options: OptionItem<T>[];
  value?: T;
  onChange: (value: T) => void;
  /** number of columns — default 2 */
  columns?: 2 | 3;
  error?: string;
}

export function OptionPicker<T extends string = string>({
  label,
  options,
  value,
  onChange,
  columns = 2,
  error,
}: OptionPickerProps<T>) {
  const colors = useThemeStore((s) => s.colors);

  return (
    <View>
      {label ? (
        <Text
          style={{
            color: colors.mutedForeground,
            fontSize: 13,
            fontWeight: "600",
            marginBottom: 10,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {label}
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        {options.map((option) => {
          const isSelected = option.value === value;

          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => ({
                // Divide space equally based on columns
                width: columns === 3 ? "31%" : "48%",
                borderRadius: 16,
                borderWidth: isSelected ? 2 : 1,
                borderColor: isSelected ? colors.primary : colors.cardBorder,
                backgroundColor: isSelected
                  ? colors.primary + "1A"
                  : colors.card,
                paddingVertical: 16,
                paddingHorizontal: 12,
                alignItems: "center",
                gap: 6,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              {option.icon ? (
                <Text style={{ fontSize: columns === 3 ? 24 : 30 }}>
                  {option.icon}
                </Text>
              ) : null}
              <Text
                style={{
                  color: isSelected ? colors.primary : colors.foreground,
                  fontSize: 14,
                  fontWeight: "700",
                  textAlign: "center",
                }}
              >
                {option.label}
              </Text>
              {option.description ? (
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontSize: 11,
                    textAlign: "center",
                    lineHeight: 14,
                  }}
                  numberOfLines={2}
                >
                  {option.description}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <Text
          style={{ color: colors.destructive, fontSize: 12, marginTop: 6 }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
