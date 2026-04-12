import { Text, View } from "react-native";
import { LogIn } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { useThemeStore } from "@/stores/theme.store";

interface SocialAuthSectionProps {
  onGooglePress: () => void;
  googleLoading?: boolean;
  googleDisabled?: boolean;
  label?: string;
}

export function SocialAuthSection({
  onGooglePress,
  googleLoading = false,
  googleDisabled = false,
  label = "or continue with",
}: SocialAuthSectionProps) {
  const colors = useThemeStore((s) => s.colors);

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{ flex: 1, height: 1, backgroundColor: colors.cardBorder }}
        />
        <Text
          style={{
            color: colors.mutedForeground,
            fontSize: 13,
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          {label}
        </Text>
        <View
          style={{ flex: 1, height: 1, backgroundColor: colors.cardBorder }}
        />
      </View>

      <Button
        variant="outline"
        size="lg"
        isLoading={googleLoading}
        disabled={googleDisabled}
        onPress={onGooglePress}
        className="w-full"
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <LogIn size={18} color={colors.foreground} />
          <Text
            style={{
              color: colors.foreground,
              fontSize: 16,
              fontWeight: "700",
            }}
          >
            Continue with Google
          </Text>
        </View>
      </Button>
    </View>
  );
}
