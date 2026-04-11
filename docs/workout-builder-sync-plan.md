# Workout Builder Sync Plan

## Objective

Evolve the workout creation flow into a structured builder that stays synchronized across create, edit, detail, runner, Firestore, and Storage. The new flow must support a cover image, aggregated target muscles, ordered sections for warmup, rounds, and cooldown, explicit rest blocks, and weekly activation metadata tied to the user's profile frequency.

This plan is intentionally scoped to workouts only. Community group creation remains out of scope for this pass.

## Current State

- `app/(tabs)/workouts/create.tsx` already contains the main wizard, exercise picker, draft builder, and save step.
- `app/(tabs)/workouts/[id]/edit.tsx` mirrors most of the same flat workout model.
- `app/(tabs)/workouts/[id]/index.tsx` reads the saved workout template and shows the detail view.
- `app/(tabs)/workouts/[id]/run.tsx` depends on the current template/session shape for live execution.
- `lib/firestore/workouts.ts` persists the current flat `workout_templates` and `workout_sessions` documents.
- `lib/workouts/exercise-catalog.ts` already returns a bundled zero-network catalog, so the main performance work is client-side rendering and preloading.
- `firestore.rules` and `storage.rules` currently allow only the existing workout/template and avatar patterns.

## Target Outcome

After this change set:

- Workout creation and editing will use the same structured template schema.
- The builder will support optional warmup and cooldown sections plus required rounds.
- Each round will contain ordered exercise and rest items with duplicate, delete, and reorder actions.
- The preview step will show the workout cover image, name, aggregated target muscles, and a collapsible summary of sections.
- Saving a workout will also record whether it is active for weekly organization.
- Firebase Storage will store workout cover images; Firestore will store only the reference data.
- The weekly workout plan will use the profile frequency as input, but the template content will stay separate from scheduling data.

## Phases

### Phase 1 - Data Contract and Persistence Foundation

Goal: make the backend and shared types capable of storing the new workout structure without breaking the existing readers.

Files to update:

- `types/index.ts`
- `lib/firestore/workouts.ts`
- `lib/firebase.ts` if a helper needs the Storage export
- `firestore.rules`

Work items:

- Extend the workout template type to support structured sections, ordered items, cover image data, target muscles, and activation metadata.
- Keep compatibility with the existing flat array so the detail and runner screens continue to work while the UI migrates.
- Add a save/update shape that can persist the new structure and still flatten when an older reader needs the legacy format.
- Prepare the Firestore rule shape for the new workout fields and any schedule metadata documents.

Acceptance criteria:

- The app can represent the new template shape in TypeScript.
- Existing workout reads still succeed with legacy documents.
- A new structured template can be saved without losing order metadata.

### Phase 2 - Builder Shell and Details UX

Goal: improve the create/edit shell so the new structure fits a cleaner mobile interaction model.

Files to update:

- `app/(tabs)/workouts/create.tsx`
- `app/(tabs)/workouts/[id]/edit.tsx`
- `components/ui/Input.tsx` if needed for size/spacing consistency
- `components/ui/Button.tsx` if needed for top-right close affordance

Work items:

- Keep the close button fixed in the upper-right corner of the screen.
- Increase the two main cards so they occupy more screen space and feel centered.
- Rework the Workout Details section to include an image upload control.
- Improve the input spacing, density, and visual hierarchy.
- Keep the step indicator synchronized between create and edit.

Acceptance criteria:

- The shell feels centered and intentional on small and large phones.
- Create and edit use the same visual language.
- Details supports image upload entry without layout breaks.

### Phase 3 - Exercise Picker Performance and Filter Refresh

Goal: remove the visible delay when opening Add Exercises and keep the filters aligned with the actual catalog.

Files to update:

- `app/(tabs)/workouts/create.tsx`
- `app/(tabs)/workouts/[id]/edit.tsx`
- `lib/workouts/exercise-catalog.ts`
- `components/workouts/ExerciseCard.tsx` if the picker card needs a lighter list variant

