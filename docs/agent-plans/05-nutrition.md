# Phase 05 - Nutrition

## Suggested Specialization

Nutrition agent.

## Objective

Deliver a full nutrition domain with manual logging, OCR-powered label scanning, AI meal photo analysis, macro tracking, goal-based diet planning, and tight integration with health platforms.

## Source Inputs For This Phase

- Nutrition types already exist in `types/index.ts`.
- No screens or components exist yet.
- Integration with workout domain is planned (burned calories visible in nutrition tracking).

## Discovery Outcomes

### OCR & Label Scanning

- Use Tesseract via `react-native-ocr` (open-source, free, local processing).
- Support batch scanning: 5 images max per batch.
- Flag low-confidence results (< 70%) for user review instead of guessing.
- Add barcode scanning for quick food lookup via OpenFoodFacts.

### Food Database & Storage

- Use USDA FoodData Central API as primary source.
- Implement Firestore cache for personalized food library updates.
- Use SQLite for offline-first local access.
- Support both metric (grams, ml) and imperial (oz, lbs) units with conversion.
- Use OpenFoodFacts for barcode database lookups.

### Meal Photo Analysis

- Use Gemini Vision for identifying foods and quantities.
- Let user optionally review or trust the AI result.
- Use visual heuristics for weight estimation (optional reference objects in photos).
- Return item-by-item breakdown plus total calories and macros.

### Macro Tracking

- Support both fixed goals and AI-personalized goals (Harris-Benedict, TDEE calculation).
- Track daily progress and weekly trends.
- Show calorie surplus/deficit badge and projection (result in X weeks).
- Allow flexible macro targets per meal type (breakfast vs dinner).

### Diet Plan Generation

- Let user choose daily or weekly plans.
- Support 3–6 customizable meals per day.
- Allow full editing of generated plans (swap, remix, adjust portions).
- Save multiple plans (library approach), not just one locked draft.
- Keep recipes simple (foods + quantities, no detailed instructions in MVP).

### UI & Dashboard

- Use macro rings (visual progress) as the primary view.
- Use accordion-style meal sections (expandible by type).
- Use FAB with submenu for quick actions (log, scan, photo, plan).
- Show both trends graph and session list for history.
- Integrate workout calories: show burned and adjusted remaining for the day.

### Health Sync & Compliance

- Sync detailed meal data to Google Health / Apple HealthKit (each meal, not just totals).
- Validate against user allergies; warn if food contains allergen.
- Show info banner for dietary violations (veganism, gluten-free, etc.) without blocking.
- Display medical disclaimer on first use, with toggle in settings.
- Use generic "not medical advice" messaging.

### Advanced Features

- Allow saving meal templates (favorite combos).
- Include gamification (streaks, badges for consistency).
- Support export/share (PDF, image, link).
- Track water intake (liters per day).
- Log supplements as foods (with macro contributions).

### Future Integrations (Out of MVP but architecturally prepared)

- MyFitnessPal / Cronometer sync.
- AI recipe generation (based on available macros and ingredients).
- Meal prep suggestions (batch cooking helpers).
- Coupon / discount suggestions based on the plan.

## Proposed Data Model

### Nutrition Logs

`nutrition_logs/{logId}`

- `userId`
- `date`
- `meals[]` (breakfast, lunch, dinner, snack, pre_workout, post_workout, other)
- `meals[].items[]` (food, servingSize, servingUnit, calories, protein, carbs, fat, fiber, sugar)
- `meals[].notes`
- `meals[].source` (manual, ocr, photo, plan_suggested)
- `totalCalories`
- `totalProtein`
- `totalCarbs`
- `totalFat`
- `totalFiber`
- `totalSugar`
- `totalWater` (ml)
- `notes`
- `createdAt`
- `updatedAt`

### Food Library

`profile/{uid}/food_library/{foodId}` and `food_catalog/{foodId}` (global)

- `name`
- `name_en`
- `brand`
- `barcode`
- `servingSize`
- `servingUnit` (g, ml, oz, tbsp, cup, pcs)
- `calories`
- `protein`
- `carbs`
- `fat`
- `fiber`
- `sugar`
- `source` (usda, openfoodfacts, custom_user)
- `tags` (vegan, gluten_free, organic, etc.)
- `createdAt`
- `updatedAt`

