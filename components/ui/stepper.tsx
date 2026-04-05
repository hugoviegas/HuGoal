import { Pressable, Text, View } from "react-native";
import { cn } from "@/lib/utils";

interface StepperStep {
  id: string;
  label: string;
}

interface StepperProps {
  steps: StepperStep[];
  currentStep: number;
  className?: string;
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <View className={cn("w-full", className)}>
      <View className="flex-row items-center gap-2">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;

          return (
            <Pressable
              key={step.id}
              accessibilityRole="button"
              accessibilityState={isActive ? { selected: true } : {}}
              className={cn(
                "flex-1 rounded-2xl border px-3 py-2",
                isActive
                  ? "bg-cyan-500/15 border-cyan-500"
                  : isCompleted
                    ? "bg-green-500/10 border-green-500/30"
                    : "bg-transparent border-light-border dark:border-dark-border",
              )}
            >
              <View className="flex-row items-center justify-center gap-2">
                <View
                  className={cn(
                    "h-5 w-5 items-center justify-center rounded-full",
                    isActive
                      ? "bg-cyan-500"
                      : isCompleted
                        ? "bg-green-500"
                        : "bg-gray-300 dark:bg-gray-600",
                  )}
                >
                  <Text className="text-[10px] font-bold text-white">
                    {index + 1}
                  </Text>
                </View>
                <Text
                  numberOfLines={1}
                  className={cn(
                    "text-xs font-semibold",
                    isActive
                      ? "text-cyan-700 dark:text-cyan-300"
                      : isCompleted
                        ? "text-green-700 dark:text-green-300"
                        : "text-gray-600 dark:text-gray-400",
                  )}
                >
                  {step.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
