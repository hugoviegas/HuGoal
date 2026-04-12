import { useEffect, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { cn } from "@/lib/utils";

interface StepperStep {
  id: string;
  label: string;
}

interface StepperProps {
  steps: StepperStep[];
  currentStep: number;
  className?: string;
  onStepPress?: (index: number) => void;
  isStepPressable?: (index: number) => boolean;
}

export function Stepper({
  steps,
  currentStep,
  className,
  onStepPress,
  isStepPressable,
}: StepperProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const stepSize = 40;
  const stepGap = 12;
  const stepInterval = stepSize + stepGap;
  const sidePadding = Math.max(0, (containerWidth - stepSize) / 2);

  useEffect(() => {
    if (!containerWidth || steps.length <= 1) return;

    const frame = requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({
        x: currentStep * stepInterval,
        animated: true,
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [containerWidth, currentStep, stepInterval, steps.length]);

  const handleLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  return (
    <View className={cn("w-full", className)} onLayout={handleLayout}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={steps.length > 1}
        snapToInterval={stepInterval}
        snapToAlignment="center"
        decelerationRate="fast"
        contentContainerStyle={{
          alignItems: "center",
          gap: 12,
          paddingVertical: 2,
          paddingHorizontal: sidePadding,
        }}
      >
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          const canPress = isStepPressable
            ? isStepPressable(index)
            : !!onStepPress;

          return (
            <Pressable
              key={step.id}
              accessibilityRole="button"
              accessibilityState={isActive ? { selected: true } : {}}
              disabled={!canPress}
              onPress={() => onStepPress?.(index)}
              className={cn(
                "h-10 w-10 items-center justify-center rounded-full border",
                isActive
                  ? "bg-cyan-500/15 border-cyan-500 border-2"
                  : "border-transparent",
                !isActive && isCompleted && "bg-green-500",
                !isActive && !isCompleted && "bg-gray-300 dark:bg-gray-600",
                !canPress && "opacity-60",
              )}
            >
              <Text
                numberOfLines={1}
                className={cn(
                  "text-xs font-bold",
                  isActive ? "text-cyan-700 dark:text-cyan-300" : "hidden",
                )}
              >
                {index + 1}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
