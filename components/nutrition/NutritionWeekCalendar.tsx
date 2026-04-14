import { useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Flame } from "lucide-react-native";

import { useThemeStore } from "@/stores/theme.store";
import { typography } from "@/constants/typography";
import { formatLocalDateKey } from "@/lib/workouts/weekly-schedule";

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface WeekDayItem {
  key: string;
  dateKey: string;
  dayLabel: string;
  dayNumber: number;
  isToday: boolean;
  isLogged: boolean;
  isStreak: boolean;
}

type WeekPage = WeekDayItem[];

interface NutritionWeekCalendarProps {
  selectedDate: string;
  onSelectDate: (dateKey: string) => void;
  loggedDateKeys: string[];
  streakDateKeys: string[];
}

function toMondayFirstIndex(date: Date): number {
  const weekday = date.getDay();
  return weekday === 0 ? 6 : weekday - 1;
}

function startOfWeekMonday(date: Date): Date {
  const base = new Date(date);
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() - toMondayFirstIndex(base));
  return base;
}

export function NutritionWeekCalendar({
  selectedDate,
  onSelectDate,
  loggedDateKeys,
  streakDateKeys,
}: NutritionWeekCalendarProps) {
  const colors = useThemeStore((s) => s.colors);
  const isDark = useThemeStore((s) => s.isDark);
  const { width } = useWindowDimensions();

  const weekPagerWidth = Math.max(280, width - 32);
  const [weekOffset, setWeekOffset] = useState(1);
  const [initialWeekMonday] = useState(() => startOfWeekMonday(new Date()));
  const weekScrollRef = useRef<FlatList<WeekPage> | null>(null);

  const weekPages = useMemo(() => {
    const today = new Date();
    const loggedDateSet = new Set(loggedDateKeys);
    const streakDateSet = new Set(streakDateKeys);
    const offsets = [-1, 0, 1];

    return offsets.map((off) => {
      const monday = new Date(initialWeekMonday);
      monday.setDate(initialWeekMonday.getDate() + off * 7);

      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + index);
        const dateKey = formatLocalDateKey(date);

        return {
          key: `${off}-${dateKey}`,
          dateKey,
          dayLabel: WEEK_DAYS[index],
          dayNumber: date.getDate(),
          isToday: dateKey === formatLocalDateKey(today),
          isLogged: loggedDateSet.has(dateKey),
          isStreak: streakDateSet.has(dateKey),
        };
      });
    });
  }, [initialWeekMonday, loggedDateKeys, streakDateKeys]);

  return (
    <View>
      <FlatList
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        data={weekPages}
        initialScrollIndex={1}
        getItemLayout={(_, index) => ({
          length: weekPagerWidth,
          offset: weekPagerWidth * index,
          index,
        })}
        ref={weekScrollRef}
        keyExtractor={(_, index) => `week-${index}`}
        onMomentumScrollEnd={(event) => {
          const page = Math.round(
            event.nativeEvent.contentOffset.x / weekPagerWidth,
          );
          setWeekOffset(Math.max(0, Math.min(weekPages.length - 1, page)));
        }}
        onScrollToIndexFailed={(info) => {
          weekScrollRef.current?.scrollToOffset({
            offset: info.index * weekPagerWidth,
            animated: false,
          });
        }}
        renderItem={({ item: days, index: pageIndex }) => (
          <View
            key={`week-${pageIndex}`}
            style={{ width: weekPagerWidth, paddingHorizontal: 2 }}
          >
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              {days.map((item) => {
                const isSelected = item.dateKey === selectedDate;
                const isActive = item.isToday || isSelected;

                return (
                  <Pressable
                    key={item.key}
                    onPress={() => onSelectDate(item.dateKey)}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.dayLabel} ${item.dayNumber}${item.isToday ? ", today" : ""}${item.isLogged ? ", has nutrition logs" : ""}${item.isStreak ? ", nutrition streak" : ""}`}
                    style={{
                      alignItems: "center",
                      minWidth: 40,
                      paddingVertical: 4,
                    }}
                  >
                    <Text
                      style={{
                        ...typography.caption,
                        marginBottom: 5,
                        color: isActive
                          ? colors.primary
                          : isDark
                            ? "#4b5563"
                            : "#9ca3af",
                      }}
                    >
                      {item.dayLabel}
                    </Text>

                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: item.isLogged
                          ? item.isToday
                            ? colors.primary
                            : isDark
                              ? "rgba(34,196,213,0.22)"
                              : "rgba(14,165,176,0.14)"
                          : "transparent",
                        borderWidth:
                          isSelected || (!item.isLogged && isActive) ? 1.5 : 0,
                        borderColor: item.isToday
                          ? colors.primary
                          : "rgba(14,165,176,0.45)",
                      }}
                    >
                      <Text
                        style={{
                          ...typography.smallMedium,
                          color: item.isLogged
                            ? item.isToday
                              ? "#ffffff"
                              : colors.primary
                            : isActive
                              ? colors.primary
                              : isDark
                                ? "#d1d5db"
                                : "#374151",
                        }}
                      >
                        {item.dayNumber}
                      </Text>
                    </View>

                    <View
                      style={{
                        height: 12,
                        marginTop: 3,
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "row",
                        gap: 3,
                      }}
                    >
                      {item.isLogged ? (
                        <View
                          style={{
                            width: 4,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: isActive
                              ? colors.primary
                              : isDark
                                ? "#4b5563"
                                : "#cbd5e1",
                          }}
                        />
                      ) : null}

                      {item.isStreak ? (
                        <Flame size={10} color={colors.primary} />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      />

      <View style={{ marginTop: 2, alignItems: "center" }}>
        <Text style={[typography.caption, { color: colors.mutedForeground }]}>
          {weekOffset === 0
            ? "Previous week"
            : weekOffset === 1
              ? "Current week"
              : "Next week"}
        </Text>
      </View>
    </View>
  );
}
