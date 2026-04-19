// ─── User Profile ───────────────────────────────────────────────
export type Goal = "lose_fat" | "gain_muscle" | "maintain" | "recomp";
export type FitnessLevel = "beginner" | "intermediate" | "advanced";
export type Equipment = "home" | "gym" | "none";
export type WorkoutLocationProfile = "home" | "gym" | "outdoor" | "studio";
export type WorkoutHoursPerDayRange =
  | "30m"
  | "45m"
  | "60m"
  | "90m"
  | "120m_plus";
export type WorkoutExperienceTimeRange =
  | "0_6_months"
  | "6_12_months"
  | "1_2_years"
  | "2_plus_years";
export type Sex = "male" | "female" | "other";
export type AIProvider = "gemini" | "claude" | "openai";

// Expanded equipment catalog ID (replaces EquipmentType for location profiles)
export type EquipmentItemId =
  // Free Weights
  | "barbell"
  | "dumbbell"
  | "dumbbell_adjustable"
  | "kettlebell"
  | "plates"
  | "weighted_vest"
  | "dip_belt"
  | "ez_bar"
  // Machines & Stations
  | "machine_cable"
  | "machine_chest_press"
  | "machine_lat_pulldown"
  | "machine_leg_extension"
  | "machine_leg_lift"
  | "machine_butterfly"
  | "machine_pulley"
  | "rack"
  | "smith_machine"
  // Bodyweight & Functional
  | "bodyweight"
  | "pullup_bar"
  | "dip_bars"
  | "pushup_bars"
  | "low_bar"
  | "ab_wheel"
  | "leg_lift_station"
  // Cardio
  | "treadmill"
  | "exercise_bike"
  | "outdoor_bike"
  | "rower"
  | "jump_rope"
  // Accessories
  | "bench"
  | "box"
  | "resistance_band"
  | "glute_band"
  | "foam_roller"
  | "gym_ball"
  | "suspension_trainer"
  | "gliding_discs"
  | "stick_towel_cord"
  | "pole"
  | "wall"
  | "none";

export type EquipmentCategory =
  | "free_weights"
  | "machines_stations"
  | "bodyweight_functional"
  | "cardio"
  | "accessories";

export interface EquipmentItem {
  id: EquipmentItemId;
  label: string;
  category: EquipmentCategory;
  image_key?: string;
}

// Location Profile
export interface WorkoutLocationProfileItem {
  id: string;
  name: string;
  type: WorkoutLocationProfile;
  equipment_ids: EquipmentItemId[];
  created_at: string;
  updated_at: string;
}

export interface WorkoutSettings {
  completed: boolean;
  locations: WorkoutLocationProfile[];
  training_days_per_week: number;
  training_days: number[];
  training_hours_per_day: WorkoutHoursPerDayRange;
  experience_level?: FitnessLevel;
  experience_time_range?: WorkoutExperienceTimeRange;
  limitations: string[];
  limitations_other?: string;
  equipment_by_location?: Partial<
    Record<WorkoutLocationProfile, EquipmentType[]>
  >;
  excluded_exercise_ids?: string[];
  updated_at?: string;
  // Firestore path: users/{userId}.workout_settings.location_profiles
  // Maximum of 3 profiles is enforced at application layer.
  location_profiles?: WorkoutLocationProfileItem[];
  active_location_profile_id?: string;
  manually_set?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  username: string;
  is_pro?: boolean;
  phone?: string;
  avatar_url?: string;
  bio?: string;
  birth_date?: string;
  age?: number;
  height_cm?: number;
  weight_kg?: number;
  sex?: Sex;
  goal?: Goal;
  level?: FitnessLevel;
  equipment?: Equipment;
  available_days_per_week?: number;
  injuries?: string;
  allergies: string[];
  dietary_restrictions: string[];
  preferred_cuisines: string[];
  xp: number;
  streak_current: number;
  streak_longest: number;
  last_activity_date?: string;
  preferred_ai_provider?: AIProvider;
  username_changed_at?: string;
  workout_settings?: WorkoutSettings;
  onboarding_complete: boolean;
  created_at: string;
  updated_at?: string;
  dashboard_config?: import("./dashboard").DashboardConfig;
}

