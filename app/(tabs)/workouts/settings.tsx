import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Check, Search, Settings2, X } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OptionPicker } from "@/components/ui/OptionPicker";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import {
  loadExerciseCache,
  type CachedLibraryExercise,
} from "@/lib/workouts/exercise-cache";
import type {
  EquipmentType,
  FitnessLevel,
  WorkoutExperienceTimeRange,
  WorkoutHoursPerDayRange,
  WorkoutLocationProfile,
  WorkoutSettings,
} from "@/types";

const WEEK_DAYS = [
  { id: 0, label: "Mon" },
  { id: 1, label: "Tue" },
  { id: 2, label: "Wed" },
  { id: 3, label: "Thu" },
  { id: 4, label: "Fri" },
  { id: 5, label: "Sat" },
  { id: 6, label: "Sun" },
] as const;

const LOCATION_OPTIONS: {
  value: WorkoutLocationProfile;
  label: string;
  description: string;
}[] = [
  { value: "home", label: "Home", description: "Train at home" },
  { value: "gym", label: "Gym", description: "Commercial gym" },
  { value: "outdoor", label: "Outdoor", description: "Park or open area" },
  { value: "studio", label: "Studio", description: "Box or studio" },
];

const HOURS_OPTIONS: {
  value: WorkoutHoursPerDayRange;
  label: string;
  description: string;
}[] = [
  { value: "30m", label: "30 min", description: "Quick session" },
  { value: "45m", label: "45 min", description: "Light to moderate" },
  { value: "60m", label: "60 min", description: "Standard" },
  { value: "90m", label: "90 min", description: "Extended session" },
  { value: "120m_plus", label: "120+ min", description: "Long session" },
];

const EXPERIENCE_LEVEL_OPTIONS: {
  value: FitnessLevel;
  label: string;
  description: string;
}[] = [
  { value: "beginner", label: "Beginner", description: "Starting now" },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "Consistent practice",
  },
  { value: "advanced", label: "Advanced", description: "High consistency" },
];

const EXPERIENCE_TIME_OPTIONS: {
  value: WorkoutExperienceTimeRange;
  label: string;
  description: string;
}[] = [
  { value: "0_6_months", label: "0-6 months", description: "Initial phase" },
  {
    value: "6_12_months",
    label: "6-12 months",
    description: "Developing consistency",
  },
  {
    value: "1_2_years",
    label: "1-2 years",
    description: "Good base",
  },
  {
    value: "2_plus_years",
    label: "2+ years",
    description: "Long-term training",
  },
];

const LIMITATIONS_OPTIONS = [
  "Lower back",
  "Shoulder",
  "Knee",
  "Ankle",
  "Wrist",
  "Neck",
  "Posture",
  "Mobility",
  "Other",
] as const;

const DEFAULT_GYM_EQUIPMENT: EquipmentType[] = [
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "bodyweight",
  "band",
  "kettlebell",
];

const EQUIPMENT_LABELS: Record<EquipmentType, string> = {
  none: "None",
  barbell: "Barbell",
  dumbbell: "Dumbbell",
  machine: "Machine",
  cable: "Cable",
  bodyweight: "Bodyweight",
  band: "Band",
  kettlebell: "Kettlebell",
};

function titleCaseLocation(location: WorkoutLocationProfile): string {
  return location.charAt(0).toUpperCase() + location.slice(1);
}

function toSettingsDate(): string {
  return new Date().toISOString();
}

