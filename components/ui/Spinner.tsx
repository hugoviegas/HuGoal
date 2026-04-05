import { ActivityIndicator } from "react-native";
import { useThemeStore } from "@/stores/theme.store";

interface SpinnerProps {
  size?: "small" | "large";
  color?: string;
}

/**
 * Spinner - Loading indicator component
 *
 * @example
 * <Spinner size="large" />
 * <Spinner size="small" color="#0ea5b0" />
 */
export function Spinner({ size = "large", color }: SpinnerProps) {
  const colors = useThemeStore((s) => s.colors);
  const spinnerColor = color || colors.primary;

  return <ActivityIndicator size={size} color={spinnerColor} />;
}
