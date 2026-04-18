import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";

interface Props {
  children: React.ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
  error: string | null;
  componentStack: string | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, componentStack: null };
  }

  static getDerivedStateFromError(error: unknown): Partial<State> {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? (error.stack ?? null) : null;
    return { hasError: true, error: message, componentStack: stack };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    const label = this.props.label ?? "ErrorBoundary";
    console.error(`[${label}] Caught render error:`, error);
    console.error(`[${label}] Component stack:`, info.componentStack);
    this.setState({ componentStack: info.componentStack ?? null });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingTop: 60 }}
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={{
              color: "#ef4444",
              fontSize: 18,
              fontWeight: "800",
              marginBottom: 8,
            }}
          >
            [DEBUG] Render Error — {this.props.label ?? "Unknown"}
          </Text>
          <Text
            style={{
              color: "#fca5a5",
              fontSize: 14,
              marginBottom: 16,
              lineHeight: 20,
            }}
          >
            {this.state.error}
          </Text>
          {this.state.componentStack && (
            <Text
              style={{
                color: "#9ca3af",
                fontSize: 11,
                fontFamily: "monospace",
                lineHeight: 16,
              }}
            >
              {this.state.componentStack}
            </Text>
          )}
          <Pressable
            onPress={() =>
              this.setState({
                hasError: false,
                error: null,
                componentStack: null,
              })
            }
            style={{
              marginTop: 24,
              backgroundColor: "#1f2937",
              padding: 14,
              borderRadius: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#f3f4f6", fontWeight: "700" }}>
              Retry
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}