export default function WorkoutSettingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const isDark = useThemeStore((s) => s.isDark);
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const setWorkoutSettings = useAuthStore((s) => s.setWorkoutSettings);
  const showToast = useToastStore((s) => s.show);

  const isOnboardingMode = params.mode === "onboarding";

  const [isSaving, setIsSaving] = useState(false);
  const [catalog, setCatalog] = useState<CachedLibraryExercise[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);

  const [locations, setLocations] = useState<WorkoutLocationProfile[]>([]);
  const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState<number>(3);
  const [trainingDays, setTrainingDays] = useState<number[]>([]);
  const [trainingHoursPerDay, setTrainingHoursPerDay] =
    useState<WorkoutHoursPerDayRange>("60m");
  const [experienceLevel, setExperienceLevel] = useState<
    FitnessLevel | undefined
  >(undefined);
  const [experienceTimeRange, setExperienceTimeRange] = useState<
    WorkoutExperienceTimeRange | undefined
  >(undefined);
  const [limitations, setLimitations] = useState<string[]>([]);
  const [limitationsOther, setLimitationsOther] = useState("");
  const [equipmentByLocation, setEquipmentByLocation] = useState<
    Partial<Record<WorkoutLocationProfile, EquipmentType[]>>
  >({});
  const [excludedExerciseIds, setExcludedExerciseIds] = useState<string[]>([]);
  const [exclusionModalOpen, setExclusionModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadCatalog = async () => {
      setIsCatalogLoading(true);
      try {
        const loaded = await loadExerciseCache();
        if (isMounted) {
          setCatalog(loaded);
        }
      } catch {
        if (isMounted) {
          showToast("Could not load exercise data", "error");
        }
      } finally {
        if (isMounted) {
          setIsCatalogLoading(false);
        }
      }
    };

    void loadCatalog();

    return () => {
      isMounted = false;
    };
  }, [showToast]);

  useEffect(() => {
    if (!profile) return;

    const current = profile.workout_settings;
    if (current) {
      setLocations(current.locations ?? []);
      setTrainingDaysPerWeek(current.training_days_per_week ?? 3);
      setTrainingDays((current.training_days ?? []).slice(0, 7));
      setTrainingHoursPerDay(current.training_hours_per_day ?? "60m");
      setExperienceLevel(current.experience_level);
      setExperienceTimeRange(current.experience_time_range);
      setLimitations(current.limitations ?? []);
      setLimitationsOther(current.limitations_other ?? "");
      setEquipmentByLocation(current.equipment_by_location ?? {});
      setExcludedExerciseIds(current.excluded_exercise_ids ?? []);
      return;
    }

    // Bootstrap with existing profile data for backward compatibility.
    setTrainingDaysPerWeek(profile.available_days_per_week ?? 3);
    setExperienceLevel(profile.level);
    if (profile.injuries) {
      setLimitations(["Other"]);
      setLimitationsOther(profile.injuries);
    }
    if (profile.equipment === "gym") {
      setLocations(["gym"]);
      setEquipmentByLocation({ gym: DEFAULT_GYM_EQUIPMENT });
    } else if (profile.equipment === "home") {
      setLocations(["home"]);
      setEquipmentByLocation({ home: ["bodyweight"] });
    }
  }, [profile]);

  useEffect(() => {
    if (trainingDays.length <= trainingDaysPerWeek) return;
    setTrainingDays((prev) => prev.slice(0, trainingDaysPerWeek));
  }, [trainingDays.length, trainingDaysPerWeek]);

  const uniqueEquipment = useMemo<EquipmentType[]>(() => {
    const fromCatalog = new Set<EquipmentType>();
    for (const exercise of catalog) {
      for (const equipment of exercise.equipment) {
        if (equipment !== "none") {
          fromCatalog.add(equipment);
        }
      }
    }

    const list = Array.from(fromCatalog);
    if (list.length === 0) return DEFAULT_GYM_EQUIPMENT;

    return list.sort((left, right) => {
      return EQUIPMENT_LABELS[left].localeCompare(EQUIPMENT_LABELS[right]);
    });
  }, [catalog]);

  const filteredExercises = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base =
      term.length === 0
        ? catalog
        : catalog.filter((exercise) =>
            exercise.name.toLowerCase().includes(term),
          );

    return base.slice(0, 200);
  }, [catalog, search]);

  const selectedExcludedCount = excludedExerciseIds.length;

  const isValid =
    locations.length > 0 &&
    trainingDaysPerWeek >= 1 &&
    trainingDaysPerWeek <= 7 &&
    trainingDays.length === trainingDaysPerWeek &&
    !!trainingHoursPerDay;

  const toggleLocation = (location: WorkoutLocationProfile) => {
    setLocations((prev) => {
      const isSelected = prev.includes(location);
      const next = isSelected
        ? prev.filter((item) => item !== location)
        : [...prev, location];

      if (!isSelected) {
        setEquipmentByLocation((old) => {
          if (old[location]) return old;

          if (location === "gym") {
            return { ...old, [location]: [...uniqueEquipment] };
          }

          return { ...old, [location]: ["bodyweight"] };
        });
      }

      return next;
    });
  };

  const toggleTrainingDay = (day: number) => {
    setTrainingDays((prev) => {
      if (prev.includes(day)) {
        return prev.filter((item) => item !== day).sort((a, b) => a - b);
      }

      if (prev.length >= trainingDaysPerWeek) {
        showToast(
          `Select up to ${trainingDaysPerWeek} training day(s)`,
          "info",
        );
        return prev;
      }

      return [...prev, day].sort((a, b) => a - b);
    });
  };

  const toggleLimitation = (item: string) => {
    setLimitations((prev) => {
      if (prev.includes(item)) {
        return prev.filter((value) => value !== item);
      }
      return [...prev, item];
    });
  };

  const toggleEquipmentForLocation = (
    location: WorkoutLocationProfile,
    equipment: EquipmentType,
  ) => {
    setEquipmentByLocation((prev) => {
      const current = prev[location] ?? [];
      const has = current.includes(equipment);
      const next = has
        ? current.filter((item) => item !== equipment)
        : [...current, equipment];

      return {
        ...prev,
        [location]: next,
      };
    });
  };

  const toggleExcludedExercise = (exerciseId: string) => {
    setExcludedExerciseIds((prev) => {
      if (prev.includes(exerciseId)) {
        return prev.filter((id) => id !== exerciseId);
      }
      return [...prev, exerciseId];
    });
  };

  const save = async () => {
    if (!user) {
      showToast("Sign in required", "error");
      return;
    }

    if (!isValid) {
      showToast(
        "Complete locations, weekly days and hours to continue",
        "error",
      );
      return;
    }

    const preparedEquipmentByLocation = locations.reduce(
      (acc, location) => {
        acc[location] = equipmentByLocation[location] ?? [];
        return acc;
      },
      {} as Partial<Record<WorkoutLocationProfile, EquipmentType[]>>,
    );

    const settings: WorkoutSettings = {
      completed: true,
      locations,
      training_days_per_week: trainingDaysPerWeek,
      training_days: [...trainingDays].sort((a, b) => a - b),
      training_hours_per_day: trainingHoursPerDay,
      experience_level: experienceLevel,
      experience_time_range: experienceTimeRange,
      limitations,
      limitations_other: limitations.includes("Other")
        ? limitationsOther.trim()
        : "",
      equipment_by_location: preparedEquipmentByLocation,
      excluded_exercise_ids: excludedExerciseIds,
      updated_at: toSettingsDate(),
    };

    setIsSaving(true);
    try {
      await setWorkoutSettings(settings);
      showToast("Workout settings saved", "success");
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)/workouts");
      }
    } catch {
      showToast("Could not save workout settings", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const SectionCard = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <View
      style={{
        backgroundColor: colors.card,
        borderColor: colors.cardBorder,
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        gap: 12,
      }}
    >
      <Text
        style={{
          color: colors.foreground,
          fontSize: 16,
          fontWeight: "700",
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 28,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
                return;
              }
              router.replace("/(tabs)/workouts");
            }}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.secondary,
            }}
          >
            <ArrowLeft size={18} color={colors.foreground} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.foreground,
                fontSize: 22,
                fontWeight: "800",
              }}
            >
              {isOnboardingMode ? "Workout Setup" : "Workout Settings"}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
              {isOnboardingMode
                ? "Configure your training profile to personalize workouts"
                : "Manage profile, equipment and exercise filters"}
            </Text>
          </View>
          <Settings2 size={18} color={colors.mutedForeground} />
        </View>

        <SectionCard title="Where do you usually train?">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {LOCATION_OPTIONS.map((option) => {
              const selected = locations.includes(option.value);
              return (
                <Pressable
                  key={option.value}
                  onPress={() => toggleLocation(option.value)}
                  style={{
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: selected ? colors.primary : colors.cardBorder,
                    backgroundColor: selected
                      ? `${colors.primary}1A`
                      : colors.background,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Text
                    style={{
                      color: selected ? colors.primary : colors.foreground,
                      fontWeight: "700",
                      fontSize: 13,
                    }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </SectionCard>

        <SectionCard title="Training frequency and days">
          <View style={{ gap: 10 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
              Days per week
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {Array.from({ length: 7 }, (_, index) => index + 1).map(
                (value) => {
                  const selected = trainingDaysPerWeek === value;
                  return (
                    <Pressable
                      key={`days-count-${value}`}
                      onPress={() => setTrainingDaysPerWeek(value)}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: selected
                          ? colors.primary
                          : colors.cardBorder,
                        backgroundColor: selected
                          ? `${colors.primary}1A`
                          : colors.background,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: selected ? colors.primary : colors.foreground,
                          fontWeight: "800",
                        }}
                      >
                        {value}
                      </Text>
                    </Pressable>
                  );
                },
              )}
            </View>

            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
              Select exact training days (Monday first)
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {WEEK_DAYS.map((day) => {
                const selected = trainingDays.includes(day.id);
                return (
                  <Pressable
                    key={`weekday-${day.id}`}
                    onPress={() => toggleTrainingDay(day.id)}
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: selected
                        ? colors.primary
                        : colors.cardBorder,
                      backgroundColor: selected
                        ? `${colors.primary}1A`
                        : colors.background,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: selected ? colors.primary : colors.foreground,
                        fontWeight: "700",
                        fontSize: 13,
                      }}
                    >
                      {day.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </SectionCard>

        <SectionCard title="How long do you train each day?">
          <OptionPicker
            options={HOURS_OPTIONS}
            value={trainingHoursPerDay}
            onChange={setTrainingHoursPerDay}
            columns={2}
          />
        </SectionCard>

        <SectionCard title="Experience level">
          <View style={{ gap: 12 }}>
            <OptionPicker
              options={EXPERIENCE_LEVEL_OPTIONS}
              value={experienceLevel}
              onChange={(value) => setExperienceLevel(value)}
              columns={3}
            />
            <OptionPicker
              options={EXPERIENCE_TIME_OPTIONS}
              value={experienceTimeRange}
              onChange={(value) => setExperienceTimeRange(value)}
              columns={2}
            />
          </View>
        </SectionCard>

        <SectionCard title="Pain or limitations">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {LIMITATIONS_OPTIONS.map((item) => {
              const selected = limitations.includes(item);
              return (
                <Pressable
                  key={item}
                  onPress={() => toggleLimitation(item)}
                  style={{
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: selected ? colors.primary : colors.cardBorder,
                    backgroundColor: selected
                      ? `${colors.primary}1A`
                      : colors.background,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Text
                    style={{
                      color: selected ? colors.primary : colors.foreground,
                      fontWeight: "700",
                      fontSize: 13,
                    }}
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {limitations.includes("Other") ? (
            <Input
              label="Other limitations"
              placeholder="Describe your limitation"
              value={limitationsOther}
              onChangeText={setLimitationsOther}
            />
          ) : null}
        </SectionCard>

        <SectionCard title="Equipment by location">
          {locations.length === 0 ? (
            <Text style={{ color: colors.mutedForeground }}>
              Select at least one location above.
            </Text>
          ) : (
            <View style={{ gap: 14 }}>
              {locations.map((location) => {
                const selectedEquipment = equipmentByLocation[location] ?? [];
                return (
                  <View key={`equipment-${location}`} style={{ gap: 8 }}>
                    <Text
                      style={{
                        color: colors.foreground,
                        fontWeight: "700",
                        fontSize: 13,
                      }}
                    >
                      {titleCaseLocation(location)} equipment
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      {uniqueEquipment.map((equipment) => {
                        const selected = selectedEquipment.includes(equipment);
                        return (
                          <Pressable
                            key={`${location}-${equipment}`}
                            onPress={() =>
                              toggleEquipmentForLocation(location, equipment)
                            }
                            style={{
                              borderRadius: 999,
                              borderWidth: 1,
                              borderColor: selected
                                ? colors.primary
                                : colors.cardBorder,
                              backgroundColor: selected
                                ? `${colors.primary}1A`
                                : colors.background,
                              paddingHorizontal: 10,
                              paddingVertical: 7,
                            }}
                          >
                            <Text
                              style={{
                                color: selected
                                  ? colors.primary
                                  : colors.foreground,
                                fontSize: 12,
                                fontWeight: "700",
                              }}
                            >
                              {EQUIPMENT_LABELS[equipment]}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </SectionCard>

        {!isOnboardingMode ? (
          <SectionCard title="Exercise exclusions">
            <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
              Exclude exercises from recommendations and generated plans.
            </Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Button
                variant="outline"
                onPress={() => setExclusionModalOpen(true)}
                style={{ flex: 1 } as any}
              >
                Select excluded exercises
              </Button>
            </View>
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>
              Selected: {selectedExcludedCount}
            </Text>
          </SectionCard>
        ) : null}

        <Button
          size="lg"
          onPress={save}
          isLoading={isSaving}
          disabled={!isValid}
        >
          {isOnboardingMode ? "Save and Continue" : "Save Workout Settings"}
        </Button>
      </ScrollView>

      <Modal
        visible={exclusionModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setExclusionModalOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: isDark ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.45)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              height: "86%",
              backgroundColor: colors.background,
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              paddingTop: 12,
              paddingHorizontal: 16,
              paddingBottom: insets.bottom + 12,
              gap: 10,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 18,
                  fontWeight: "800",
                }}
              >
                Exclude exercises
              </Text>
              <Pressable
                onPress={() => setExclusionModalOpen(false)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.secondary,
                }}
              >
                <X size={18} color={colors.foreground} />
              </Pressable>
            </View>

            <View style={{ position: "relative" }}>
              <Input
                placeholder="Search exercise"
                value={search}
                onChangeText={setSearch}
              />
              <View style={{ position: "absolute", right: 10, top: 12 }}>
                <Search size={18} color={colors.mutedForeground} />
              </View>
            </View>

            {isCatalogLoading ? (
              <View style={{ paddingVertical: 30 }}>
                <Text style={{ color: colors.mutedForeground }}>
                  Loading exercise list...
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredExercises}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 24 }}
                renderItem={({ item }) => {
                  const selected = excludedExerciseIds.includes(item.id);
                  const imageUri =
                    item.remote_image_urls?.[0] ?? item.images?.[0] ?? null;
                  return (
                    <Pressable
                      onPress={() => toggleExcludedExercise(item.id)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        paddingVertical: 8,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.cardBorder,
                      }}
                    >
                      <View
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 10,
                          overflow: "hidden",
                          backgroundColor: colors.secondary,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {imageUri ? (
                          <Image
                            source={{ uri: imageUri }}
                            style={{ width: 52, height: 52 }}
                            resizeMode="cover"
                          />
                        ) : (
                          <Text
                            style={{
                              color: colors.mutedForeground,
                              fontSize: 11,
                            }}
                          >
                            No image
                          </Text>
                        )}
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: colors.foreground,
                            fontSize: 14,
                            fontWeight: "700",
                          }}
                        >
                          {item.name}
                        </Text>
                        <Text
                          style={{
                            color: colors.mutedForeground,
                            fontSize: 12,
                          }}
                        >
                          {item.equipment_label}
                        </Text>
                      </View>

                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: selected
                            ? colors.primary
                            : colors.cardBorder,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: selected
                            ? `${colors.primary}1A`
                            : "transparent",
                        }}
                      >
                        {selected ? (
                          <Check size={14} color={colors.primary} />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                }}
              />
            )}

            <Button onPress={() => setExclusionModalOpen(false)}>
              Done ({selectedExcludedCount})
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}
