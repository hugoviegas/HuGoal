import { useMemo, useState } from "react";
import {
  addDays,
  eachMonthOfInterval,
  eachYearOfInterval,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
  addMonths,
} from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react-native";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeOutUp,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Button } from "@/components/ui/Button";
import { useThemeStore } from "@/stores/theme.store";
import { cn } from "@/lib/utils";
import { toBirthDateValue } from "@/lib/profile-dates";

interface CalendarLumeProps {
  label?: string;
  value?: string | null;
  onChange: (value: string | null) => void;
  minDate?: Date;
  maxDate?: Date;
  helperText?: string;
  error?: string;
  allowClear?: boolean;
  disabled?: boolean;
  className?: string;
  containerClassName?: string;
  contentClassName?: string;
}

type Step = "year" | "month" | "day";

function parseValue(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );
}

function isWithinRange(date: Date, minDate?: Date, maxDate?: Date) {
  if (minDate && isBefore(date, startOfDay(minDate))) return false;
  if (maxDate && isAfter(date, endOfDay(maxDate))) return false;
  return true;
}

function buildYearRange(minDate?: Date, maxDate?: Date) {
  return eachYearOfInterval({
    start: startOfYear(minDate ?? new Date(1900, 0, 1)),
    end: endOfYear(maxDate ?? new Date(2100, 11, 31)),
  }).reverse();
}

