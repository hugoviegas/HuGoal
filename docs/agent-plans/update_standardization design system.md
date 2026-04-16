--

# Prompt: UI Design System Standardization — Workouts, Nutrition, Community & Home Pages

## 🎯 Goal

Standardize the design system across the Workouts, Nutrition, Community, and Home pages of the HuGoal React Native app (Expo + NativeWind), creating a unified top header component, bottom bar pattern, and shared loading animation.

## 🧠 Context

**Stack:** React Native + Expo Router + NativeWind (Tailwind) + TypeScript  
**Branch:** `preview`  
**Key files:**

- `app/(tabs)/workouts/index.tsx` — Has calendar, streak, settings button, bottom bar with 2 buttons
- `app/(tabs)/nutrition/index.tsx` — Has calendar, "Nutrition Streak" label + number, bottom bar with text input
- `app/(tabs)/community/index.tsx` — Has its own header, post block at bottom
- `app/(tabs)/home.tsx` — Has chat input (to receive coach chat bottom bar)
- `app/(tabs)/workouts/settings.tsx` — Existing settings page for workouts (reference for nutrition settings)

**Design decisions already made (merge rules):**

- Streak label style (font/size) → use Nutrition's label style
- Streak number style → use Workout's number style
- Date size and layout → use Nutrition's calendar layout
- Remove the "current / previous / next week" text label below calendar on both pages
- Page title centered at top (each page has its own: "Workouts", "Nutrition", "Community")
- Rename "Nutrition Streak" → just "Streak" (consistent across all 3 pages)

---

## ✅ Task

### Phase 1 — Shared `PageHeader` Component

- [ ] Create `components/shared/PageHeader.tsx`
- [ ] Props: `title: string`, `streakCount: number`, `onSettingsPress: () => void`, `onTodayPress?: () => void`
- [ ] Layout: `[Settings Icon] [Centered Title] [Today Button (optional)]`
- [ ] Below title row: Streak row with label "Streak" (Nutrition font style) + count (Workout number style)
- [ ] Below streak: Weekly calendar (Nutrition's date layout, no current/previous/next week label)
- [ ] Add `// SHARED STYLE — if changed here, update PageHeader usage in: Workouts, Nutrition, Community` comments on all shared style tokens

### Phase 2 — Replace Headers

- [ ] `workouts/index.tsx` → Replace existing header with `<PageHeader title="Workouts" ... onTodayPress={...} />`
- [ ] `nutrition/index.tsx` → Replace existing header with `<PageHeader title="Nutrition" ... />`; add `onSettingsPress` routing to new `nutrition/settings.tsx`
- [ ] `community/index.tsx` → Replace existing header with `<PageHeader title="Community" streakCount={groupStreak} onSettingsPress={...} />`; calendar shows group check-in

### Phase 3 — New Nutrition Settings Page

- [ ] Create `app/(tabs)/nutrition/settings.tsx`
- [ ] Reference `app/(tabs)/workouts/settings.tsx` for structure and style
- [ ] Scope settings to nutrition-specific options only
- [ ] Register route in `app/(tabs)/nutrition/_layout.tsx`

### Phase 4 — Standardize Bottom Bars

- [ ] Audit bottom bar heights across Workouts, Nutrition, Community, and Home
- [ ] Add drag indicator bar (`<View className="w-10 h-1 bg-gray-400 rounded-full mx-auto mb-2" />`) to Workouts bottom bar (currently missing — causing height discrepancy)
- [ ] Apply identical container styles to all bottom bars:
      // SHARED BOTTOM BAR STYLE — sync across: home, workouts, nutrition, community
      paddingBottom: safeAreaInsets.bottom + 8
      paddingHorizontal: 16
      borderTopWidth: 1
      borderTopColor: colors.border
      backgroundColor: colors.card

text

- [ ] `community/index.tsx` bottom bar → Move existing post block (currently inline) into standardized bottom bar container
- [ ] `home.tsx` → Add bottom bar with coach chat input (same container style); this is a **new chat type** — scaffold only, no logic yet (flag with `// TODO: Coach chat logic`)
- [ ] Workouts bottom bar: **keep existing 2 buttons** for now — Phase 6 (dedicated) will replace with workout chat

### Phase 5 — Loading Animation Standardization

- [ ] Search for all loading indicators across the app: `ActivityIndicator`, spinner, skeleton, etc.
- Known locations: `workouts/index.tsx`, `workouts/history.tsx`, `workouts/explore.tsx`, `workouts/library.tsx`, `nutrition/*.tsx`, `community/*.tsx`, `home.tsx`
- [ ] Extract Nutrition's blue pulsing circle animation into `components/shared/LoadingPulse.tsx`
- [ ] Replace ALL other loading animations with `<LoadingPulse />` everywhere found
- [ ] Add comment: `// SHARED LOADING — use <LoadingPulse /> everywhere in the app`

### Phase 6 — Workouts Background Color Fix

- [ ] Inspect `workouts/index.tsx` for any overlay `View` or style applying a slightly different background
- [ ] Ensure `backgroundColor` matches the app's base dark background token exactly
- [ ] Cross-check against `home.tsx` background as reference baseline

---

## ⚠️ Phases NOT included in this prompt (handle separately)

- **Workout chat replacement** (replacing 2 buttons + moving them below the first card) — requires dedicated planning phase
- **Full Community page restructure** — top bar applied now, but full page rebuild is a future phase

---

## 📤 Expected Output

1. `components/shared/PageHeader.tsx` — fully implemented
2. `components/shared/LoadingPulse.tsx` — extracted from Nutrition, used everywhere
3. Updated `workouts/index.tsx`, `nutrition/index.tsx`, `community/index.tsx`, `home.tsx`
4. New `app/(tabs)/nutrition/settings.tsx`
5. Updated `app/(tabs)/nutrition/_layout.tsx` (new settings route)
6. All shared styles commented with sync warnings across files

## ⚙️ Constraints

- Language: TypeScript / English comments
- NativeWind (Tailwind classes) — avoid inline StyleSheet unless needed for animations
- Preserve ALL existing interactions/logic — design changes only (except LoadingPulse replacement)
- Do NOT refactor workouts bottom bar content in this phase
- Do NOT implement coach chat logic — scaffold container only
- Mark any deferred work with `// TODO:` comments
- After each file change, confirm no broken imports or missing props

## 🤖 Suggested Claude Skill / Agent

## Artifact > Code Generation | Multi-step Reasoning | Tool Use (file read before edit)
