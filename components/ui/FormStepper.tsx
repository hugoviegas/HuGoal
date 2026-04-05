import { View, Text } from "react-native";
import { Button } from "@/components/ui/Button";
import { useThemeStore } from "@/stores/theme.store";

export interface FormStepItem {
  id: string;
  title: string;
  description?: string;
}

interface FormStepperProps {
  steps: FormStepItem[];
  currentStep: number;
  canSkip?: boolean;
  isLoading?: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
  onSkip?: () => void;
  onComplete?: () => void;
  children?: React.ReactNode;
}

export function FormStepper({
  steps,
  currentStep,
  canSkip,
  isLoading,
  onNext,
  onPrevious,
  onSkip,
  onComplete,
  children,
}: FormStepperProps) {
  const colors = useThemeStore((s) => s.colors);
  const isLastStep = currentStep >= steps.length - 1;
  const active = steps[currentStep];

  return (
    <View style={{ flex: 1 }}>
      {/* Progress bar */}
      <View style={{ flexDirection: "row", gap: 6, marginBottom: 24 }}>
        {steps.map((step, index) => (
          <View
            key={step.id}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 999,
              backgroundColor:
                index <= currentStep ? colors.primary : colors.cardBorder,
            }}
          />
        ))}
      </View>

      {/* Step header */}
      <View style={{ marginBottom: 20 }}>
        <Text
          style={{
            color: colors.primary,
            fontSize: 12,
            fontWeight: "600",
            marginBottom: 4,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Step {currentStep + 1} of {steps.length}
        </Text>
        <Text
          style={{
            color: colors.foreground,
            fontSize: 26,
            fontWeight: "800",
            lineHeight: 32,
          }}
        >
          {active?.title}
        </Text>
        {active?.description ? (
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 14,
              marginTop: 6,
              lineHeight: 20,
            }}
          >
            {active.description}
          </Text>
        ) : null}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>{children}</View>

      {/* Actions */}
      <View style={{ gap: 10, marginTop: 16 }}>
        {isLastStep ? (
          <Button
            variant="primary"
            size="lg"
            isLoading={isLoading}
            onPress={onComplete}
          >
            Complete Setup
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            isLoading={isLoading}
            onPress={onNext}
          >
            Continue
          </Button>
        )}

        {currentStep > 0 ? (
          <Button variant="ghost" size="lg" onPress={onPrevious}>
            Back
          </Button>
        ) : null}

        {/* Only show Skip when canSkip=true AND onSkip handler is provided */}
        {canSkip && !!onSkip ? (
          <Button variant="outline" size="md" onPress={onSkip}>
            Skip for now
          </Button>
        ) : null}
      </View>
    </View>
  );
}
