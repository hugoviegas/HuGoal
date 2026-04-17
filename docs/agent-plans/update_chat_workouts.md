---
# Prompt: Workout Coach Chat — Full System Design & Phased Implementation Plan

## 🎯 Goal
Replace the `AdaptWorkout` module entirely with a `WorkoutChat` AI coach panel — identical in design to `NutritionChat` — capable of reading workout context, executing actions (edit, create, adapt, substitute exercises), and supporting `/` command shortcuts.
---

## 🧠 Context

**Repo:** `hugoviegas/HuGoal` — branch `preview`  
**Stack:** React Native + Expo + TypeScript + Firebase/Firestore + `lib/ai-provider.ts`

**Current state to remove (full cleanup, no dead code allowed):**

- `lib/workouts/adapt-workout.ts` — `buildDifficultyAdjustedExercises`, `buildTimeAdjustedExercises`, `filterTemplatesForLocation`, `selectBestTemplateForWorkoutType`
- All imports and usages in `app/(tabs)/workouts/index.tsx`
- Remove from `workouts/index.tsx`: `handleChangeWorkoutType`, `handleAdjustWorkoutTime`, `handleChangeDifficulty`, `handleUseAnotherLocation`, `handleResetTodayAdaptations`, `applyTemplateOverride` (partially — keep the Firestore write logic, extract to a standalone util)
- Remove: old bottom panel `Animated.View` (collapsed + expanded adapt options), `panelPanResponder`, `panelHeight`, `COLLAPSED_H`, `EXPANDED_H`, `panelExpanded`, `panelExpandedRef`, `panelBaseHRef`, `adaptContentOpacity`, `backdropOpacity`, all web panel touch handlers

**Reference for chat panel pattern:**

- `components/nutrition/NutritionChat.tsx` — full panel component
- `components/nutrition/ChatInputBar.tsx` — input bar
- `hooks/useNutritionChatPanel` (inside `NutritionChat.tsx`) — panel animation hook
- `lib/ai/nutritionChatAI.ts` — AI call pattern
- `lib/firestore/nutritionChat.ts` — chat persistence pattern

**Workout context sources (always send to AI):**

- `profile.workout_settings` — training_days, locations, equipment_by_location, difficulty, goals
- `todayWorkout` (WorkoutTemplateRecord) — full template JSON with exercises, sets, reps, muscleGroups, sections
- `todayOverride` — if set, current day adaptation override
- `completedDates` — streak/history context
- `profile` — age, weight, height, fitness_goal, preferred_ai_provider
- User memories (future: `users/{uid}/memories` collection — scaffold now, implement later)

---

## ✅ Task

### PHASE 1 — Cleanup: Remove `AdaptWorkout` module

- [ ] Delete `lib/workouts/adapt-workout.ts` entirely
- [ ] Remove ALL imports of `adapt-workout` across the codebase (run search: `import.*adapt-workout`)
- [ ] In `workouts/index.tsx`: remove the 5 handler functions and the old bottom panel (see list above)
- [ ] Extract `applyTemplateOverride` core logic (the Firestore `upsertWorkoutDailyOverride` write + state update) into `lib/workouts/workout-daily-override.ts` — export as `applyDailyOverride(uid, template, extra, callbacks)`
- [ ] Verify no TypeScript errors, no unused imports, no `any` introduced
- [ ] Add comment at top of `workouts/index.tsx`: `// AdaptWorkout module removed — Phase: Workout Chat Migration (Apr 2026)`

---

### PHASE 2 — Workout Session JSON Shape

**Decision: Hybrid local cache + Firestore sync**

The workout template data lives in Firestore (`WorkoutTemplateRecord`). For the AI chat to read and modify templates efficiently:

- [ ] Create `lib/workouts/workout-session-context.ts`
- [ ] Export function `buildWorkoutSessionContext(template: WorkoutTemplateRecord, profile: Profile, todayOverride: WorkoutDailyOverrideRecord | null): WorkoutSessionContext`
- [ ] `WorkoutSessionContext` type:

```ts
interface WorkoutSessionContext {
  template_id: string;
  template_name: string;
  difficulty: string;
  estimated_duration_minutes: number;
  location: string | undefined;
  target_muscles: string[];
  sections: {
    name: string;
    type: string;
    blocks: {
      exercise_id: string;
      name: string;
      sets: number;
      reps: string;
      execution_mode: string;
      primary_muscles: string[];
      prescription: string;
    }[];
  }[];
  user_equipment: string[]; // from profile.workout_settings.equipment_by_location[activeLocation]
  user_locations: string[]; // from profile.workout_settings.locations
  user_training_days: number[]; // 0=Mon...6=Sun
  user_fitness_goal: string;
  today_override: { source_type: string; manually_set: boolean } | null;
}
```

- [ ] This object is serialized as JSON and injected into the AI system prompt on every chat message
- [ ] Keep it compact — strip null values before serializing

---

### PHASE 3 — WorkoutChat Component

