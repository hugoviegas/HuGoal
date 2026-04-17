oncluiu 4 etapas
Tenho uma visão completa do projeto agora. Gero o prompt.

## text

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

Preparado usando Claude Sonnet 4.6 Thinking
Agora temos um problema, a IA ainda não sabe como pegar os exercícios, provavelmente a ia esta criando uma ficha porém os exercícios não estão no sistema, então precisamos fazer com que a ia saiba de todos os exercícios existentes no app e como selecionar eles corretamente, como organizar em rounds, como colocar o tempo de rest entre cada set e cada round.

Então nós temos um arquivo com todos os exercícios do sistema, e temos um sistema que cria planos de treino, e gera um arquivo e salva no banco de dados.
Agora e entender como a ia vai interagir com o backend disso e saber o que fazer, podemos gerar um modelo exemplo, com warmup, 2 rounds e um cooldown, usando exercícios com peso, sem peso e com tempos, incluindo tempo de preparação.

Mas antes preciso saber se esta tudo configurado corretamente no banco de dados e na criação do plano.

---

Veja o repo novamente:
https://github.com/hugoviegas/HuGoal/tree/preview
Concluiu 9 etapas
Tenho tudo o que preciso. Agora gero o prompt completo com diagnóstico + exemplo de template + solução para o AI saber os exercícios.

## text

# Prompt: Workout Coach AI — Exercise Catalog Integration + Template Schema Reference

## 🎯 Goal

Give the Workout Coach AI full knowledge of the exercise catalog (IDs, equipment, muscles, execution modes), teach it the exact `WorkoutTemplateRecord` schema to produce valid templates, and provide a canonical example template to use as a reference for all AI-generated workouts.

---

## 🧠 Context

**Stack:** React Native + Expo + TypeScript + Firebase/Firestore  
**Branch:** `preview`

### Exercise Catalog

- **Source:** `lib/workouts/generated/official-exercises.ts` — bundled at build time (~2.4MB), ~900+ exercises
- **Type:** `OfficialExerciseRecord` (from `exercise-cache.ts` and `exercise-catalog.ts`)
- **Schema per exercise:**

```ts
interface OfficialExerciseRecord {
  id: string; // e.g. "barbell_bench_press"
  name: string; // e.g. "Barbell Bench Press"
  category: string; // "strength" | "cardio" | "stretching" | ...
  source_category: string;
  source_equipment: string; // raw string: "barbell", "body only", "dumbbell"...
  equipment: EquipmentType[]; // normalized: ["barbell"] | ["bodyweight"] | ...
  primary_muscles: string[]; // e.g. ["chest", "triceps"]
  secondary_muscles: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  type: string; // "compound" | "isolation" | "static" | ...
  remote_image_urls?: string[];
}
```

### Template Schema (Firestore: `workout_templates`)

```ts
interface WorkoutTemplateRecord {
  id: string; // auto-generated Firestore ID
  user_id: string;
  name: string;
  description?: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  is_ai_generated: boolean;
  exercises: WorkoutTemplateExerciseRecord[]; // LEGACY flat list
  sections?: WorkoutTemplateSectionRecord[]; // PREFERRED: structured sections
  target_muscles?: string[];
  estimated_duration_minutes: number;
  location?: string;
  tags: string[];
  is_active?: boolean;
  is_public?: boolean;
  is_draft?: boolean;
  created_at: string;
  updated_at: string;
}

interface WorkoutTemplateSectionRecord {
  id: string; // unique per section, e.g. "warmup", "round_1"
  type: "warmup" | "round" | "cooldown";
  name: string; // display name
  order: number; // 0, 1, 2...
  blocks: WorkoutTemplateBlockRecord[];
}

interface WorkoutTemplateBlockRecord {
  id: string; // unique per block, e.g. "block_1"
  type: "exercise" | "rest";
  order: number;
  // --- for type === "exercise" ---
  exercise_id?: string; // MUST match an id from official-exercises
  name?: string; // display name (copy from OfficialExerciseRecord.name)
  execution_mode?: "reps" | "time";
  reps?: string; // e.g. "12" or "10-12" — when execution_mode = "reps"
  exercise_seconds?: number; // work time in seconds — when execution_mode = "time"
  prep_seconds?: number; // countdown before work starts (optional)
  weight_kg?: number; // suggested weight (optional)
  primary_muscles?: string[]; // copy from OfficialExerciseRecord
  secondary_muscles?: string[];
  notes?: string;
  // --- for type === "rest" ---
  rest_seconds?: number; // rest block duration
  duration_seconds?: number; // alias for rest_seconds in rest blocks
}
```