export function CalendarLume({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  helperText,
  error,
  allowClear = false,
  disabled = false,
  className,
  containerClassName,
  contentClassName,
}: CalendarLumeProps) {
  const colors = useThemeStore((s) => s.colors);
  const isDark = useThemeStore((s) => s.isDark);
  const selectedDate = useMemo(() => parseValue(value), [value]);
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>("year");
  const [selectedYear, setSelectedYear] = useState<number>(
    (selectedDate ?? maxDate ?? new Date()).getFullYear(),
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    (selectedDate ?? maxDate ?? new Date()).getMonth(),
  );

  const visibleMonth = useMemo(
    () => new Date(selectedYear, selectedMonth, 1),
    [selectedYear, selectedMonth],
  );
  const today = new Date();
  const years = useMemo(
    () => buildYearRange(minDate, maxDate),
    [minDate, maxDate],
  );

  const months = useMemo(
    () =>
      eachMonthOfInterval({
        start: startOfYear(new Date(selectedYear, 0, 1)),
        end: endOfYear(new Date(selectedYear, 11, 31)),
      }),
    [selectedYear],
  );

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1 });
    const collection: Date[] = [];
    let day = start;

    while (day <= end) {
      collection.push(day);
      day = addDays(day, 1);
    }

    return collection;
  }, [visibleMonth]);

  const selectedText = selectedDate
    ? format(selectedDate, "dd MMM yyyy")
    : "Select a date";
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const openPicker = () => {
    const referenceDate = selectedDate ?? maxDate ?? today;
    setSelectedYear(referenceDate.getFullYear());
    setSelectedMonth(referenceDate.getMonth());
    setStep("year");
    setIsOpen(true);
  };

  const handleSelectDate = (date: Date) => {
    if (!isWithinRange(date, minDate, maxDate)) return;
    onChange(toBirthDateValue(date));
    setIsOpen(false);
  };

  const headerTitle =
    step === "year"
      ? "Select a year"
      : step === "month"
        ? `Year ${selectedYear}`
        : format(visibleMonth, "MMMM yyyy");

  return (
    <View className={cn("gap-1.5", containerClassName)}>
      {label ? (
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </Text>
      ) : null}

      <Pressable
        onPress={openPicker}
        disabled={disabled}
        className={cn(
          "flex-row items-center justify-between rounded-xl border px-4 py-3",
          error
            ? "border-red-500"
            : "border-light-border dark:border-dark-border",
          "bg-light-surface dark:bg-dark-surface",
          disabled && "opacity-60",
          className,
        )}
      >
        <View className="flex-row items-center gap-3">
          <CalendarDays size={18} color={colors.primary} />
          <Text
            className={cn(
              selectedDate
                ? "text-gray-900 dark:text-gray-100"
                : "text-gray-500 dark:text-gray-400",
            )}
          >
            {selectedText}
          </Text>
        </View>
        <Text className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {selectedDate ? format(selectedDate, "EEE") : "Birth date"}
        </Text>
      </Pressable>

      {helperText ? (
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          {helperText}
        </Text>
      ) : null}
      {error ? <Text className="text-xs text-red-500">{error}</Text> : null}

      <Modal
        transparent
        visible={isOpen}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <View className="flex-1 items-center justify-center px-4">
          <BlurView
            intensity={28}
            tint={isDark ? "dark" : "light"}
            className="absolute inset-0"
          />
          <Pressable
            className="absolute inset-0 bg-black/45"
            onPress={() => setIsOpen(false)}
          />

          <View
            className={cn(
              "w-full max-w-md overflow-hidden rounded-3xl border p-4",
              "bg-light-card dark:bg-dark-card",
              "border-light-border dark:border-dark-border",
              contentClassName,
            )}
            style={
              {
                shadowColor: "#000",
                shadowOpacity: 0.18,
                shadowRadius: 24,
                elevation: 8,
              } as ViewStyle
            }
          >
            <View className="flex-row items-center justify-between pb-4">
              <View>
                <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {headerTitle}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {allowClear
                    ? "Choose or clear your date"
                    : "Select your birth date"}
                </Text>
              </View>

              <View className="flex-row items-center gap-2">
                {allowClear && selectedDate ? (
                  <Pressable
                    accessibilityLabel="Clear birth date"
                    onPress={() => {
                      onChange(null);
                      setIsOpen(false);
                    }}
                    className="rounded-full p-2"
                  >
                    <X size={18} color={colors.mutedForeground} />
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityLabel="Previous month"
                  onPress={() => {
                    if (step !== "day") return;
                    const next = subMonths(
                      new Date(selectedYear, selectedMonth, 1),
                      1,
                    );
                    setSelectedYear(next.getFullYear());
                    setSelectedMonth(next.getMonth());
                  }}
                  className={cn(
                    "rounded-full p-2",
                    step !== "day" && "opacity-40",
                  )}
                  disabled={step !== "day"}
                >
                  <ChevronLeft size={18} color={colors.foreground} />
                </Pressable>
                <Pressable
                  accessibilityLabel="Next month"
                  onPress={() => {
                    if (step !== "day") return;
                    const next = addMonths(
                      new Date(selectedYear, selectedMonth, 1),
                      1,
                    );
                    setSelectedYear(next.getFullYear());
                    setSelectedMonth(next.getMonth());
                  }}
                  className={cn(
                    "rounded-full p-2",
                    step !== "day" && "opacity-40",
                  )}
                  disabled={step !== "day"}
                >
                  <ChevronRight size={18} color={colors.foreground} />
                </Pressable>
              </View>
            </View>

            <View className="mb-4 flex-row gap-2">
              <Button
                variant={step === "year" ? "primary" : "outline"}
                size="sm"
                onPress={() => setStep("year")}
              >
                Year
              </Button>
              <Button
                variant={step === "month" ? "primary" : "outline"}
                size="sm"
                onPress={() => setStep("month")}
              >
                Month
              </Button>
            </View>

            {step === "year" ? (
              <Animated.View
                key="year"
                entering={FadeInDown.duration(180)}
                exiting={FadeOutUp.duration(140)}
              >
                <ScrollView
                  style={{ maxHeight: 320 }}
                  contentContainerStyle={{ paddingBottom: 8 }}
                  showsVerticalScrollIndicator={false}
                >
                  <View className="flex-row flex-wrap">
                    {years.map((yearDate) => {
                      const year = yearDate.getFullYear();
                      const selected = year === selectedYear;
                      return (
                        <View key={year} className="mb-2 basis-1/3 px-1">
                          <Button
                            variant={selected ? "primary" : "outline"}
                            size="sm"
                            className="h-10"
                            onPress={() => {
                              setSelectedYear(year);
                              setStep("month");
                            }}
                          >
                            {String(year)}
                          </Button>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              </Animated.View>
            ) : null}

            {step === "month" ? (
              <Animated.View
                key="month"
                entering={FadeInDown.duration(180)}
                exiting={FadeOutUp.duration(140)}
              >
                <View className="flex-row flex-wrap">
                  {months.map((monthDate) => {
                    const monthIndex = monthDate.getMonth();
                    const selected = monthIndex === selectedMonth;
                    const firstDay = new Date(selectedYear, monthIndex, 1);
                    const inRange = isWithinRange(firstDay, minDate, maxDate);

                    return (
                      <View
                        key={monthDate.toISOString()}
                        className="mb-2 basis-1/3 px-1"
                      >
                        <Button
                          variant={selected ? "primary" : "outline"}
                          size="sm"
                          className="h-12"
                          disabled={!inRange}
                          onPress={() => {
                            setSelectedMonth(monthIndex);
                            setStep("day");
                          }}
                        >
                          {format(monthDate, "MMM")}
                        </Button>
                      </View>
                    );
                  })}
                </View>
              </Animated.View>
            ) : null}

            {step === "day" ? (
              <Animated.View
                key="day"
                entering={FadeInUp.duration(180)}
                exiting={FadeOutUp.duration(140)}
              >
                <View className="pb-2">
                  <Text className="text-center text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {format(visibleMonth, "MMMM yyyy")}
                  </Text>
                </View>
                <View className="flex-row pb-2">
                  {weekdays.map((dayLabel) => (
                    <Text
                      key={dayLabel}
                      className="flex-1 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                    >
                      {dayLabel}
                    </Text>
                  ))}
                </View>

                <View className="flex-row flex-wrap">
                  {days.map((day) => {
                    const inMonth = isSameMonth(day, visibleMonth);
                    const isSelected = selectedDate
                      ? isSameDay(day, selectedDate)
                      : false;
                    const isCurrentDay = isSameDay(day, today);
                    const disabledDay = !isWithinRange(day, minDate, maxDate);

                    return (
                      <Pressable
                        key={day.toISOString()}
                        onPress={() => handleSelectDate(day)}
                        disabled={disabledDay}
                        accessibilityLabel={format(day, "EEEE, dd MMMM yyyy")}
                        className="mb-2 basis-[14.2857%] items-center justify-center"
                      >
                        <View
                          className={cn(
                            "h-10 w-10 items-center justify-center rounded-full border",
                            isSelected
                              ? "border-cyan-500 bg-cyan-500"
                              : isCurrentDay
                                ? "border-cyan-500/50 bg-cyan-500/10"
                                : "border-transparent",
                            !inMonth && "opacity-40",
                            disabledDay && "opacity-25",
                          )}
                        >
                          <Text
                            className={cn(
                              "text-sm font-semibold",
                              isSelected
                                ? "text-white"
                                : "text-gray-900 dark:text-gray-100",
                            )}
                          >
                            {format(day, "d")}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                <View className="pt-2">
                  <Text className="text-xs text-gray-500 dark:text-gray-400">
                    Dates after your 18th birthday are disabled.
                  </Text>
                </View>
              </Animated.View>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}