- [ ] Create `components/workouts/WorkoutChat.tsx`
  - Mirror `NutritionChat.tsx` structure exactly (drag handle, panel animation, message list, input bar)
  - Use `useWorkoutChatPanel` hook (create `hooks/useWorkoutChatPanel.ts` — mirror `useNutritionChatPanel`)

- [ ] Create `components/workouts/WorkoutChatInputBar.tsx`
  - **Remove:** microphone/audio button
  - **Keep:** text input (same style as `ChatInputBar`)
  - **Add left:** paperclip icon (Paperclip from lucide) — opens file picker: accepts `.json`, `.csv`, `.pdf`, `.txt` — scaffold only, parse in Phase 4
  - **Add right:** send button (ArrowUp icon, teal fill — same as nutrition send)
  - **`/` command menu:** when input starts with `/`, render a floating suggestion list above the input bar:

```ts
const SLASH_COMMANDS = [
  {
    command: "/change-workout-time",
    description: "Shorten or lengthen today's session",
  },
  {
    command: "/substitute-exercise",
    description: "Replace an exercise with an alternative",
  },
  { command: "/change-difficulty", description: "Make today easier or harder" },
  {
    command: "/change-location",
    description: "Switch equipment/location for today",
  },
  { command: "/create-workout", description: "Build a new workout template" },
  { command: "/reset-today", description: "Reset today's adaptations" },
];
```

- Filter suggestions as user types after `/`
- Tapping a suggestion fills input with command text

- [ ] `WorkoutChat` props:

```ts
interface WorkoutChatProps {
  messages: WorkoutChatMessage[];
  isLoading: boolean;
  onSendText: (
    text: string,
    attachments?: WorkoutChatAttachment[],
  ) => Promise<void>;
  onFileAttached?: (file: WorkoutChatAttachment) => void;
  sessionContext: WorkoutSessionContext;
  expanded: boolean;
  onTogglePanel: () => void;
  panelContentOpacity: Animated.Value;
  composerBottomOffset: number;
  disabled?: boolean;
  disabledReason?: string;
}
```

---

### PHASE 4 — AI Integration (`lib/ai/workoutChatAI.ts`)

- [ ] Create `lib/ai/workoutChatAI.ts`
- [ ] Export `analyzeWorkoutChatMessage(input: WorkoutChatAIInput): Promise<WorkoutChatAIResponse>`

**System prompt strategy — inject `WorkoutSessionContext` as JSON block:**
You are a personal workout coach AI. You know the user's complete workout profile and active session.

USER CONTEXT:
<workout_context>
{JSON.stringify(sessionContext, null, 0)}
</workout_context>

Rules:

Always reference the user's current equipment, location, and available exercises

When modifying a workout, return the full updated template as JSON in a <workout_patch> block

When creating a new workout, return full template JSON in a <new_workout> block

When substituting exercises, validate against user's equipment list

Use workout_context.user_fitness_goal to calibrate intensity

Be concise in chat responses. Explain changes in 1-2 sentences max.

text

- [ ] AI response parsing: detect `<workout_patch>` or `<new_workout>` blocks in response text — extract, validate, return as structured `WorkoutChatAIResponse.patch`
- [ ] `WorkoutChatAIResponse` type:

```ts
interface WorkoutChatAIResponse {
  text: string;
  action?: "patch_workout" | "create_workout" | "substitute_exercise" | "none";
  patch?: Partial<WorkoutTemplateRecord>;
  newTemplate?: Omit<WorkoutTemplateRecord, "id" | "created_at" | "updated_at">;
}
```

- [ ] Use existing `lib/ai-provider.ts` for the API call (respect `profile.preferred_ai_provider`)

---

### PHASE 5 — Action Execution in `workouts/index.tsx`

When `WorkoutChatAIResponse.action` is `patch_workout`:

- [ ] Call `updateWorkoutTemplate(uid, templateId, patch)` — use existing Firestore util
- [ ] Call `applyDailyOverride(...)` to mark today as overridden
- [ ] Re-run `loadData()` to refresh UI
- [ ] Show success toast

When action is `create_workout`:

- [ ] Call `createWorkoutTemplate(uid, newTemplate)`
- [ ] Add to `workouts` state
- [ ] Show confirmation message in chat + toast

When action is `substitute_exercise`:

- [ ] Patch the specific exercise block in the active template
- [ ] Apply as daily override

---

### PHASE 6 — Chat Persistence (`lib/firestore/workoutChat.ts`)

- [ ] Create `lib/firestore/workoutChat.ts`
- [ ] Mirror `lib/firestore/nutritionChat.ts` exactly
- [ ] Export: `loadTodayWorkoutChatMessages(uid)` and `saveTodayWorkoutChatMessages(uid, messages)`
- [ ] Collection: `users/{uid}/workout_chat/{dateKey}`
- [ ] Messages reset at midnight (same pattern as nutrition)

---

### PHASE 7 — Workout Store (`stores/workout.store.ts`)