### Diet Plans

`diet_plans/{planId}`

- `userId`
- `name`
- `goal`
- `period` (daily | weekly)
- `mealsPerDay`
- `mealsPerType` (flexible macros by meal: breakfast, lunch, dinner, etc.)
- `target_calories`
- `target_macro_protein`
- `target_macro_carbs`
- `target_macro_fat`
- `meals[]` (structured by day and meal type)
- `meals[].items[]` (food, quantity, notes)
- `preferences` (allergies, restrictions, cuisines, vegan, vegetarian, supplements)
- `editHistory[]` (track changes)
- `isActive`
- `createdAt`
- `updatedAt`

### Meal Templates (Favorites)

`profile/{uid}/meal_templates/{templateId}`

- `name`
- `items[]` (foods + quantities)
- `totalMacros`
- `createdAt`

### OCR & Photo Metadata

`nutrition_scans/{scanId}` or `nutrition_photos/{photoId}`

- `userId`
- `type` (ocr | photo)
- `rawImage` (Firebase Storage ref)
- `raw_text` (if OCR)
- `ai_output` (parsed foods, confidence)
- `user_edited_values` (what user corrected)
- `sync_status` (draft | synced)
- `createdAt`

### Health Sync Metadata

`profile/{uid}/health_sync`

- `last_sync_timestamp`
- `sync_enabled` (true | false)
- `synced_dates` (array of dates)

## Screens And Routes

- `app/(tabs)/nutrition/index.tsx` for the daily dashboard with macro rings and meal sections.
- `app/(tabs)/nutrition/log.tsx` for manual meal and food logging.
- `app/(tabs)/nutrition/scan.tsx` for OCR label scanning (batch).
- `app/(tabs)/nutrition/photo.tsx` for AI meal photo analysis.
- `app/(tabs)/nutrition/plan.tsx` for creating and viewing AI diet plans.
- `app/(tabs)/nutrition/history.tsx` for weekly/monthly trends and streak tracking.
- `app/(tabs)/nutrition/library.tsx` for personal food library management.
- `/admin/nutrition.tsx` for managing food catalog, validating custom entries, debugging OCR.
- Shared components under `components/nutrition/` for macro rings, meal sections, food rows, and disclaimer banners.

## Component Plan

Shared components should live under `components/nutrition/`.

- `MacroRings.tsx` for circular progress visualization (inspiration: Apple Activity Rings).
- `MealSection.tsx` for accordion-style meal groupings.
- `FoodRow.tsx` for inline food item display, edit, and delete.
- `NutritionDisclaimer.tsx` for disclaimer banner with toggle.
- `OCRReview.tsx` for batch OCR results with confidence flagging.
- `MealPhotoReview.tsx` for photo analysis breakdown before save.
- `MacroBreakdown.tsx` for pie/bar chart of P/C/F ratios.
- `GoalSetting.tsx` for daily/weekly goal input.
- `StreakBadge.tsx` for gamification (days, badges).
- `HistoryChart.tsx` for trends (calories, macros over time).
- `WaterTracker.tsx` for hydration log mini-widget.

## Services And Stores

### New Services

- `lib/ocr-service.ts` for Tesseract integration, batch processing, confidence filtering.
- `lib/barcode-service.ts` for barcode scanning, OpenFoodFacts lookup.
- `lib/food-service.ts` for USDA API, local cache sync, search, conversion (metric ↔ imperial).
- `lib/meal-photo-service.ts` for Gemini Vision integration, AI parsing.
- `lib/nutrition-ai.ts` for diet plan generation, macro calculations, goal setting.
- `lib/nutrition-sync.ts` for Google Health / HealthKit bidirectional sync.
- `lib/macro-calculator.ts` for TDEE, calories, Harris-Benedict formulas.
- `lib/nutrition-validator.ts` for allergy checking, dietary restriction validation.

### New Stores

- `stores/nutrition.store.ts` for active log, daily totals, plan state.
- `stores/food-library.store.ts` for personal food cache and favorites.
- `stores/diet-plan.store.ts` for active diet plan and templates.
- `stores/health-sync.store.ts` for sync status and permissions.

## Screen Behavior

### Nutrition Dashboard

