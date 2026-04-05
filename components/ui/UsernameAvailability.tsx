import { View, Text } from "react-native";
import { Input } from "@/components/ui/Input";
import { useThemeStore } from "@/stores/theme.store";

interface UsernameAvailabilityProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  isAvailable?: boolean;
  isLoading?: boolean;
}

export function UsernameAvailability({
  value,
  onChange,
  error,
  isAvailable,
  isLoading,
}: UsernameAvailabilityProps) {
  const colors = useThemeStore((s) => s.colors);

  let statusText: string | null = null;
  let statusColor = colors.mutedForeground;

  if (isLoading) {
    statusText = "Checking username...";
  } else if (value.length > 0 && isAvailable) {
    statusText = "Username is available";
    statusColor = colors.accent;
  } else if (value.length > 0 && !isAvailable && !error) {
    statusText = "Username is not available";
    statusColor = colors.destructive;
  }

  return (
    <View>
      <Input
        label="Username"
        placeholder="your_username"
        value={value}
        autoCapitalize="none"
        onChangeText={onChange}
        error={error}
      />
      {statusText ? (
        <Text style={{ color: statusColor, fontSize: 12, marginTop: 6 }}>
          {statusText}
        </Text>
      ) : null}
    </View>
  );
}