- [ ] Add to workout store:

```ts
chatMessages: WorkoutChatMessage[];
setChatMessages: (messages: WorkoutChatMessage[]) => void;
addChatMessage: (message: WorkoutChatMessage) => void;
```

- [ ] `WorkoutChatMessage` type (in `stores/workout.store.ts`):

```ts
interface WorkoutChatMessage {
  id: string;
  type:
    | "user_text"
    | "ai_response"
    | "ai_workout_patch"
    | "ai_new_workout"
    | "user_file";
  text: string;
  createdAt: string;
  payload?: {
    patch?: Partial<WorkoutTemplateRecord>;
    newTemplate?: Partial<WorkoutTemplateRecord>;
    file?: { localUri: string; name: string; mimeType: string };
  };
}
```

---

### PHASE 8 — User Memories (Scaffold)

- [ ] Create `lib/firestore/userMemories.ts`
- [ ] Firestore path: `users/{uid}/memories/{memoryId}`
- [ ] Type:

```ts
interface UserMemory {
  id: string;
  category: "workout" | "nutrition" | "general";
  content: string;
  created_at: string;
  updated_at: string;
}
```

- [ ] Export: `listMemories(uid, category?)`, `createMemory(uid, memory)`, `deleteMemory(uid, id)`
- [ ] Inject relevant memories (category: `workout`) into AI system prompt as an additional context block
- [ ] No UI yet — scaffold only

---

### PHASE 9 — Wire Everything in `workouts/index.tsx`

- [ ] Replace old bottom panel with:

```tsx
<Animated.View /* backdrop */ />
<Animated.View style={{ ...panelStyle }} {...panelPanHandlers}>
  <WorkoutChat
    messages={chatMessages}
    isLoading={sendingChat}
    onSendText={handleSendWorkoutMessage}
    sessionContext={workoutSessionContext}
    expanded={panelExpanded}
    onTogglePanel={togglePanel}
    panelContentOpacity={panelContentOpacity}
    composerBottomOffset={composerBottomPadding}
  />
</Animated.View>
```

- [ ] `workoutSessionContext` = `useMemo(() => buildWorkoutSessionContext(todayWorkout, profile, todayOverride), [todayWorkout, profile, todayOverride])`
- [ ] `handleSendWorkoutMessage`: calls `analyzeWorkoutChatMessage`, dispatches action, persists messages
- [ ] Load chat on focus: `loadTodayWorkoutChatMessages`
- [ ] Save chat on change: `saveTodayWorkoutChatMessages`

---

## 📤 Expected Output

| File                                          | Action                        |
| --------------------------------------------- | ----------------------------- |
| `lib/workouts/adapt-workout.ts`               | ❌ Delete                     |
| `lib/workouts/workout-session-context.ts`     | ✅ Create                     |
| `lib/workouts/workout-daily-override.ts`      | ✅ Create (extracted logic)   |
| `lib/ai/workoutChatAI.ts`                     | ✅ Create                     |
| `lib/firestore/workoutChat.ts`                | ✅ Create                     |
| `lib/firestore/userMemories.ts`               | ✅ Create (scaffold)          |
| `components/workouts/WorkoutChat.tsx`         | ✅ Create                     |
| `components/workouts/WorkoutChatInputBar.tsx` | ✅ Create                     |
| `hooks/useWorkoutChatPanel.ts`                | ✅ Create                     |
| `stores/workout.store.ts`                     | ✅ Update (add chat messages) |
| `app/(tabs)/workouts/index.tsx`               | ✅ Heavy update               |

---

## ⚠️ AI Context Strategy Decision (recommended)

**Use structured text injection in system prompt (not a file attachment, not a separate API call).**

Rationale:

- Gemini and OpenAI both handle large JSON in system prompts well under ~4K tokens
- `WorkoutSessionContext` serializes to ~800-1200 tokens — well within limits
- No extra API call, no file upload latency
- Easy to update (rebuild context per message from live state)
- Future: add `user_memories[]` block to same system prompt, max 5 most recent

**File attachments** (Phase 4 paperclip) are for user-initiated imports only (e.g., importing a workout from a CSV), NOT for context injection.

---

## ⚙️ Constraints

- Language: TypeScript / English comments
- Zero dead code after cleanup — verify with `grep -r "adapt-workout"` returns empty
- NativeWind for layout; inline styles for animations/dynamic values only
- No new `any` types
- All new Firestore collections must mirror existing patterns (see `lib/firestore/nutritionChat.ts`)
- Cross-file sync comment required on `WorkoutChat.tsx` and `NutritionChat.tsx`:
  // SHARED BOTTOM BAR STYLE — sync across: home, workouts, nutrition, community

text

- Slash command menu must be keyboard-aware (render above keyboard, not below)
- `WorkoutChatInputBar` must be exported and documented independently of `WorkoutChat`

## 🤖 Suggested Claude Skill / Agent

## Tool Use (read files before editing) | Artifact > Code Generation | Multi-step Reasoning