Work items:

- Preload the bundled catalog before the picker opens, not only after the user taps Add Exercises.
- Use a virtualized or otherwise lighter rendering approach for the exercise list.
- Rebuild the equipment filters from the real exercise catalog metadata instead of a stale hard-coded subset.
- Keep the round builder as the return destination after adding an exercise from either the card or the plus icon.

Acceptance criteria:

- Opening Add Exercises feels immediate or near-immediate.
- Filtering by equipment shows the full actual catalog set.
- Adding an exercise returns the user to the builder reliably.

### Phase 4 - Builder Structure: Warmup, Rounds, Cooldown

Goal: replace the current flat exercise card model with the ordered workout structure.

Files to update:

- `app/(tabs)/workouts/create.tsx`
- `app/(tabs)/workouts/[id]/edit.tsx`
- `components/ui/Accordion.tsx` if a new accordion is needed
- `components/workouts/ExerciseCard.tsx`

Work items:

- Add optional warmup and cooldown sections.
- Keep rounds mandatory, with at least one exercise per round.
- Model rest as its own item inside the builder, not as a hidden property on the exercise card.
- Support duplicate, delete, and reorder actions for both exercise rows and rest rows.
- Save the exact order of all items in Firestore.

Acceptance criteria:

- The builder can represent warmup, rounds, and cooldown independently.
- A round cannot be saved empty.
- The order shown in the builder is the order saved in the database.

### Phase 5 - Preview, Detail, and Scheduling

Goal: expose the final workout structure clearly and connect it to weekly activation.

Files to update:

- `app/(tabs)/workouts/create.tsx`
- `app/(tabs)/workouts/[id]/index.tsx`
- `app/(tabs)/workouts/[id]/run.tsx`
- `stores/workout.store.ts`

Work items:

- Preview the workout cover image and aggregated target muscle groups.
- Show an accordion-style summary for the ordered sections.
- Add a toggle to mark the workout active for weekly organization.
- Use the profile frequency to assign workouts across the week.
- Preserve compatibility in the runner so older workouts still execute.

Acceptance criteria:

- Preview explains the whole workout without requiring navigation back into the builder.
- The workout detail screen can display the new aggregated data.
- The active toggle influences weekly organization logic.

### Phase 6 - Storage, Rules, Migration, and Validation

Goal: complete the backend wiring and verify the end-to-end flow.

Files to update:

- `storage.rules`
- `firestore.rules`
- `lib/firebase.ts`
- `lib/firestore/workouts.ts`
- Any new upload helper under `lib/`

Work items:

- Add workout image upload support through Firebase Storage.
- Store only reference data in Firestore.
- Update the rules for the new workout media path and the new structured template fields.
- Validate the full flow with type checks, linting, Android export, and a real E2E smoke path.

Acceptance criteria:

- Workout cover image upload works end to end.
- Rule changes are deployed together with the app changes.
- The app passes local verification before any preview build or production deploy.

## Execution Order

1. Finish the data contract and persistence foundation.
2. Refactor the create/edit shell to use the new structure.
3. Optimize the picker and update the filters.
4. Rebuild the builder around warmup, rounds, cooldown, and ordered rest items.
5. Update preview, detail, runner, and weekly activation.
6. Finish Storage, Firestore rules, migration support, and validation.

## Risks

- The current template shape is flat, so readers must stay backward-compatible during migration.
- The exercise catalog is bundled, but the picker can still feel slow if rendering remains fully expanded.
- Scheduling must stay separate from content to avoid rewriting workout templates when the weekly plan changes.
- Storage uploads need clear path rules so users can only write their own workout images.

## Validation Checklist

- `expo lint`
- `npx tsc --noEmit`
- `npx expo export --platform android`
- Manual create/edit/detail/run verification on the local dev server
- E2E smoke coverage for create, add image, add items, save, reopen, and schedule toggle
