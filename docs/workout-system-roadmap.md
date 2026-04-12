# Workout System — Full Roadmap

> Created: 2026-04-12  
> Status: In progress

---

## Overview

Complete overhaul of the workout system covering: configuration profiles, my-workouts library, weekly scheduling, and the main workouts screen with adaptive workout tools.

---

## Phase 0 — Immediate Display Fixes (NOW)

Fix the current broken workout display before building new features.

### 0.1 — Workout Detail Page (`[id]/index.tsx`)
- [x] Show `workout.cover_image_url` as the header image (not the exercise catalog image)
- [x] Show `workout.name` as the main title and `workout.description` as subtitle
- [x] Render exercises separated by warmup / workout / cooldown using `workout.sections` when available, falling back to the artificial split from `exercises[]`
- [x] Keep the tap-to-inspect exercise detail (catalog images, how-to, muscle map) as a secondary panel or modal

### 0.2 — Workouts Hub (`index.tsx`)
- [x] Prefer `workout.cover_image_url` as hero image instead of first-exercise catalog image
- [x] Use `workout.sections` data (when available) for the warmup/workout/cooldown section display instead of the artificial positional split

### 0.3 — Run Screen (`run.tsx`)
- [x] Remove MOCK_WORKOUT — load real `WorkoutTemplateRecord` from Firestore by route `id`
- [x] Convert template exercises/sections to `RunningExercise[]` with catalog enrichment
- [x] Save `CompletedWorkoutSessionRecord` to Firestore on last step completion
- [x] Navigate to summary with `?sessionId=` param

### 0.4 — Summary Screen (`summary.tsx`)
- [x] Remove mock data — load real session by `sessionId` param
- [x] Display duration, volume, sets, reps, XP earned, exercise breakdown

### 0.5 — History Screen (`history.tsx`)
- [x] Remove all mock data — load real `workout_sessions_completed` from Firestore
- [x] Group by date, show per-session metrics, stats tab with real aggregates

### 0.6 — Streak & Calendar
- [x] `updateUserStreak` called automatically on session save
- [x] Calendar dots driven by real `getCompletedSessionDates` query
- [x] Streak badge reads from `profile.streak_current`

---

## Phase 1 — Workout Configuration (Training Profiles)

A new settings area separate from the profile settings, accessible via the Settings2 icon in the workouts hub.

Route: `/workouts/settings` (or `/workouts/config`)

### 1.1 — Training Locations (Workout Profiles)
- User can create up to **3 training locations** (e.g., "Home", "Gym", "Hotel")
- Each location acts as an independent training profile
- Each location has its own:
  - Name + icon/emoji
  - Equipment set (see 1.2)
  - Workout time & frequency (see 1.3)
  - Exercise types & difficulty (see 1.4)
  - Active workout templates assigned to it
- Only one location can be **active** at a time
- UI: card list with add button (disabled when 3 exist), edit/delete via 3-dot menu

**Firestore collection:** `workout_profiles/{profileId}`
```
{
  id: string
  user_id: string
  name: string
  icon: string           // emoji or lucide icon name
  equipment: string[]    // selected equipment types
  days_per_week: number
  training_days: number[]  // 0=Mon … 6=Sun
  minutes_per_session: number
  exercise_types: string[]
  difficulty: "beginner" | "intermediate" | "advanced"
  is_active: boolean
  created_at: string
  updated_at: string
}
```

### 1.2 — Equipment
- Full list of available equipment types from `EquipmentType`
- Multi-select with:
  - "Select all" / "Deselect all" toggle
  - Search/filter bar
  - Visual icons per equipment type
- Default: all selected
- Stored per training location profile

### 1.3 — Time & Frequency
- Days per week slider (1–7)
- Day-of-week multi-select (Mon–Sun checkboxes)
- Minutes per session selector (15 / 30 / 45 / 60 / 90 / 120+)

### 1.4 — Exercise Types & Difficulty
- Exercise type toggles: Strength, Cardio, Flexibility, HIIT, Yoga, etc.
- Difficulty selector: Beginner / Intermediate / Advanced
  - Advanced includes all; Intermediate includes Beginner
- Applied per training location profile

---

## Phase 2 — My Workouts Library

New route: `/workouts/library` (replaces or enhances current index for template management)

### 2.1 — Tabs
- **My Workouts** — All templates the user has created or saved
- **Discover** — Public workout templates from other users
- **Drafts** — In-progress templates (saved from the create flow)

