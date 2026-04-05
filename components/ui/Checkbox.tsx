import { Pressable, View, Text, type PressableProps } from "react-native";
import { Check } from "lucide-react-native";
import { cn } from "@/lib/utils";

interface CheckboxProps extends Omit<PressableProps, "children"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  error?: string;
  containerClassName?: string;
  labelClassName?: string;
}

const sizeMap = {
  sm: "h-4 w-4 rounded",
  md: "h-5 w-5 rounded-md",
  lg: "h-6 w-6 rounded-lg",
};

const labelSizeMap = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

/**
 * Checkbox - Controlled checkbox component
 *
 * @example
 * const [checked, setChecked] = useState(false);
 * <Checkbox checked={checked} onCheckedChange={setChecked} label="I agree" />
 */
export function Checkbox({
  checked = false,
  onCheckedChange,
  label,
  size = "md",
  disabled = false,
  error,
  containerClassName,
  labelClassName,
  ...props
}: CheckboxProps) {
  return (
    <View className={cn("gap-1.5", containerClassName)}>
      <Pressable
        className="flex-row items-center gap-3"
        onPress={() => !disabled && onCheckedChange?.(!checked)}
        disabled={disabled}
        {...props}
      >
        <View
          className={cn(
            sizeMap[size],
            checked
              ? "bg-cyan-500 dark:bg-cyan-600"
              : "border-2 border-gray-300 dark:border-gray-600",
            disabled && "opacity-50",
            "items-center justify-center",
          )}
        >
          {checked && <Check size={12} color="#ffffff" strokeWidth={3} />}
        </View>
        {label && (
          <Text
            className={cn(
              labelSizeMap[size],
              "text-gray-900 dark:text-gray-100",
              labelClassName,
            )}
          >
            {label}
          </Text>
        )}
      </Pressable>
      {error && <Text className="text-xs text-red-500">{error}</Text>}
    </View>
  );
}
