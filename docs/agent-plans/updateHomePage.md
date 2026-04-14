# HuGoal — Home Screen Redesign & Widget System

**Branch:** `preview` | **Repo:** `hugoviegas/HuGoal`

---

## Goal

Rebuild the HuGoal Home screen from scratch in React Native with a fully new UI featuring draggable/editable custom widgets. Remove all legacy dashboard code, its TabBar icon, and the profile tab from the TabBar. Greeting text in English (i18n-ready).

---

## Context

- **Stack:** React Native + Expo Router, `useThemeStore` for colors, `useAuthStore` for profile/loading, `lucide-react-native` for icons, `react-native-safe-area-context`, `date-fns` (ptBR for date display only)
- **Animations:** `react-native-reanimated` + `react-native-gesture-handler` (assume installed)
- **State:** Zustand (existing pattern in `/stores`)
- **Existing components to USE:**
  - `Avatar` from `@/components/ui/Avatar`
  - `Button` from `@/components/ui/Button`
  - `Modal` from `@/components/ui/Modal`
  - Design tokens: `@/constants/spacing`, `@/constants/radius`, `@/constants/typography`
- **TabBar:** `app/(tabs)/_layout.tsx` uses `ModernMobileMenu` custom component
- **Files to DELETE:** `app/(tabs)/dashboard.tsx`, `app/(tabs)/dashboard-backup.tsx`

---

## Phase 1 — TabBar Cleanup

### `app/(tabs)/_layout.tsx`

- Remove `<Tabs.Screen name="dashboard" />` and `<Tabs.Screen name="dashboard-backup" />` entirely
- Remove `<Tabs.Screen name="profile" />` entry (profile accessible via Avatar tap only)
- Final `<Tabs>` screens: `home`, `workouts`, `nutrition`, `community` — in this order
- Delete `app/(tabs)/dashboard.tsx` and `app/(tabs)/dashboard-backup.tsx`

### `components/ui/modern-mobile-menu.tsx`

- Audit for any hardcoded `dashboard` or `profile` route references and remove them
- Ensure the menu renders exactly 4 items: Home, Workouts, Nutrition, Community

---

## Phase 2 — New Home Screen (`app/(tabs)/home.tsx`)

Replace the entire file with a new component built from scratch.

### 2.1 Header

- Safe area aware (`useSafeAreaInsets`)
- **Left:** Greeting text + date
  - Greeting in **English**: `"Good morning"` / `"Good afternoon"` / `"Good evening"` based on hour — i18n-ready (use plain string constants, easily replaceable with `t()` calls later)
  - Format: `"Good morning, {FirstName}"`
  - Date: formatted with `date-fns` ptBR locale (display only), e.g. `"wednesday, 15 de abril"`
- **Right:** `Avatar` component using `profile.avatar_url` and `profile.name` — on press navigates to `/(tabs)/profile`

### 2.2 Hero Summary Card (`components/home/HeroSummaryCard.tsx`)

Prominent full-width card with:

- **SVG circular progress ring** (built with React Native `<Svg>` from `react-native-svg`) showing calories consumed vs. goal
- Ring animates on mount using `react-native-reanimated` `useSharedValue` + `withTiming` (drive `strokeDashoffset`)
- Center of ring: large calorie number + label `"kcal today"`
- Below ring: two inline stats — `🔥 {streak} day streak` and `💪 {workouts} workouts`
- Accent color: `colors.primary`
- Card style: `colors.card` background, `radius.lg`, subtle shadow

### 2.3 Widget Grid

A `ScrollView` containing the active widget list. Each item is a `WidgetCard` wrapper.

**Edit mode** — triggered by floating pencil button (bottom-right, above TabBar):

- All widgets show a drag handle (left edge) and a `×` remove button (top-right)
- Widgets perform a subtle shake animation (`withRepeat` + `withSequence` on rotation)
- Floating button becomes a checkmark "Done"

**Drag-to-reorder:**

- Use `react-native-reanimated` + `react-native-gesture-handler` `PanGestureHandler`
- Animate vertical position with `withSpring`
- On drag release, commit new order to `widgets.store`

**Add widget:**

