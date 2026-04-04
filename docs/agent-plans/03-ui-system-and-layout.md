# Phase 03 - UI System and Layout

## Suggested specialization

Design system agent (3 sub-agents: tokens → atomics → patterns in parallel).

## Objective

Standardize the app UI with centralized design tokens (5-level typography, extended colors, 4px spacing, elevation), refine 6 existing components, create 19 new components (9 atomics + 10 patterns), implement token-based dark/light theming, and establish reusable layout patterns.

**Key Outcomes:**

- ✅ 6 design token files (colors, spacing, typography, animation, elevation)
- ✅ 6 components refined (Avatar, Button, Input, GlassCard, Modal, Toast)
- ✅ 19 new components (9 atomics + 10 patterns/layout)
- ✅ TextProvider Context for dynamic typography
- ✅ Dark/light theme via token-based colors + theme.store
- ✅ 3 parallel agents (tokens → atomics → patterns)

## Current Starting Point

- **6 existing components:** Button, Input, GlassCard, Modal, Toast, Avatar (stubs/basic, need refinement)
- **Missing:** Design tokens (colors, spacing, typography), TabBar (needs polish), layout patterns
- **No TypeScript errors** on existing components
- **Theme store exists** (theme.store.ts) — ready for token-based switching

## Design Tokens (Centralized Foundation)

### Token Files (Location: `constants/`)

**6 Files, each responsible for one concern:**

1. **colors.ts**
   - Light palette: primary #6366F1, secondary #8B5CF6, success #10B981, warning #F59E0B, error #EF4444, info #3B82F6, neutrals (50-950)
   - Dark palette: darker versions with 4.5:1 contrast minimum
   - Export: `ColorScheme = typeof colors.light`

2. **spacing.ts**
   - 4px base: xs (4), sm (8), md (12), lg (16), xl (20), 2xl (24), 3xl (32), 4xl (40), 5xl (48), 6xl (64), 7xl (80), 8xl (96)
   - Used via NativeWind classes (`p-4`, `m-8`, etc)

3. **typography.ts**
   - 5 levels: h1 (28px, 700 bold), h2 (24px, 600 semi), h3 (20px, 600 semi), body (16px, 400), small (14px, 400), caption (12px, 500)
   - Accessed via `useTypography()` hook or TextProvider context

4. **animation.ts**
   - Speeds: fast (100ms), normal (200ms), slow (400ms)
   - Easing: cubicBezier(0.4, 0, 0.2, 1) default

5. **elevation.ts**
   - 3 levels: xs (elevation: 1), md (elevation: 4), lg (elevation: 8)
   - Android-style depth shadows

6. **design-system.ts**
   - Re-exports all above + validation type
   - Single import: `import * as DS from '@/constants/design-system'`

## Shared UI Inventory (25 Components Total)

### Existing to Refine (6)

- **Avatar** → add size (xs, sm, md, lg), status indicator, ring
- **Button** → verify 5 variants + sizes (primary, secondary, outline, ghost, destructive, sm/md/lg)
- **Input** → keep as-is (no enhancements now)
- **GlassCard** → update blur + border with tokens
- **Modal** → add sizes (sm, md, lg) + animation variants
- **Toast** → add variants (success, error, info, warning)

### New Atomic Components (9)

- `Spinner` — Reanimated rotation, size + color props
- `Checkbox` — animated check mark, controlled pattern
- `Toggle` — animated slide switch via Reanimated
- `Badge` — 6 variants (default, primary, success, warning, error, info)
- `Pill` — extends Badge with removable onPress action
- `Divider` — horizontal | vertical, optional center label
- `Tooltip` — Portal-based, 4 positions, long-press trigger
- `ProgressFormIndicator` — progress bar + step dots visualization
- `Tabs` — internal tabs (not bottom nav), animated underline

### New Layout & Pattern Components (10)

- `Screen` — safe-area wrapper, header optional, scrollable
- `SectionHeader` — title + description + action button
- `StatCard` — icon + label + value + trend (direction+percent)
- `DashboardCard` — generic container (icon + title + children + footer)
- `EmptyState` — icon + title + description + action
- `ErrorState` — similar to EmptyState with retry emphasis
- `Skeleton` — shimmer animation, mock data shapes (line, circle, rect)
- `SettingsRow` — icon + label + value + trailing (toggle/chevron)
- `LazyImage` — blur preview → sharp image transition
- `TabBar` — floating bottom nav (glass style)

### Setup & Context (2)

- `TextProvider.tsx` + `useTypography.ts` — typography context for 5-level hierarchy

## Styling Approach (Confirmed)

