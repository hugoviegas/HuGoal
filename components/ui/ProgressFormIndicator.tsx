import { View, Text } from "react-native";
import { cn } from "@/lib/utils";

interface ProgressFormIndicatorProps {
  current: number;
  total: number;
  labels?: string[];
  className?: string;
  showPercentage?: boolean;
}

/**
 * ProgressFormIndicator - Shows form progress with step indicators
 *
 * @example
 * <ProgressFormIndicator current={2} total={5} labels={['Info', 'Account', 'Preferences', 'Settings', 'Review']} />
 * <ProgressFormIndicator current={1} total={3} showPercentage />
 */
export function ProgressFormIndicator({
  current,
  total,
  labels,
  className,
  showPercentage = false,
}: ProgressFormIndicatorProps) {
  const percentage = Math.round((current / total) * 100);
  const steps = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <View className={cn("gap-3", className)}>
      {/* Progress bar */}
      <View className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <View
          className="h-full bg-cyan-500 dark:bg-cyan-600 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </View>

      {/* Step indicators */}
      <View className="flex-row gap-2 justify-between">
        {steps.map((step) => (
          <View key={step} className="flex-1 gap-1.5">
            <View
              className={cn(
                "flex-1 rounded-lg",
                step <= current
                  ? "bg-cyan-500 dark:bg-cyan-600"
                  : "bg-gray-200 dark:bg-gray-700",
              )}
              style={{ height: 6 }}
            />
            {labels && labels[step - 1] && (
              <Text className="text-xs text-center text-gray-600 dark:text-gray-400">
                {labels[step - 1]}
              </Text>
            )}
          </View>
        ))}
      </View>

      {/* Percentage or step count */}
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Step {current} of {total}
        </Text>
        {showPercentage && (
          <Text className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">
            {percentage}%
          </Text>
        )}
      </View>
    </View>
  );
}