- Show macro rings for visual progress (primary view).
- Show calorie badge: total consumed / target (e.g., 1500/2000).
- Show projection: "If you maintain this pace, you'll be -500 cal in 2 weeks."
- Show workout integration: "Burned +500 cal this morning | Remaining: adjusted to 2500."
- Split into meal sections (accordion): Breakfast, Lunch, Dinner, Snack, Pre-workout, Post-workout.
- Show mini water tracker (e.g., "1.5 / 2.5 L").
- Show quick actions: Log, Scan, Photo, Plan (FAB menu).
- Empty state: single CTA to log first meal.

### Manual Logging

- Search food library or USDA database.
- Barcode scan option (quick lookup).
- Set serving size (with unit conversion: grams ↔ oz, ml ↔ cups).
- Show estimated macros before save.
- Allow inline notes (e.g., "cooked in olive oil").
- Option to save as favorite (meal template).

### OCR Scan

- Capture or import up to 5 images in one batch.
- Each image → Tesseract processes → edit screen.
- Each result row shows: food name, brand, serving size, calories, macros (P/C/F/fiber/sugar).
- Confidence badge: if < 70%, highlight row in yellow (review required).
- Barcode auto-lookup if detected (try OpenFoodFacts first).
- User can edit every field before batch save.
- Batch save → create multiple meal items in today's log.

### Meal Photo Analysis

- Capture or import a photo of a meal.
- Gemini Vision analyzes: identifies foods, estimates quantities (grams or servings).
- Returns item-by-item list (e.g., "150g grilled chicken", "200ml rice", "salad 50g") + total calories + macros.
- User can accept all or review/edit individual items (add, remove, duplicate, rename).
- Option to trust AI (save directly) or manually adjust before save.

### Diet Plan

- Conversational form (or single screen):
  - Goal (lose fat, gain muscle, maintain, recomp).
  - Calorie target (ask or AI calculates from TDEE).
  - Macro preference (or suggest balanced 40/40/20).
  - Meals per day (3–6, user picks).
  - Duration (1 day or 7 days).
  - Allergies / restrictions / preferred cuisines (from profile, editable).
  - Vegan / vegetarian / supplement preference.
- Gemini generates editable meal plan: day-by-day, meal-by-meal with foods and quantities.
- User can swap meals, adjust portions, add/remove items before saving.
- Save to library (not locked; can modify later).
- Current plan: mark as active (guides daily logging).

## Behavior Rules

- All logging requires manual confirmation before save (review macro preview).
- OCR and AI outputs flag confidence; low confidence requires user review or edit.
- Allergies are validated: warn user if food contains known allergen (from profile).
- Dietary restrictions show info banner (e.g., "This meal is not vegan") but don't block save.
- Medical disclaimer appears on first use (modal), then toggle in settings (always accessible).
- Manual logging works fully offline; AI features (OCR, photo, plan) require network.
- Health sync is bidirectional: app → Health app + Health app ← app (e.g., synced workouts boost calorie allowance).
- Macro rings and totals update in real time as user logs.
- Streaks and badges track for gamification.
- Export (PDF/image) captures daily or weekly summary; share link shows read-only view.

## Implementation Phases

### Phase A - Data Foundation

1. Set up USDA Food Data Central API integration and local SQLite cache.
2. Build `food-service.ts` (search, caching, unit conversion).
3. Populate barcode cache via OpenFoodFacts.
4. Build personal food library (Firestore + SQLite sync).

### Phase B - Manual Logging

1. Build `app/(tabs)/nutrition/log.tsx` (search, barcode, custom items).
2. Build `components/nutrition/FoodRow.tsx` and macro preview.
3. Build `app/(tabs)/nutrition/library.tsx` for favorites and history.
4. Test offline food search via SQLite cache.

### Phase C - OCR Scanning

1. Setup Tesseract via `react-native-ocr`.
2. Build `app/(tabs)/nutrition/scan.tsx` (capture/import, batch processing).
3. Build `components/nutrition/OCRReview.tsx` (confidence flagging, edit fields).
4. Integrate barcode detection and OpenFoodFacts lookup.
5. Test 5-image batch processing.

### Phase D - Meal Photo Analysis

