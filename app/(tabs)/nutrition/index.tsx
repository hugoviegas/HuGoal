/*
Phase 4 Test Checklist
- [ ] Send image in chat -> AI returns editable food items
- [ ] Chat image is stored in Firebase Storage temp path
- [ ] Pantry page can list, create, edit and delete items
- [ ] AI nutrition label scan pre-fills pantry form
- [ ] Chat AI uses pantry values for matched item names
- [ ] Pantry tutorial modal shows only on first visit
*/
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { format } from "date-fns";
import { CalendarDays, Flame } from "lucide-react-native";

import {
  NutritionChat,
  useNutritionChatPanel,
} from "@/components/nutrition/NutritionChat";
import { MacroWidget } from "@/components/nutrition/MacroWidget";
import { NutritionWeekCalendar } from "@/components/nutrition/NutritionWeekCalendar";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import {
  analyzeNutritionChatText,
  type NutritionChatItem,
} from "@/lib/ai/nutritionChatAI";
import {
  analyzeMealImageToChatItems,
  uploadNutritionImageTemp,
} from "@/lib/ai/nutritionImageAI";
import type { AudioRecordedPayload } from "@/components/nutrition/ChatInputBar";
import { listPantryItems } from "@/lib/firestore/pantry";
import {
  loadTodayNutritionChatMessages,
  saveTodayNutritionChatMessages,
} from "@/lib/firestore/nutritionChat";
import {
  createNutritionLog,
  listNutritionLogs,
  listWaterLogs,
} from "@/lib/firestore/nutrition";
import { calculateDailyGoal } from "@/lib/macro-calculator";
import { generateId } from "@/lib/utils";
import { formatLocalDateKey } from "@/lib/workouts/weekly-schedule";
import { useAuthStore } from "@/stores/auth.store";
import { useNutritionStore } from "@/stores/nutrition.store";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import type { ChatMessage } from "@/stores/nutrition.store";
import type { MealType, NutritionItem, NutritionLog } from "@/types";

type UserCoachMessageType = "user_text" | "user_audio_transcript";

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  pre_workout: "Pre-workout",
  post_workout: "Post-workout",
};

function dateKeyFromIso(isoDate: string): string {
  return isoDate.slice(0, 10);
}

