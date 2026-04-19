# Running Workout Redesign Plan

## Goal

Redesign the active workout runner at `app/(tabs)/workouts/[id]/run.tsx` to improve clarity, reduce friction during set execution, and make the expanded progress view easier to scan and reorder during a live workout.

This plan is intentionally split into closed phases so the screen can be improved without changing the session lifecycle, persistence, and workout data model all at once.

## Current Baseline

The current runner already provides:

- Active session hydration and pause/resume persistence.
- Exercise and rest steps derived from workout templates.
- A top action area with quick list/edit entry points.
- A full-screen exercise hero image.
- A compact bottom sheet for workout progress.
- An exercise inspection modal with image cycling and instructions.
- A draggable exercise list used by workout builder flows.

## Target Experience

- Remove the exercise list popup from the top area.
- Replace the current adjust-set popup with a bottom sheet focused on fast numeric edits.
- Show a compact info block with repetitions or timer, current weight, title, and a `How to` action instead of set/position metadata.
- Render workout progress by rounds, with exercise marks and rest dots.
- Change the primary CTA from `Start Workout` to `Resume Workout` when the runner detects an existing in-progress session.
- Loop exercise images automatically every 2 seconds during the active set.
- Expand workout progress into clearly separated rounds with accordion sections, exercise images, drag-and-drop reorder inside rounds, and explicit rest items between exercises.

## Files Most Likely To Change

- `app/(tabs)/workouts/[id]/run.tsx`
- `components/workouts/ExerciseInspectModal.tsx`
- `components/ui/BottomSheetModal.tsx`
- `components/ui/ResponsiveModal.tsx` or a new sheet component if the current modal API is too generic
- `components/workouts/DraggableExerciseList.tsx` or a new round-aware variant
- `stores/workout.store.ts` if live session state needs round-aware reorder or resume metadata

## Execution Phases

### Phase 1 - Screen Decomposition And Top Bar Simplification

Scope:

- Remove the top exercise-list popup entry point from the runner header.
- Keep only the actions needed for session control and set adjustment.
- Define the new top layout for the active exercise area.

Deliverables:

- Cleaner header with fewer actions.
- A stable layout contract for the new info block.

Acceptance Criteria:

- No visible list popup entry in the top bar.
- Existing session controls still work.
- The screen still renders for paused and active sessions.

### Phase 2 - Bottom Sheet For Adjust Set Values

Scope:

- Replace the current popup edit flow with a bottom sheet.
- Add plus/minus controls for reps and weight.
- Keep text input for direct numeric correction.
- Preserve the ability to confirm, cancel, and reflect current live values.

Deliverables:

- Reusable adjust-set sheet with clear stepper controls.
- Faster editing for reps and weights during execution.

Acceptance Criteria:

- User can increase and decrease reps and weight without leaving the runner.
- Direct typing still works.
- The sheet can be dismissed without changing values.

### Phase 3 - Exercise Info Block And `How to` Modal

Scope:

- Replace the set/position metadata with a stronger information block.
- Show repetitions or timer as the primary signal.
- Show current weight beneath it.
- Keep the exercise title prominent.
- Replace the old position/set area with a `How to` action that opens a modal with execution instructions.

Deliverables:

- New compact exercise summary region.
- Dedicated instruction modal or sheet.

Acceptance Criteria:

- The runner surface is easier to scan at a glance.
- `How to` opens a readable instruction view.
- The instruction view works even when official media is missing.

### Phase 4 - Round-Based Progress Strip

Scope:

- Redesign the lower progress indicator to represent rounds instead of a flat step list.
- Use short marks for exercises and dots for rest blocks.
- Make the current round and current step clearly visible.

Deliverables:

- Round progress component with exercise/rest markers.
- Visual state for current, completed, and upcoming items.

Acceptance Criteria:

- Users can tell which round they are in without opening the expanded view.
- Rest items are visually distinct from exercise items.

### Phase 5 - Resume Workout CTA Logic

Scope:

- Update the entry CTA so an in-progress template shows `Resume Workout` instead of `Start Workout`.
- Detect whether the workout already has session state and present the proper continuation action.

Deliverables:

- CTA copy and behavior aligned with resumed sessions.

Acceptance Criteria:

- A paused or already started workout does not present itself as fresh.
- Resume action restores the current state correctly.

### Phase 6 - Automatic Image Cycling

Scope:

- Make the exercise image loop automatically every 2 seconds while the current exercise is active.
- Keep manual fallback behavior when there is only one image.
- Preserve pause behavior if the user needs to inspect a specific image.

Deliverables:

- Image carousel behavior inside the hero area.

Acceptance Criteria:

- Images cycle automatically without user interaction.
- The loop does not interfere with completing sets or advancing steps.

### Phase 7 - Expanded Progress View By Round

Scope:

- Expand the workout progress area into accordion sections per round.
- Render the exercise image inside each item.
- Add drag-and-drop ordering inside a round.
- Include rests between exercises in the expanded view.

Deliverables:

- Round-aware progress explorer.
- Reorder interactions during execution.

Acceptance Criteria:

- Exercises are grouped by round and easy to collapse.
- Reordering updates the live session without breaking the current step.
- Rest items remain visible and structurally correct.

### Phase 8 - QA, Accessibility, And Cleanup

Scope:

- Validate the new layout on small and large screens.
- Confirm touch targets, labels, and hit areas.
- Review empty, loading, and resume states.
- Remove dead code from the old popup-based UI.

Deliverables:

- Final runner polish and cleanup.
- Regression check against session persistence.

Acceptance Criteria:

- No broken route transitions.
- No regressions in pause/resume or completion saving.
- The runner feels intentionally redesigned rather than patched.

## Suggested Implementation Order

1. Top bar cleanup and layout decomposition.
2. Adjust-set bottom sheet.
3. `How to` modal and summary block.
4. Round-based progress strip.
5. Resume CTA logic.
6. Automatic image loop.
7. Expanded round accordion with reorder and rest blocks.
8. Cleanup and QA.

## Risks

- The runner currently mixes playback, persistence, editing, and progress rendering in one file, so changes need to stay incremental.
- Round-aware reordering can affect the meaning of `currentStepIndex` and persisted session snapshots.
- Automatic image looping should not add visual noise when the workout is time-based.
- The new bottom sheet should reuse the existing modal pattern instead of introducing a one-off overlay.

## Recommended Validation After Each Phase

- Run `npm run type-check`.
- Run `npm run lint`.
- Manually test the runner with at least one paused workout and one fresh workout.
- Confirm resume behavior after app reload.

## Success Definition

The redesign is done when the runner reads cleanly at a glance, the set adjustment flow is faster, the progress hierarchy is round-based, and the workout can be resumed, inspected, and reordered without losing session state.