### 2.2 — My Workouts Tab
- Card grid/list showing all workout templates
- Card content:
  - Cover image
  - Name + description excerpt
  - Tags (difficulty, duration, muscle focus)
  - Active/inactive badge
  - Like count (for discovered workouts)
  - 3-dot context menu: Edit | Duplicate | Move to Location | Deactivate/Activate | Delete
- Filter by: location profile, difficulty, muscle group

### 2.3 — Discover Tab
- Browse public templates shared by other users
- Like button (heart) + count
- "Add to my library" button
- Shows how many users added it
- Search + filter bar

### 2.4 — Drafts Tab
- Incomplete templates auto-saved during creation
- Can resume editing or discard

### 2.5 — Edit Workout Sheet
- Accessible via 3-dot menu
- Fields: name, description, cover image, difficulty, tags
- Toggle: Active / Inactive
- Move to Location: select from user's location profiles
- Bottom sheet or dedicated screen

**Firestore additions:**
- `workout_templates` → add `location_profile_id?: string`, `is_draft?: boolean`, `like_count?: number`, `saved_by_count?: number`
- `workout_likes/{userId}_{templateId}` — like records
- Public templates visible by querying `is_public == true`

---

## Phase 3 — Weekly Schedule Distribution

Logic to distribute active workout templates across the week.

### 3.1 — Schedule Algorithm
- Input: active templates for current location profile + `training_days[]`
- Distribution: round-robin in creation order
  - Example: 3 templates, 5 training days → T1, T2, T3, T1, T2
- Schedule stored per week so past weeks aren't re-computed
- Re-computed when: templates change, location profile changes, training days change

### 3.2 — Schedule Display in Workouts Hub
- Week calendar shows which workout is scheduled per day
- Tapping a day shows the scheduled workout
- Today's workout is the default shown in the main panel

**Firestore additions:**
- `workout_schedule/{userId}_{yearWeek}` — weekly schedule map
  ```
  { weekKey: "2026-W15", schedule: { "Mon": "templateId1", "Tue": "templateId2", ... } }
  ```

---

## Phase 4 — Adapt Workout Panel

Floating "Adapt Workout" button on the workouts hub / active workout screen. Opens a bottom sheet with 4 options:

### 4.1 — Change Workout Type
- Popup to select a different active template from the current location profile
- Replaces today's scheduled workout (one-time swap, not permanent)

### 4.2 — Adjust Workout Time *(deferred)*
- Dynamically add/remove exercises to match target duration
- Complex — depends on AI integration

### 4.3 — Change Difficulty
- Changes the target weight / reps range for exercises in the current session
- Beginner: lighter loads, fewer reps
- Advanced: heavier loads, more reps

### 4.4 — Use Another Location
- Switches the active location profile
- Updates the scheduled workouts to show templates for the new location
- Today's workout updates immediately

---

## Phase 5 — Workout Execution Improvements

### 5.1 — Section-Aware Run Screen
- `run.tsx` to use `workout.sections` for step progression
- Clear visual separation between warmup → workout → cooldown phases

### 5.2 — Completed Workout Storage
- Save full session to `workout_sessions` collection (not just paused)
- Track: template used, duration, sets completed, total volume, XP earned

---

## Implementation Order

| Step | Phase | Description |
|------|-------|-------------|
| 1 | 0.1 | Fix workout detail display (cover image, sections) |
| 2 | 0.2 | Fix workouts hub hero image and section display |
| 3 | 1 | Build configuration screens (location profiles, equipment, etc.) |
| 4 | 2 | Build My Workouts library with tabs and 3-dot menus |
| 5 | 3 | Weekly schedule algorithm and display |
| 6 | 4 | Adapt workout panel |
| 7 | 5 | Run screen improvements |

---

## Type Changes Required

```typescript
// Add to WorkoutTemplateRecord / WorkoutTemplateInput
location_profile_id?: string
is_draft?: boolean
is_public?: boolean
like_count?: number
saved_by_count?: number

// New
interface WorkoutLocationProfile {
  id: string
  user_id: string
  name: string
  icon: string
  equipment: EquipmentType[]
  days_per_week: number
  training_days: number[]   // 0=Mon, 6=Sun
  minutes_per_session: number
  exercise_types: string[]
  difficulty: Difficulty
  is_active: boolean
  created_at: string
  updated_at: string
}

interface WeeklyWorkoutSchedule {
  id: string              // {userId}_{yearWeek}
  user_id: string
  week_key: string        // "2026-W15"
  schedule: Record<string, string>  // "Mon" -> templateId
  location_profile_id: string
  created_at: string
}
```