- **Layout:** NativeWind (className) for positioning, padding, margin, sizing
- **Dynamic:** StyleSheet for colors, shadows, elevation (requires device knowledge)
- **Mix:** Both on same component: `<View className="p-4" style={{backgroundColor: colors.primary}} />`

## Style Rules (Applied via Tokens)

- **Glass surfaces:** BlurView + token colors + subtle borders (use elevation tokens)
- **Layered backgrounds:** Token colors for primary, secondary, neutral surfaces
- **Palette restraint:** Primary #6366F1, secondary #8B5CF6, semantic colors (success/warning/error/info)
- **Typography hierarchy:** 5 levels via tokens (not default system styling)
- **Rounded corners:** 3 consistent sizes (sm 4px, md 8px, lg 16px) via tokens
- **Motion:** Subtle (fast 100ms for micro, normal 200ms for transitions, slow 400ms for modals)

## Component API Contract (CLAUDE.md § 3)

Every new component MUST follow this contract:

```ts
// Props visuais
variant?: string          // e.g., Badge: 'primary' | 'success'
size?: 'xs' | 'sm' | 'md' | 'lg'
tone?: string             // optional variant flavor
fullWidth?: boolean       // e.g., Button, Input

// Props de estado
value?: any               // controlled value
defaultValue?: any        // uncontrolled default
open?: boolean            // for Modal, Tooltip
onOpenChange?: (bool) => void
checked?: boolean         // for Checkbox, Toggle
onCheckedChange?: (bool) => void

// Props de comportamento
loading?: boolean         // show loading state
disabled?: boolean        // disable interaction
editable?: boolean        // for inputs

// Props de estilo
className?: string        // NativeWind classes
contentClassName?: string
containerClassName?: string

// Eventos (RN naming)
onPress?: () => void      // tap action
onChange?: (val) => void  // value change
onSelect?: (item) => void // multi-select

/// JSDoc + usage example in file header
```

## Layout and Interaction Rules

- Every screen should be safe-area aware and scroll correctly on small devices.
- Primary forms should have a clear top title, a short explanation, grouped inputs, and a bottom CTA.
- Long content screens should use section headers and repeated card spacing rather than one giant sheet.
- Destructive actions must go through a confirmation modal.
- Success should use a toast or inline success state, not a silent action.
- Loading states should use skeletons or lightweight spinners instead of blank pages.
- Empty states should explain why the area is empty and offer one next action.
- Error states should keep user input intact and offer retry.

## Configuration Decisions (Confirmed — 18 Locked)

| Decision            | Choice                                                                                     | Impact                       |
| ------------------- | ------------------------------------------------------------------------------------------ | ---------------------------- |
| Typography levels   | 5 (h1, h2, h3, body, small, caption)                                                       | More granular hierarchy      |
| Color palette       | Extended (primary, secondary, success, warning, error, info)                               | Better semantic feedback     |
| Spacing base        | 4px (not 8px)                                                                              | More granular flexibility    |
| Border-radius sizes | 3 (sm 4px, md 8px, lg 16px)                                                                | Consistent across components |
| Animation speeds    | 3 (fast 100ms, normal 200ms, slow 400ms)                                                   | Standard motion vocabulary   |
| Typography impl     | React Context + TextProvider                                                               | Dynamic, switch-able         |
| Tokens storage      | Split files (not monolithic)                                                               | Easier navigation            |
| Light mode          | Soft neutral (not stark white)                                                             | Better usability             |
| Primary accent      | Indigo #6366F1                                                                             | Cool blue identity           |
| Tab bar             | Floating + glassy                                                                          | Confirmed, polish in Onda 1  |
| Layout patterns     | 10 total (Screen, Header, Card, Empty, Error, Skeleton, Row, Dashboard, LazyImage, TabBar) | Reduce ad-hoc UI             |
| Styling             | NativeWind (layout) + StyleSheet (dynamic)                                                 | Best of both worlds          |
| Dark/Light theme    | Token-based via theme.store                                                                | Clean switch                 |
| Accessibility       | B+ (keyboard nav + screen reader)                                                          | Inclusive without overhead   |
| Icon library        | lucide-react-native                                                                        | Vast catalog                 |
| Component docs      | JSDoc + examples                                                                           | Low-friction reference       |
| Testing             | Unit tests (RN Testing Library)                                                            | Prevent regressions          |
| Parallelization     | 3 agents (tokens → atomics → patterns)                                                     | Faster delivery              |

## Data and Storage

- This phase does not add new Firestore data.
- Theme mode, toast queue, and layout state can remain local.
- Token system is pure TypeScript — no runtime API calls needed.

## Deliverables

### Phase 1: Design Tokens (Blocker)