// ─── Exercises ──────────────────────────────────────────────────
export type Difficulty = "beginner" | "intermediate" | "advanced";
export type EquipmentType =
  | "none"
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "bodyweight"
  | "band"
  | "kettlebell";

export interface Exercise {
  id: string;
  name: string;
  name_en: string;
  force?: string | null;
  mechanic?: string | null;
  category?: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  equipment: EquipmentType[];
  difficulty: Difficulty;
  video_youtube_ids: string[];
  video_storage_url?: string;
  instructions_pt?: string;
  instructions_en?: string;
  instructions?: string[];
  aliases: string[];
  images?: string[];
  muscle_primary?: string;
  muscle_secondary?: string[];
  training_style?: string[];
  type?: string;
  source_id?: string;
  source_level?: string;
  source_equipment?: string | null;
  source_category?: string;
  source_images?: string[];
  remote_image_urls?: string[];
}

// ─── Workouts ───────────────────────────────────────────────────
export interface WorkoutExercise {
  exercise_id: string;
  name: string;
  name_en: string;
  sets: number;
  reps: number;
  duration_seconds?: number;
  rest_seconds: number;
  primary_muscles: string[];
  secondary_muscles: string[];
  video_youtube_id?: string;
  video_storage_url?: string;
  order: number;
}

export type WorkoutSectionType = "warmup" | "round" | "cooldown";
export type WorkoutBlockType = "exercise" | "rest";

export interface WorkoutBlock {
  id: string;
  type: WorkoutBlockType;
  order: number;
  exercise_id?: string;
  name?: string;
  reps?: string;
  weight_kg?: number;
  rest_seconds?: number;
  notes?: string;
  duration_seconds?: number;
  primary_muscles?: string[];
  secondary_muscles?: string[];
}

export interface WorkoutSection {
  id: string;
  type: WorkoutSectionType;
  name: string;
  order: number;
  blocks: WorkoutBlock[];
}

export interface WorkoutTemplate {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  cover_image_url?: string;
  is_ai_generated: boolean;
  source_prompt?: string;
  exercises: WorkoutExercise[];
  sections?: WorkoutSection[];
  target_muscles?: string[];
  is_active?: boolean;
  schedule_day_of_week?: number;
  estimated_duration_minutes: number;
  difficulty: Difficulty;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CompletedSet {
  exercise_id: string;
  set_number: number;
  reps: number;
  weight_kg: number;
  duration_seconds?: number;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  workout_template_id: string;
  workout_name: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  sets_completed: CompletedSet[];
  total_volume_kg: number;
  difficulty_rating: number;
  xp_earned: number;
  notes?: string;
}

// ─── Nutrition ──────────────────────────────────────────────────
export type MealType =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack"
  | "pre_workout"
  | "post_workout";

export type FoodSource = "manual" | "ocr" | "ai_photo" | "ai_generated";

export interface NutritionItem {
  food_name: string;
  brand?: string;
  notes?: string;
  serving_size_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  source: FoodSource;
  photo_url?: string; // local URI or Firebase Storage URL
  ai_suggested?: boolean;
  confidence?: number;
  review_session_id?: string;
  user_edited?: boolean;
  original_weight_g?: number;
}

export interface NutritionLogMetadata {
  source?: "manual" | "nutrition_review" | "ai_generated";
  review_session_id?: string;
  is_final?: boolean;
  ai_model?: string;
}

export interface NutritionLog {
  id: string;
  user_id: string;
  logged_at: string;
  confirmed_at?: string;
  saved_at?: string;
  meal_type: MealType;
  items: NutritionItem[];
  total: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  notes?: string;
  image_url?: string;
  metadata?: NutritionLogMetadata;
}

export interface FoodLibraryItem {
  id: string;
  user_id: string;
  name: string;
  brand?: string;
  serving_size_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  barcode?: string;
  created_at: string;
}

export interface DietPlan {
  id: string;
  user_id: string;
  name: string;
  is_ai_generated: boolean;
  target_calories: number;
  daily_protein_g: number;
  daily_carbs_g: number;
  daily_fat_g: number;
  meals: {
    meal_type: MealType;
    items: NutritionItem[];
    notes?: string;
  }[];
  dietary_tags: string[];
  created_at: string;
}

// ─── Community ──────────────────────────────────────────────────
export type PostVisibility = "public" | "followers";
export type PostStatus = "published" | "draft" | "flagged" | "removed";
export type ChallengeType = "workout" | "nutrition" | "activity" | "streak";
export type ReportReason = "spam" | "harassment" | "inappropriate" | "other";
export type ReportStatus = "pending" | "approved" | "dismissed";
export type GroupMembership = "open" | "invite_only";
export type GroupVisibility = "public" | "private";
export type Trend = "up" | "down" | "stable";

export interface PostMedia {
  type: "image";
  storage_url: string;
  order: number;
}

export interface PostLinkedContent {
  type: "workout" | "nutrition" | "achievement";
  target_id: string;
  title: string;
  preview?: Record<string, unknown>;
}

export interface CommunityPost {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar_url?: string;
  content: string;
  content_length: number;
  media: PostMedia[];
  linked_content?: PostLinkedContent;
  visibility: PostVisibility;
  like_count: number;
  comment_count: number;
  liked_by: string[];
  status: PostStatus;
  created_at: string;
  updated_at?: string;
  flagged_reason?: ReportReason;
  flagged_count: number;
  mod_reviewed: boolean;
  mod_approved?: boolean;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  author_avatar_url?: string;
  content: string;
  reply_to?: string;
  like_count: number;
  created_at: string;
  status: "published" | "flagged" | "removed";
  replies?: CommunityComment[];
}

export interface CommunityFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
  is_muted: boolean;
  is_blocked: boolean;
}

export interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
  reason?: "user_input" | "auto_spam";
}

export interface UserMute {
  id: string;
  muter_id: string;
  muted_id: string;
  created_at: string;
}

export interface ChallengeConfig {
  goal: string;
  target_value: number;
  unit: string;
}

export interface CommunityGroup {
  id: string;
  creator_id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  challenge_type: ChallengeType;
  challenge_config: ChallengeConfig;
  membership: GroupMembership;
  visibility: GroupVisibility;
  member_count: number;
  created_at: string;
  started_at?: string;
  ended_at?: string;
  status: "active" | "ended";
}

export interface GroupMember {
  user_id: string;
  user_name: string;
  user_avatar?: string;
  joined_at: string;
  current_score: number;
  current_rank: number;
  last_activity?: string;
}

export interface CheckInMedia {
  storage_url: string;
  width?: number;
  height?: number;
  taken_at?: string; // ISO string from EXIF DateTimeOriginal
}

export interface GroupCheckIn {
  id: string;
  group_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  challenge_type: ChallengeType;
  metric_value: number;
  metric_unit: string;
  notes?: string;
  media?: CheckInMedia[];
  like_count: number;
  liked_by: string[];
  comment_count: number;
  checked_in_at: string;
  date: string; // YYYY-MM-DD for one-per-day enforcement
}

export interface CheckInComment {
  id: string;
  check_in_id: string;
  group_id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  content: string;
  emoji_reaction?: string;
  created_at: string;
}

export interface ChallengeParticipant {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  group_id: string;
  score: number;
  rank: number;
  progress_history: Array<{ timestamp: string; score: number }>;
  trend: Trend;
  completed: boolean;
  completed_at?: string;
  updated_at: string;
}

export interface ContentReport {
  id: string;
  reporter_id: string;
  reported_type: "post" | "comment" | "user";
  reported_id: string;
  reason: ReportReason;
  evidence_url?: string;
  status: ReportStatus;
  created_at: string;
  reviewed_at?: string;
  reviewer_id?: string;
}

export interface CommunityNotification {
  id: string;
  user_id: string;
  type: "like" | "comment" | "follow" | "group_invite" | "challenge_started";
  actor_id: string;
  actor_name: string;
  actor_avatar?: string;
  target_id?: string;
  target_type?: "post" | "group";
  read: boolean;
  created_at: string;
}

export interface PublicProfile {
  id: string;
  name: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  xp: number;
  streak_current: number;
  follower_count: number;
  following_count: number;
  public_post_count: number;
  network_visibility: "public" | "private";
  profile_visibility: "public" | "private";
}

// ─── Achievements ───────────────────────────────────────────────
export interface Achievement {
  id: string;
  achievement_key: string;
  name: string;
  description: string;
  icon: string;
  unlocked_at?: string;
  xp_reward: number;
}

