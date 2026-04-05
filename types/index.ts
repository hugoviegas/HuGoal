// ─── User Profile ───────────────────────────────────────────────
export type Goal = "lose_fat" | "gain_muscle" | "maintain" | "recomp";
export type FitnessLevel = "beginner" | "intermediate" | "advanced";
export type Equipment = "home" | "gym" | "none";
export type Sex = "male" | "female" | "other";
export type AIProvider = "gemini" | "claude" | "openai";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  username: string;
  avatar_url?: string;
  bio?: string;
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
  onboarding_complete: boolean;
  created_at: string;
  updated_at?: string;
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
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment: EquipmentType[];
  difficulty: Difficulty;
  video_youtube_ids: string[];
  video_storage_url?: string;
  instructions_pt?: string;
  instructions_en?: string;
  aliases: string[];
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

export interface WorkoutTemplate {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_ai_generated: boolean;
  source_prompt?: string;
  exercises: WorkoutExercise[];
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
  serving_size_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  source: FoodSource;
}

export interface NutritionLog {
  id: string;
  user_id: string;
  logged_at: string;
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
export type ChallengeType =
  | "weight_loss"
  | "gym_frequency"
  | "volume"
  | "custom";

export interface CommunityPost {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  content: string;
  image_url?: string;
  shared_workout_id?: string;
  shared_diet_id?: string;
  likes_count: number;
  comments_count: number;
  visibility: PostVisibility;
  created_at: string;
}

export interface CommunityFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface CommunityGroup {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  creator_id: string;
  members: string[];
  challenge_type: ChallengeType;
  challenge_goal?: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface ChallengeParticipant {
  id: string;
  group_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  current_progress: number;
  rank: number;
  last_updated: string;
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
