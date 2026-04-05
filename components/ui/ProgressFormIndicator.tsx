import { useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { CircleCheck } from "lucide-react-native";
import { cn } from "@/lib/utils";

interface ProgressFormIndicatorProps {
  current: number;
  total: number;
  labels?: string[];
  className?: string;
  showPercentage?: boolean;
  showActions?: boolean;
  continueLabel?: string;
  finishLabel?: string;
  backLabel?: string;
  onContinue?: () => void;
  onBack?: () => void;
  disableContinue?: boolean;
  disableBack?: boolean;
  hideBackOnFirstStep?: boolean;
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
  showActions = false,
  continueLabel = "Continue",
  finishLabel = "Finish",
  backLabel = "Back",
  onContinue,
  onBack,
  disableContinue = false,
  disableBack = false,
  hideBackOnFirstStep = true,
}: ProgressFormIndicatorProps) {
  const safeTotal = Math.max(1, total);
  const safeCurrent = Math.max(1, Math.min(current, safeTotal));
  const hasBack = hideBackOnFirstStep ? safeCurrent > 1 : true;
  const isFinalStep = safeCurrent >= safeTotal;

  const dotGap = 24;
  const dotSize = 8;

  const totalDotsWidth = useMemo(() => {
    if (safeTotal <= 1) return dotSize;
    return safeTotal * dotSize + (safeTotal - 1) * dotGap;
  }, [safeTotal, dotGap, dotSize]);

  const indicatorWidth = useMemo(() => {
    if (safeTotal <= 1) return dotSize;
    const ratio = safeCurrent / safeTotal;
    return Math.max(dotSize, ratio * totalDotsWidth);
  }, [safeCurrent, safeTotal, totalDotsWidth, dotSize]);

  const widthAnim = useRef(new Animated.Value(indicatorWidth)).current;
  const backWidthAnim = useRef(new Animated.Value(hasBack ? 96 : 0)).current;
  const backOpacityAnim = useRef(new Animated.Value(hasBack ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(widthAnim, {
      toValue: indicatorWidth,
      useNativeDriver: false,
      friction: 8,
      tension: 90,
    }).start();
  }, [indicatorWidth, widthAnim]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backWidthAnim, {
        toValue: hasBack ? 96 : 0,
        duration: 220,
        useNativeDriver: false,
      }),
      Animated.timing(backOpacityAnim, {
        toValue: hasBack ? 1 : 0,
        duration: 180,
        useNativeDriver: false,
      }),
    ]).start();
  }, [hasBack, backOpacityAnim, backWidthAnim]);

  const percentage = Math.round((safeCurrent / safeTotal) * 100);
  const steps = Array.from({ length: safeTotal }, (_, i) => i + 1);

  return (
    <View className={cn("gap-4", className)}>
      <View className="items-center gap-3">
        <View className="relative w-full items-center">
          <View style={{ width: totalDotsWidth, alignSelf: "center" }}>
            <Animated.View
              className="absolute rounded-full bg-green-500"
              style={{
                left: 0,
                width: widthAnim,
                height: 14,
                borderRadius: 14,
                zIndex: -1,
              }}
            />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                height: 14,
              }}
            >
              {steps.map((step) => (
                <View
                  key={step}
                  className={cn(
                    "h-2 w-2 rounded-full",
                    step <= safeCurrent
                      ? "bg-cyan-500 dark:bg-cyan-400"
                      : "bg-gray-300 dark:bg-gray-600",
                  )}
                />
              ))}
            </View>
          </View>
        </View>

        {labels && labels.length > 0 ? (
          <View className="w-full flex-row justify-between">
            {steps.map((step) => (
              <Text
                key={`label-${step}`}
                className={cn(
                  "text-[11px]",
                  step === safeCurrent
                    ? "font-semibold text-cyan-600 dark:text-cyan-400"
                    : "text-gray-500 dark:text-gray-400",
                )}
              >
                {labels[step - 1] ?? `Step ${step}`}
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      {showPercentage && (
        <View className="w-full items-end">
          <Text className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">
            {percentage}%
          </Text>
        </View>
      )}

      {showActions ? (
        <View className="flex-row items-center gap-2">
          <Animated.View
            style={{
              width: backWidthAnim,
              opacity: backOpacityAnim,
              overflow: "hidden",
            }}
          >
            <Pressable
              disabled={!hasBack || disableBack}
              onPress={onBack}
              className={cn(
                "items-center justify-center rounded-full bg-gray-100 px-4 py-3 dark:bg-gray-800",
                (!hasBack || disableBack) && "opacity-50",
              )}
            >
              <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {backLabel}
              </Text>
            </Pressable>
          </Animated.View>

          <Pressable
            disabled={disableContinue}
            onPress={onContinue}
            className={cn(
              "flex-1 flex-row items-center justify-center gap-2 rounded-full bg-cyan-600 px-4 py-3 dark:bg-cyan-500",
              disableContinue && "opacity-60",
            )}
          >
            {isFinalStep ? <CircleCheck size={16} color="#ffffff" /> : null}
            <Text className="text-sm font-semibold text-white">
              {isFinalStep ? finishLabel : continueLabel}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
