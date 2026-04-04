# Phase 02 - Onboarding and Profile

## Suggested specialization

Onboarding and profile agent.

## Objective

Collect the user profile through a short onboarding flow, persist it to Firestore, and provide the private profile editing surface that the rest of the app depends on.

## Current Starting Point

- The `UserProfile` type already contains onboarding fields.
- Auth state exists, but onboarding and profile screens do not exist yet.

## Screens and Routes

- `app/(auth)/onboarding/_layout.tsx` for the stepper shell.
- `app/(auth)/onboarding/personal.tsx` for identity and body metrics.
- `app/(auth)/onboarding/goals.tsx` for goal selection and training intent.
- `app/(auth)/onboarding/experience.tsx` for training level, equipment, and availability.
- `app/(auth)/onboarding/diet.tsx` for nutrition preferences and restrictions.
- `app/(tabs)/profile/index.tsx` for the private profile summary.
- `app/settings/profile-edit.tsx` for editing the same profile fields later.

## Step-by-Step Work

1. Build the onboarding stepper with clear progress, back, next, skip, and save actions.
2. Create the four onboarding screens and keep the form schema shared between onboarding and profile edit.
3. Use React Hook Form and Zod for validation and field coercion.
4. Save each step into a local draft so the flow can recover after interruption or app restart.
5. Write the completed profile document to Firestore and mark onboarding as complete.
6. Build the private profile summary so the user can review and edit the stored data later.

## Recommended Field Set

### Personal

- name
- avatar_url optional
- age
- sex
- height_cm
- weight_kg

### Goals

- goal: lose_fat, gain_muscle, maintain, recomp
- target timeline or target date
- target intensity or pace
- training frequency target

### Experience

- level: beginner, intermediate, advanced
- equipment: home, gym, none
- available days per week
- available minutes per session
- injuries or movement limitations

### Diet

- allergies
- dietary_restrictions
- preferred_cuisines
- vegetarian or vegan preference
- whey or supplement preference
- foods to avoid

## Behavior Rules

- The skip path is allowed, but the app must clearly explain that workout generation, diet generation, and coach personalization will remain limited until the profile is completed.
- If the user returns to onboarding later, prefill from Firestore and any local draft instead of starting from zero.
- If a save fails, keep the draft locally and let the user retry without losing input.
- If avatar upload is part of the step, allow users to skip it and keep an initials fallback.
- The profile edit screen should reuse the same validation schema as onboarding.

## Data and Storage

- Store the full private profile in `profiles/{uid}`.
- Recommended fields include `name`, `email`, `avatar_url`, `bio`, `age`, `height_cm`, `weight_kg`, `sex`, `goal`, `level`, `equipment`, `allergies`, `dietary_restrictions`, `preferred_cuisines`, `xp`, `streak_current`, `streak_longest`, `last_activity_date`, `preferred_ai_provider`, `onboarding_complete`, `created_at`.
- Store profile images in Firebase Storage and save only the resulting URL in Firestore.
- Keep onboarding drafts local unless the user explicitly saves the profile.

## Configuration Questions

- Which fields are required before personalized workouts can be generated?
- Which fields are required before personalized nutrition can be generated?
- Is metric-only acceptable for MVP? Recommendation: yes, to keep onboarding simple.
- Do we require avatar upload before account completion? Recommendation: no, make it optional.
- Should available training days and session length be required or optional? Recommendation: required for better workout generation.

## Deliverables

- A complete four-step onboarding flow.
- Firestore profile creation and update logic.
- A private profile screen and edit flow that reuse the same schema.
- A profile shape that reflects the user’s goals, experience, and dietary preferences.

## Acceptance Criteria

- A new user can finish the flow end-to-end.
- The profile document exists in Firestore after completion.
- The app can detect onboarding completion and skip the flow later.
- The profile screen shows the stored data and allows edits without duplicating schema logic.

## Constraints

- Do not move into workout, nutrition, or community features in this phase.
- Keep the onboarding forms minimal and direct so later phases can depend on them.
