# Phase 09 - Achievements

## Suggested specialization

Rewards and progression agent.

## Objective

Add XP, badge unlocks, and visible reward feedback that reflects the user's activity across workouts, nutrition, and community.

## Current Starting Point

- The schema already includes achievements and XP-related fields.
- No achievements UI or unlock logic exists yet.

## Screens and Routes

- `app/(tabs)/profile/achievements.tsx` for the achievement catalog and XP history.
- Unlock states can also be surfaced as modals or toasts from the relevant feature screens.

## Step-by-Step Work

1. Define XP rules and badge unlock rules.
2. Build the achievements list and achievement detail views.
3. Add unlock animations and history states.
4. Read and write achievement records under the profile subcollection.
5. Connect XP awards to workouts, nutrition logs, and community actions.

## Reward Model

- Workout rewards can cover first workout, completed workout, streak milestones, volume milestones, and personal bests.
- Nutrition rewards can cover first meal logged, consecutive logging days, and plan adherence.
- Community rewards can cover first post, first follow, first group join, and challenge completion.
- Profile or coach rewards can cover onboarding completion and weekly consistency.

## Screen Behavior

- The achievements page should clearly separate unlocked and locked items.
- Locked achievements should show a short description, current progress, and the next step needed.
- Unlocking an achievement should trigger a visible success state such as a modal, toast, or small animation.
- The XP display should feel cumulative and trustworthy, not noisy.
- Duplicate awards should not be counted twice if the triggering event is replayed.
- If the user is offline, queue the award locally and sync when connectivity returns.

## Data and Storage

- `profiles/{uid}.xp`, `streak_current`, and `streak_longest` store the headline progression state.
- `profiles/{uid}/achievements/{achievementId}` stores unlocked achievement records with key, name, description, icon, unlocked_at, and xp_reward.
- Recommended optional `profiles/{uid}/xp_events` or `xp_ledger` subcollection can track the reason for each XP award for auditing and deduplication.

## Configuration Questions

- Which achievement categories should ship in MVP? Recommendation: workout consistency, nutrition consistency, and community participation first.
- Should badges be fully visible before unlock, or should some remain hidden? Recommendation: visible categories with hidden surprise badges later.
- Should XP levels be derived only from points, or should there also be named tiers? Recommendation: derive tiers from XP but keep the raw number visible.
- Should unlock history be infinite or capped? Recommendation: keep the full record if storage remains small.

## Deliverables

- An achievements screen.
- XP reward logic.
- Unlock feedback and history.

## Acceptance Criteria

- Completing tracked actions visibly changes XP or badges.
- Unlocked achievements persist across app sessions.
- Awards are not double-counted when the same event is replayed.

## Constraints

- Keep reward rules explicit and easy to test.
- Avoid burying XP logic inside unrelated UI components.
