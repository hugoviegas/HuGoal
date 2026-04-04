# Phase 04 - Workouts

## Suggested specialization

Workout agent.

## Objective

Deliver the workout domain end-to-end: library browsing, template creation, workout editing, live workout execution, session history, and exercise guidance.

## Current Starting Point

- `stores/workout.store.ts` already exists as a base session store.
- Workout screens, domain components, and helper hooks are not implemented yet.

## Screens and Routes

- `app/(tabs)/workouts/index.tsx` for the user's saved workout templates.
- `app/(tabs)/workouts/create.tsx` for manual and AI-assisted creation.
- `app/(tabs)/workouts/explore.tsx` for the exercise library.
- `app/(tabs)/workouts/history.tsx` for completed sessions and trends.
- `app/(tabs)/workouts/[id]/index.tsx` for workout detail.
- `app/(tabs)/workouts/[id]/edit.tsx` for editing a template.
- `app/(tabs)/workouts/[id]/run.tsx` for the active workout runner.
- Shared components under `components/workouts/` for cards, runner controls, demo video, muscle map, and set rows.

## Step-by-Step Work

1. Define the workout and exercise data access patterns needed by the screens.
2. Build the workouts index with search, filters, recent sessions, and a clear create CTA.
3. Build the create flow with a manual builder and an AI-assisted builder.
4. Build the detail, edit, explore, history, and run screens around one stable template model.
5. Implement the workout runner around the existing workout store.
6. Add timer, rest countdown, haptics, keep-awake, and local notification behavior.
7. Add progressive overload suggestions based on the last completed session.
8. Add muscle map highlighting and exercise demo video support.

## Screen Behavior

### Workouts Index

- Show saved templates as cards with name, difficulty, estimated duration, and last session summary.
- Allow search by workout name and filter by goal, equipment, or difficulty.
- Show an empty state with one primary action: create a workout.

### Create Workout

- Manual mode should let the user search the exercise library, add exercises, set order, define sets, reps, duration, rest, and notes.
- AI mode should ask for goal, split, equipment, available time, training level, target muscles, cardio preference, and injuries or limitations.
- AI-generated output must be shown as an editable draft before saving.
- If the AI provider or key is unavailable, fall back to manual creation instead of blocking the user.

### Explore Exercises

- Support search, muscle filters, equipment filters, and difficulty filters.
- Show each exercise with name, muscle groups, equipment, difficulty, and demo media availability.
- Opening an exercise should show instructions, target muscles, and related videos.

### Workout Detail and Edit

- Show template summary, total duration, exercise list, tags, and buttons to start, edit, or duplicate.
- Editing should preserve the template until the user explicitly saves changes.
- If an exercise is missing or deleted, surface a replacement action instead of breaking the template.

### Live Run

- The runner should present the current exercise, the current set, rest timing, suggested weight, and quick actions for complete, skip, back, and reorder.
- Show elapsed session time, current exercise progress, and session volume as the user works through the plan.
- The runner should keep a running list of completed sets and persist the active session snapshot so the workout can resume after interruption.
- At the end of the workout, show a summary with duration, total volume, sets completed, pace, and a simple score or rating.

## Behavior Rules

- If rest ends while the app is backgrounded, send a local notification and restore the rest state when the app returns.
- If the user edits set weight during the session, keep that value on the session record even if the template stays unchanged.
- If the app loses network during a workout, keep the session locally and sync the completed result when possible.
- If muscle mapping data is unavailable, show a generic highlight instead of hiding the runner UI.
- If demo video is unavailable, show instructions and the exercise name rather than a broken player.

## Data and Storage

- `exercise_library` is the source of truth for exercise metadata, muscles, equipment, instructions, and video references.
- `workout_templates` stores the user's workout definitions, whether manual or AI-generated.
- `workout_sessions` stores the completed session, timestamps, total volume, difficulty rating, notes, and all completed sets.
- `muscle_regions` stores the highlight polygons or paths used by the mannequin.
- Recommended active-session state can be kept locally and only committed to Firestore when the session ends.

## Configuration Questions

- Which template types are supported in MVP: full body, upper/lower, push/pull/legs, or only custom?
- Should AI-generated workouts include warm-up and cool-down blocks automatically? Recommendation: yes.
- What is the maximum number of exercises per template in MVP?
- Should users be able to create custom exercises, or only select from the library? Recommendation: library only for MVP.
- Should rest times be per exercise, per set, or both? Recommendation: per exercise with optional override.

## Deliverables

- Complete workout CRUD and execution flow.
- A live runner that can track sets, rest, and elapsed time.
- Exercise guidance that can show muscle emphasis and demo media.
- A workout history view with meaningful summary metrics.

## Acceptance Criteria

- A user can create a workout, run it, and save the session.
- Rest alerts still work when the app is backgrounded.
- The next session can suggest weights based on prior data.
- The exercise library can drive both manual creation and AI-generated templates.

## Constraints

- Keep the workout runner state predictable; do not hide state changes in multiple places.
- If AI generation is touched, keep it optional and failure-tolerant.