### Key Rules the AI MUST follow

1. `exercise_id` must be a valid ID from the `official-exercises` catalog — never invented
2. Always include `name` in every block (copy from catalog)
3. Always include `primary_muscles` in every exercise block (copy from catalog)
4. `execution_mode` is required on every exercise block
5. Rest between sets is a `type: "rest"` block inserted after each exercise block within a round
6. Rest between rounds is a `type: "rest"` block at the end of each round section
7. `sections` is ALWAYS preferred over `exercises` — if both are provided, `sections` takes priority in the UI
8. `flattenWorkoutSections()` auto-populates `exercises[]` from sections on save — AI does not need to set both
9. Section `order` starts at 0, block `order` starts at 0 within each section

---

## ✅ Task

### Step 1 — Build AI-Accessible Exercise Index

- [ ] Create `lib/workouts/workout-ai-catalog.ts`
- [ ] Export `buildAICatalogIndex(exercises: CachedLibraryExercise[]): AIExerciseIndex`
- [ ] `AIExerciseIndex` is a compact lookup structure:

```ts
interface AIExerciseEntry {
  id: string;
  name: string;
  equipment: string; // primary equipment label
  muscles: string[]; // primary_muscles only
  category: string; // "strength" | "cardio" | "stretching" | ...
  level: string; // difficulty
  mode: "reps" | "time"; // inferred: stretching/cardio → "time", else "reps"
}

type AIExerciseIndex = {
  byId: Record<string, AIExerciseEntry>;
  byMuscle: Record<string, string[]>; // muscle → [exercise_ids]
  byEquipment: Record<string, string[]>; // equipment → [exercise_ids]
};
```

- [ ] Execution mode inference rule:
  ```ts
  function inferExecutionMode(ex: CachedLibraryExercise): "reps" | "time" {
    if (["stretching", "cardio", "plyometrics"].includes(ex.category))
      return "time";
    if (ex.type === "static") return "time";
    return "reps";
  }
  ```
- [ ] Export `getAICatalogIndex(): AIExerciseIndex` — lazy-loads from `loadExerciseCache()`, cached in module scope

---

### Step 2 — Inject Exercise Knowledge into AI System Prompt

- [ ] Update `lib/ai/workoutChatAI.ts` — update system prompt to include:
      EXERCISE CATALOG RULES
      You must ONLY use exercise_ids from the official catalog. NEVER invent exercise IDs.
      When the user's equipment list is provided, only select exercises compatible with that equipment.

When creating or modifying a workout, follow these rules:

Warmup: use exercises from category "stretching" or tag "warmup", execution_mode = "time" (30-45s), prep_seconds = 5

Rounds: use strength/calisthenics exercises matching the target muscles and user equipment

Cooldown: use exercises from category "stretching", type = "static", execution_mode = "time" (30-60s)

Rest blocks: insert a rest block (type: "rest") after each exercise block within a round

Round rest: insert a rest block at the end of each round section (rest_seconds = 60-90)

Always set execution_mode on every exercise block

Always copy name and primary_muscles from the catalog entry

Respond with the complete template JSON inside <workout_template> tags.
The JSON must conform exactly to WorkoutTemplateRecord schema.

text

- [ ] Inject exercise index as a filtered subset — NOT the full 900+ exercises
- [ ] Filter strategy: inject only exercises matching `user_equipment` + `target_muscles` from `WorkoutSessionContext`
- [ ] Function: `buildAIExerciseSubset(index: AIExerciseIndex, equipment: string[], muscles: string[], maxPerMuscle = 8): AIExerciseEntry[]`
- [ ] This keeps the injected list under ~100 exercises (~2K tokens max)
- [ ] Inject as:
      AVAILABLE EXERCISES (use ONLY these IDs)
      <exercise_catalog>
      [{ "id": "...", "name": "...", "equipment": "...", "muscles": [...], "mode": "reps|time" }, ...]
      </exercise_catalog>

text

---

### Step 3 — Canonical Example Template (AI Reference)

The following example must be included in the AI system prompt as `<example_template>`:

