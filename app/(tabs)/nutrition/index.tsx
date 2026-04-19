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
import { PageHeader } from "@/components/shared/PageHeader";
import { useNutritionChatPanel } from "@/components/nutrition/NutritionChat";
import { MacroSummary } from "@/components/nutrition/MacroSummary";
import { MealSection } from "@/components/nutrition/MealSection";
import { NutritionWeekCalendar } from "@/components/nutrition/NutritionWeekCalendar";
import { WaterTracker } from "@/components/nutrition/WaterTracker";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { radius } from "@/constants/radius";
import { typography } from "@/constants/typography";
import { elevation } from "@/constants/elevation";
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
  addWaterLog,
  createNutritionLog,
  listNutritionLogs,
  listWaterLogs,
} from "@/lib/firestore/nutrition";
import { calculateDailyGoal } from "@/lib/macro-calculator";
import { generateId } from "@/lib/utils";
import { formatLocalDateKey } from "@/lib/workouts/weekly-schedule";
import { useAuthStore } from "@/stores/auth.store";
import { useNavigationStore } from "@/stores/navigation.store";
import { useNutritionStore } from "@/stores/nutrition.store";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import type { ChatMessage } from "@/stores/nutrition.store";
import type { MealType, NutritionItem, NutritionLog } from "@/types";
import {
  BookOpen,
  CalendarDays,
  Clock3,
  Droplets,
  Flame,
  History,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react-native";

type UserCoachMessageType = "user_text" | "user_audio_transcript";

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  pre_workout: "Pre-workout",
  post_workout: "Post-workout",
};

const MEAL_DISPLAY_ORDER: MealType[] = [
  "breakfast",
  "lunch",
  "snack",
  "dinner",
  "pre_workout",
  "post_workout",
];

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

function toNutritionItemFromAi(
  item: NutritionChatItem,
  reviewSessionId?: string,
): NutritionItem {
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
    ai_suggested: true,
    confidence:
      item.confidence === "high"
        ? 0.95
        : item.confidence === "medium"
          ? 0.8
          : 0.6,
    review_session_id: reviewSessionId,
  };
}

function buildAiSummary(items: NutritionChatItem[]): string {
  const totalCalories = items.reduce((sum, item) => sum + item.calories, 0);
  return `I found ${items.length} item${items.length === 1 ? "" : "s"} (~${Math.round(totalCalories)} kcal). Review and edit before saving.`;
}

function formatLogTime(loggedAt: string): string {
  const parsed = new Date(loggedAt);
  if (Number.isNaN(parsed.getTime())) {
    return loggedAt;
  }

  return format(parsed, "HH:mm");
}

