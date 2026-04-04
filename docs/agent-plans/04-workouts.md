# Phase 04 - Workouts

## Suggested Specialization

Workout agent.

## Objective

Deliver the workout domain end-to-end with a strong admin and data foundation:

- Exercise library browsing and management.
- Template creation, editing, duplication, and session execution.
- Live workout runner with local persistence and resume support.
- Muscle mannequin mapping with editable regions.
- AI-assisted workout generation.
- Automated exercise image generation.
- Translation pipeline for the exercise catalog.
- Health sync with Google Health / Health Connect and Apple HealthKit.

## Source Inputs For This Phase

- `stores/workout.store.ts` already exists as the base session store.
- Prototype files in `docs/prototype_files/` define the target UX and data import direction.
- The exercise catalog already has more than 150 exercises.
- Front and back mannequin images must be used as the visual basis for muscle highlighting.

## Discovery Outcomes

### Muscle Mapping

- Use a standalone web editor outside the mobile app.
- Use `fabric.js` or an equivalent drawing library for hotspot editing.
- Support only front and back mannequin views for MVP.
- Map only the main muscle groups for now, not ultra-granular anatomy.
- Save the map in a file or collection that the app can read later.

### Exercise Data

- Use Firestore as the source of truth.
- Keep a local cache for offline-first behavior.
- Separate base exercise data from media data.
- Allow custom exercises created by users, but keep the catalog library-driven for selection.
- Use soft delete so templates do not break when an exercise is retired.

### AI And Prompting

- Use the existing prompt-generator prototype as the base for workout prompt generation.
- Generate workout plans with Gemini.
- Use a conversational flow for AI workout creation.
- Show an editable draft before saving any AI-generated workout.
- If AI is unavailable, block the AI path and send the user to manual creation.

### Exercise Images

- Use a free or open-source image generation approach that can run in the background.
- Generate images on demand and in background jobs.
- Store generated media in Firebase Storage.
- Keep at least one image per exercise, with front/back/optional diagonal variations where relevant.

### Health Sync

- Support bidirectional sync with Google Health / Health Connect and Apple HealthKit.
- Sync in real time after the session ends.
- Sync workouts and nutrition-related data together.

### User Experience

- Workout index should use tabs for Saved, Recent, and Drafts.
- Creation should start from a FAB.
- Creation flow should separate Manual and AI modes using tabs.
- Live runner should be minimal and fullscreen-focused.
- Review before save is mandatory.

## Proposed Data Model

### Exercises

`exercises/{exerciseId}`

- `id`
- `name`
- `name_en`
- `category`
- `muscle_primary`
- `muscle_secondary`
- `equipment`
- `training_style`
- `difficulty`
- `type`
- `is_deleted`
- `created_at`
- `updated_at`

### Exercise Media

`exercises_media/{exerciseId}`

- `imageUrl_front`
- `imageUrl_back`
- `imageUrl_diagonal`
- `videoUrl`
- `link`
- `instructions`
- `notes`
- `source`
- `generated_at`

### Workout Templates

`workout_templates/{templateId}`

- `userId`
- `name`
- `goal`
- `split`
- `equipment`
- `availableTime`
- `level`
- `targetMuscles`
- `cardioPreference`
- `limitations`
- `exercises`
- `tags`
- `isDraft`
- `created_at`
- `updated_at`

### Workout Sessions

`workout_sessions/{sessionId}`

- `userId`
- `templateId`
- `templateName`
- `completedSets`
- `duration`
- `volume`
- `rating`
- `notes`
- `sync_status`
- `created_at`
- `finished_at`

### Muscle Regions

`muscle_regions/{view}`

- `front_body`
- `back_body`

Each region should keep normalized coordinates or SVG-like paths so the same map can be rendered on different screen sizes.

### Custom Exercises

`profile/{uid}/customExercises/{customExerciseId}`

- `name`
- `muscles`
- `equipment`
- `difficulty`
- `instructions`
- `media`
- `is_approved`

## Screens And Routes

