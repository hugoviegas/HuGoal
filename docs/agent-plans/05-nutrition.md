# Phase 05 - Nutrition

## Suggested specialization

Nutrition agent.

## Objective

Ship nutrition logging, food storage, OCR-based label scanning, AI meal analysis, macro tracking, and diet plan creation.

## Current Starting Point

- Nutrition types already exist in `types/index.ts`.
- No nutrition route screens or feature components exist yet.

## Screens and Routes

- `app/(tabs)/nutrition/index.tsx` for the daily nutrition summary.
- `app/(tabs)/nutrition/log.tsx` for manual food and meal logging.
- `app/(tabs)/nutrition/scan.tsx` for OCR label capture and batch review.
- `app/(tabs)/nutrition/photo.tsx` for AI meal photo analysis.
- `app/(tabs)/nutrition/plan.tsx` for AI-generated diet plans.
- Shared components under `components/nutrition/` for macro rings, meal sections, food rows, and disclaimer banners.

## Step-by-Step Work

1. Build the nutrition dashboard and daily macro summary.
2. Add manual meal logging and a personal food library.
3. Implement the OCR scan flow with camera or gallery input and a review screen.
4. Implement the meal photo analysis flow with editable review before save.
5. Aggregate the daily macro totals and display them in the summary view.
6. Add AI-generated diet plan creation and save it to Firestore.
7. Show the nutrition disclaimer banner on both AI-assisted screens.

## Screen Behavior

### Nutrition Dashboard

- Show today's calorie target, calories consumed, calories remaining, and macro progress.
- Split the day into meal sections such as breakfast, lunch, dinner, snack, pre-workout, and post-workout.
- Show quick actions for manual logging, label scan, meal photo analysis, and diet plan creation.
- If there is no log yet, show a clear empty state with a single primary CTA.

### Manual Logging

- Let the user search or pick from their personal food library, add a new food item, and set serving size.
- Allow the user to log a full meal or a single item.
- Keep units consistent and show macros before save.

### OCR Scan

- Let the user capture from the camera or import multiple images from the gallery.
- Batch scan should support multiple images in one run, with a practical cap that matches the selected OCR pipeline.
- Each image should be processed into editable items before saving.
- Parsed fields should include food name, brand, serving size, calories, protein, carbs, fat, fiber, and sugar when available.
- If OCR confidence is low or the text is ambiguous, highlight the row for user review rather than guessing silently.

### Meal Photo Analysis

- Let the user capture or import a meal photo.
- The AI should return identified foods, estimated weights, and a confidence-aware breakdown that the user can edit.
- The review screen should allow adding, removing, splitting, or renaming items before confirming.

### Diet Plan

- Ask for goal, calorie target, macro target, meal count, allergies, dietary restrictions, preferred cuisines, vegan/vegetarian preference, and supplement preference.
- AI should return a plan in structured meal sections that can be reviewed before saving.
- The plan should be editable, not a locked final answer.

## Behavior Rules

- Always show the nutrition disclaimer banner on AI-assisted screens and diet plan views.
- If OCR or AI parsing fails, keep the source image and raw text so the user can retry without re-capturing.
- If the user rejects an AI suggestion, let them manually edit every field before save.
- If there is no API key, manual logging should still work and AI-assisted features should clearly explain why they are unavailable.
- All AI-derived values should be treated as approximate and editable.

## Data and Storage

- `nutrition_logs` stores the actual meal logs with items, totals, meal type, notes, images, and timestamps.
- `food_library` stores personal reusable foods with barcode support and serving macro values.
- `diet_plans` stores generated meal plans with daily target calories and macros.
- Derived daily totals can be calculated from `nutrition_logs` instead of stored separately.

## Configuration Questions

- Should batch OCR support exactly five images in MVP, or should the cap be configurable? Recommendation: use a fixed safe cap with a user-visible hint.
- Are metric units mandatory for serving sizes and weight? Recommendation: yes, keep MVP consistent.
- Should barcode entry be included in MVP food library creation? Recommendation: yes, if the catalog is available.
- Should diet plans be generated as daily plans or as a weekly plan split into daily meals? Recommendation: weekly structure with day-by-day sections.
- Should supplements such as whey be modeled as a preference field or as a food item? Recommendation: preference field in onboarding and item-level support in logs.

## Deliverables

- Manual logging and AI-assisted logging flows.
- A per-day macro summary.
- A usable personal food library.
- A review-first OCR and meal photo workflow.

## Acceptance Criteria

- The user can log a meal manually.
- The user can scan a label, review the parsed values, and save the entry.
- The user can analyze a meal photo, edit the result, and persist it.
- The nutrition screens always show a clear disclaimer for AI-derived estimates.

## Constraints

- Use review screens before any nutrition write is committed.
- Keep AI outputs editable, because nutrition estimates are approximate by design.