✅ 6 centralized token files (colors, spacing, typography, animation, elevation, design-system)
✅ Single import point: `import * as DS from '@/constants/design-system'`
✅ Type-safe color/spacing/typography exports with contrast verified

### Phase 2: Refine Existing (6 Components)

✅ Avatar, Button, Input, GlassCard, Modal, Toast updated with tokens
✅ All refined components working smoothly in light + dark modes

### Phase 3: New Atomics (9 Components)

✅ Spinner, Checkbox, Toggle, Badge, Pill, Divider, Tooltip, ProgressFormIndicator, Tabs
✅ All with JSDoc + examples + dark/light support + unit tests

### Phase 4: Layout Patterns (10 Components)

✅ Screen, SectionHeader, StatCard, DashboardCard, EmptyState, ErrorState, Skeleton, SettingsRow, LazyImage, TabBar
✅ All following component API contract (CLAUDE.md § 3)
✅ JSDoc + examples in each file header

### Phase 5: Setup (2 Files)

✅ TextProvider.tsx + useTypography hook
✅ TextProvider wraps root layout
✅ Hook provides dynamic typography access

### Final Output

✅ 25 total components (6 refined + 19 new)
✅ Consistent visual language across entire app
✅ Reusable patterns reduce future custom UI work by 40%
✅ 0 TypeScript errors
✅ All components tested + documented

## Acceptance Criteria

### Functional

- ✅ All 25 components render without errors
- ✅ Feature screens CAN use ONLY shared primitives (no custom ad-hoc UI)
- ✅ Loading, empty, error states covered by dedicated components
- ✅ TabBar floats, is glassy, animates smoothly
- ✅ All refined components work in new state
- ✅ All atomics render correctly
- ✅ All patterns integrate properly

### Visual Consistency

- ✅ Cards, buttons, inputs look consistent in light AND dark themes
- ✅ Color palette uses ONLY defined tokens (no hardcoded colors)
- ✅ Spacing consistent via token usage
- ✅ Typography hierarchy clear via 5-level system
- ✅ Border-radius matches token sizes (sm/md/lg)
- ✅ Motion smooth + consistent (100/200/400ms speeds)

### Technical Quality

- ✅ 0 TypeScript errors
- ✅ All components follow API contract (CLAUDE.md § 3)
- ✅ Dark/light theme switch works (via theme.store)
- ✅ Accessibility: all interactive elements have testID + labels
- ✅ Hit areas ≥ 44x44 pts
- ✅ No duplicate component names
- ✅ Unit tests pass (RN Testing Library)

### Documentation

- ✅ JSDoc + example in every component file header
- ✅ docs/components.md documents usage
- ✅ Component contrast ratios verified (4.5:1 minimum)

## Constraints

- ❌ Do NOT introduce feature-domain logic (e.g., workout calculation, nutrition math)
- ❌ Do NOT create workout-specific or nutrition-specific components (defer to Phase 04+)
- ✅ Prefer small reusable primitives over large abstractions
- ✅ Keep components pure/presentational — no API calls or Firestore logic
- ✅ Components must work with mock data before real data
- ✅ No copying web implementations (shadcn, Radix, framer-motion) literally — adapt to RN
- ✅ Maintain backward compatibility with Phase 01 foundation (auth, routing)
- ✅ Do NOT break existing Phase 02 onboarding logic

## Implementation Strategy

### Parallelization (3 Independent Agents)

**Agent 1: Design Tokens** (No dependencies)

- Phase 1: Create 6 token files (constants/colors.ts, spacing.ts, typography.ts, animation.ts, elevation.ts, design-system.ts)
- Output: constants/design-system.ts fully exported + typed
- **Time:** ~1 day
- **Blocker:** Must complete before Agents 2 & 3 start

**Agent 2: Atomics** (Depends on Agent 1)

- Phase 2: Refine 6 existing components (2 days)
- Phase 3: Create 9 new atomic components (3 days)
- Output: 15 components with JSDoc + examples + unit tests
- **Time:** ~5 days
- **Can parallelize internally:** Some atomics independent of others

**Agent 3: Patterns** (Depends on Agent 1, can use Agent 2)

- Phase 4: Create 10 layout/pattern components (4 days)
- Phase 5: Setup TextProvider + hooks (1 day)
- Output: 12 components + integration + documentation
- **Time:** ~5 days
- **Can use:** Atomics from Agent 2 in patterns

**Merge Point:** After all 3 agents complete, merge, integrate, final documentation

**Sequential Time (1 agent):** 1 + 5 + 5 = 11 days
**Parallel Time (3 agents):** 1 + max(5, 5) = 6 days
**Savings:** 5 days (45% faster)

