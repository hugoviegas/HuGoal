import { forwardRef, useState } from "react";
import { Pressable, Text, View, type PressableProps } from "react-native";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/theme.store";

interface ChipProps extends PressableProps {
  label: string;
  variant?: "filled" | "outlined" | "soft";
  color?: "primary" | "secondary" | "success" | "warning" | "error";
  size?: "sm" | "md" | "lg";
  selected?: boolean;
  onRemove?: () => void;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  textClassName?: string;
}

const variantStyles = {
  filled: "bg-light-surface dark:bg-dark-surface",
  outlined: "bg-transparent border",
  soft: "bg-transparent",
};

const colorStyles = {
  primary: {
    filled: "bg-primary-100 dark:bg-primary-900",
    outlined: "border-primary-500 dark:border-primary-400",
    soft: "bg-primary-50 dark:bg-primary-950",
  },
  secondary: {
    filled: "bg-gray-100 dark:bg-gray-800",
    outlined: "border-gray-500 dark:border-gray-400",
    soft: "bg-gray-50 dark:bg-gray-950",
  },
  success: {
    filled: "bg-green-100 dark:bg-green-900",
    outlined: "border-green-500 dark:border-green-400",
    soft: "bg-green-50 dark:bg-green-950",
  },
  warning: {
    filled: "bg-yellow-100 dark:bg-yellow-900",
    outlined: "border-yellow-500 dark:border-yellow-400",
    soft: "bg-yellow-50 dark:bg-yellow-950",
  },
  error: {
    filled: "bg-red-100 dark:bg-red-900",
    outlined: "border-red-500 dark:border-red-400",
    soft: "bg-red-50 dark:bg-red-950",
  },
};

const colorTextStyles = {
  primary: "text-primary-600 dark:text-primary-400",
  secondary: "text-gray-700 dark:text-gray-300",
  success: "text-green-700 dark:text-green-400",
  warning: "text-yellow-700 dark:text-yellow-500",
  error: "text-red-700 dark:text-red-500",
};

const selectedColorStyles = {
  primary: "bg-primary-500 dark:bg-primary-600",
  secondary: "bg-gray-500 dark:bg-gray-600",
  success: "bg-green-500 dark:bg-green-600",
  warning: "bg-yellow-500 dark:bg-yellow-600",
  error: "bg-red-500 dark:bg-red-600",
};

const sizeStyles = {
  sm: {
    container: "px-2 py-1 rounded-md",
    text: "text-xs",
    icon: "w-3 h-3",
  },
  md: {
    container: "px-3 py-1.5 rounded-lg",
    text: "text-sm",
    icon: "w-4 h-4",
  },
  lg: {
    container: "px-4 py-2 rounded-xl",
    text: "text-base",
    icon: "w-5 h-5",
  },
};

export const Chip = forwardRef<Pressable, ChipProps>(
  (
    {
      label,
      variant = "outlined",
      color = "primary",
      size = "md",
      selected = false,
      onRemove,
      leftIcon,
      rightIcon,
      className,
      textClassName,
      disabled,
      ...props
    },
    ref,
  ) => {
    const containerClasses = cn(
      "flex-row items-center",
      variantStyles[variant],
      sizeStyles[size].container,
      selected ? selectedColorStyles[color] : colorStyles[color][variant],
      disabled && "opacity-50",
      className,
    );

    const textColorClass = selected
      ? "text-white font-medium"
      : colorTextStyles[color];

    return (
      <Pressable
        ref={ref}
        className={containerClasses}
        disabled={disabled}
        {...props}
      >
        {leftIcon && <View className="mr-1">{leftIcon}</View>}

        <Text className={cn(textColorClass, sizeStyles[size].text, textClassName)}>
          {label}
        </Text>

        {onRemove && (
          <Pressable
            onPress={onRemove}
            className="ml-1 p-0.5 rounded-full active:opacity-70"
            hitSlop={8}
          >
            <Text className={cn(textColorClass, "font-bold")}>×</Text>
          </Pressable>
        )}

        {rightIcon && <View className="ml-1">{rightIcon}</View>}
      </Pressable>
    );
  },
);

Chip.displayName = "Chip";

interface ChipGroupProps {
  chips: Array<{
    id: string;
    label: string;
    selected?: boolean;
    disabled?: boolean;
  }>;
  onChange?: (selectedIds: string[]) => void;
  multiSelect?: boolean;
  color?: ChipProps["color"];
  size?: ChipProps["size"];
  variant?: ChipProps["variant"];
  className?: string;
}

export function ChipGroup({
  chips,
  onChange,
  multiSelect = true,
  color = "primary",
  size = "md",
  variant = "outlined",
  className,
}: ChipGroupProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    chips.filter((c) => c.selected).map((c) => c.id),
  );

  const handlePress = (id: string) => {
    let newSelected: string[];

    if (multiSelect) {
      newSelected = selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id];
    } else {
      newSelected = selectedIds.includes(id) ? [] : [id];
    }

    setSelectedIds(newSelected);
    onChange?.(newSelected);
  };

  return (
    <View className={cn("flex-row flex-wrap gap-2", className)}>
      {chips.map((chip) => (
        <Chip
          key={chip.id}
          label={chip.label}
          selected={selectedIds.includes(chip.id)}
          color={color}
          size={size}
          variant={variant}
          disabled={chip.disabled}
          onPress={() => handlePress(chip.id)}
        />
      ))}
    </View>
  );
}