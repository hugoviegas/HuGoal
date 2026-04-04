# Phase 03 - UI System and Layout

## Suggested specialization

Design system agent (can parallelize into 3 sub-agents: tokens → atomics → patterns).

## Objective

Standardize the app UI with centralized design tokens (typography 5 levels, colors extended, spacing 4px, elevation), refine 6 existing components, create 19 new components (atomics + layout patterns), implement token-based dark/light theming, and establish reusable layout patterns so feature screens avoid custom one-off styling.

**Key Outcomes:**
- ✅ 6 design token files (colors, spacing, typography, animation, elevation)
- ✅ 6 components refined (Avatar, Button, Input, GlassCard, Modal, Toast)
- ✅ 19 new components (9 atomics + 10 patterns/layout)
- ✅ TextProvider Context for dynamic typography
- ✅ Dark/light theme via token-based colors + theme.store
- ✅ 3+ parallel agents (tokens → atomics → patterns)

## Current Starting Point

- **6 existing components:** Button, Input, GlassCard, Modal, Toast, Avatar (stubs/basic, need refinement)
- **Missing:** Design tokens (colors, spacing, typography), TabBar (needs polish), layout patterns (Screen, SectionHeader, StatCard, EmptyState, ErrorState, etc)
- **No TypeScript errors** on existing components
- **Theme store exists** (theme.store.ts) — ready for token-based color switching

## Shared UI Inventory

- `GlassCard` for blurred surfaces and content containers.
- `Button` for all primary, secondary, outline, ghost, and destructive actions.
- `Input` for text entry, number entry, search, and form validation.
- `Modal` for confirmations and focused actions.
- `Toast` for lightweight feedback.
- `Avatar` for user identity surfaces.
- `TabBar` for the floating bottom navigation.
- Recommended add-ons: `Screen`, `SectionHeader`, `StatCard`, `EmptyState`, `ErrorState`, `LoadingState`, `Pill`, `Divider`, and `SettingsRow`.

## Style Rules

- Prefer glass surfaces with soft blur, subtle borders, and enough contrast to stay readable in both themes.
- Avoid flat, generic white panels; use layered backgrounds, soft gradients, or atmospheric color blocks where it helps the hierarchy.
- Keep the palette restrained: one primary accent, one supportive accent, and neutral surfaces.
- Typography should feel intentional, not default. Treat title, body, and metric text as separate hierarchy levels.
- Rounded corners should feel consistent across cards, buttons, sheets, and input surfaces.
- Motion should be subtle and functional: fades, slides, springs, and short confirmations rather than heavy animation.

## Layout and Interaction Rules

- Every screen should be safe-area aware and scroll correctly on small devices.
- Primary forms should have a clear top title, a short explanation, grouped inputs, and a bottom CTA.
- Long content screens should use section headers and repeated card spacing rather than one giant sheet.
- Destructive actions must go through a confirmation modal.
- Success should use a toast or inline success state, not a silent action.
- Loading states should use skeletons or lightweight spinners instead of blank pages.
- Empty states should explain why the area is empty and offer one next action.
- Error states should keep user input intact and offer retry.

## Data and Storage

- This phase does not add new Firestore data.
- Theme mode, toast queue, and layout state can remain local.

## Configuration Questions

- What is the final typography direction for the brand? Recommendation: avoid default system styling and choose a more distinctive heading treatment before launch.
- Should the tab bar stay floating and glassy across the whole app? Recommendation: yes.
- Should light mode be bright white or soft neutral? Recommendation: soft neutral with glass cards, not stark white everywhere.
- Which accent color should lead the product identity: a cool blue, a violet, or a green? Recommendation: pick one and use it consistently across CTAs and progress indicators.

## Deliverables

- A coherent shared component system.
- A reusable floating tab bar.
- Layout patterns that future feature screens can copy safely.

## Acceptance Criteria

- Feature screens can be assembled using shared primitives instead of custom ad hoc UI.
- Cards, inputs, buttons, sheets, and navigation surfaces look visually consistent in both themes.
- Loading, empty, and error states are covered by shared patterns rather than custom one-offs.

## Constraints

- Do not introduce feature-domain logic here.
- Prefer small reusable primitives over large abstractions.