```json
{
  "name": "Full Body Strength -  45min",
  "description": "Warmup, 2 rounds of compound + bodyweight exercises, cooldown.",
  "difficulty": "intermediate",
  "is_ai_generated": true,
  "estimated_duration_minutes": 45,
  "location": "gym",
  "tags": ["strength", "full_body", "ai_generated"],
  "exercises": [],
  "sections": [
    {
      "id": "warmup",
      "type": "warmup",
      "name": "Warmup",
      "order": 0,
      "blocks": [
        {
          "id": "block_w1",
          "type": "exercise",
          "order": 0,
          "exercise_id": "arm_circles",
          "name": "Arm Circles",
          "execution_mode": "time",
          "exercise_seconds": 30,
          "prep_seconds": 5,
          "primary_muscles": ["shoulders"],
          "secondary_muscles": []
        },
        {
          "id": "block_w2",
          "type": "exercise",
          "order": 1,
          "exercise_id": "leg_swings",
          "name": "Leg Swings",
          "execution_mode": "time",
          "exercise_seconds": 30,
          "prep_seconds": 5,
          "primary_muscles": ["hamstrings", "hip_flexors"],
          "secondary_muscles": []
        }
      ]
    },
    {
      "id": "round_1",
      "type": "round",
      "name": "Round 1",
      "order": 1,
      "blocks": [
        {
          "id": "block_r1_e1",
          "type": "exercise",
          "order": 0,
          "exercise_id": "barbell_squat",
          "name": "Barbell Squat",
          "execution_mode": "reps",
          "reps": "10-12",
          "weight_kg": 60,
          "primary_muscles": ["quadriceps", "glutes"],
          "secondary_muscles": ["hamstrings", "core"]
        },
        {
          "id": "block_r1_rest1",
          "type": "rest",
          "order": 1,
          "rest_seconds": 45
        },
        {
          "id": "block_r1_e2",
          "type": "exercise",
          "order": 2,
          "exercise_id": "push_ups",
          "name": "Push Ups",
          "execution_mode": "reps",
          "reps": "12-15",
          "primary_muscles": ["chest", "triceps"],
          "secondary_muscles": ["shoulders", "core"]
        },
        {
          "id": "block_r1_rest2",
          "type": "rest",
          "order": 3,
          "rest_seconds": 45
        },
        {
          "id": "block_r1_e3",
          "type": "exercise",
          "order": 4,
          "exercise_id": "plank",
          "name": "Plank",
          "execution_mode": "time",
          "exercise_seconds": 45,
          "prep_seconds": 3,
          "primary_muscles": ["core"],
          "secondary_muscles": ["shoulders", "glutes"]
        },
        {
          "id": "block_r1_round_rest",
          "type": "rest",
          "order": 5,
          "rest_seconds": 90,
          "notes": "Rest between rounds"
        }
      ]
    },
    {
      "id": "round_2",
      "type": "round",
      "name": "Round 2",
      "order": 2,
      "blocks": [
        {
          "id": "block_r2_e1",
          "type": "exercise",
          "order": 0,
          "exercise_id": "barbell_squat",
          "name": "Barbell Squat",
          "execution_mode": "reps",
          "reps": "10-12",
          "weight_kg": 60,
          "primary_muscles": ["quadriceps", "glutes"],
          "secondary_muscles": ["hamstrings", "core"]
        },
        {
          "id": "block_r2_rest1",
          "type": "rest",
          "order": 1,
          "rest_seconds": 45
        },
        {
          "id": "block_r2_e2",
          "type": "exercise",
          "order": 2,
          "exercise_id": "push_ups",
          "name": "Push Ups",
          "execution_mode": "reps",
          "reps": "12-15",
          "primary_muscles": ["chest", "triceps"],
          "secondary_muscles": ["shoulders", "core"]
        },
        {
          "id": "block_r2_rest2",
          "type": "rest",
          "order": 3,
          "rest_seconds": 45
        },
        {
          "id": "block_r2_e3",
          "type": "exercise",
          "order": 4,
          "exercise_id": "plank",
          "name": "Plank",
          "execution_mode": "time",
          "exercise_seconds": 45,
          "prep_seconds": 3,
          "primary_muscles": ["core"],
          "secondary_muscles": ["shoulders", "glutes"]
        }
      ]
    },
    {
      "id": "cooldown",
      "type": "cooldown",
      "name": "Cooldown",
      "order": 3,
      "blocks": [
        {
          "id": "block_c1",
          "type": "exercise",
          "order": 0,
          "exercise_id": "standing_quad_stretch",
          "name": "Standing Quad Stretch",
          "execution_mode": "time",
          "exercise_seconds": 30,
          "prep_seconds": 5,
          "primary_muscles": ["quadriceps"],
          "secondary_muscles": []
        },
        {
          "id": "block_c2",
          "type": "exercise",
          "order": 1,
          "exercise_id": "seated_forward_bend",
          "name": "Seated Forward Bend",
          "execution_mode": "time",
          "exercise_seconds": 45,
          "prep_seconds": 0,
          "primary_muscles": ["hamstrings", "lower_back"],
          "secondary_muscles": []
        }
      ]
    }
  ]
}
```

