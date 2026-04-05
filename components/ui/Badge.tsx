import { Pressable, Text, type PressableProps } from "react-native";
import { cn } from "@/lib/utils";

interface BadgeProps extends PressableProps {
  variant?:
    | "default"
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "destructive"
    | "accent";
  size?: "sm" | "md" | "lg";
  count?: number;
  children?: React.ReactNode;
  textClassName?: string;
  className?: string;
}

const variantStyles = {
  default: "bg-gray-200 dark:bg-gray-700",
  primary: "bg-cyan-500 dark:bg-cyan-600",
  secondary: "bg-gray-500 dark:bg-gray-600",
  success: "bg-green-500 dark:bg-green-600",
  warning: "bg-amber-500 dark:bg-amber-600",
  destructive: "bg-red-500 dark:bg-red-600",
  accent: "bg-purple-500 dark:bg-purple-600",
};

const variantTextStyles = {
  default: "text-gray-900 dark:text-gray-100",
  primary: "text-white",
  secondary: "text-white",
  success: "text-white",
  warning: "text-white",
  destructive: "text-white",
  accent: "text-white",
};

const sizeStyles = {
  sm: "px-2 py-1 rounded-md",
  md: "px-3 py-1.5 rounded-lg",
  lg: "px-4 py-2 rounded-xl",
};

const sizeTextStyles = {
  sm: "text-xs font-medium",
  md: "text-sm font-medium",
  lg: "text-base font-semibold",
};

const countDotStyles = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

/**
 * Badge - Status badge with optional counter
 *
 * @example
 * <Badge variant="success">Active</Badge>
 * <Badge variant="primary" count={3} size="md" />
 * <Badge variant="warning" size="lg">Warning</Badge>
 * <Badge variant="primary" onPress={handlePress}>Clickable</Badge>
 */
export function Badge({
  variant = "default",
  size = "md",
  count,
  children,
  textClassName,
  className,
  onPress,
  ...props
}: BadgeProps) {
  // If only count is shown (no children), render as dot
  if (count !== undefined && !children) {
    return (
      <Pressable
        className={cn(
          "rounded-full items-center justify-center",
          countDotStyles[size],
          variantStyles[variant],
          className,
        )}
        onPress={onPress}
        {...props}
      >
        {count > 0 && (
          <Text
            className={cn(
              "font-bold",
              variantTextStyles[variant],
              sizeTextStyles[size],
            )}
          >
            {count > 99 ? "99+" : count}
          </Text>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      className={cn(sizeStyles[size], variantStyles[variant], className)}
      onPress={onPress}
      {...props}
    >
      {typeof children === "string" ? (
        <Text
          className={cn(
            variantTextStyles[variant],
            sizeTextStyles[size],
            textClassName,
          )}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