// ─── Muscle Regions ─────────────────────────────────────────────
export type MuscleSide = "front" | "back";

export interface MuscleRegion {
  id: string;
  name: string;
  name_en: string;
  group: string;
  side: MuscleSide;
  svg_path: string;
}

// ─── Nutrition Extended ────────────────────────────────────────
export interface DailyNutritionGoal {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export type NutritionRdiSex = "male" | "female";
export type NutritionActivityLevel = "low" | "moderate" | "high" | "very_high";
export type NutritionRdiGoal = "lose" | "maintain" | "gain";

export interface NutritionMacroSplit {
  protein_pct: number;
  carbs_pct: number;
  fat_pct: number;
}

export interface NutritionRDIInputs {
  sex: NutritionRdiSex;
  age: number;
  height_cm: number;
  current_weight_kg: number;
  goal_weight_kg: number;
  activity_level: NutritionActivityLevel;
  goal: NutritionRdiGoal;
}

export interface NutritionRDIResult {
  bmr: number;
  tdee: number;
  rdi_kcal: number;
  macro_split: NutritionMacroSplit;
}

export type NutritionGoalStrategy =
  | "formula_only"
  | "formula_plus_override"
  | "manual_only";

export interface ManualNutrientTargets {
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
}

export interface NutritionSettings extends NutritionRDIInputs {
  rdi_kcal: number;
  macro_split: NutritionMacroSplit;
  water_goal_ml?: number;
  cup_size_ml?: number;
  goal_strategy?: NutritionGoalStrategy;
  manual_nutrient_targets?: ManualNutrientTargets;
  updated_at: string;
}

export type ServingType = "weight" | "unit" | "liquid";

export interface UnifiedFoodItem {
  id: string;
  user_id: string;
  name: string;
  brand?: string;
  category?: string;
  serving_type: ServingType;
  base_serving_value: number;
  base_serving_unit: "g" | "ml" | "unit";
  unit_weight_g?: number;
  kcal_per_base: number;
  protein_g_per_base: number;
  carbs_g_per_base: number;
  fat_g_per_base: number;
  fiber_g_per_base?: number;
  sugar_g_per_base?: number;
  barcode?: string;
  notes?: string;
  photo_url?: string;
  source: FoodSource;
  created_at: string;
  updated_at: string;
}

export interface DailyLogEntry {
  id: string;
  user_id: string;
  date_key: string;
  meal_slot: MealType | "other";
  food_id?: string;
  snapshot_food: UnifiedFoodItem;
  quantity: number;
  quantity_unit: "g" | "ml" | "unit";
  effective_grams_ml: number;
  total_kcal: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  total_fiber_g?: number;
  total_sugar_g?: number;
  rdi_kcal_pct?: number;
  created_at: string;
  updated_at: string;
}

export interface HydrationSettings {
  user_id: string;
  daily_target_ml: number;
  cup_size_ml: number;
  updated_at: string;
}

export interface NutritionReminderSchedule {
  time: string; // HH:mm
  weekdays: number[]; // 0-6 (Sun-Sat)
  timezone?: string;
}

export interface NutritionReminder {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: "water" | "meal" | "custom";
  enabled: boolean;
  schedule: NutritionReminderSchedule;
  repeat_interval_minutes?: number;
  local_notification_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface AIContextPayload {
  date_key: string;
  goals_summary: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number;
    sugar_g?: number;
  };
  hydration_summary: {
    consumed_ml: number;
    target_ml: number;
  };
  filtered_pantry_items: Array<{
    id: string;
    name: string;
    kcal_per_base: number;
    protein_g_per_base: number;
    carbs_g_per_base: number;
    fat_g_per_base: number;
    base_serving_value: number;
    base_serving_unit: "g" | "ml" | "unit";
  }>;
  day_log_summary: Array<{
    meal_slot: MealType | "other";
    food_name: string;
    quantity: number;
    quantity_unit: "g" | "ml" | "unit";
    kcal: number;
  }>;
}

export interface NutritionDaySummary {
  date: string; // YYYY-MM-DD
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  mealsCount: number;
  waterMl: number;
}

export interface WaterLog {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  amount_ml: number;
  logged_at: string;
}

export interface MealTemplate {
  id: string;
  user_id: string;
  name: string;
  items: NutritionItem[];
  total: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  created_at: string;
}