## QA & Verification Checklist

### Phase 1 (Tokens)

- [ ] All 6 token files compile (0 TS errors)
- [ ] Colors contrast verified (light & dark pairs, 4.5:1 minimum)
- [ ] Spacing scale validated (4px increments)
- [ ] Animation configs tested on physical device (smooth, no jank)
- [ ] Elevation shadows render correctly on Android & iOS

### Phase 2-3 (Components)

- [ ] Avatar: size, status, ring props work + initials fallback shows
- [ ] Button: all 5 variants visible + sizes scale correctly
- [ ] Input: error state displays properly
- [ ] GlassCard: blur + border apply, token colors used
- [ ] Modal: sizes (sm/md/lg) + animations render smoothly
- [ ] Toast: all 5 variants (default, success, error, info, warning) display correct colors
- [ ] Spinner: rotates smoothly (no stuttering on low-end Android)
- [ ] Checkbox: animated check mark works
- [ ] Toggle: slide animation smooth
- [ ] Badge: renders with/without count overlay
- [ ] Pill: removable action functional
- [ ] Divider: horizontal & vertical render correctly
- [ ] Tooltip: appears on long-press, disappears on blur
- [ ] ProgressFormIndicator: shows progress visually (bar + dots)
- [ ] Tabs: underline slides to active tab smoothly

### Phase 4-5 (Patterns)

- [ ] Screen: safe-area applies correctly, scroll works
- [ ] SectionHeader: title + description + action button display
- [ ] StatCard: icon + label + value + trend render correctly
- [ ] DashboardCard: flexible layout accommodates children
- [ ] EmptyState: icon + title + description + action visible
- [ ] ErrorState: shows error message + retry button
- [ ] Skeleton: shimmer animation plays smoothly
- [ ] SettingsRow: icon + label + trailing (toggle/chevron) layout correct
- [ ] LazyImage: placeholder shows, transitions to image
- [ ] TabBar: floats at bottom, icons + labels visible, animations smooth
- [ ] TextProvider: context provides typography correctly
- [ ] useTypography: hook returns correct sizes/weights

### Cross-Component Testing

- [ ] All 25 components render in light theme
- [ ] All 25 components render in dark theme
- [ ] Theme switch (toggle dark mode) updates all components
- [ ] No TypeScript errors across entire project
- [ ] No duplicate component names (grep + sort check)
- [ ] Accessibility: all interactive elements have testID
- [ ] Accessibility: all inputs/buttons have labels or accessibilityLabel
- [ ] Hit areas: all buttons/inputs ≥ 44x44 pts (measure in Expo Inspector)
- [ ] Unit tests pass: `npm run test:components` (RN Testing Library)
- [ ] No regression in Phase 01 (auth, routing still work)
- [ ] No regression in Phase 02 (onboarding forms still work)
- [ ] JSDoc + example present in every component file header
- [ ] All 6 token files exported from constants/design-system.ts
- [ ] All 19 new components exported from components/ui/index.ts
- [ ] TextProvider wraps root layout in app/\_layout.tsx
- [ ] Colors access: `const colors = useThemeStore(s => s.colors)` works
- [ ] Spacing access: `const spacing = TS.spacing` works
- [ ] Typography access: `const typo = useTypography()` works

## Risk Mitigations

| Risk                                  | Severity | Mitigation                                                                     |
| ------------------------------------- | -------- | ------------------------------------------------------------------------------ |
| Color contrast fails in dark mode     | HIGH     | Test all light/dark pairs with contrast checker before merge                   |
| Animations stutter on low-end Android | MEDIUM   | Test Reanimated configs on Android 6+; use simple spring vs complex            |
| Accessibility hit areas too small     | MEDIUM   | Enforce 44x44 minimum; measure in Expo Inspector                               |
| Design tokens not synchronized        | MEDIUM   | Create constants/design-system.ts as single source of truth                    |
| Component API inconsistency           | MEDIUM   | Enforce contract via TypeScript; type-check all props                          |
| Circular imports                      | MEDIUM   | Keep tokens in constants/; components in components/; strict folder boundaries |
| TabBar overlaps content               | LOW      | Set bottom padding on ScrollView screens to account for TabBar height          |
| TextProvider context overhead         | LOW      | Memoize context value; use useContext only where needed                        |

## Next Phase (Onda 2 — Overlays & Selection)

**Phase 04: Modal, Dropdowns, Filters, Selectors**

- Depends on: Phase 03 (Onda 1) complete
- Components: Modal consolidado, DropdownMenu, FilterPopover, Accordion, Slider, AvatarPicker
- Time estimate: 5-7 days
- Use atomics from Phase 03 as building blocks
