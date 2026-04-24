import { forwardRef } from "react";
import {
  TextInput,
  View,
  Text,
  Pressable,
  type TextInputProps,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/theme.store";

interface SearchBarProps extends Omit<TextInputProps, "style"> {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  variant?: "default" | "filled" | "outlined";
  size?: "sm" | "md" | "lg";
  onClear?: () => void;
  onSubmit?: () => void;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
  inputClassName?: string;
  helperText?: string;
  error?: string;
}

const variantStyles = {
  default: {
    container: "bg-transparent border-0",
    input: "bg-transparent",
  },
  filled: {
    container: "bg-light-surface dark:bg-dark-surface",
    input: "bg-transparent",
  },
  outlined: {
    container: "bg-transparent border border-light-border dark:border-dark-border",
    input: "bg-transparent",
  },
};

const sizeStyles = {
  sm: {
    container: "px-3 py-2 rounded-lg",
    input: "text-sm",
  },
  md: {
    container: "px-4 py-3 rounded-xl",
    input: "text-base",
  },
  lg: {
    container: "px-5 py-4 rounded-2xl",
    input: "text-lg",
  },
};

export const SearchBar = forwardRef<TextInput, SearchBarProps>(
  (
    {
      value,
      onChangeText,
      placeholder = "Search...",
      variant = "default",
      size = "md",
      onClear,
      onSubmit,
      leftIcon,
      rightIcon,
      containerClassName,
      inputClassName,
      helperText,
      error,
      ...props
    },
    ref,
  ) => {
    const colors = useThemeStore((s) => s.colors);

    const handleClear = () => {
      onChangeText("");
      onClear?.();
    };

    const containerClasses = cn(
      "flex-row items-center",
      variantStyles[variant].container,
      sizeStyles[size].container,
      error && "border-red-500",
      containerClassName,
    );

    return (
      <View>
        <View className={containerClasses}>
          {leftIcon && <View className="mr-2">{leftIcon}</View>}

          <TextInput
            ref={ref}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            className={cn(
              "flex-1 text-gray-900 dark:text-gray-100",
              variantStyles[variant].input,
              sizeStyles[size].input,
              inputClassName,
            )}
            returnKeyType="search"
            onSubmitEditing={onSubmit}
            {...props}
          />

          {value.length > 0 && (
            <Pressable onPress={handleClear} className="ml-2 p-1">
              <Text style={{ color: colors.textSecondary }}>×</Text>
            </Pressable>
          )}

          {rightIcon && !value && <View className="ml-2">{rightIcon}</View>}
        </View>

        {(error || helperText) && (
          <Text
            className={`mt-1 px-1 text-sm ${
              error ? "text-red-500" : "text-light-textSecondary dark:text-dark-textSecondary"
            }`}
          >
            {error || helperText}
          </Text>
        )}
      </View>
    );
  },
);

SearchBar.displayName = "SearchBar";