- `app/(tabs)/workouts/index.tsx` for Saved, Recent, and Drafts.
- `app/(tabs)/workouts/create.tsx` for manual and AI-assisted creation.
- `app/(tabs)/workouts/explore.tsx` for the exercise library.
- `app/(tabs)/workouts/history.tsx` for completed sessions and trends.
- `app/(tabs)/workouts/[id]/index.tsx` for workout detail.
- `app/(tabs)/workouts/[id]/edit.tsx` for editing a template.
- `app/(tabs)/workouts/[id]/run.tsx` for the active workout runner.
- `app/(tabs)/workouts/[id]/summary.tsx` if a dedicated summary screen is needed.
- `app/admin/muscle-map-editor.tsx` for the standalone mannequin editor.
- `app/admin/exercises.tsx` for exercise management, translation, and approvals.
- `app/admin/image-generator.tsx` for batch and on-demand image generation.

## Component Plan

Shared components should live under `components/workouts/`.

- `ExerciseCard.tsx` for search results and detail previews.
- `WorkoutCard.tsx` for template cards in the index.
- `WorkoutFormStep.tsx` for the conversational AI builder.
- `MuscleMap.tsx` for rendering front and back mannequin highlights.
- `MuscleMapEditor.tsx` for admin hotspot editing.
- `LiveRunner.tsx` for the active workout screen.
- `RestTimer.tsx` for countdown, haptics, and local notification behavior.
- `SessionSummary.tsx` for the end-of-workout summary.
- `SetRow.tsx` for set editing and inline tracking.
- `MediaPreview.tsx` for image, video, and link display.

## Services And Stores

### Existing Store To Extend

- `stores/workout.store.ts`

Add predictable state for:

- Active session lifecycle.
- Pause and resume.
- Rest countdown.
- Reorder operations.
- Notes and bookmarked sets.
- Completed set snapshots.
- Offline persistence metadata.

### New Services

- `lib/exercise-service.ts` for loading, searching, and caching exercise data.
- `lib/workout-ai.ts` for Gemini prompts, structured output, and cache keys.
- `lib/image-generation.ts` for prompt assembly and image upload to Firebase Storage.
- `lib/health-sync.ts` for bidirectional sync with health platforms.
- `lib/muscle-map.ts` for mannequin region lookup and rendering helpers.
- `lib/workout-import.ts` for importing the existing exercise bank.
- `lib/workout-translation.ts` for batch translation workflows.

## Workout Index Behavior

- Show template cards with name, difficulty, estimated duration, and last session summary.
- Use tabs for Saved, Recent, and Drafts.
- Allow search by workout name.
- Filter by goal, equipment, and difficulty.
- Provide one primary create action in the empty state and in the main view.
- Keep the card preview minimal: name, duration, and difficulty.

## Create Workout Behavior

### Manual Mode

- Search the exercise library.
- Add exercises to the plan.
- Set order, sets, reps, duration, rest, weights, and notes.
- Allow optional overrides per exercise.

### AI Mode

- Use a conversational step-by-step flow.
- Ask for goal, split, equipment, available time, training level, target muscles, cardio preference, and injuries or limitations.
- Render the prompt using the HTML prompt-generator template.
- Generate a draft workout using Gemini.
- Show the AI result as an editable draft before saving.
- Cache AI output globally by input signature so identical requests do not regenerate needlessly.
- If AI is unavailable, route the user back to manual creation.

## Explore Behavior

- Support search.
- Support muscle filters, equipment filters, and difficulty filters.
- Show exercise name, muscle groups, equipment, difficulty, and whether media exists.
- Opening an exercise should show instructions, target muscles, links, and related videos.
- If media is missing, show the exercise data and instructions instead of a broken player.

## Detail And Edit Behavior

- Show template summary, total duration, exercise list, and tags.
- Provide actions to start, edit, and duplicate.
- Editing must not mutate the original template until the user explicitly saves.
- Missing or deleted exercises must surface a replacement action instead of breaking the template.

## Live Runner Behavior

