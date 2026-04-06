Context
Starting from scratch as a pure mobile app in the currently empty HuGoal/ directory. The existing CoachAi web app serves as a reference for Firestore schema and feature logic only — no code is migrated from it. The goal is a single Expo React Native codebase that produces both an Android APK and an iOS IPA, with real-time device testing and OTA updates.

Tech Stack
ConcernChoiceReasonFrameworkExpo SDK 52 (Managed Workflow)Single codebase → APK + IPA, Expo Go for instant device testing, no Xcode required during developmentLanguageTypeScriptType safety, matches existing Firebase schemaNavigationExpo Router v4File-based like Next.js, typed routes, deep linking built-inStylingNativeWind v4 (Tailwind v3)className props on RN components, most familiar authoring experienceGlass/Blur UIexpo-blur BlurViewNative iOS/Android backdrop blur (CSS backdrop-filter doesn't exist in RN)Animationsreact-native-reanimated v360fps native-thread animations, gesture integrationGesturesreact-native-gesture-handlerLong-press drag reorder, swipe actionsStateZustand v5Lightweight, works in RN without changesFormsReact Hook Form + ZodFamiliar validation patternBackendFirebase (Firestore + Auth + Storage)Real-time, scales, already designed schemaAIUser's own API key (Claude, Gemini, GPT-4)Stored in expo-secure-store, never in cloudOCRreact-native-vision-camera + ML KitOn-device, free, offline-capableVideoexpo-videoNative video playback for exercise demosSVG (muscle map)react-native-svgSame SVG path data from CoachAi, just different element namesi18ni18next + react-i18nextDevice language detection, easy to add languagesChartsvictory-nativeProgression charts on coach pageNotificationsexpo-notificationsLocal rest timer alerts when app is backgrounded

Project Structure
HuGoal/
├── app/ ← Expo Router screens (file = route)
│ ├── \_layout.tsx ← Root layout: auth guard, theme, i18n init
│ ├── (auth)/
│ │ ├── \_layout.tsx
│ │ ├── welcome.tsx ← Splash/welcome screen
│ │ ├── login.tsx
│ │ ├── signup.tsx
│ │ └── onboarding/
│ │ ├── \_layout.tsx ← Progress stepper
│ │ ├── personal.tsx ← Name, age, height, weight, sex
│ │ ├── goals.tsx ← Goal (lose/gain/maintain), timeline
│ │ ├── experience.tsx ← Fitness level, equipment access
│ │ └── diet.tsx ← Allergies, preferences, vegan/vegetarian
│ ├── (tabs)/
│ │ ├── \_layout.tsx ← Custom floating tab bar
│ │ ├── dashboard.tsx ← Today overview: streak, XP, planned workout, macros
│ │ ├── workouts/
│ │ │ ├── index.tsx ← My workouts list
│ │ │ ├── create.tsx ← Manual or AI-generated workout builder
│ │ │ ├── explore.tsx ← Browse exercise library
│ │ │ ├── history.tsx ← Past sessions with stats
│ │ │ └── [id]/
│ │ │ ├── index.tsx ← Workout detail view
│ │ │ ├── edit.tsx ← Edit workout
│ │ │ └── run.tsx ← Live workout runner
│ │ ├── nutrition/
│ │ │ ├── index.tsx ← Daily macro summary + meal list
│ │ │ ├── log.tsx ← Manual food entry
│ │ │ ├── scan.tsx ← OCR camera (food label scanning)
│ │ │ ├── photo.tsx ← AI meal photo analysis
│ │ │ └── plan.tsx ← AI-generated diet plan
│ │ ├── community/
│ │ │ ├── index.tsx ← Social feed (posts from following)
│ │ │ ├── discover.tsx ← Find people, trending posts
│ │ │ ├── groups/
│ │ │ │ ├── index.tsx ← My groups
│ │ │ │ ├── create.tsx ← Create challenge group
│ │ │ │ └── [id].tsx ← Group detail + leaderboard
│ │ │ └── [postId].tsx ← Post detail + comments
│ │ ├── coach.tsx ← AI coach: progression, weekly plan, insights
│ │ └── profile/
│ │ ├── index.tsx ← My profile (photo, stats, public posts)
│ │ └── achievements.tsx ← Badges + XP history
│ ├── user/[id].tsx ← Public profile of another user
│ └── settings/
│ ├── index.tsx
│ ├── ai-keys.tsx ← API key management (SecureStore)
│ ├── appearance.tsx ← Dark/light mode + theme color
│ ├── language.tsx ← Language picker
│ ├── profile-edit.tsx ← Edit user profile
│ └── about.tsx ← Version, author, BUSL 1.1 license
├── components/
│ ├── ui/
│ │ ├── Button.tsx
│ │ ├── Input.tsx
│ │ ├── GlassCard.tsx ← BlurView wrapper (glass effect)
│ │ ├── TabBar.tsx ← Custom floating tab bar (reanimated)
│ │ ├── Toast.tsx ← Zustand-driven snackbar
│ │ ├── Modal.tsx
│ │ └── Avatar.tsx
│ ├── workouts/
│ │ ├── MuscleAnatomy.tsx ← react-native-svg front/back mannequin
│ │ ├── WorkoutRunner.tsx ← Timer, sets, weights, rest between exercises
│ │ ├── WorkoutCard.tsx
│ │ ├── ExerciseCard.tsx
│ │ ├── VideoPlayer.tsx ← expo-video exercise demo
│ │ └── SetRow.tsx ← Weight + reps input row
│ ├── nutrition/
│ │ ├── MacroRing.tsx ← Donut chart for daily macros
│ │ ├── FoodItem.tsx
│ │ ├── MealSection.tsx
│ │ └── DisclaimerBanner.tsx ← "Not a substitute for professional advice"
│ └── community/
│ ├── PostCard.tsx
│ ├── ChallengeCard.tsx
│ └── LeaderboardRow.tsx
├── stores/
│ ├── auth.store.ts ← onAuthStateChanged listener, user profile
│ ├── theme.store.ts ← dark/light + accent color
│ ├── workout.store.ts ← Active workout session state
│ └── toast.store.ts
├── hooks/
│ ├── useAuth.ts
│ ├── useTheme.ts
│ └── useLocale.ts
├── lib/
│ ├── firebase.ts ← Firebase init (AsyncStorage persistence)
│ ├── firestore.ts ← Typed collection helpers
│ ├── ai-provider.ts ← Unified Claude/Gemini/GPT-4 interface
│ ├── api-key-store.ts ← SecureStore read/write/delete
│ ├── exercise-videos.ts ← Exercise ID → YouTube ID / Storage URL map
│ └── utils.ts ← cn(), formatDuration(), etc.
├── types/
│ └── index.ts ← All Firestore document types + app types
├── constants/
│ ├── colors.ts ← Light/dark color palettes
│ ├── theme.ts ← Spacing, radius, font sizes
│ └── muscle-data.ts ← SVG path data for front/back mannequin
├── locales/
│ ├── en.json
│ └── pt.json
├── assets/
│ ├── fonts/
│ ├── images/
│ │ └── muscle-map/ ← front.png, back.png (reference images)
│ └── icons/
├── app.json ← Expo config (name, slug, icons, splash)
├── eas.json ← Build profiles (development, preview, production)
├── tailwind.config.js ← NativeWind v4 (Tailwind v3)
├── babel.config.js ← NativeWind + reanimated plugins
├── tsconfig.json
├── package.json
└── LICENSE ← BUSL 1.1

Firebase Schema (Firestore)
Collections
profiles/{uid}
name, email, avatar_url, bio
age, height_cm, weight_kg, sex
goal (lose_fat | gain_muscle | maintain | recomp)
level (beginner | intermediate | advanced)
equipment (home | gym | none)
allergies[], dietary_restrictions[], preferred_cuisines[]
xp, streak_current, streak_longest, last_activity_date
preferred_ai_provider (gemini | claude | openai) ← preference only, key stored locally
created_at

workout_templates/{id}
user_id, name, description
is_ai_generated, source_prompt
exercises: [{
exercise_id, name, name_en
sets, reps, duration_seconds, rest_seconds
primary_muscles[], secondary_muscles[]
video_youtube_id, video_storage_url
order
}]
estimated_duration_minutes, difficulty
tags[], created_at, updated_at

workout_sessions/{id}
user_id, workout_template_id, workout_name
started_at, ended_at, duration_seconds
sets_completed: [{
exercise_id, set_number, reps, weight_kg, duration_seconds
}]
total_volume_kg, difficulty_rating (1-5)
xp_earned, notes

exercise_library/{id}
name (PT), name_en
primary_muscles[], secondary_muscles[]
equipment[] (none | barbell | dumbbell | machine | cable | bodyweight | band)
difficulty (beginner | intermediate | advanced)
video_youtube_ids[], video_storage_url
instructions_pt, instructions_en
aliases[]

muscle_regions/{id}
name, name_en, group
side (front | back)
svg_polygon_points ← coordinates for mannequin highlight overlay

nutrition_logs/{id}
user_id, logged_at
meal_type (breakfast | lunch | dinner | snack | pre_workout | post_workout)
items: [{
food_name, brand, serving_size_g
calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g
source (manual | ocr | ai_photo | ai_generated)
}]
total: { calories, protein_g, carbs_g, fat_g }
notes, image_url

food_library/{id} ← user's personal food item database
user_id, name, brand
serving_size_g, calories, protein_g, carbs_g, fat_g
barcode, created_at

diet_plans/{id}
user_id, name
is_ai_generated, target_calories
daily_protein_g, daily_carbs_g, daily_fat_g
meals: [{ meal_type, items[], notes }]
dietary_tags[], created_at

community_posts/{id}
author_id, content, image_url
shared_workout_id, shared_diet_id
likes_count, comments_count
visibility (public | followers)
created_at

community_follows/{id}
follower_id, following_id, created_at

community_groups/{id}
name, description, avatar_url
creator_id, members[]
challenge_type (weight_loss | gym_frequency | volume | custom)
challenge_goal, start_date, end_date
is_active

challenge_participants/{id}
group_id, user_id
current_progress, rank
last_updated

achievements/{id} (subcollection under profiles)
achievement_key, name, description, icon
unlocked_at, xp_reward

Feature Implementation Details
AI Integration Architecture
The user sets their preferred provider in settings. The key lives in expo-secure-store:
ts// lib/api-key-store.ts
type Provider = 'gemini' | 'claude' | 'openai';

saveApiKey(provider, key) // SecureStore.setItemAsync → iOS Keychain / Android Keystore
getApiKey(provider) // SecureStore.getItemAsync
deleteApiKey(provider) // SecureStore.deleteItemAsync
lib/ai-provider.ts exposes:

generateText(systemPrompt, userPrompt) — workout generation, diet plans, coach insights
analyzeImage(base64, prompt) — meal photo analysis, food label OCR post-processing

Keys never touch Firestore or any server. WHEN_UNLOCKED_THIS_DEVICE_ONLY prevents cloud backup.
API Key Setup Screen (settings/ai-keys.tsx):

Status per provider (configured / not configured)
Masked key display (sk-ant-...\*\*\*\*)
Step-by-step guide with Linking.openURL() to each provider's key page
"Test connection" button making a minimal API call

Workout Runner (workouts/[id]/run.tsx)
State managed in workout.store.ts (Zustand):

Current exercise index, current set, rest timer, total elapsed time
Weight per set (editable, persisted per session)
Reorderable exercise list (drag-and-drop mid-workout)

Native enhancements:

expo-haptics impact on set completion
expo-keep-awake keeps screen on during active workout
expo-notifications local notification when rest timer ends (user can background the app)
Progressive overload: fetch last session for same workout from Firestore, show suggested weight with +/- indicator

Muscle Mannequin (components/workouts/MuscleAnatomy.tsx)
Uses react-native-svg. Path data in constants/muscle-data.ts defines SVG polygons for each muscle group (front and back). Active muscles for the current exercise get highlighted via useAnimatedProps + withTiming color interpolation (reanimated).
OCR Food Scanning (nutrition/scan.tsx)

react-native-vision-camera shows live camera preview
User captures frame or picks up to 5 images from gallery (expo-image-picker allowsMultipleSelection: true, selectionLimit: 5)
Each image processed through @react-native-ml-kit/text-recognition (on-device, free)
Raw text sent to user's AI provider to extract: food name, serving size, calories, protein, carbs, fat
Review screen shows each detected item — user can edit any field before saving

AI Meal Photo Analysis (nutrition/photo.tsx)

User captures/picks photo of their meal
Image (base64) sent to AI provider with structured prompt
AI returns JSON array of identified foods with estimated weights
Review screen lists each item with editable weight/quantity
User confirms → batch logged to nutrition_logs

Disclaimer banner on both screens: "Estimativas de IA são aproximadas e não substituem orientação de um profissional de saúde."
Community + Challenges
Posts support text, images (Firebase Storage), and optionally attaching a workout or diet plan. Real-time feed via Firestore onSnapshot. Challenge leaderboards updated by Cloud Functions triggered on workout_sessions and nutrition_logs writes (prevents client-side manipulation).
Glass UI
Every card uses GlassCard:
tsx<BlurView intensity={60} tint="default" style={styles.card}>
{children}
</BlurView>
tint automatically switches with the system color scheme for dark/light mode.

Key Dependency List
json{
"expo": "~52.0.0",
"expo-router": "~4.0.0",
"expo-blur": "~14.0.0",
"expo-secure-store": "~14.0.0",
"expo-camera": "~15.0.0",
"expo-image-picker": "~15.0.0",
"expo-video": "~2.0.0",
"expo-haptics": "~13.0.0",
"expo-keep-awake": "~13.0.0",
"expo-notifications": "~0.28.0",
"expo-updates": "~0.26.0",
"expo-linking": "~6.0.0",
"expo-constants": "~17.0.0",
"react-native-svg": "15.6.0",
"react-native-vision-camera": "^4.6.0",
"@react-native-ml-kit/text-recognition": "^1.1.0",
"nativewind": "^4.1.23",
"tailwindcss": "^3.4.0",
"react-native-safe-area-context": "4.11.0",
"react-native-screens": "~3.34.0",
"react-native-reanimated": "~3.16.0",
"react-native-gesture-handler": "~2.20.0",
"@react-native-async-storage/async-storage": "2.1.0",
"firebase": "^12.11.0",
"@google/generative-ai": "^0.24.1",
"openai": "^4.0.0",
"@anthropic-ai/sdk": "^0.39.0",
"zustand": "^5.0.9",
"react-hook-form": "^7.68.0",
"@hookform/resolvers": "^5.2.2",
"zod": "^4.1.13",
"i18next": "^23.0.0",
"react-i18next": "^14.0.0",
"victory-native": "^41.0.0",
"date-fns": "^4.1.0",
"lucide-react-native": "^0.468.0"
}

Note: NativeWind v4 requires Tailwind v3 — not v4 (which is CSS-first and incompatible with RN).

Build & Testing Workflow
Daily Development
bashnpx expo start # Start Metro bundler

# → Scan QR with Expo Go on physical device (instant, no build needed)

When Native Modules Are Needed (vision-camera, ML Kit)
basheas build --profile development --platform android

# → Download and install development APK on device

# → Connect to local Metro bundler via tunnel

Preview Build (QA / sharing with others)
basheas build --profile preview --platform all

# → APK (Android) + Ad-hoc IPA (iOS)

OTA Update (JS-only changes, no app store needed)
basheas update --branch production --message "Fix workout timer"

# Users get update on next app launch

Production Release
basheas build --profile production --platform all # AAB + IPA
eas submit --profile production --platform all # Upload to stores
eas.json
json{
"build": {
"development": {
"developmentClient": true,
"distribution": "internal",
"android": { "buildType": "apk" },
"ios": { "simulator": true }
},
"preview": {
"distribution": "internal",
"android": { "buildType": "apk" }
},
"production": {
"android": { "buildType": "app-bundle" }
}
}
}

Implementation Phases (MVP)
PhaseDeliverable1Project scaffold: Expo + NativeWind + Expo Router + Firebase Auth + dark/light + i18n (EN/PT)2Onboarding quiz (4 steps) + profile stored in Firestore3Core UI library: GlassCard, Button, Input, TabBar, Toast, Avatar4Workout feature: exercise library browser, manual create, AI generate, workout runner with timer/sets/weights, muscle map5Nutrition: manual log, food library, OCR scan, AI meal photo, macro tracking, AI diet plan6AI key management: SecureStore, setup guide, provider switcher, test connection7Community: posts, follows, groups, challenge creation, leaderboard8Coach page: progression charts, weekly AI summary, streak calendar9Achievements + XP system + unlock animations10Polish: about page, BUSL 1.1, app icons, splash screen, EAS production build

License
LICENSE — Business Source License 1.1:

Non-commercial / personal use: ✅ free
Forking for learning: ✅ allowed
Selling/distributing commercially without permission: ❌ prohibited
Auto-converts to Apache 2.0 after 4 years from each release

This directly prevents anyone from copying the app and publishing it on app stores.

Verification Checklist

App runs on physical Android via Expo Go (Phase 1)
Auth + onboarding completes and saves to Firestore
AI generates workout using user's Gemini/Claude/GPT key
Workout runner: timer counts, sets save, rest alert fires in background
Muscle map highlights correct groups during exercise
OCR scan reads nutrition label from photo
AI meal photo identifies foods + shows review screen
Community post creates, appears in feed, likes work
Challenge leaderboard updates after logging a workout
API key saved locally, never appears in Firestore
Dark mode + language switch work immediately
Production APK built via EAS, installs on clean Android device