function computeCurrentStreak(loggedDateKeys: string[]): string[] {
  const streak: string[] = [];
  const loggedSet = new Set(loggedDateKeys);
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (true) {
    const dateKey = formatLocalDateKey(cursor);
    if (!loggedSet.has(dateKey)) {
      break;
    }
    streak.push(dateKey);
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function inferMealTypeFromTime(date = new Date()): MealType {
  const hour = date.getHours();

  if (hour < 10) return "breakfast";
  if (hour < 14) return "lunch";
  if (hour < 17) return "snack";
  if (hour < 22) return "dinner";
  return "snack";
}

function inferServingSizeInGrams(quantity: number, unit: string): number {
  const q = Math.max(0, quantity);
  const normalized = unit.trim().toLowerCase();

  if (["g", "gram", "grams", "gr", "grama", "gramas"].includes(normalized)) {
    return Math.max(1, q);
  }
  if (["kg", "quilo", "kilo"].includes(normalized)) {
    return Math.max(1, q * 1000);
  }
  if (["ml", "mililitro", "mililitros"].includes(normalized)) {
    return Math.max(1, q);
  }
  if (["cup", "xicara", "xicaras"].includes(normalized)) {
    return Math.max(1, q * 240);
  }
  if (["slice", "fatia", "fatias"].includes(normalized)) {
    return Math.max(1, q * 30);
  }
  if (["unit", "unidade", "piece", "peca", "pcs"].includes(normalized)) {
    return Math.max(1, q * 50);
  }
  if (["tbsp", "colher", "tablespoon"].includes(normalized)) {
    return Math.max(1, q * 15);
  }

  return Math.max(1, q * 100);
}

function toNutritionItemFromAi(item: NutritionChatItem): NutritionItem {
  return {
    food_name: item.name,
    serving_size_g: Math.round(
      inferServingSizeInGrams(item.quantity, item.unit),
    ),
    calories: Math.max(0, Math.round(item.calories)),
    protein_g: Math.max(0, Math.round(item.protein_g * 10) / 10),
    carbs_g: Math.max(0, Math.round(item.carbs_g * 10) / 10),
    fat_g: Math.max(0, Math.round(item.fat_g * 10) / 10),
    notes: `${item.quantity} ${item.unit}`,
    source: "ai_generated",
  };
}

function buildAiSummary(items: NutritionChatItem[]): string {
  const totalCalories = items.reduce((sum, item) => sum + item.calories, 0);
  return `I found ${items.length} item${items.length === 1 ? "" : "s"} (~${Math.round(totalCalories)} kcal). Review and edit before saving.`;
}

export default function NutritionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const isFocused = useIsFocused();

  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const showToast = useToastStore((s) => s.show);
  const colors = useThemeStore((s) => s.colors);
  const isDark = useThemeStore((s) => s.isDark);

  const todayLogs = useNutritionStore((s) => s.todayLogs);
  const todayTotals = useNutritionStore((s) => s.todayTotals);
  const dailyGoal = useNutritionStore((s) => s.dailyGoal);
  const isLoading = useNutritionStore((s) => s.isLoading);
  const selectedDate = useNutritionStore((s) => s.selectedDate);
  const streakDays = useNutritionStore((s) => s.streakDays);
  const chatMessages = useNutritionStore((s) => s.chatMessages);
  const setTodayLogs = useNutritionStore((s) => s.setTodayLogs);
  const setDailyGoal = useNutritionStore((s) => s.setDailyGoal);
  const setWater = useNutritionStore((s) => s.setWater);
  const setLoading = useNutritionStore((s) => s.setLoading);
  const setSelectedDate = useNutritionStore((s) => s.setSelectedDate);
  const setStreakDays = useNutritionStore((s) => s.setStreakDays);
  const setChatMessages = useNutritionStore((s) => s.setChatMessages);
  const addChatMessage = useNutritionStore((s) => s.addChatMessage);

  const [allLogs, setAllLogs] = useState<NutritionLog[]>([]);
  const [loggedDateKeys, setLoggedDateKeys] = useState<string[]>([]);
  const [sendingChat, setSendingChat] = useState(false);
  const [savingPendingItems, setSavingPendingItems] = useState(false);
  const [pendingAiItems, setPendingAiItems] = useState<NutritionChatItem[]>([]);
  const [editableTranscript, setEditableTranscript] = useState<{
    messageId: string;
    value: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const transcriptAutoAnalyzeTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const todayDateKey = formatLocalDateKey(new Date());
  const isViewingToday = selectedDate === todayDateKey;

  const {
    panelHeight,
    keyboardOffset,
    composerBottomPadding,
    panelExpanded,
    backdropOpacity,
    panelContentOpacity,
    panelPanHandlers,
    openPanel,
    closePanel,
  } = useNutritionChatPanel({
    insetsBottom: insets.bottom,
    windowHeight,
  });

  const selectedDateLabel = useMemo(() => {
    const parsed = new Date(`${selectedDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return selectedDate;
    }
    return format(parsed, "EEEE, MMMM d");
  }, [selectedDate]);

  const logsSummary = useMemo(() => {
    const totalItems = todayLogs.reduce(
      (sum, log) => sum + log.items.length,
      0,
    );

    const perMeal = todayLogs.reduce(
      (acc, log) => {
        const key = log.meal_type;
        const current = acc[key] ?? { calories: 0, entries: 0 };

        acc[key] = {
          calories: current.calories + log.total.calories,
          entries: current.entries + 1,
        };

        return acc;
      },
      {} as Partial<Record<MealType, { calories: number; entries: number }>>,
    );

    return {
      totalItems,
      perMeal,
    };
  }, [todayLogs]);

  const appendChat = useCallback(
    (message: Omit<ChatMessage, "id" | "createdAt">): ChatMessage => {
      const created: ChatMessage = {
        id: generateId(),
        createdAt: new Date().toISOString(),
        ...message,
      };

      addChatMessage(created);
      return created;
    },
    [addChatMessage],
  );

  const clearTranscriptAutoAnalyzeTimer = useCallback(() => {
    if (!transcriptAutoAnalyzeTimerRef.current) {
      return;
    }

    clearTimeout(transcriptAutoAnalyzeTimerRef.current);
    transcriptAutoAnalyzeTimerRef.current = null;
  }, []);

  const loadNutritionBase = useCallback(async () => {
    if (!user?.uid) {
      setAllLogs([]);
      setTodayLogs([]);
      setLoggedDateKeys([]);
      setStreakDays([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const logs = await listNutritionLogs(user.uid);
      const uniqueDateKeys = Array.from(
        new Set(logs.map((log) => dateKeyFromIso(log.logged_at))),
      );
      const streak = computeCurrentStreak(uniqueDateKeys);

      setAllLogs(logs);
      setLoggedDateKeys(uniqueDateKeys);
      setStreakDays(streak);

      if (profile) {
        setDailyGoal(calculateDailyGoal(profile));
      }
    } catch (loadErr) {
      const message =
        loadErr instanceof Error
          ? loadErr.message
          : "Failed to load nutrition data";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [
    profile,
    setDailyGoal,
    setLoading,
    setStreakDays,
    setTodayLogs,
    showToast,
    user?.uid,
  ]);

  const loadTodayChat = useCallback(async () => {
    if (!user?.uid) {
      setChatMessages([]);
      return;
    }

    const messages = await loadTodayNutritionChatMessages(user.uid);
    setChatMessages(messages);
  }, [setChatMessages, user?.uid]);

  useEffect(() => {
    if (!isFocused) return;
    void loadNutritionBase();
    void loadTodayChat();
  }, [isFocused, loadNutritionBase, loadTodayChat]);

  useEffect(() => {
    return () => {
      clearTranscriptAutoAnalyzeTimer();
    };
  }, [clearTranscriptAutoAnalyzeTimer]);

  useEffect(() => {
    const logsForSelectedDate = allLogs.filter(
      (log) => dateKeyFromIso(log.logged_at) === selectedDate,
    );
    setTodayLogs(logsForSelectedDate);
  }, [allLogs, selectedDate, setTodayLogs]);

  useEffect(() => {
    if (!user?.uid) {
      setWater(0);
      return;
    }

    let mounted = true;
    void listWaterLogs(user.uid, selectedDate)
      .then((waterLogs) => {
        if (!mounted) return;
        setWater(waterLogs.reduce((sum, row) => sum + row.amount_ml, 0));
      })
      .catch(() => {
        if (!mounted) return;
        setWater(0);
      });

    return () => {
      mounted = false;
    };
  }, [selectedDate, setWater, user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    void saveTodayNutritionChatMessages(user.uid, chatMessages);
  }, [chatMessages, user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;

    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = nextMidnight.getTime() - now.getTime() + 250;

    const timer = setTimeout(() => {
      clearTranscriptAutoAnalyzeTimer();
      setChatMessages([]);
      setPendingAiItems([]);
      setEditableTranscript(null);
      void saveTodayNutritionChatMessages(user.uid, []);
    }, msUntilMidnight);

    return () => {
      clearTimeout(timer);
    };
  }, [clearTranscriptAutoAnalyzeTimer, setChatMessages, user?.uid]);

  const syncChatDateBoundary = useCallback(async () => {
    if (!user?.uid) {
      return;
    }

    const currentDayMessages = await loadTodayNutritionChatMessages(user.uid);
    const currentStoreMessages = useNutritionStore.getState().chatMessages;

    if (currentDayMessages.length === 0 && currentStoreMessages.length > 0) {
      setChatMessages([]);
      setPendingAiItems([]);
      setEditableTranscript(null);
      clearTranscriptAutoAnalyzeTimer();
    }
  }, [clearTranscriptAutoAnalyzeTimer, setChatMessages, user?.uid]);

  const runChatAnalysisFromMessage = useCallback(
    async (
      message: string,
      messageType: UserCoachMessageType,
      appendUserMessage = true,
    ) => {
      if (!user?.uid || !isViewingToday || sendingChat) {
        return;
      }

      const trimmedMessage = message.trim();
      if (!trimmedMessage) {
        return;
      }

      await syncChatDateBoundary();

      if (appendUserMessage) {
        appendChat({ type: messageType, text: trimmedMessage });
      }

      setSendingChat(true);

      try {
        const pantryItemsRaw = await listPantryItems(user.uid);
        const pantryItems = pantryItemsRaw.map((item) => {
          const factor = Math.max(1, item.serving_size_g) / 100;

          return {
            id: item.id,
            name: item.name,
            calories: Math.round(item.calories_per_100g * factor),
            protein_g: Math.round(item.protein_per_100g * factor * 10) / 10,
            carbs_g: Math.round(item.carbs_per_100g * factor * 10) / 10,
            fat_g: Math.round(item.fat_per_100g * factor * 10) / 10,
            serving_size_g: item.serving_size_g,
          };
        });

        const { provider, items } = await analyzeNutritionChatText({
          preferredProvider: profile?.preferred_ai_provider ?? "gemini",
          userMessage: trimmedMessage,
          pantryItems,
          previousItems: pendingAiItems,
        });

        setPendingAiItems(items);
        appendChat({
          type: "ai_response",
          text: `Using ${provider}, ${buildAiSummary(items)}`,
        });
        appendChat({
          type: "ai_food_items",
          text: "Detected items are ready for review below.",
          payload: { items },
        });
      } catch (chatError) {
        const messageText =
          chatError instanceof Error
            ? chatError.message
            : "Unable to analyze message right now.";

        appendChat({ type: "ai_response", text: messageText });
        showToast(messageText, "error");
      } finally {
        setSendingChat(false);
      }
    },
    [
      appendChat,
      isViewingToday,
      pendingAiItems,
      profile?.preferred_ai_provider,
      sendingChat,
      showToast,
      syncChatDateBoundary,
      user?.uid,
    ],
  );

  const handleSendChatMessage = useCallback(async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    await runChatAnalysisFromMessage(trimmed, "user_text", true);
  }, [runChatAnalysisFromMessage]);

  const handleAudioRecorded = useCallback(
    async ({ uri: localUri, transcript: rawTranscript }: AudioRecordedPayload) => {
      if (!user?.uid || !isViewingToday) {
        return;
      }

      try {
        setSendingChat(true);
        await syncChatDateBoundary();

        const transcript = rawTranscript?.trim() ?? "";

        const messageText = transcript || "Audio enviado. Ajuste o texto manualmente se necessario.";

        appendChat({
          type: "user_audio_transcript",
          text: messageText,
          payload: {
            audio: {
              localUri,
            },
          },
        });

        if (transcript) {
          await runChatAnalysisFromMessage(transcript, "user_audio_transcript", false);
        } else {
          showToast("Audio capturado. Sem transcricao automatica neste build.", "info");
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to process audio message";
        showToast(message, "error");
      } finally {
        setSendingChat(false);
      }
    },
    [
      appendChat,
      isViewingToday,
      runChatAnalysisFromMessage,
      showToast,
      syncChatDateBoundary,
      user?.uid,
    ],
  );

  const handleImageSelected = useCallback(
    async (localUri: string) => {
      if (!user?.uid || !isViewingToday || sendingChat) {
        return;
      }

      let base64 = "";

      try {
        base64 = await FileSystem.readAsStringAsync(localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } catch {
        showToast("Could not read selected image", "error");
        return;
      }

      if (!base64) {
        showToast("Could not read selected image", "error");
        return;
      }

      setSendingChat(true);

      try {
        await syncChatDateBoundary();

        let storagePath: string | undefined;
        let downloadUrl: string | undefined;
        let mimeType: string | undefined;

        try {
          const uploaded = await uploadNutritionImageTemp(user.uid, localUri);
          storagePath = uploaded.storagePath;
          downloadUrl = uploaded.downloadUrl;
          mimeType = uploaded.mimeType;
        } catch {
          // Upload is best-effort for temporary media history.
        }

        appendChat({
          type: "user_image",
          text: "Meal image",
          payload: {
            image: {
              localUri,
              storagePath,
              downloadUrl,
              mimeType,
            },
          },
        });

        const pantryItems = await listPantryItems(user.uid);
        const detectedItems = await analyzeMealImageToChatItems(
          base64,
          pantryItems,
          profile?.preferred_ai_provider ?? "gemini",
        );

        setPendingAiItems(detectedItems);
        appendChat({
          type: "ai_response",
          text: `Image analyzed. ${buildAiSummary(detectedItems)}`,
        });
        appendChat({
          type: "ai_food_items",
          text: "Detected items are ready for review below.",
          payload: { items: detectedItems },
        });
      } catch (error) {
        const messageText =
          error instanceof Error
            ? error.message
            : "Unable to analyze this image right now.";

        appendChat({ type: "ai_response", text: messageText });
        showToast(messageText, "error");
      } finally {
        setSendingChat(false);
      }
    },
    [
      appendChat,
      isViewingToday,
      profile?.preferred_ai_provider,
      sendingChat,
      showToast,
      syncChatDateBoundary,
      user?.uid,
    ],
  );

  const submitTranscriptForAnalysis = useCallback(
    async (messageId: string, transcriptText: string) => {
      const normalized = transcriptText.trim();
      if (!normalized) {
        showToast("Transcript is empty. Try recording again.", "error");
        return;
      }

      const currentStoreMessages = useNutritionStore.getState().chatMessages;
      setChatMessages(
        currentStoreMessages.map((entry) =>
          entry.id === messageId
            ? {
                ...entry,
                text: normalized,
              }
            : entry,
        ),
      );

      setEditableTranscript((current) =>
        current?.messageId === messageId ? null : current,
      );

      await runChatAnalysisFromMessage(
        normalized,
        "user_audio_transcript",
        false,
      );
    },
    [runChatAnalysisFromMessage, setChatMessages, showToast],
  );

  const handleChangeEditableTranscript = useCallback(
    (value: string) => {
      clearTranscriptAutoAnalyzeTimer();
      setEditableTranscript((current) =>
        current
          ? {
              ...current,
              value,
            }
          : null,
      );
    },
    [clearTranscriptAutoAnalyzeTimer],
  );

  const handleSubmitEditableTranscript = useCallback(async () => {
    if (!editableTranscript) {
      return;
    }

    clearTranscriptAutoAnalyzeTimer();
    await submitTranscriptForAnalysis(
      editableTranscript.messageId,
      editableTranscript.value,
    );
  }, [
    clearTranscriptAutoAnalyzeTimer,
    editableTranscript,
    submitTranscriptForAnalysis,
  ]);


  const handlePendingItemChange = useCallback(
    (index: number, patch: Partial<NutritionChatItem>) => {
      setPendingAiItems((current) =>
        current.map((item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                ...patch,
              }
            : item,
        ),
      );
    },
    [],
  );

  const handleSaveAllPending = useCallback(async () => {
    if (!user?.uid || !isViewingToday || pendingAiItems.length === 0) {
      return;
    }

    setSavingPendingItems(true);

    try {
      const mealType = inferMealTypeFromTime(new Date());
      const nutritionItems: NutritionItem[] = pendingAiItems.map((item) =>
        toNutritionItemFromAi(item),
      );

      await createNutritionLog(user.uid, {
        meal_type: mealType,
        items: nutritionItems,
        notes: "Saved from nutrition coach chat",
      });

      setPendingAiItems([]);
      appendChat({
        type: "ai_response",
        text: `Saved ${nutritionItems.length} item${nutritionItems.length === 1 ? "" : "s"} to ${MEAL_TYPE_LABELS[mealType]}.`,
      });

      showToast("Nutrition items saved", "success");
      await loadNutritionBase();
    } catch (saveError) {
      const messageText =
        saveError instanceof Error
          ? saveError.message
          : "Failed to save nutrition items";

      showToast(messageText, "error");
    } finally {
      setSavingPendingItems(false);
    }
  }, [
    appendChat,
    isViewingToday,
    loadNutritionBase,
    pendingAiItems,
    showToast,
    user?.uid,
  ]);


  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <Spinner size="lg" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 14,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          backgroundColor: colors.card,
          borderBottomColor: colors.cardBorder,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 11,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isDark
                  ? "rgba(14,165,176,0.15)"
                  : "rgba(14,165,176,0.10)",
              }}
            >
              <Flame size={17} color={colors.primary} />
            </View>
            <View>
              <Text style={[typography.h3, { color: colors.foreground }]}>
                {streakDays.length}d
              </Text>
              <Text
                style={[typography.caption, { color: colors.mutedForeground }]}
              >
                nutrition streak
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => setSelectedDate(todayDateKey)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              height: 36,
              borderRadius: 11,
              paddingHorizontal: 10,
              backgroundColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.04)",
            }}
            accessibilityRole="button"
            accessibilityLabel="Return to today"
          >
            <CalendarDays size={16} color={isDark ? "#9ca3af" : "#64748b"} />
            <Text
              style={[typography.smallMedium, { color: colors.foreground }]}
            >
              Today
            </Text>
          </Pressable>
        </View>

        <NutritionWeekCalendar
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          loggedDateKeys={loggedDateKeys}
          streakDateKeys={streakDays}
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: 14,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 160,
          gap: spacing.md,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ gap: 2 }}>
            <Text
              style={[typography.caption, { color: colors.mutedForeground }]}
            >
              {selectedDateLabel}
            </Text>
            <Text style={[typography.h2, { color: colors.foreground }]}>
              Nutrition
            </Text>
          </View>

          {isViewingToday ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button
                size="sm"
                variant="outline"
                onPress={() => router.push("/nutrition/pantry")}
              >
                Pantry
              </Button>
              <Button size="sm" onPress={() => router.push("/nutrition/log")}>
                Log meal
              </Button>
            </View>
          ) : (
            <Text
              style={[typography.caption, { color: colors.mutedForeground }]}
            >
              Read-only history
            </Text>
          )}
        </View>

        <MacroWidget totals={todayTotals} goal={dailyGoal} />

        <View
          style={{
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
            borderWidth: 1,
            borderRadius: 12,
            padding: spacing.sm,
            gap: spacing.xs,
          }}
        >
          <Text style={[typography.smallMedium, { color: colors.foreground }]}>
            Day summary
          </Text>
          <Text style={[typography.small, { color: colors.mutedForeground }]}>
            {todayLogs.length} logs · {logsSummary.totalItems} items ·{" "}
            {Math.round(todayTotals.calories)} kcal
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(Object.keys(logsSummary.perMeal) as MealType[]).map(
              (mealType) => {
                const meal = logsSummary.perMeal[mealType];
                if (!meal) return null;

                return (
                  <View
                    key={mealType}
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: colors.cardBorder,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      backgroundColor: colors.background,
                    }}
                  >
                    <Text
                      style={[
                        typography.caption,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {MEAL_TYPE_LABELS[mealType]} {Math.round(meal.calories)}{" "}
                      kcal
                    </Text>
                  </View>
                );
              },
            )}
          </View>
        </View>

        {!isViewingToday ? (
          <View
            style={{
              backgroundColor: colors.secondary,
              borderColor: colors.cardBorder,
              borderWidth: 1,
              borderRadius: 12,
              padding: spacing.sm,
            }}
          >
            <Text
              style={[typography.small, { color: colors.secondaryForeground }]}
            >
              You are viewing a past day. Entries are read-only.
            </Text>
          </View>
        ) : null}

        {error ? (
          <View
            style={{
              backgroundColor: colors.destructive + "14",
              borderRadius: 12,
              padding: spacing.md,
              gap: spacing.xs,
              borderWidth: 1,
              borderColor: colors.destructive + "30",
            }}
          >
            <Text
              style={[typography.bodyMedium, { color: colors.destructive }]}
            >
              {error}
            </Text>
            <Button
              variant="outline"
              size="sm"
              onPress={() => void loadNutritionBase()}
            >
              Retry
            </Button>
          </View>
        ) : null}

      </ScrollView>

      <Animated.View
        pointerEvents={panelExpanded ? "box-none" : "none"}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "#000",
          opacity: backdropOpacity,
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={closePanel} />
      </Animated.View>

      <Animated.View
        style={{
          position: "absolute",
          bottom: keyboardOffset,
          left: 0,
          right: 0,
          height: panelHeight,
          overflow: "hidden",
          backgroundColor: colors.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.35 : 0.08,
          shadowRadius: 10,
          elevation: 10,
        }}
        {...panelPanHandlers}
      >
        <NutritionChat
          messages={chatMessages}
          isLoading={sendingChat}
          onSendText={handleSendChatMessage}
          onAudioRecorded={handleAudioRecorded}
          onImageSelected={handleImageSelected}
          pendingItems={pendingAiItems}
          onChangePendingItem={handlePendingItemChange}
          onSaveAll={handleSaveAllPending}
          savingAll={savingPendingItems}
          disabled={!isViewingToday}
          disabledReason="Chat is available only for today. Tap Today above to continue."
          editableTranscript={editableTranscript}
          onChangeEditableTranscript={handleChangeEditableTranscript}
          onSubmitEditableTranscript={handleSubmitEditableTranscript}
          submittingTranscript={sendingChat}
          expanded={panelExpanded}
          onTogglePanel={() => {
            if (panelExpanded) {
              closePanel();
            } else {
              openPanel();
            }
          }}
          panelContentOpacity={panelContentOpacity}
          composerBottomOffset={composerBottomPadding}
        />
      </Animated.View>
    </View>
  );
}