1. Build `app/(tabs)/nutrition/photo.tsx` (capture/import single meal).
2. Integrate Gemini Vision via `meal-photo-service.ts`.
3. Build `components/nutrition/MealPhotoReview.tsx` (item-by-item edit, trust/review toggle).
4. Test confidence and weight estimation accuracy.

### Phase E - Dashboard & Macro Tracking

1. Build `app/(tabs)/nutrition/index.tsx` with macro rings.
2. Build `components/nutrition/MacroRings.tsx` (visual progress).
3. Build `components/nutrition/MealSection.tsx` (accordion, meal breakdown).
4. Aggregate totals in real-time from logs.
5. Integrate workouts: fetch burned calories, adjust remaining.

### Phase F - Goal Setting & Calculation

1. Build goal UI (profile goal + custom override).
2. Implement TDEE, Harris-Benedict, macro ratio calculations.
3. Show surplus/deficit badge and projection.
4. Allow flexible macros per meal type (breakfast vs dinner).

### Phase G - Diet Plan Generation

1. Build `app/(tabs)/nutrition/plan.tsx` (conversational form).
2. Implement `nutrition-ai.ts` (Gemini prompt + caching).
3. Build review screen (editable, swap, adjust, save).
4. Support daily + weekly generation.
5. Build library management (save multiple, set active).

### Phase H - History & Gamification

1. Build `app/(tabs)/nutrition/history.tsx` (trends chart + list).
2. Build `components/nutrition/StreakBadge.tsx` and badge system.
3. Implement export (PDF/image) and share link.
4. Track water intake and render mini-widget.

### Phase I - Health Sync

1. Setup iOS HealthKit + Android Google Fit integration.
2. Implement `nutrition-sync.ts` (bidirectional sync).
3. Map app data → health platform format.
4. Handle permissions and fallback.
5. Test real-time sync post-meal-save.

### Phase J - Compliance & Admin

1. Build allergy checking in `nutrition-validator.ts`.
2. Add dietary restriction banners (non-blocking).
3. Build medical disclaimer (first-time modal + settings toggle).
4. Build `/admin/nutrition.tsx` for food catalog management.
5. Test favorite meal saving in `/profile/meal_templates/`.

### Phase K - Polish & Integration

1. Integrate with nutrition types in `types/index.ts`.
2. Add meal templates (save favorites).
3. Add supplement logging (as foods with macros).
4. Scaffold MyFitnessPal / Cronometer integration.
5. Tighten accessibility and visual consistency.

## Configuration Questions

- Should manual logging show estimated time to reach goal dynamic or a static weekly projection?
- How aggressive should allergy warnings be (block vs info only)?
- Should the food library prioritize USDA or OpenFoodFacts initially?
- How many streak levels should there be for gamification (e.g., 7-day, 30-day, 100-day)?

## Deliverables

- Full nutrition logging (manual, OCR, photo analysis, AI diet plans).
- Macro tracking with daily + weekly trends.
- Personal food library with USDA + OpenFoodFacts.
- Health sync integration (bidirectional, real-time).
- Gamification (streaks, badges, exports, sharing).

## Acceptance Criteria

- The user can log a meal manually.
- The user can scan a label, review the parsed values, and save the entry.
- The user can analyze a meal photo, edit the result, and persist it.
- The nutrition screens always show a clear disclaimer for AI-derived estimates.
- Allergies trigger a validation warning.
- Diet plans can be fully edited, saved, and reused.
- Macro totals and trends display correctly (daily + weekly).
- Health sync pushes nutrition data to Apple HealthKit and Google Fit in real-time.
- Streaks and badges award on consistent logging.

## Constraints

- Use review screens before any nutrition write is committed.
- Keep AI outputs editable, because nutrition estimates are approximate by design.
- Manual logging must work fully offline (food search via cache).
- AI features (OCR, photo, plan) require network; offer clear UX when unavailable.
- Preserve raw OCR text and images for retry without re-capture.
- Flag low-confidence results instead of guessing; let user decide.
- Warn on allergies / restrictions without blocking (user autonomy).

## Open Questions Worth Confirming

- If food is not in USDA, should app let user create custom with photo (or text recipe)?
- Should meal templates (favorites) be shareable with friends?
- Should the AI diet plan support recurring weekly generation (auto-refresh)?
- How detailed should meal prep suggestions be (just timing or with shopping list)?
