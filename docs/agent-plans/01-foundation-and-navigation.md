# Phase 01 - Foundation and Navigation

## Suggested specialization

Foundation agent.

## Objective

Turn the repository into a working Expo Router app shell with auth routing, theme and locale bootstrapping, and predictable entry points for the rest of the product.

## Current Starting Point

- `app/` route folders already exist, but the route files are mostly empty.
- Firebase, auth state, theme state, i18n, and core helpers already exist in `lib/` and `stores/`.
- Shared UI atoms already exist in `components/ui/`.

## Screens and Routes

- `app/_layout.tsx` for root providers, route guard, and app-wide wrappers.
- `app/(auth)/_layout.tsx` for the auth flow container.
- `app/(auth)/welcome.tsx` for the splash/welcome landing screen.
- `app/(auth)/login.tsx` for sign-in.
- `app/(auth)/signup.tsx` for account creation.
- `app/(auth)/onboarding/_layout.tsx` for the onboarding stepper shell.
- `app/(tabs)/_layout.tsx` for the floating tab bar.
- `app/(tabs)/dashboard.tsx`, `workouts/index.tsx`, `nutrition/index.tsx`, `community/index.tsx`, and `profile/index.tsx` as the first tab targets.
- `app/settings/index.tsx` as the settings entry point with rows for appearance, language, AI keys, profile edit, and about.

## Step-by-Step Work

1. Build the root layout and compose providers for auth, theme, locale, safe area, status bar, and toasts.
2. Add route-group layouts for auth and tabs.
3. Add route protection so the app resolves to welcome, onboarding, or tabs depending on auth state and onboarding completion.
4. Create first-pass auth screens with the expected actions and navigation targets.
5. Create the tab shell and placeholder landing screens so navigation can be tested end-to-end.
6. Add the settings entry screen and basic toggles for appearance and language.
7. Make sure the app can launch cleanly on a physical device with the current Expo workflow.

## Behavior Rules

- Startup order should be: splash/loading, auth hydration, profile fetch, locale/theme init, then routing.
- If the auth state is loading, keep the splash or loading state visible instead of flashing the wrong route.
- If the user is signed out, always land in the auth flow.
- If the user is signed in but onboarding is not complete, send them to onboarding before personalized features.
- If the profile fetch fails, show a retry state and keep any valid auth session alive.
- If the device language is unsupported, fall back to English.

## Data and Storage

- No feature data should be written in this phase beyond reading the current profile document.
- Firestore is only read for `profiles/{uid}` so the router can decide whether onboarding is complete.
- Theme mode and language can be local preferences for now; they do not need new Firestore fields in this phase.

## Configuration Questions

- Which auth providers are enabled on day one: email/password only, or email/password plus Google and Facebook? Email/password first
- Do we show a guest/browse-only mode? Recommendation: no, keep sign-in required.
- Should the welcome screen be the default unauthenticated entry point? Recommendation: yes.
- Should the theme default to system mode? Recommendation: yes.
- Should the language default to device locale with English fallback? Recommendation: yes.

## Deliverables

- A functioning app shell with route groups.
- Auth-aware navigation and first-pass auth screens.
- Tab navigation placeholders for the main product areas.
- A basic settings entry point for global preferences.

## Acceptance Criteria

- Expo Go opens the app without a red screen or blank screen.
- Logged-out users land in the auth flow.
- Logged-in users land in the tab flow.
- Theme and language resolve consistently on startup.
- Navigation targets exist for the major app sections even before the feature logic is filled in.

## Constraints

- Reuse the existing Firebase and i18n modules rather than rewriting them.
- Keep this phase limited to bootstrapping and navigation; do not start workout, nutrition, community, or coach logic yet.