- In edit mode, a `+` card appears at the bottom of the list
- Tapping it opens the existing `Modal` component listing available widget types
- Each list item: widget icon + name + "Add" button

### 2.4 Widget Types

Each widget is a self-contained component in `components/home/widgets/`.

| Widget        | File                     | Description                                                                   |
| ------------- | ------------------------ | ----------------------------------------------------------------------------- |
| Calories      | `CaloriesWidget.tsx`     | Horizontal progress bar, kcal consumed / goal                                 |
| Workouts      | `WorkoutsWidget.tsx`     | Today's count + `"Start Workout"` CTA → `/(tabs)/workouts/create`             |
| Streak        | `StreakWidget.tsx`       | Flame icon + streak count + last 7 days dot row                               |
| Quick Actions | `QuickActionsWidget.tsx` | 2 buttons: `"Start Workout"` → workouts/create, `"Log Nutrition"` → nutrition |
| Water Intake  | `WaterIntakeWidget.tsx`  | Glass counter with `+` / `−` controls (local state only)                      |

---

## Phase 3 — New File Structure

Create the following new files:

```
components/
  home/
    HeroSummaryCard.tsx       ← SVG ring + stats
    WidgetCard.tsx            ← Wrapper: drag handle, edit controls, shadow
    widgets/
      CaloriesWidget.tsx
      WorkoutsWidget.tsx
      StreakWidget.tsx
      QuickActionsWidget.tsx
      WaterIntakeWidget.tsx

stores/
  widgets.store.ts            ← Zustand store for widget list
```

### `stores/widgets.store.ts`

```ts
type WidgetType = "calories" | "workouts" | "streak" | "quickActions" | "water";

interface WidgetConfig {
  id: string; // uuid or nanoid
  type: WidgetType;
  order: number;
}

interface WidgetsStore {
  widgets: WidgetConfig[];
  addWidget: (type: WidgetType) => void;
  removeWidget: (id: string) => void;
  reorderWidgets: (ordered: WidgetConfig[]) => void;
}
```

- Use `zustand` with `AsyncStorage` persist middleware if available, else plain store
- Default widgets on first load: `['calories', 'workouts', 'streak', 'quickActions']`

---

## Phase 4 — Legacy Cleanup

- Delete `app/(tabs)/dashboard.tsx`
- Delete `app/(tabs)/dashboard-backup.tsx`
- Search all files for imports referencing `dashboard`, `dashboard-backup`, `GlassCard`, `InteractiveMenuWeb.demo` — remove unused imports
- Verify `_layout.tsx` has no references to deleted screens
- Verify `modern-mobile-menu.tsx` has no hardcoded `dashboard` or `profile` route entries
- Remove `profile` from `<Tabs>` but keep the `Profile` screen file intact (reachable via Avatar navigation)

---

## Implementation Constraints

- **React Native only** — no web CSS, no HTML elements, no DOM APIs
- **No breaking changes** to Workouts, Nutrition, Community, Profile screens
- **All colors** via `useThemeStore((s) => s.colors)` — avoid hardcoded hex except semantic UI accents (replace `#F59E0B` flame color with a token if one exists in the theme)
- **No external drag-and-drop libs** beyond `react-native-reanimated` + `react-native-gesture-handler`
- **Touch targets:** minimum 44×44px for all interactive elements
- **Loading state:** render centered `ActivityIndicator` while `isLoading` from `useAuthStore` is `true`
- **StyleSheet.create** pattern throughout — no inline style objects
- **TypeScript strict** — no `any` types, full prop interfaces for every component
- **i18n-ready strings:** all user-facing text in English, defined as constants at the top of each file (easy to swap for `t()` calls in a future i18n pass)
- **Comments** only where logic is non-obvious (drag math, SVG ring calculation)

---

## Greeting Reference (i18n-ready)

```ts
// Easy to replace with t('greeting.morning') etc.
const GREETINGS = {
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening",
} as const;
```

---

## SVG Ring Calculation Reference

```ts
const RADIUS = 60;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈ 376.99
const progress = calories / calorieGoal; // 0 → 1
const strokeDashoffset = CIRCUMFERENCE * (1 - progress);
// Animate strokeDashoffset from CIRCUMFERENCE → target value on mount
```
