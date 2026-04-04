# Phase 06 - AI Keys

## Suggested specialization

Secure storage and provider setup agent.

## Objective

Give the user a safe way to manage Gemini, Claude, and OpenAI keys locally and choose a preferred provider without sending secrets to Firestore or any server.

## Current Starting Point

- `lib/api-key-store.ts` already stores keys in SecureStore.
- `lib/ai-provider.ts` already calls the three providers.
- The settings screen for key management still needs to be built.

## Screens and Routes

- `app/settings/ai-keys.tsx` for the provider cards, input modal, status, test button, and setup links.
- `app/settings/index.tsx` should link into the AI keys screen and show the current provider preference.

## Step-by-Step Work

1. Build the AI key settings screen.
2. Show the configured or not-configured state for each provider.
3. Display masked key previews instead of full secrets.
4. Add links to each provider's API key page and a short setup guide.
5. Add a small connection test for the active provider.
6. Store only the provider preference in the profile; keep the key local.
7. Confirm the app never writes API keys to Firestore or logs them.

## Screen Behavior

- Each provider card should show provider name, status, masked key preview, and actions for test, edit, and delete.
- Adding or editing a key should use a focused modal or sheet with a clear explanation that the key is stored only on-device.
- The test action should make the smallest possible API call that confirms the key works without generating a large response.
- If validation fails, keep the current key state visible and explain whether the issue is an invalid key, rate limit, network problem, or provider outage.
- The screen should explain how to create a key with direct links to the provider dashboards.
- If no key exists and the user opens an AI feature, route them here with a short explanation instead of failing silently.

## Data and Storage

- Each provider key stays only in SecureStore using `WHEN_UNLOCKED_THIS_DEVICE_ONLY` behavior.
- `profiles/{uid}.preferred_ai_provider` stores only the provider preference, not the secret.
- A local last-tested timestamp or status flag can be kept on-device for UI feedback.

## Configuration Questions

- Which provider should be the default suggestion when the user has multiple keys saved? Recommendation: use the profile preference, then fall back to the last successful provider.
- Should the app allow multiple keys at once? Recommendation: yes, one per provider.
- Should the user be able to set a provider preference without saving a key yet? Recommendation: yes, but AI features should still gate until a key exists.
- Should test results be cached across sessions? Recommendation: only locally, not in Firestore.

## Deliverables

- AI key management screen.
- Provider switcher and test action.
- Clear secure-storage behavior for local secrets.

## Acceptance Criteria

- Keys survive app restarts.
- Keys are masked in the UI.
- No API key appears in cloud data.
- The app can explain how to set up each provider without exposing secrets.

## Constraints

- SecureStore must remain the only persistence layer for these secrets.
- Do not expose full keys in logs, exceptions, or analytics.