function sumNutritionItems(items: NutritionChatItem[]) {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein_g: acc.protein_g + item.protein_g,
      carbs_g: acc.carbs_g + item.carbs_g,
      fat_g: acc.fat_g + item.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
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
  const waterMl = useNutritionStore((s) => s.waterMl);
  const isLoading = useNutritionStore((s) => s.isLoading);
  const selectedDate = useNutritionStore((s) => s.selectedDate);
  const streakDays = useNutritionStore((s) => s.streakDays);
  const chatMessages = useNutritionStore((s) => s.chatMessages);
  const setTodayLogs = useNutritionStore((s) => s.setTodayLogs);
  const setDailyGoal = useNutritionStore((s) => s.setDailyGoal);
  const setWater = useNutritionStore((s) => s.setWater);
  const lastFetchedAt = useNutritionStore((s) => s.lastFetchedAt);
  const setLoading = useNutritionStore((s) => s.setLoading);
  const setLastFetchedAt = useNutritionStore((s) => s.setLastFetchedAt);
  const setSelectedDate = useNutritionStore((s) => s.setSelectedDate);
  const setStreakDays = useNutritionStore((s) => s.setStreakDays);
  const setChatMessages = useNutritionStore((s) => s.setChatMessages);
  const addChatMessage = useNutritionStore((s) => s.addChatMessage);

  const NUTRITION_CACHE_TTL_MS = 5 * 60 * 1000;

  const [allLogs, setAllLogs] = useState<NutritionLog[]>([]);
  const [loggedDateKeys, setLoggedDateKeys] = useState<string[]>([]);
  const [sendingChat, setSendingChat] = useState(false);
  const [savingPendingItems, setSavingPendingItems] = useState(false);
  const [pendingAiItems, setPendingAiItems] = useState<NutritionChatItem[]>([]);
  const [reviewSheetVisible, setReviewSheetVisible] = useState(false);
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
    EXPANDED_H,
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

  const [isFullscreen, setIsFullscreen] = useState(false);
  const topBarAnim = useRef(new Animated.Value(0)).current;
  const headerHeightRef = useRef(100);

  const enterFullscreen = useCallback(() => {
    setIsFullscreen(true);
    panelHeight.setValue(windowHeight);
    composerBottomPadding.setValue(insets.bottom);
    Animated.timing(topBarAnim, {
      toValue: -headerHeightRef.current,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [
    panelHeight,
    composerBottomPadding,
    insets.bottom,
    topBarAnim,
    windowHeight,
  ]);

  const exitFullscreen = useCallback(() => {
    setIsFullscreen(false);
    panelHeight.setValue(EXPANDED_H);
    composerBottomPadding.setValue(80);
    Animated.timing(topBarAnim, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [panelHeight, composerBottomPadding, EXPANDED_H, topBarAnim]);

  const setNavbarVisible = useNavigationStore((s) => s.setNavbarVisible);

  useEffect(() => {
    if (isFullscreen) {
      setNavbarVisible(false);
      return () => setNavbarVisible(true);
    }
    setNavbarVisible(true);
  }, [isFullscreen, setNavbarVisible]);

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

  const mealSections = useMemo(() => {
    const grouped: Record<MealType, NutritionItem[]> = {
      breakfast: [],
      lunch: [],
      snack: [],
      dinner: [],
      pre_workout: [],
      post_workout: [],
    };

    for (const log of todayLogs) {
      grouped[log.meal_type].push(...log.items);
    }

    return MEAL_DISPLAY_ORDER.map((mealType) => ({
      mealType,
      items: grouped[mealType],
    }));
  }, [todayLogs]);

  const mealSectionsWithSummary = useMemo(
    () =>
      mealSections.map((section) => ({
        ...section,
        calories: section.items.reduce((sum, item) => sum + item.calories, 0),
      })),
    [mealSections],
  );

  const latestLog = useMemo(() => todayLogs[0] ?? null, [todayLogs]);

  const pendingReviewTotals = useMemo(
    () => sumNutritionItems(pendingAiItems),
    [pendingAiItems],
  );

  const goalProgress = Math.min(
    todayTotals.calories / Math.max(dailyGoal.calories, 1),
    1,
  );

  const mealCoverage = mealSections.filter(
    (section) => section.items.length > 0,
  ).length;

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
      setLastFetchedAt(Date.now());
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
    setLastFetchedAt,
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
    const isFresh =
      lastFetchedAt !== null &&
      Date.now() - lastFetchedAt < NUTRITION_CACHE_TTL_MS;
    if (!isFresh) {
      void loadNutritionBase();
      void loadTodayChat();
    }
  }, [
    isFocused,
    lastFetchedAt,
    NUTRITION_CACHE_TTL_MS,
    loadNutritionBase,
    loadTodayChat,
  ]);

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

  const handleSendChatMessage = useCallback(
    async (message: string) => {
      const trimmed = message.trim();
      if (!trimmed) {
        return;
      }

      await runChatAnalysisFromMessage(trimmed, "user_text", true);
    },
    [runChatAnalysisFromMessage],
  );

  const handleAudioRecorded = useCallback(
    async ({
      uri: localUri,
      transcript: rawTranscript,
    }: AudioRecordedPayload) => {
      if (!user?.uid || !isViewingToday) {
        return;
      }

      try {
        setSendingChat(true);
        await syncChatDateBoundary();

        const transcript = rawTranscript?.trim() ?? "";

        const messageText =
          transcript ||
          "Audio enviado. Ajuste o texto manualmente se necessario.";

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
          await runChatAnalysisFromMessage(
            transcript,
            "user_audio_transcript",
            false,
          );
        } else {
          showToast(
            "Audio capturado. Sem transcricao automatica neste build.",
            "info",
          );
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
      const now = new Date().toISOString();
      const reviewSessionId = generateId();
      const mealType = inferMealTypeFromTime(new Date());
      const nutritionItems: NutritionItem[] = pendingAiItems.map((item) =>
        toNutritionItemFromAi(item, reviewSessionId),
      );

      await createNutritionLog(user.uid, {
        meal_type: mealType,
        items: nutritionItems,
        notes: "Saved from nutrition coach chat",
        confirmed_at: now,
        saved_at: now,
        metadata: {
          source: "nutrition_review",
          review_session_id: reviewSessionId,
          is_final: true,
        },
      });

      setPendingAiItems([]);
      setReviewSheetVisible(false);
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

  const handleAddWaterQuick = useCallback(
    async (ml: number) => {
      if (!user?.uid || !isViewingToday || ml <= 0) {
        return;
      }

      try {
        await addWaterLog(user.uid, selectedDate, ml);
        setWater(waterMl + ml);
      } catch {
        showToast("Failed to add water", "error");
      }
    },
    [isViewingToday, selectedDate, setWater, showToast, user?.uid, waterMl],
  );

  // Retained temporarily while tab-level chat logic is being migrated to the global overlay.
  void isDark;
  void savingPendingItems;
  void keyboardOffset;
  void panelExpanded;
  void backdropOpacity;
  void panelContentOpacity;
  void panelPanHandlers;
  void openPanel;
  void closePanel;
  void enterFullscreen;
  void exitFullscreen;
  void handleSendChatMessage;
  void handleAudioRecorded;
  void handleImageSelected;
  void handleChangeEditableTranscript;
  void handleSubmitEditableTranscript;
  void handlePendingItemChange;
  void handleSaveAllPending;

  if (isLoading && todayLogs.length === 0) {
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
      <Animated.View
        onLayout={(e) => {
          headerHeightRef.current = e.nativeEvent.layout.height;
        }}
        style={{ transform: [{ translateY: topBarAnim }], zIndex: 10 }}
      >
        <PageHeader
          title="Nutrition"
          streakCount={streakDays.length}
          onSettingsPress={() => router.push("/(tabs)/nutrition/settings")}
          onTodayPress={
            !isViewingToday ? () => setSelectedDate(todayDateKey) : undefined
          }
          calendarSlot={
            <NutritionWeekCalendar
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              loggedDateKeys={loggedDateKeys}
              streakDateKeys={streakDays}
            />
          }
        />
      </Animated.View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: 18,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 220,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            backgroundColor: colors.card,
            padding: 16,
            gap: 14,
            overflow: "hidden",
            ...elevation.sm,
          }}
        >
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: -26,
              right: -24,
              width: 110,
              height: 110,
              borderRadius: 999,
              backgroundColor: colors.primary + "15",
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              bottom: -30,
              left: -18,
              width: 88,
              height: 88,
              borderRadius: 999,
              backgroundColor: colors.accent + "10",
            }}
          />

          <View
            style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}
          >
            <View style={{ flex: 1, gap: 8 }}>
              <View
                style={{
                  alignSelf: "flex-start",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  backgroundColor: isViewingToday
                    ? colors.primary + "18"
                    : colors.secondary,
                }}
              >
                <CalendarDays size={13} color={colors.primary} />
                <Text
                  style={[
                    typography.caption,
                    { color: colors.primary, fontWeight: "700" },
                  ]}
                >
                  {isViewingToday ? "Live day" : "History mode"}
                </Text>
              </View>

              <Text style={[typography.h2, { color: colors.foreground }]}>
                {selectedDateLabel}
              </Text>
              <Text
                style={[typography.small, { color: colors.mutedForeground }]}
              >
                Track meals, hydration, and AI review in one place.
              </Text>
            </View>

            <View
              style={{
                borderRadius: 18,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: isViewingToday
                  ? colors.primary + "16"
                  : colors.secondary,
                borderWidth: 1,
                borderColor: isViewingToday
                  ? colors.primary + "30"
                  : colors.cardBorder,
              }}
            >
              <Text
                style={[
                  typography.caption,
                  { color: colors.mutedForeground, textAlign: "center" },
                ]}
              >
                {isViewingToday ? "Today" : "Read only"}
              </Text>
              <Text
                style={[
                  typography.smallMedium,
                  { color: colors.foreground, textAlign: "center" },
                ]}
              >
                {todayLogs.length} logs
              </Text>
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {[
              { label: "Logs", value: String(todayLogs.length), icon: History },
              {
                label: "Items",
                value: String(logsSummary.totalItems),
                icon: UtensilsCrossed,
              },
              { label: "Streak", value: `${streakDays.length}d`, icon: Flame },
              {
                label: "Water",
                value: `${Math.round(waterMl)}ml`,
                icon: Droplets,
              },
            ].map((pill) => {
              const Icon = pill.icon;

              return (
                <View
                  key={pill.label}
                  style={{
                    flexGrow: 1,
                    flexBasis: "46%",
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    backgroundColor: colors.background,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    gap: 4,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Icon size={14} color={colors.primary} />
                    <Text
                      style={[
                        typography.caption,
                        { color: colors.mutedForeground, fontWeight: "700" },
                      ]}
                    >
                      {pill.label}
                    </Text>
                  </View>
                  <Text
                    style={[
                      typography.smallMedium,
                      { color: colors.foreground },
                    ]}
                  >
                    {pill.value}
                  </Text>
                </View>
              );
            })}
          </View>

          <View
            style={{
              gap: 8,
              borderRadius: 18,
              backgroundColor: colors.background,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              padding: 12,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View>
                <Text
                  style={[
                    typography.caption,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Calorie pace
                </Text>
                <Text
                  style={[typography.smallMedium, { color: colors.foreground }]}
                >
                  {Math.round(todayTotals.calories)} /{" "}
                  {Math.round(dailyGoal.calories)} kcal
                </Text>
              </View>
              <Text
                style={[typography.caption, { color: colors.mutedForeground }]}
              >
                {Math.round(goalProgress * 100)}%
              </Text>
            </View>

            <View
              style={{
                height: 8,
                borderRadius: 999,
                backgroundColor: colors.cardBorder,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: 8,
                  borderRadius: 999,
                  width: `${Math.min(goalProgress * 100, 100)}%`,
                  backgroundColor: colors.primary,
                }}
              />
            </View>
          </View>

          <MacroSummary totals={todayTotals} goal={dailyGoal} />

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {[
              {
                label: "Log meal",
                hint: "Open the meal editor",
                icon: UtensilsCrossed,
                onPress: () => router.push("/nutrition/log"),
                tone: colors.primary,
              },
              {
                label: "Food library",
                hint: "Reuse saved foods",
                icon: BookOpen,
                onPress: () => router.push("/nutrition/food-library"),
                tone: colors.accent,
              },
              {
                label: "History",
                hint: "Review previous days",
                icon: History,
                onPress: () => router.push("/nutrition/history"),
                tone: colors.destructive,
              },
              {
                label: pendingAiItems.length > 0 ? "Review AI" : "Water +250",
                hint:
                  pendingAiItems.length > 0
                    ? "Confirm pending items"
                    : "Quick hydration add",
                icon: pendingAiItems.length > 0 ? Sparkles : Droplets,
                onPress:
                  pendingAiItems.length > 0
                    ? () => setReviewSheetVisible(true)
                    : () => handleAddWaterQuick(250),
                tone:
                  pendingAiItems.length > 0 ? colors.primary : colors.primary,
              },
            ].map((action) => {
              const Icon = action.icon;

              return (
                <Pressable
                  key={action.label}
                  onPress={action.onPress}
                  style={({ pressed }) => ({
                    flexBasis: "48%",
                    flexGrow: 1,
                    minHeight: 96,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: action.tone + "26",
                    backgroundColor: action.tone + (pressed ? "1F" : "14"),
                    padding: 14,
                    gap: 10,
                    opacity: isViewingToday ? 1 : 0.72,
                    justifyContent: "space-between",
                  })}
                  disabled={!isViewingToday && action.label !== "History"}
                >
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 12,
                      backgroundColor: colors.background,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={17} color={action.tone} />
                  </View>
                  <View style={{ gap: 2 }}>
                    <Text
                      style={[
                        typography.smallMedium,
                        { color: colors.foreground },
                      ]}
                    >
                      {action.label}
                    </Text>
                    <Text
                      style={[
                        typography.caption,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {action.hint}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View
          style={{
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            backgroundColor: colors.card,
            padding: 14,
            gap: 12,
            ...elevation.sm,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text
                style={[typography.smallMedium, { color: colors.foreground }]}
              >
                Hydration
              </Text>
              <Text
                style={[typography.caption, { color: colors.mutedForeground }]}
              >
                Quick adds from the dashboard
              </Text>
            </View>
            <Droplets size={18} color={colors.primary} />
          </View>
          <WaterTracker
            current={waterMl}
            target={2000}
            onAdd={isViewingToday ? handleAddWaterQuick : undefined}
          />
        </View>

        {pendingAiItems.length > 0 ? (
          <View
            style={{
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: colors.primary + "26",
              backgroundColor: colors.primary + "0F",
              padding: 14,
              gap: 12,
              ...elevation.sm,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  flex: 1,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    backgroundColor: colors.background,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Sparkles size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      typography.smallMedium,
                      { color: colors.foreground },
                    ]}
                  >
                    AI review ready
                  </Text>
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Saved when you confirm the review sheet.
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setReviewSheetVisible(true)}
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  backgroundColor: colors.primary,
                }}
              >
                <Text
                  style={[
                    typography.caption,
                    { color: colors.primaryForeground, fontWeight: "700" },
                  ]}
                >
                  Open
                </Text>
              </Pressable>
            </View>

            <Text style={[typography.bodyMedium, { color: colors.foreground }]}>
              {buildAiSummary(pendingAiItems)}
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {[
                {
                  label: `${pendingAiItems.length} items`,
                  color: colors.primary,
                },
                {
                  label: `${Math.round(pendingReviewTotals.calories)} kcal`,
                  color: colors.accent,
                },
                {
                  label: `${Math.round(pendingReviewTotals.protein_g)}g protein`,
                  color: colors.destructive,
                },
              ].map((pill) => (
                <View
                  key={pill.label}
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    backgroundColor: pill.color + "16",
                    borderWidth: 1,
                    borderColor: pill.color + "30",
                  }}
                >
                  <Text
                    style={[
                      typography.caption,
                      { color: pill.color, fontWeight: "700" },
                    ]}
                  >
                    {pill.label}
                  </Text>
                </View>
              ))}
            </View>

            <Button
              onPress={() => setReviewSheetVisible(true)}
              variant="outline"
              size="sm"
            >
              Review & save
            </Button>
          </View>
        ) : null}

        <View
          style={{
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            backgroundColor: colors.card,
            padding: 14,
            gap: 12,
            ...elevation.sm,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <View>
              <Text
                style={[typography.smallMedium, { color: colors.foreground }]}
              >
                Meals
              </Text>
              <Text
                style={[typography.caption, { color: colors.mutedForeground }]}
              >
                {" "}
                {mealCoverage}/6 meal slots filled
              </Text>
            </View>
            <Text
              style={[typography.caption, { color: colors.mutedForeground }]}
            >
              {" "}
              {Math.round(todayTotals.calories)} kcal today
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            {mealSectionsWithSummary.map((section) => (
              <View
                key={section.mealType}
                style={{
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  backgroundColor: colors.background,
                  padding: 8,
                  gap: 8,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 6,
                  }}
                >
                  <View>
                    <Text
                      style={[
                        typography.smallMedium,
                        { color: colors.foreground },
                      ]}
                    >
                      {MEAL_TYPE_LABELS[section.mealType]}
                    </Text>
                    <Text
                      style={[
                        typography.caption,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {" "}
                      {section.items.length} items
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Text
                      style={[
                        typography.caption,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {section.calories} kcal
                    </Text>
                    <Clock3 size={13} color={colors.mutedForeground} />
                  </View>
                </View>

                <MealSection
                  mealType={section.mealType}
                  items={section.items}
                  defaultExpanded={section.items.length > 0}
                  onAddItem={
                    isViewingToday
                      ? () =>
                          router.push({
                            pathname: "/nutrition/log",
                            params: { mealType: section.mealType },
                          })
                      : undefined
                  }
                />
              </View>
            ))}
          </View>
        </View>

        <View
          style={{
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            backgroundColor: colors.card,
            padding: 14,
            gap: 10,
            ...elevation.sm,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text
                style={[typography.smallMedium, { color: colors.foreground }]}
              >
                Latest log
              </Text>
              <Text
                style={[typography.caption, { color: colors.mutedForeground }]}
              >
                Synced from Firestore
              </Text>
            </View>
            <History size={18} color={colors.primary} />
          </View>

          {latestLog ? (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <View
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    backgroundColor: colors.primary + "16",
                  }}
                >
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.primary, fontWeight: "700" },
                    ]}
                  >
                    {MEAL_TYPE_LABELS[latestLog.meal_type]}
                  </Text>
                </View>
                <View
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    backgroundColor: colors.secondary,
                  }}
                >
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.secondaryForeground, fontWeight: "700" },
                    ]}
                  >
                    {formatLogTime(latestLog.logged_at)}
                  </Text>
                </View>
                <View
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    backgroundColor: colors.secondary,
                  }}
                >
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.secondaryForeground, fontWeight: "700" },
                    ]}
                  >
                    {latestLog.items.length} items
                  </Text>
                </View>
              </View>

              <Text
                style={[typography.bodyMedium, { color: colors.foreground }]}
              >
                {Math.round(latestLog.total.calories)} kcal · P{" "}
                {Math.round(latestLog.total.protein_g)}g · C{" "}
                {Math.round(latestLog.total.carbs_g)}g · F{" "}
                {Math.round(latestLog.total.fat_g)}g
              </Text>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {latestLog.items.slice(0, 4).map((item) => (
                  <View
                    key={`${item.food_name}-${item.serving_size_g}`}
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: colors.cardBorder,
                      backgroundColor: colors.background,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                    }}
                  >
                    <Text
                      style={[
                        typography.caption,
                        { color: colors.mutedForeground },
                      ]}
                      numberOfLines={1}
                    >
                      {item.food_name}
                    </Text>
                  </View>
                ))}
              </View>

              <Button
                size="sm"
                variant="outline"
                onPress={() => router.push("/nutrition/history")}
              >
                Open history
              </Button>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <Text
                style={[typography.small, { color: colors.mutedForeground }]}
              >
                No logs yet for this day. Log a meal or open the food library to
                start building the timeline.
              </Text>
              {isViewingToday ? (
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Button
                    size="sm"
                    onPress={() => router.push("/nutrition/log")}
                  >
                    Log meal
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onPress={() => router.push("/nutrition/food-library")}
                  >
                    Food library
                  </Button>
                </View>
              ) : null}
            </View>
          )}
        </View>

        {!isViewingToday ? (
          <View
            style={{
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              backgroundColor: colors.secondary,
              padding: 14,
            }}
          >
            <Text
              style={[
                typography.smallMedium,
                { color: colors.secondaryForeground },
              ]}
            >
              You are viewing a past day. Entries are read-only.
            </Text>
          </View>
        ) : null}

        {error ? (
          <View
            style={{
              backgroundColor: colors.destructive + "14",
              borderRadius: radius.xl,
              padding: 14,
              gap: 8,
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

      <BottomSheetModal
        visible={reviewSheetVisible}
        onClose={() => setReviewSheetVisible(false)}
        title="AI review ready"
        contentStyle={{ paddingHorizontal: 16 }}
      >
        <View style={{ gap: 12 }}>
          <Text style={[typography.small, { color: colors.mutedForeground }]}>
            Review the detected items below and confirm when you are ready to
            save them to the day log.
          </Text>

          <View style={{ gap: 8, maxHeight: 360 }}>
            {pendingAiItems.map((item, index) => (
              <View
                key={`${item.name}-${index}`}
                style={{
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  backgroundColor: colors.background,
                  padding: 12,
                  gap: 6,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <Text
                    style={[
                      typography.smallMedium,
                      { color: colors.foreground, flex: 1 },
                    ]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {item.quantity} {item.unit}
                  </Text>
                </View>
                <Text
                  style={[
                    typography.caption,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {" "}
                  {Math.round(item.calories)} kcal · P{" "}
                  {Math.round(item.protein_g)}g · C {Math.round(item.carbs_g)}g
                  · F {Math.round(item.fat_g)}g
                </Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <View
              style={{
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 6,
                backgroundColor: colors.primary + "16",
              }}
            >
              <Text
                style={[
                  typography.caption,
                  { color: colors.primary, fontWeight: "700" },
                ]}
              >
                {pendingAiItems.length} items
              </Text>
            </View>
            <View
              style={{
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 6,
                backgroundColor: colors.secondary,
              }}
            >
              <Text
                style={[
                  typography.caption,
                  { color: colors.secondaryForeground, fontWeight: "700" },
                ]}
              >
                {Math.round(pendingReviewTotals.calories)} kcal
              </Text>
            </View>
          </View>

          <Button
            onPress={handleSaveAllPending}
            isLoading={savingPendingItems}
            disabled={!isViewingToday || pendingAiItems.length === 0}
          >
            Save to daily log
          </Button>
          <Button
            variant="outline"
            onPress={() => setReviewSheetVisible(false)}
          >
            Close
          </Button>
        </View>
      </BottomSheetModal>
    </View>
  );
}