- Runner should be fullscreen and focused.
- Show the current exercise, current set, rest timer, suggested weight, and quick actions.
- Provide complete, skip, back, reorder, bookmark, and note actions.
- Track elapsed time, exercise progress, and session volume.
- Persist the active session snapshot so the workout can resume after interruption.
- If rest finishes while backgrounded, trigger a local notification and restore rest state on return.
- Keep the state model predictable; do not hide state changes in multiple places.

## Summary And History Behavior

- Show duration, total volume, sets completed, pace, and a simple score or rating.
- Add trend-based progressive overload suggestions from the last three sessions.
- History should show completed sessions, trends, and a lightweight leaderboard-style summary.

## Image Generation Workflow

The image pipeline should support a background job and a manual admin trigger.

1. Build a prompt from exercise name, category, equipment, difficulty, and target muscles.
2. Run the prompt through the local image generation workflow.
3. Upload the generated asset to Firebase Storage.
4. Save the resulting URLs in `exercises_media`.
5. Retry missing images later from the admin panel.

The system should be able to generate at least one image per exercise and keep running in the background without blocking the app.

## Translation Workflow

- The existing catalog must be translatable.
- Use batch translation for the initial 150+ exercises.
- Keep the schema open for future languages.
- Make translations editable from the admin panel.
- Keep the original exercise ID stable across languages.

## Admin Workflow

- Admin users can create and edit exercises.
- Admin users can manage translations in batch.
- Admin users can map mannequin regions.
- Admin users can trigger image generation.
- Admin users can approve user-created custom exercises.

## Future Integrations To Keep In Scope

- Community sharing and friend challenges.
- Export and import of workouts, including PDF sharing.
- Wearables integration.
- Nutrition correlation.
- Exercise batch variants and progressive exercise families.

## Implementation Phases

### Phase A - Data Foundation

1. Finalize exercise schema and import the existing bank.
2. Build Firestore access patterns and local cache.
3. Add translation support.
4. Prepare media references and soft delete handling.

### Phase B - Muscle Map

1. Build the standalone editor.
2. Store and load front and back mannequin regions.
3. Render highlights in the app.

### Phase C - Media Generation

1. Build prompt generation from exercise metadata.
2. Generate images in the background.
3. Upload and persist media URLs.

### Phase D - Workout Creation

1. Build manual builder.
2. Build AI conversational flow.
3. Add review-before-save.

### Phase E - Workout Library UX

1. Build index tabs.
2. Add search and filters.
3. Build detail and duplicate flows.

### Phase F - Live Runner

1. Build fullscreen runner.
2. Add rest timer, haptics, notifications, and pause/resume.
3. Persist active sessions offline-first.

### Phase G - Summary And History

1. Build session summary.
2. Add trends and overload suggestions.
3. Sync completed sessions to Firestore.

### Phase H - Health Sync

1. Add permissions and platform integration.
2. Sync workout and nutrition data bidirectionally.

### Phase I - Admin Panel

1. Add exercise CRUD.
2. Add translation and approval tools.
3. Add image generation controls.

### Phase J - Polish And Expansion

1. Add community, export, and wearable scaffolds.
2. Add exercise batch variants.
3. Tighten accessibility and visual consistency.

## Acceptance Criteria

- A user can create a workout, run it, and save the session.
- Rest alerts still work when the app is backgrounded.
- The next session can suggest weights based on prior data.
- The exercise library can drive both manual creation and AI-generated templates.
- The mannequin can be configured outside the mobile app and read by the system.
- Exercise media can be generated and stored in Firebase Storage.
- Translations can be batch processed and maintained.
- Health data can sync bidirectionally for workouts and nutrition.

## Constraints

- Keep the runner state predictable.
- Keep AI optional and failure-tolerant.
- Prefer offline-first behavior for active sessions.
- Use soft delete for exercises to protect historical templates.
- Keep the admin editor separate from the consumer mobile app.

## Open Questions Still Worth Confirming Before Implementation

- Which template types are allowed in MVP: full body, upper/lower, push/pull/legs, or custom only?
- What is the maximum number of exercises per template in MVP?
- Should warm-up and cool-down blocks be generated automatically in every AI workout?
- How much of the health sync should be automatic versus user-initiated?
- Do you want the admin panel to be web-only or also accessible inside the project app shell?
