import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Ban,
  Calendar,
  Check,
  Clock,
  Dumbbell,
  Home,
  Layers,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Trees,
  X,
} from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OptionPicker } from "@/components/ui/OptionPicker";
import { EquipmentPicker } from "@/components/workouts/EquipmentPicker";
import { useAuthStore } from "@/stores/auth.store";
import { useNavigationStore } from "@/stores/navigation.store";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import {
  loadExerciseCache,
  type CachedLibraryExercise,
} from "@/lib/workouts/exercise-cache";
import { rescheduleWorkouts } from "@/lib/workouts/reschedule-workouts";
import { generateId } from "@/lib/utils";
import type {
  EquipmentItemId,
  EquipmentType,
  FitnessLevel,
  WorkoutExperienceTimeRange,
  WorkoutHoursPerDayRange,
  WorkoutLocationProfile,
  WorkoutLocationProfileItem,
  WorkoutSettings,
} from "@/types";

// ─── Constants ───────────────────────────────────────────────────────────────

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
  { value: "0_6_months", label: "0–6 mo", description: "Initial phase" },
  {
    value: "6_12_months",
    label: "6–12 mo",
    description: "Developing consistency",
  },
  {
    value: "1_2_years",
    label: "1–2 yr",
    description: "Good base",
  },
  {
    value: "2_plus_years",
    label: "2+ yr",
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

const PROFILE_LIMIT = 3;

const DEFAULT_EQUIPMENT_BY_LOCATION: Record<
  WorkoutLocationProfile,
  EquipmentItemId[]
> = {
  home: ["bodyweight"],
  gym: [
    "barbell",
    "dumbbell",
    "machine_cable",
    "machine_leg_extension",
    "machine_lat_pulldown",
    "bodyweight",
    "kettlebell",
  ],
  outdoor: ["bodyweight", "pullup_bar", "outdoor_bike", "jump_rope"],
  studio: [
    "bodyweight",
    "dumbbell",
    "kettlebell",
    "resistance_band",
    "bench",
  ],
};

const LEGACY_EQUIPMENT_MAP: Record<EquipmentType, EquipmentItemId[]> = {
  none: ["none"],
  barbell: ["barbell", "plates", "rack"],
  dumbbell: ["dumbbell", "dumbbell_adjustable"],
  machine: [
    "machine_cable",
    "machine_chest_press",
    "machine_lat_pulldown",
    "machine_leg_extension",
    "machine_leg_lift",
    "machine_butterfly",
    "machine_pulley",
    "smith_machine",
    "rack",
  ],
  cable: ["machine_cable", "machine_pulley"],
  bodyweight: [
    "bodyweight",
    "pullup_bar",
    "dip_bars",
    "pushup_bars",
    "low_bar",
    "leg_lift_station",
  ],
  band: ["resistance_band", "glute_band", "suspension_trainer"],
  kettlebell: ["kettlebell"],
};

function titleCaseLocation(location: WorkoutLocationProfile): string {
  return location.charAt(0).toUpperCase() + location.slice(1);
}

function normalizeProfileName(
  name: string | undefined,
  type: WorkoutLocationProfile,
): string {
  const normalized = (name ?? "").trim().slice(0, 30);
  if (normalized.length > 0) return normalized;
  return `My ${titleCaseLocation(type)}`;
}

function mapLegacyEquipmentToItems(
  legacy: EquipmentType[] | undefined,
  locationType: WorkoutLocationProfile,
): EquipmentItemId[] {
  if (!legacy || legacy.length === 0) {
    return [...DEFAULT_EQUIPMENT_BY_LOCATION[locationType]];
  }

  const mapped = legacy.flatMap((item) => LEGACY_EQUIPMENT_MAP[item] ?? []);
  if (mapped.length === 0) {
    return [...DEFAULT_EQUIPMENT_BY_LOCATION[locationType]];
  }

  return Array.from(new Set(mapped));
}

function toSettingsDate(): string {
  return new Date().toISOString();
}

// ─── Screen ───────────────────────────────────────────────────────────────────

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
  const setNavbarVisible = useNavigationStore((s) => s.setNavbarVisible);

  const isOnboardingMode = params.mode === "onboarding";

  // ── Part 1: Hide TabBar on mount ──────────────────────────────────────────
  useEffect(() => {
    setNavbarVisible(false);
    return () => setNavbarVisible(true);
  }, [setNavbarVisible]);

  // ── Form state ────────────────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [catalog, setCatalog] = useState<CachedLibraryExercise[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);

  const [locationProfiles, setLocationProfiles] = useState<
    WorkoutLocationProfileItem[]
  >([]);
  const [activeLocationProfileId, setActiveLocationProfileId] = useState<
    string | null
  >(null);
  const [expandedLocationProfileId, setExpandedLocationProfileId] = useState<
    string | null
  >(null);
  const [equipmentPickerProfileId, setEquipmentPickerProfileId] = useState<
    string | null
  >(null);
  const [createProfileModalOpen, setCreateProfileModalOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileType, setNewProfileType] =
    useState<WorkoutLocationProfile>("home");
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editingProfileName, setEditingProfileName] = useState("");
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
  const [excludedExerciseIds, setExcludedExerciseIds] = useState<string[]>([]);
  const [exclusionModalOpen, setExclusionModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Load exercise catalog
  useEffect(() => {
    let isMounted = true;
    const loadCatalog = async () => {
      setIsCatalogLoading(true);
      try {
        const loaded = await loadExerciseCache();
        if (isMounted) setCatalog(loaded);
      } catch {
        if (isMounted) showToast("Could not load exercise data", "error");
      } finally {
        if (isMounted) setIsCatalogLoading(false);
      }
    };
    void loadCatalog();
    return () => {
      isMounted = false;
    };
  }, [showToast]);

  // Seed form from profile
  useEffect(() => {
    if (!profile) return;

    const current = profile.workout_settings;
    if (current) {
      setTrainingDaysPerWeek(current.training_days_per_week ?? 3);
      setTrainingDays((current.training_days ?? []).slice(0, 7));
      setTrainingHoursPerDay(current.training_hours_per_day ?? "60m");
      setExperienceLevel(current.experience_level);
      setExperienceTimeRange(current.experience_time_range);
      setLimitations(current.limitations ?? []);
      setLimitationsOther(current.limitations_other ?? "");
      setExcludedExerciseIds(current.excluded_exercise_ids ?? []);

      const now = toSettingsDate();
      let nextProfiles = (current.location_profiles ?? [])
        .slice(0, PROFILE_LIMIT)
        .map((profileItem) => ({
          ...profileItem,
          name: normalizeProfileName(profileItem.name, profileItem.type),
          equipment_ids: Array.from(new Set(profileItem.equipment_ids ?? [])),
          created_at: profileItem.created_at ?? now,
          updated_at: profileItem.updated_at ?? now,
        }));

      // Backward compatibility bootstrap: migrate old shape to one profile.
      if (
        nextProfiles.length === 0 &&
        (current.locations?.length ?? 0) > 0
      ) {
        const primaryLocation = current.locations?.[0];
        if (primaryLocation) {
          nextProfiles = [
            {
              id: generateId(),
              name: `My ${titleCaseLocation(primaryLocation)}`,
              type: primaryLocation,
              equipment_ids: mapLegacyEquipmentToItems(
                current.equipment_by_location?.[primaryLocation],
                primaryLocation,
              ),
              created_at: now,
              updated_at: now,
            },
          ];
        }
      }

      setLocationProfiles(nextProfiles);
      const resolvedActiveProfileId =
        nextProfiles.find((item) => item.id === current.active_location_profile_id)
          ?.id ?? nextProfiles[0]?.id ?? null;
      setActiveLocationProfileId(resolvedActiveProfileId);
      setExpandedLocationProfileId(resolvedActiveProfileId);
      return;
    }

    setTrainingDaysPerWeek(profile.available_days_per_week ?? 3);
    setExperienceLevel(profile.level);
    setExcludedExerciseIds([]);

    if (profile.injuries) {
      setLimitations(["Other"]);
      setLimitationsOther(profile.injuries);
    } else {
      setLimitations([]);
      setLimitationsOther("");
    }

    const defaultLocationType: WorkoutLocationProfile | null =
      profile.equipment === "gym"
        ? "gym"
        : profile.equipment === "home"
          ? "home"
          : null;

    if (defaultLocationType) {
      const now = toSettingsDate();
      const initialProfile: WorkoutLocationProfileItem = {
        id: generateId(),
        name: `My ${titleCaseLocation(defaultLocationType)}`,
        type: defaultLocationType,
        equipment_ids: [...DEFAULT_EQUIPMENT_BY_LOCATION[defaultLocationType]],
        created_at: now,
        updated_at: now,
      };
      setLocationProfiles([initialProfile]);
      setActiveLocationProfileId(initialProfile.id);
      setExpandedLocationProfileId(initialProfile.id);
    } else {
      setLocationProfiles([]);
      setActiveLocationProfileId(null);
      setExpandedLocationProfileId(null);
    }
  }, [profile]);

  // Trim selected days when count decreases
  useEffect(() => {
    if (trainingDays.length <= trainingDaysPerWeek) return;
    setTrainingDays((prev) => prev.slice(0, trainingDaysPerWeek));
  }, [trainingDays.length, trainingDaysPerWeek]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const filteredExercises = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base =
      term.length === 0
        ? catalog
        : catalog.filter((ex) => ex.name.toLowerCase().includes(term));
    return base.slice(0, 200);
  }, [catalog, search]);

  const activeLocationProfile = useMemo(
    () =>
      locationProfiles.find((item) => item.id === activeLocationProfileId) ??
      locationProfiles[0] ??
      null,
    [locationProfiles, activeLocationProfileId],
  );

  const equipmentPickerSelectedIds = useMemo(() => {
    if (!equipmentPickerProfileId) return [];
    return (
      locationProfiles.find((item) => item.id === equipmentPickerProfileId)
        ?.equipment_ids ?? []
    );
  }, [equipmentPickerProfileId, locationProfiles]);

  const selectedExcludedCount = excludedExerciseIds.length;

  const isValid =
    locationProfiles.length > 0 &&
    !!activeLocationProfile &&
    trainingDaysPerWeek >= 1 &&
    trainingDaysPerWeek <= 7 &&
    trainingDays.length === trainingDaysPerWeek &&
    !!trainingHoursPerDay;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openCreateProfileModal = () => {
    if (locationProfiles.length >= PROFILE_LIMIT) {
      showToast(`You can create up to ${PROFILE_LIMIT} location profiles`, "info");
      return;
    }
    setNewProfileName("");
    setNewProfileType("home");
    setCreateProfileModalOpen(true);
  };

  const createLocationProfile = () => {
    if (locationProfiles.length >= PROFILE_LIMIT) {
      showToast(`You can create up to ${PROFILE_LIMIT} location profiles`, "info");
      return;
    }

    const name = newProfileName.trim().slice(0, 30);
    if (!name) {
      showToast("Profile name is required", "error");
      return;
    }

    const now = toSettingsDate();
    const createdProfile: WorkoutLocationProfileItem = {
      id: generateId(),
      name,
      type: newProfileType,
      equipment_ids: [],
      created_at: now,
      updated_at: now,
    };

    setLocationProfiles((prev) => [...prev, createdProfile]);
    setActiveLocationProfileId(createdProfile.id);
    setExpandedLocationProfileId(createdProfile.id);
    setCreateProfileModalOpen(false);
    setEquipmentPickerProfileId(createdProfile.id);
  };

  const startProfileNameEdit = (profileItem: WorkoutLocationProfileItem) => {
    setEditingProfileId(profileItem.id);
    setEditingProfileName(profileItem.name);
  };

  const commitProfileNameEdit = () => {
    if (!editingProfileId) return;

    const nextName = editingProfileName.trim().slice(0, 30);
    if (!nextName) {
      showToast("Profile name cannot be empty", "error");
      return;
    }

    setLocationProfiles((prev) =>
      prev.map((item) =>
        item.id === editingProfileId
          ? {
              ...item,
              name: nextName,
              updated_at: toSettingsDate(),
            }
          : item,
      ),
    );
    setEditingProfileId(null);
    setEditingProfileName("");
  };

  const toggleProfileExpanded = (profileId: string) => {
    setExpandedLocationProfileId((prev) => (prev === profileId ? null : profileId));
  };

  const selectActiveProfile = (profileId: string) => {
    setActiveLocationProfileId(profileId);
    setExpandedLocationProfileId(profileId);
  };

  const removeLocationProfile = (profileId: string) => {
    if (locationProfiles.length <= 1) {
      showToast("At least one location profile is required", "info");
      return;
    }

    Alert.alert(
      "Delete profile?",
      "This will remove the profile and its equipment list.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setLocationProfiles((prev) => {
              if (prev.length <= 1) return prev;

              const next = prev.filter((item) => item.id !== profileId);
              const fallbackProfileId = next[0]?.id ?? null;

              setActiveLocationProfileId((activeId) =>
                activeId === profileId ? fallbackProfileId : activeId,
              );
              setExpandedLocationProfileId((expandedId) =>
                expandedId === profileId ? fallbackProfileId : expandedId,
              );
              setEquipmentPickerProfileId((pickerId) =>
                pickerId === profileId ? null : pickerId,
              );
              if (editingProfileId === profileId) {
                setEditingProfileId(null);
                setEditingProfileName("");
              }

              return next;
            });
          },
        },
      ],
    );
  };

  const openEquipmentPickerForProfile = (profileId: string) => {
    setEquipmentPickerProfileId(profileId);
  };

  const handleEquipmentPickerConfirm = (ids: EquipmentItemId[]) => {
    if (!equipmentPickerProfileId) return;

    const uniqueIds = Array.from(new Set(ids));
    setLocationProfiles((prev) =>
      prev.map((item) =>
        item.id === equipmentPickerProfileId
          ? {
              ...item,
              equipment_ids: uniqueIds,
              updated_at: toSettingsDate(),
            }
          : item,
      ),
    );
    setEquipmentPickerProfileId(null);
  };

  const toggleTrainingDay = (day: number) => {
    setTrainingDays((prev) => {
      if (prev.includes(day)) {
        return prev.filter((item) => item !== day).sort((a, b) => a - b);
      }
      if (prev.length >= trainingDaysPerWeek) {
        showToast(`Select up to ${trainingDaysPerWeek} training day(s)`, "info");
        return prev;
      }
      return [...prev, day].sort((a, b) => a - b);
    });
  };

  const toggleLimitation = (item: string) => {
    setLimitations((prev) =>
      prev.includes(item) ? prev.filter((v) => v !== item) : [...prev, item],
    );
  };

  const toggleExcludedExercise = (exerciseId: string) => {
    setExcludedExerciseIds((prev) =>
      prev.includes(exerciseId)
        ? prev.filter((id) => id !== exerciseId)
        : [...prev, exerciseId],
    );
  };

  const save = async () => {
    if (!user) {
      showToast("Sign in required", "error");
      return;
    }

    if (locationProfiles.length === 0) {
      showToast("Create at least one location profile", "error");
      return;
    }

    const normalizedProfiles = locationProfiles.slice(0, PROFILE_LIMIT).map((item) => ({
      ...item,
      name: normalizeProfileName(item.name, item.type),
      equipment_ids: Array.from(new Set(item.equipment_ids)),
      updated_at: toSettingsDate(),
    }));

    const resolvedActiveProfileId =
      normalizedProfiles.find((item) => item.id === activeLocationProfileId)?.id ??
      normalizedProfiles[0]?.id;

    if (!resolvedActiveProfileId) {
      showToast("Select an active location profile", "error");
      return;
    }

    if (!isValid) {
      showToast("Complete profiles, weekly days and hours to continue", "error");
      return;
    }

    const settings = {
      completed: true,
      training_days_per_week: trainingDaysPerWeek,
      training_days: [...trainingDays].sort((a, b) => a - b),
      training_hours_per_day: trainingHoursPerDay,
      experience_level: experienceLevel,
      experience_time_range: experienceTimeRange,
      limitations,
      limitations_other: limitations.includes("Other") ? limitationsOther.trim() : "",
      location_profiles: normalizedProfiles,
      active_location_profile_id: resolvedActiveProfileId,
      excluded_exercise_ids: excludedExerciseIds,
      updated_at: toSettingsDate(),
    } as WorkoutSettings;

    setIsSaving(true);
    try {
      await setWorkoutSettings(settings);
      showToast("Workout settings saved", "success");
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)/workouts");
    } catch {
      showToast("Could not save workout settings", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReschedule = () => {
    if (!user?.uid) return;

    if (!activeLocationProfile) {
      showToast("Select an active location profile first", "error");
      return;
    }

    Alert.alert(
      "Reschedule workouts?",
      "This will regenerate workouts for today and the next two weeks. Past and completed workouts will not change.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setIsRescheduling(true);
            try {
              await rescheduleWorkouts(
                user.uid,
                [...trainingDays].sort((a, b) => a - b),
                {
                  locationType: activeLocationProfile.type,
                  equipmentIds: activeLocationProfile.equipment_ids,
                },
              );
              showToast("Workouts rescheduled", "success");
              if (router.canGoBack()) router.back();
              else router.replace("/(tabs)/workouts");
            } catch {
              showToast("Could not reschedule workouts", "error");
            } finally {
              setIsRescheduling(false);
            }
          },
        },
      ],
    );
  };

  // ── Sub-components ────────────────────────────────────────────────────────

  const SectionCard = ({
    icon,
    title,
    subtitle,
    children,
  }: {
    icon?: React.ReactNode;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
  }) => (
    <View
      style={{
        backgroundColor: colors.card,
        borderColor: colors.cardBorder,
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        gap: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        {icon ? (
          <View style={{ marginTop: 1 }}>{icon}</View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text
            style={{ color: colors.foreground, fontSize: 15, fontWeight: "700" }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 2 }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {children}
    </View>
  );

  // Icon map for location cards (rendered inside component for colors access)
  const locationIconMap: Record<WorkoutLocationProfile, React.ReactNode> = {
    home: <Home size={22} color={colors.primary} />,
    gym: <Dumbbell size={22} color={colors.primary} />,
    outdoor: <Trees size={22} color={colors.primary} />,
    studio: <Layers size={22} color={colors.primary} />,
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 32,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace("/(tabs)/workouts");
            }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.secondary,
            }}
          >
            <ArrowLeft size={18} color={colors.foreground} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text
              style={{ color: colors.foreground, fontSize: 22, fontWeight: "800" }}
            >
              {isOnboardingMode ? "Workout Setup" : "Workout Settings"}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
              {isOnboardingMode
                ? "Configure your training profile to personalise workouts"
                : "Manage location profiles, schedule and exercise filters"}
            </Text>
          </View>
        </View>

        {/* ── Section 1: Location profiles ── */}
        <SectionCard
          icon={<MapPin size={16} color={colors.primary} />}
          title="Location profiles"
          subtitle="Create up to 3 profiles with separate equipment lists"
        >
          <View style={{ gap: 12 }}>
            {locationProfiles.length > 0 ? (
              <View style={{ gap: 12 }}>
                <View style={{ gap: 8 }}>
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    Active profile
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {locationProfiles.map((profileItem) => {
                      const selected = activeLocationProfileId === profileItem.id;
                      return (
                        <Pressable
                          key={`active-${profileItem.id}`}
                          accessibilityRole="button"
                          accessibilityLabel={`${profileItem.name}${selected ? ", active" : ""}`}
                          onPress={() => selectActiveProfile(profileItem.id)}
                          style={{
                            borderRadius: 999,
                            borderWidth: selected ? 2 : 1,
                            borderColor: selected
                              ? colors.primary
                              : colors.cardBorder,
                            backgroundColor: selected
                              ? colors.primary + "18"
                              : colors.surface,
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                          }}
                        >
                          <Text
                            style={{
                              color: selected ? colors.primary : colors.foreground,
                              fontSize: 13,
                              fontWeight: "700",
                            }}
                          >
                            {profileItem.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={{ gap: 10 }}>
                  {locationProfiles.map((profileItem) => {
                    const expanded = expandedLocationProfileId === profileItem.id;
                    const isActive = activeLocationProfileId === profileItem.id;
                    const isEditing = editingProfileId === profileItem.id;

                    return (
                      <View
                        key={`profile-card-${profileItem.id}`}
                        style={{
                          borderWidth: 1,
                          borderColor: isActive ? colors.primary : colors.cardBorder,
                          backgroundColor: isActive
                            ? colors.primary + "10"
                            : colors.surface,
                          borderRadius: 14,
                          padding: 12,
                          gap: 10,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <View
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 10,
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: colors.secondary,
                            }}
                          >
                            {locationIconMap[profileItem.type]}
                          </View>

                          <View style={{ flex: 1, gap: 2 }}>
                            {isEditing ? (
                              <TextInput
                                autoFocus
                                value={editingProfileName}
                                onChangeText={(value) =>
                                  setEditingProfileName(value.slice(0, 30))
                                }
                                onBlur={commitProfileNameEdit}
                                onSubmitEditing={commitProfileNameEdit}
                                maxLength={30}
                                returnKeyType="done"
                                style={{
                                  color: colors.foreground,
                                  fontSize: 15,
                                  fontWeight: "700",
                                  borderBottomWidth: 1,
                                  borderBottomColor: colors.cardBorder,
                                  paddingVertical: 2,
                                }}
                              />
                            ) : (
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`Edit ${profileItem.name} profile name`}
                                onPress={() => startProfileNameEdit(profileItem)}
                                style={{ alignSelf: "flex-start" }}
                              >
                                <Text
                                  style={{
                                    color: colors.foreground,
                                    fontSize: 15,
                                    fontWeight: "700",
                                  }}
                                >
                                  {profileItem.name}
                                </Text>
                              </Pressable>
                            )}
                            <Text
                              style={{
                                color: colors.mutedForeground,
                                fontSize: 12,
                              }}
                            >
                              {titleCaseLocation(profileItem.type)} ·{" "}
                              {profileItem.equipment_ids.length} equipment selected
                            </Text>
                          </View>

                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Rename ${profileItem.name}`}
                            onPress={() => startProfileNameEdit(profileItem)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 10,
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: colors.secondary,
                            }}
                          >
                            <Pencil size={16} color={colors.foreground} />
                          </Pressable>

                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={expanded ? "Collapse profile" : "Expand profile"}
                            onPress={() => toggleProfileExpanded(profileItem.id)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 10,
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: colors.secondary,
                            }}
                          >
                            {expanded ? (
                              <ChevronUp size={16} color={colors.foreground} />
                            ) : (
                              <ChevronDown size={16} color={colors.foreground} />
                            )}
                          </Pressable>
                        </View>

                        {expanded ? (
                          <View style={{ gap: 8 }}>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Edit equipment for ${profileItem.name}`}
                              onPress={() => openEquipmentPickerForProfile(profileItem.id)}
                              style={{
                                minHeight: 44,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: colors.cardBorder,
                                backgroundColor: colors.background,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                                paddingHorizontal: 12,
                              }}
                            >
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                <Dumbbell size={16} color={colors.mutedForeground} />
                                <Text
                                  style={{
                                    color: colors.foreground,
                                    fontSize: 13,
                                    fontWeight: "600",
                                  }}
                                >
                                  Select equipment
                                </Text>
                              </View>
                              <Text
                                style={{
                                  color: colors.mutedForeground,
                                  fontSize: 12,
                                  fontWeight: "600",
                                }}
                              >
                                {profileItem.equipment_ids.length} selected
                              </Text>
                            </Pressable>

                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Delete ${profileItem.name}`}
                              onPress={() => removeLocationProfile(profileItem.id)}
                              disabled={locationProfiles.length <= 1}
                              style={{
                                minHeight: 42,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor:
                                  locationProfiles.length <= 1
                                    ? colors.cardBorder
                                    : colors.destructive,
                                backgroundColor:
                                  locationProfiles.length <= 1
                                    ? colors.surface
                                    : colors.destructive + "15",
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                              }}
                            >
                              <Trash2
                                size={16}
                                color={
                                  locationProfiles.length <= 1
                                    ? colors.mutedForeground
                                    : colors.destructive
                                }
                              />
                              <Text
                                style={{
                                  color:
                                    locationProfiles.length <= 1
                                      ? colors.mutedForeground
                                      : colors.destructive,
                                  fontSize: 13,
                                  fontWeight: "700",
                                }}
                              >
                                Delete profile
                              </Text>
                            </Pressable>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>

                {locationProfiles.length < PROFILE_LIMIT ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Add location profile"
                    onPress={openCreateProfileModal}
                    style={{
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.cardBorder,
                      backgroundColor: colors.surface,
                      minHeight: 46,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <Plus size={16} color={colors.primary} />
                    <Text
                      style={{
                        color: colors.foreground,
                        fontSize: 14,
                        fontWeight: "700",
                      }}
                    >
                      Add location profile
                    </Text>
                  </Pressable>
                ) : (
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontSize: 12,
                    }}
                  >
                    Maximum of {PROFILE_LIMIT} profiles reached.
                  </Text>
                )}
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontSize: 13,
                  }}
                >
                  Create your first profile to set where and how you train.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Create first location profile"
                  onPress={openCreateProfileModal}
                  style={{
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    backgroundColor: colors.surface,
                    minHeight: 46,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Plus size={16} color={colors.primary} />
                  <Text
                    style={{
                      color: colors.foreground,
                      fontSize: 14,
                      fontWeight: "700",
                    }}
                  >
                    Add location profile
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </SectionCard>

        {/* ── Section 2: Training frequency & days ── */}
        <SectionCard
          icon={<Calendar size={16} color={colors.primary} />}
          title="Training schedule"
          subtitle="How many days per week and which ones"
        >
          {/* Days-per-week number picker */}
          <View style={{ gap: 8 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, fontWeight: "600" }}>
              Days per week
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {Array.from({ length: 7 }, (_, i) => i + 1).map((value) => {
                const selected = trainingDaysPerWeek === value;
                return (
                  <Pressable
                    key={`count-${value}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${value} day${value > 1 ? "s" : ""} per week${selected ? ", selected" : ""}`}
                    onPress={() => setTrainingDaysPerWeek(value)}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? colors.primary : colors.cardBorder,
                      backgroundColor: selected ? colors.primary + "18" : colors.surface,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: selected ? colors.primary : colors.foreground,
                        fontWeight: "800",
                        fontSize: 14,
                      }}
                    >
                      {value}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Day-of-week pills */}
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 12, fontWeight: "600" }}>
                Which days? (Mon–Sun)
              </Text>
              <Text
                style={{
                  color:
                    trainingDays.length === trainingDaysPerWeek
                      ? colors.primary
                      : colors.mutedForeground,
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                {trainingDays.length} of {trainingDaysPerWeek} selected
              </Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {WEEK_DAYS.map((day) => {
                const selected = trainingDays.includes(day.id);
                return (
                  <Pressable
                    key={`day-${day.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${day.label}${selected ? ", selected" : ""}`}
                    onPress={() => toggleTrainingDay(day.id)}
                    style={{
                      borderRadius: 999,
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? colors.primary : colors.cardBorder,
                      backgroundColor: selected ? colors.primary + "18" : colors.surface,
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      minWidth: 44,
                      alignItems: "center",
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

        {/* ── Section 3: Session duration ── */}
        <SectionCard
          icon={<Clock size={16} color={colors.primary} />}
          title="Session duration"
          subtitle="How long do you train each day?"
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {HOURS_OPTIONS.map((option) => {
              const selected = trainingHoursPerDay === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityLabel={`${option.label}${selected ? ", selected" : ""}`}
                  onPress={() => setTrainingHoursPerDay(option.value)}
                  style={{
                    borderRadius: 12,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? colors.primary : colors.cardBorder,
                    backgroundColor: selected ? colors.primary + "18" : colors.surface,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    alignItems: "center",
                    minWidth: 80,
                  }}
                >
                  <Text
                    style={{
                      color: selected ? colors.primary : colors.foreground,
                      fontWeight: "700",
                      fontSize: 14,
                    }}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 2 }}
                  >
                    {option.description}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </SectionCard>

        {/* ── Section 4: Experience (level + time range grouped) ── */}
        <SectionCard
          icon={<Dumbbell size={16} color={colors.primary} />}
          title="Experience"
          subtitle="Your current training level and time in sport"
        >
          <View style={{ gap: 16 }}>
            <OptionPicker
              label="Level"
              options={EXPERIENCE_LEVEL_OPTIONS}
              value={experienceLevel}
              onChange={setExperienceLevel}
              columns={3}
            />
            <View
              style={{
                height: 1,
                backgroundColor: colors.cardBorder,
                marginHorizontal: -2,
              }}
            />
            <OptionPicker
              label="Time training"
              options={EXPERIENCE_TIME_OPTIONS}
              value={experienceTimeRange}
              onChange={setExperienceTimeRange}
              columns={2}
            />
          </View>
        </SectionCard>

        {/* ── Section 5: Physical limitations ── */}
        <SectionCard
          icon={<AlertCircle size={16} color={colors.primary} />}
          title="Pain or limitations"
          subtitle="Select any areas to take it easy on"
        >
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {LIMITATIONS_OPTIONS.map((item) => {
              const selected = limitations.includes(item);
              return (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityLabel={`${item}${selected ? ", selected" : ""}`}
                  onPress={() => toggleLimitation(item)}
                  style={{
                    borderRadius: 999,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? colors.primary : colors.cardBorder,
                    backgroundColor: selected ? colors.primary + "18" : colors.surface,
                    paddingHorizontal: 13,
                    paddingVertical: 8,
                    minWidth: 44,
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

        {/* ── Section 7: Excluded exercises (non-onboarding) ── */}
        {!isOnboardingMode ? (
          <SectionCard
            icon={<Ban size={16} color={colors.primary} />}
            title="Excluded exercises"
            subtitle="Remove exercises from all generated plans"
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Select excluded exercises. ${selectedExcludedCount} selected`}
              onPress={() => setExclusionModalOpen(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                backgroundColor: colors.surface,
              }}
            >
              <Ban size={16} color={colors.mutedForeground} />
              <Text
                style={{
                  flex: 1,
                  color: colors.foreground,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                Choose exercises to exclude
              </Text>
              {selectedExcludedCount > 0 ? (
                <View
                  style={{
                    backgroundColor: colors.primary + "22",
                    borderRadius: 999,
                    paddingHorizontal: 9,
                    paddingVertical: 3,
                  }}
                >
                  <Text
                    style={{
                      color: colors.primary,
                      fontSize: 12,
                      fontWeight: "700",
                    }}
                  >
                    {selectedExcludedCount} excluded
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </SectionCard>
        ) : null}

        {/* ── Part 3: Reschedule button (non-onboarding) ── */}
        {!isOnboardingMode ? (
          <Button
            variant="outline"
            size="lg"
            onPress={handleReschedule}
            isLoading={isRescheduling}
            disabled={isRescheduling || !isValid}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <RefreshCw
                size={16}
                color={isDark ? colors.foreground : colors.foreground}
              />
              <Text
                style={{
                  color: colors.foreground,
                  fontWeight: "700",
                  fontSize: 16,
                }}
              >
                Reschedule This Week
              </Text>
            </View>
          </Button>
        ) : null}

        {/* ── Save button ── */}
        <Button
          size="lg"
          onPress={save}
          isLoading={isSaving}
          disabled={!isValid || isSaving}
        >
          {isOnboardingMode ? "Save and Continue" : "Save Workout Settings"}
        </Button>
      </ScrollView>

      {/* ── Add location profile modal ── */}
      <Modal
        visible={createProfileModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateProfileModalOpen(false)}
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
              backgroundColor: colors.background,
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              paddingTop: 12,
              paddingHorizontal: 16,
              paddingBottom: insets.bottom + 12,
              gap: 12,
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
                New location profile
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close create profile modal"
                onPress={() => setCreateProfileModalOpen(false)}
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

            <Input
              label="Profile name"
              placeholder="e.g. Home Morning"
              value={newProfileName}
              onChangeText={(value) => setNewProfileName(value.slice(0, 30))}
            />
            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: 12,
                marginTop: -8,
              }}
            >
              {newProfileName.length}/30 characters
            </Text>

            <View style={{ gap: 8 }}>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                Location type
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {LOCATION_OPTIONS.map((option) => {
                  const selected = option.value === newProfileType;
                  return (
                    <Pressable
                      key={`create-type-${option.value}`}
                      accessibilityRole="button"
                      accessibilityLabel={`${option.label}${selected ? ", selected" : ""}`}
                      onPress={() => setNewProfileType(option.value)}
                      style={{
                        borderRadius: 999,
                        borderWidth: selected ? 2 : 1,
                        borderColor: selected ? colors.primary : colors.cardBorder,
                        backgroundColor: selected
                          ? colors.primary + "18"
                          : colors.surface,
                        paddingHorizontal: 13,
                        paddingVertical: 8,
                        minWidth: 44,
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
            </View>

            <Button
              size="lg"
              onPress={createLocationProfile}
              disabled={!newProfileName.trim()}
            >
              Create profile and select equipment
            </Button>
          </View>
        </View>
      </Modal>

      <EquipmentPicker
        visible={!!equipmentPickerProfileId}
        selectedIds={equipmentPickerSelectedIds}
        onClose={() => setEquipmentPickerProfileId(null)}
        onConfirm={handleEquipmentPickerConfirm}
      />

      {/* ── Exercise exclusion modal ── */}
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
                accessibilityRole="button"
                accessibilityLabel="Close exclusion picker"
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
                      accessibilityRole="button"
                      accessibilityLabel={`${item.name}${selected ? ", excluded" : ""}`}
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
                          borderColor: selected ? colors.primary : colors.cardBorder,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: selected
                            ? colors.primary + "1A"
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
          </View>
        </View>
      </Modal>
    </View>
  );
}
