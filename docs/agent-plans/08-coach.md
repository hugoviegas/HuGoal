# Phase 08 - Coach

## Suggested specialization

Coach and analytics agent.

## Objective

Create the coaching experience: progression charts, weekly summaries, insights, streak awareness, and a lightweight question-and-answer surface about the user's training and nutrition.

## Current Starting Point

- AI helpers already exist.
- There is no coach screen yet.

## Screens and Routes

- `app/(tabs)/coach.tsx` for the main coach dashboard.
- Optional coach subcomponents can be grouped under `components/` if the screen needs reusable cards or chart blocks.

## Step-by-Step Work

1. Build the coach screen and its data model.
2. Summarize weekly workout and nutrition trends from stored data.
3. Add progression charts with `victory-native`.
4. Add a streak calendar and concise insight cards.
5. Add a short "ask coach" prompt area so the user can ask about workouts, progression, or nutrition.
6. Use the AI provider to draft a weekly summary when data is available.

## Screen Behavior

- The top of the screen should summarize the current week: streak, XP, workout sessions completed, nutrition adherence, and the next suggested focus.
- Charts should cover the most useful coaching metrics first: workout frequency, exercise progression, total volume, bodyweight trend if available, and macro adherence.
- Insight cards should be concise and action-oriented, not long paragraphs.
- The coach prompt should answer simple questions about the user's own data and provide practical next steps, not medical or generic fluff.
- If the user has very little data, the screen should switch to a starter mode with a simple plan and a clear explanation of what to log next.
- If AI generation fails, keep the chart and deterministic summary visible and show a retry action for the AI-generated narrative.

## Behavior Rules

- Base all graphs and summaries on stored workout and nutrition data rather than on a separate hidden state.
- If enough data exists, the weekly summary can be generated automatically; otherwise, generate on demand.
- If the user asks a question that depends on data not yet collected, answer with what is known and state the missing context.
- Keep the coach UI fast; charts must not block the rest of the app from rendering.

## Data and Storage

- Use `workout_sessions`, `workout_templates`, `nutrition_logs`, and profile streak fields as the source of truth for analytics.
- Recommended optional cache: a `profiles/{uid}/coach_snapshots` subcollection with week range, generated summary, action items, and timestamp so the user can revisit prior weekly guidance without regenerating it every time.
- The ask-coach prompt can remain local in MVP, unless product later wants a saved conversation history.

## Configuration Questions

- Should the coach focus more on training, nutrition, or a balanced mix? Recommendation: balanced mix with user-adjustable focus.
- Should weekly summaries auto-generate or be generated only when the user opens the coach page? Recommendation: generate on demand first, then cache.
- Should prior coach responses be saved in Firestore or kept local? Recommendation: cache weekly snapshots only if needed; keep chat-style history local for MVP.
- How detailed should coach responses be? Recommendation: short, actionable, and specific by default.

## Deliverables

- Coach page with progress visualization.
- Weekly summary and insights.
- Streak-focused supporting UI.
- A lightweight ask-coach surface for user questions.

## Acceptance Criteria

- A user can review trends and see a summary of the current week.
- Charts and summaries render without blocking the rest of the app.
- The coach can answer simple contextual questions using the user's own data.

## Constraints

- Keep the analytics layer data-driven and easy to audit.
- Prefer readable summaries over dense dashboard clutter.