---

### Step 4 — Template Validation Before Save

- [ ] Create `lib/workouts/workout-template-validator.ts`
- [ ] Export `validateAITemplate(raw: unknown, catalogIndex: AIExerciseIndex): { valid: boolean; errors: string[]; sanitized?: WorkoutTemplateInput }`
- [ ] Validations:
  - Every exercise block has `exercise_id` that exists in `catalogIndex.byId`
  - Every exercise block has `execution_mode` set
  - Every section has `type` in `["warmup", "round", "cooldown"]`
  - `estimated_duration_minutes` is a positive number
  - At least 1 round section exists
  - Block `order` values are sequential within each section (auto-fix if not)
  - `name` is auto-filled from catalog if missing
  - `primary_muscles` is auto-filled from catalog if missing
- [ ] If `valid: false`, return errors to chat as:
      appendChat({ type: "ai_response", text: ⚠️ Template validation failed: ${errors.join(", ")}. Please try again. })

text

---

### Step 5 — DB Verification Checklist

Before AI integration works end-to-end, verify the following in Firestore:

- [ ] **`workout_templates` collection:** confirm `sections[]` field is being written (not just `exercises[]`)
- In `createWorkoutTemplate`: ✅ `sections` is in the payload — confirmed in `lib/firestore/workouts.ts`
- In `updateWorkoutTemplate`: ✅ uses `setDoc merge:true` — patch with `sections` will update correctly
- [ ] **`flattenWorkoutSections` is called on create:** ✅ confirmed — `exercises[]` auto-populated from sections
- [ ] **`sanitizeRecord` strips undefined:** ✅ confirmed — `rest_seconds: undefined` won't break Firestore
- [ ] **`source_type` for chat actions:** already defined in `WorkoutDailyOverrideRecord`:
- `"chat_patch_workout"` ✅
- `"chat_create_workout"` ✅
- `"chat_substitute_exercise"` ✅
- [ ] **Missing:** `updateWorkoutTemplate` in `lib/firestore/workouts.ts` receives `sections` in the patch — verify `WorkoutTemplateInput` includes `sections?: WorkoutTemplateSectionRecord[]` ✅ confirmed

**⚠️ Gap found:** `WorkoutSessionContext` (in `workout-session-context.ts`) strips `rest_seconds` from blocks — rest blocks (`type: "rest"`) are filtered out before sending to AI. Fix:

- [ ] In `buildWorkoutSessionContext`, include rest blocks in sections:

```ts
blocks: section.blocks
.sort((a, b) => a.order - b.order)
.map((b) => {
  if (b.type === "rest") {
    return { type: "rest", order: b.order, rest_seconds: b.rest_seconds ?? b.duration_seconds ?? 60 };
  }
  return { exercise_id: b.exercise_id!, name: b.name, ... };
})
```

This way the AI knows what rest periods already exist before modifying.

---

## 📤 Expected Output

| File                                         | Action                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| `lib/workouts/workout-ai-catalog.ts`         | ✅ Create                                                                |
| `lib/workouts/workout-template-validator.ts` | ✅ Create                                                                |
| `lib/ai/workoutChatAI.ts`                    | ✅ Update — inject exercise subset + example template + validation rules |
| `lib/workouts/workout-session-context.ts`    | ✅ Fix — include rest blocks in sections output                          |

## ⚙️ Constraints

- Never send full 900+ exercise list to AI — always filter by user equipment + target muscles first
- AI exercise subset max: 100 entries (~2K tokens)
- Example template is injected as a constant string in the system prompt — not re-fetched per message
- `exercise_id` values in example must be real IDs from `official-exercises.ts` — replace the placeholder IDs above with verified real IDs from the catalog before implementing
- Validation must run BEFORE any Firestore write — never save an invalid AI template

## 🤖 Suggested Claude Skill / Agent

## Tool Use (read `official-exercises.ts` first to pick real IDs) | Artifact > Code Generation | Multi-step Reasoning
