# BetterU Agent Plans

This folder turns the high-level roadmap in `docs/main_plan.md` and the original idea in `docs/initial_prompt.md` into phase briefs that can be handed to specialized agents.

## Current State Snapshot

- The app is still at scaffold stage in the main BetterU workspace.
- `app/` exists as a route tree, but the route files are mostly empty.
- Shared foundation code already exists for Firebase, auth state, theme state, i18n, utilities, and basic UI atoms.
- Expo configuration, NativeWind, Tailwind, and localization setup are already present.
- The versions in `package.json` are the source of truth for implementation.

## Shared Product Rules

- Build one Expo codebase for Android and iOS.
- Use Firebase for auth and Firestore data, Storage for media, and SecureStore for API keys.
- AI-generated content is always draft-first: generate, review, then save.
- Every feature screen must handle loading, empty, error, retry, and offline states.
- UI should stay glassy, clean, and modern, with intentional typography and safe-area aware spacing.
- Dark/light mode and EN/PT support are required from the start.
- Keep sensitive data local; never write user API keys to Firestore.

## MVP Baseline Decisions

- Auth providers in MVP: email/password, Google, and Facebook.
- Onboarding can be skipped, but personalized features must be gated until profile data exists.
- Default post visibility: followers-only with an explicit public toggle.
- Leaderboard authority: server-side aggregation or Cloud Functions, not client math.
- Coach summaries: derive from stored data; cache only generated summaries if needed.
- Workout and nutrition AI should fail gracefully into manual flows.

## Phase Map

1. [Phase 01 - Foundation and Navigation](01-foundation-and-navigation.md)
2. [Phase 02 - Onboarding and Profile](02-onboarding-and-profile.md)
3. [Phase 03 - UI System and Layout](03-ui-system-and-layout.md)
4. [Phase 04 - Workouts](04-workouts.md)
5. [Phase 05 - Nutrition](05-nutrition.md)
6. [Phase 06 - AI Keys](06-ai-keys.md)
7. [Phase 07 - Community](07-community.md)
8. [Phase 08 - Coach](08-coach.md)
9. [Phase 09 - Achievements](09-achievements.md)
10. [Phase 10 - Polish](10-polish.md)

## Phase Execution Contract

- Each phase brief should answer: which screens exist, how they behave, what data is stored, which error cases matter, what configuration questions need decisions, and how the phase is considered done.
- Keep phase boundaries narrow so each agent can finish one slice without accidentally expanding scope.

## Review Template

- Use [phase-review-template.md](phase-review-template.md) at the end of every phase delivery.
