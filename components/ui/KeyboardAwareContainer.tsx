import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type KeyboardAwareContainerProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  keyboardVerticalOffset?: number;
};

export function KeyboardAwareContainer({
  children,
  style,
  keyboardVerticalOffset,
}: KeyboardAwareContainerProps) {
  const insets = useSafeAreaInsets();

  const defaultOffset = Platform.OS === "ios" ? insets.bottom + 16 : 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={keyboardVerticalOffset ?? defaultOffset}
      style={[{ flex: 1 }, style]}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
