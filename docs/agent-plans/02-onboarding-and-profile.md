# Phase 02 - Onboarding and Profile

## Suggested specialization

Onboarding and profile agent (can parallelize into multiple sub-agents per phase).

## Objective

Collect the user profile through a 4-step onboarding flow with real-time validation, persist to Firestore with 3x automatic retry, and provide editable profile surfaces. Include unique username (3-20 chars, a-zA-Z0-9\_, immutable), optional avatar upload to Firebase Storage, local AsyncStorage draft recovery, and separate read-only profile tab + editable settings screen.

## Current Starting Point

- The `UserProfile` type already contains onboarding fields BUT **missing**: `username`, `onboarding_complete`, `username_changed_at`.
- Auth state exists with profile fetch, but onboarding and profile screens do not exist yet.
- No components for FormStepper, UsernameAvailability, or DietaryPreferencePicker yet.

## Screens and Routes

### Onboarding Flow (New User Path)

- `app/(auth)/onboarding/_layout.tsx` — FormStepper wrapper with progress bar, prev/next/skip buttons, retry logic
- `app/(auth)/onboarding/personal.tsx` — name, username (unique check), avatar (optional + upload), age, sex, height_cm, weight_kg
- `app/(auth)/onboarding/goals.tsx` — goal selection (lose_fat | gain_muscle | maintain | recomp), target_timeline
- `app/(auth)/onboarding/experience.tsx` — level (beginner | intermediate | advanced), equipment (home | gym | none), available_days_per_week (1-7 slider), injuries text
- `app/(auth)/onboarding/diet.tsx` — allergies, dietary_restrictions, preferred_cuisines (hybrid: predefined chips + custom input)

### Profile Screens (Post-Onboarding)

- `app/(tabs)/profile/index.tsx` — Read-only profile view: name, @username, avatar, bio, stats (xp, streak), Edit button → settings/profile-edit.tsx
- `app/settings/profile-edit.tsx` — Editable: name, avatar (reupload), bio, age, height, weight, sex, allergies, restrictions, cuisines. Username shown with "0/1 changes left this month" warning (if attempting to change).

## Step-by-Step Work (6 Phases, Parallelizable)

### PHASE 1: Setup & Schema (Parallel: 1.1 ↔ 1.2 ↔ 1.3)

1. **1.1** Update `types/index.ts` — Add to UserProfile: `username: string`, `onboarding_complete: boolean`, `username_changed_at?: string`
2. **1.2** Create `lib/validation/schemas.ts` — Two separate Zod schemas:
   - `onboardingSchema` (all 4 steps with partial validation per step)
   - `profileEditSchema` (only editable fields after onboarding)
   - `usernameSchema` (3-20 chars, a-zA-Z0-9\_, not in reserved list)
3. **1.3** Create `lib/username.ts` — Validation utilities:
   - `validateUsernameFormat(str): boolean`
   - `checkUsernameAvailable(username): Promise<boolean>` (Firestore query + 5min cache)
   - `isReservedUsername(username): boolean`
   - Reserved list: `admin, system, root, api, app, support, help, info, test, demo`
4. **1.4** Update `firestore.rules` — Add rules for `profiles/{uid}` write (required fields check) and `usernames/{username}` read

### PHASE 2: Components (Fully Parallelizable)

1. **2.1** Create `components/ui/FormStepper.tsx` — Reusable multi-step form:
   - Props: `steps: {id, title, description}[]`, `currentStep`, `onStepChange`, `onComplete`, `canSkip`, `isLoading`
   - Features: progress bar, prev/next/skip buttons, auto-scroll to top
   - Emit `onStepValidate(index)` callback before advancing
2. **2.2** Extend `components/ui/Avatar.tsx` — Add upload mode:
   - Props: `mode: 'view' | 'upload'`, `onUpload?: (url) => void`, `isUploading?: boolean`
   - Firebase Storage upload → return URL
   - Show loading spinner during upload, error toast on fail
   - Fallback: initials from name if no avatar_url
3. **2.3** Create `components/ui/UsernameAvailability.tsx` — Real-time username check input:
   - Extends Input with debounced (500ms) Firestore check
   - Show status: ✓ (available) | ✗ (taken) | ⏳ (checking) | ✗ (invalid format)
   - Props: `value`, `onChange`, `error`, `isAvailable`, `isLoading`
4. **2.4** Create `components/ui/DietaryPreferencePicker.tsx` — Hybrid selector:
   - Predefined chips (vegan, vegetarian, gluten-free, dairy-free, etc)
   - Custom input below for user-added items
   - Multi-select, return `string[]`
   - Props: `value`, `onChange`, `category: 'allergies' | 'restrictions' | 'cuisines'`

### PHASE 3: Hooks & Local State (Parallel: 3.1 ↔ 3.2)

1. **3.1** Create `hooks/useOnboardingDraft.ts` — AsyncStorage draft management:
   - `loadDraft()` → fetch onboarding_draft:{uid} from AsyncStorage
   - `saveDraft(step, data)` → save step data atomically
   - `clearDraft()` → delete on success
   - Auto-save on each step + app backgrounding
2. **3.2** Create `hooks/useUsernameCheck.ts` — Debounced Firestore query:
   - Params: `username: string`
   - Returns: `{ isAvailable: bool, isLoading: bool, error?: string, isFormatValid: bool }`
   - Cache valid results for 5min
   - Debounce 500ms before query

### PHASE 4: Screens (Depends on Phase 2, Internal Parallelizable)

1. **4.1** Create `app/(auth)/onboarding/_layout.tsx` — FormStepper wrapper:
   - Manage currentStep, formData (from draft or empty)
   - Call `Zod.parse()` before advancing per step
   - On "Skip" → show warning modal → confirm → continue
   - On "Complete" → validate all required → call saveProfileToFirestore() (Phase 5.1)
   - Show retry button if save fails (draft kept locally)
2. **4.2-4.5** Create four step screens:
   - **personal.tsx**: name, username (with UsernameAvailability), avatar (upload optional), age, sex, height, weight
   - **goals.tsx**: goal radio buttons, target_timeline slider/input
   - **experience.tsx**: level dropdown, equipment checkboxes, available_days_per_week (1-7 slider)
   - **diet.tsx**: Use DietaryPreferencePicker for allergies, restrictions, cuisines

3. **4.6** Create `app/(tabs)/profile/index.tsx` — Read-only profile:
   - Display: name, @username, avatar, bio, xp, streak_current, streak_longest
   - Edit button → navigate to settings/profile-edit.tsx
   - Logout button (top-right)
   - Load from auth.store.profile
4. **4.7** Create `app/settings/profile-edit.tsx` — Editable profile:
   - Use profileEditSchema (Zod)
   - Prefill from current profile
   - Edit: name, avatar, bio, age, height, weight, sex, allergies, restrictions, cuisines
   - Username: show current + "0/1 changes left this month" warning if editing (blocked if no changes left)
   - Save → call saveProfileToFirestore() with retry
   - Show success/error toast

### PHASE 5: Backend Logic (Depends on Phase 1)

1. **5.1** Create `lib/firestore/profile.ts` — Core save function:

   ```ts
   saveProfileToFirestore(uid: string, profile: UserProfile, draft: any): Promise<void>
   - Validate profile against Zod schema
   - Firestore writeBatch():
     - setDoc(profiles/{uid}, profile + onboarding_complete=true)
     - setDoc(usernames/{username}, {uid, reserved: false})
   - Retry logic: 3 attempts with exponential backoff (1s, 2s, 4s)
   - On success: clear draft + return
   - On failure: keep draft, throw error
   ```

2. **5.2** Create `lib/firestore/username.ts` — Username reservation:
   - `reserveUsername(username, uid)` — part of batch in 5.1
   - Check if username/{username} exists, write atomically
   - Prevent race conditions via Firestore transaction or Cloud Function

3. **5.3** _OPTIONAL_ Cloud Function `functions/onProfileWrite.ts`:
   - Trigger: profiles/{uid} write
   - Ensure usernames/{username} atomically updated
   - Rollback if conflicts

### PHASE 6: Navigation & Integration (Depends on Phase 5)

1. **6.1** Update `app/_layout.tsx` — Add routing guards:
   - Fetch onboarding_complete from auth.store
   - If !authenticated → (auth) screens
   - If authenticated && !onboarding_complete → (auth)/onboarding
   - If authenticated && onboarding_complete → (tabs)
   - On profile fetch fail: show retry screen

2. **6.2** Update `app/(auth)/_layout.tsx` — Android back handling:
   - Disable back button in onboarding (show warning if user tries)
   - Allow back from profile screens (settings)

3. **6.3** Update `stores/auth.store.ts` — Extend profile cache:
   - Cache `onboarding_complete` from Firestore
   - On logout: clear profile + drafts
   - On login fail: show draft recovery option if exists

## Firestore Data Model

### `profiles/{uid}` Document Structure

```
{
  // Required (minimum to complete onboarding)
  id: string (from Auth)
  email: string (from Auth)
  name: string (from personal step)
  sex: 'male' | 'female' | 'other' (from personal step)
  goal: 'lose_fat' | 'gain_muscle' | 'maintain' | 'recomp' (from goals step)
  level: 'beginner' | 'intermediate' | 'advanced' (from experience step)
  equipment: 'home' | 'gym' | 'none' (from experience step)
  username: string (unique, 3-20 a-zA-Z0-9_, from personal step)
  onboarding_complete: boolean (set ONLY after Firestore write succeeds)
  created_at: string (ISO timestamp)

  // Optional
  avatar_url?: string (Firebase Storage URL, from personal step)
  bio?: string (from profile edit later)
  age?: number (from personal step)
  height_cm?: number (from personal step, default metric)
  weight_kg?: number (from personal step, default metric)
  available_days_per_week?: number (1-7, from experience step)
  allergies: string[] (from diet step, empty array default)
  dietary_restrictions: string[] (from diet step, empty array default)
  preferred_cuisines: string[] (from diet step, empty array default)

  // System
  xp: number (0 on creation, updated by workouts/achievements)
  streak_current: number (0 on creation)
  streak_longest: number (0 on creation)
  last_activity_date?: string
  preferred_ai_provider?: 'gemini' | 'claude' | 'openai' (set in settings later, Phase 06)
  username_changed_at?: string (timestamp, for rate-limiting changes to 1x per month/year)
  updated_at: string (ISO timestamp)
}
```

### `usernames/{username}` Reverse Lookup Collection

```
{
  uid: string (user ID who owns this username)
  reserved: boolean (true for: admin, system, root, api, app, support, etc)
  created_at: string (ISO timestamp)
}
```

### `onboarding_drafts/{uid}` Local Sync Helper (AsyncStorage Backup in Firestore)

```
{
  step_1_personal: { name, username, avatar_url, age, sex, height_cm, weight_kg }
  step_2_goals: { goal, target_timeline }
  step_3_experience: { level, equipment, available_days_per_week, injuries }
  step_4_diet: { allergies, dietary_restrictions, preferred_cuisines }
  created_at: string
  updated_at: string
  (Deleted automatically on successful profile save)
}
```

## Required Fields Summary (For MVP Compliance)

### Required to Complete Onboarding

- **name** (string)
- **email** (from Auth, auto)
- **sex** (enum: male, female, other)
- **goal** (enum: lose_fat, gain_muscle, maintain, recomp)
- **level** (enum: beginner, intermediate, advanced)
- **equipment** (enum: home, gym, none)
- **username** (3-20 chars, a-zA-Z0-9\_, unique)
- **onboarding_complete** (boolean, set to `true` after Firestore write success)

### Highly Recommended (For Better AI Generation)

- **available_days_per_week** (1-7, improves workout scheduling)

### Optional

- avatar_url, bio, age, height_cm, weight_kg, allergies, dietary_restrictions, preferred_cuisines

## Recommended Field Set (From All Four Steps)

### Personal Step

- name ⭐
- username ⭐ (NEW: unique identifier)
- avatar_url (optional, can upload later)
- age (optional)
- sex ⭐
- height_cm (optional, metric default)
- weight_kg (optional, metric default)

### Goals Step

- goal ⭐ (lose_fat, gain_muscle, maintain, recomp)
- target_timeline (optional: weeks slider, e.g., 12-52 weeks)

### Experience Step

- level ⭐ (beginner, intermediate, advanced)
- equipment ⭐ (home, gym, none; can be multiple)
- available_days_per_week (optional slider 1-7; highly recommended)
- injuries (optional: text field for movement limitations)

### Diet Step

- allergies (optional: chips + custom input)
- dietary_restrictions (optional: vegan, vegetarian, gluten-free, etc)
- preferred_cuisines (optional: Italian, Asian, Mediterranean, etc)

## Behavior Rules (Confirmed from Discussion)

### Onboarding Flow

- **Skip allowed?** YES — user can skip individual fields, NOT all-or-nothing
- **Skip warning:** Show modal explaining that personalized recommendations will be limited until profile is completed
- **Skip behavior:** Mark `onboarding_complete = true` only if ALL required fields are filled; otherwise keep in onboarding flow and warn user
- **Prefill on return:** If user logs back in with `onboarding_complete = false`, prefill from Firestore + local AsyncStorage draft

### Draft & Recovery

- **Local draft:** Save to AsyncStorage (`onboarding_draft:{uid}`) after each step change
- **Auto-save timing:** On step change + app backgrounding (via `useAppState` hook)
- **Recovery:** If app crashes mid-onboarding, prefill form with draft on next launch
- **Draft cleanup:** Delete AsyncStorage draft ONLY after successful Firestore write; keep if write fails

### Avatar Upload

- **Avatar mandatory?** NO — optional in personal step, can upload later in settings/profile-edit.tsx
- **Upload target:** Firebase Storage (path: `avatars/{uid}/{timestamp}.jpg`)
- **URL stored:** Save resulting URL to Firestore `profiles/{uid}.avatar_url`
- **Fallback:** If no avatar_url, show initials from name in Avatar component
- **Reupload:** Allowed in settings/profile-edit.tsx anytime

### Username

- **When required?** Required in personal step (step 1)
- **Format:** 3-20 characters, alphanumeric + underscore (a-zA-Z0-9\_), case-sensitive
- **Uniqueness check:** Real-time debounced (500ms) query to `usernames/{username}` collection
- **Immutable?** YES — cannot change after onboarding completion
- **Limited edits:** Can attempt change 1x per month/year if `username_changed_at` tracking enabled
- **Display:** Show as @username in profile tab (`app/(tabs)/profile/index.tsx`)
- **Reserved words:** admin, system, root, api, app, support, help, info, test, demo

### Validation & Error Handling

- **Validation library:** React Hook Form + Zod (separate schemas for onboarding vs edit)
- **Schema reuse:** NO — use `onboardingSchema` for steps, `profileEditSchema` for settings edit (different validation rules)
- **Save failure:** Show error toast + keep draft in AsyncStorage
- **Retry logic:** Automatic 3x retry with exponential backoff (1s, 2s, 4s) before showing manual retry button
- **Network offline:** Keep draft, show "Connection required" message, allow retry when online

### Profile Editing (Post-Onboarding)

- **Edit location:** `app/settings/profile-edit.tsx`
- **Editable fields:** ALL fields except email (which comes from Auth)
- **Username edit:** Cannot change (field disabled) OR can change with "0/1 changes left this month" warning
- **Save behavior:** Call `saveProfileToFirestore()` with retry logic (same as onboarding)
- **Navigation:** Edit button in `app/(tabs)/profile/index.tsx` → navigate to settings/profile-edit.tsx

### AI Provider Selection

- **When asked?** NOT during onboarding → deferred to `app/settings/ai-keys.tsx` (Phase 06)
- **Why?** Don't block onboarding completion; let user set this later when ready to generate workouts

## Data and Storage

### Firestore Collections & Rules

- Store the full private profile in `profiles/{uid}`.
- Create reverse-lookup collection `usernames/{username}` for rapid uniqueness checks and profile discovery.
- Optional: Create `onboarding_drafts/{uid}` in Firestore as backup (or keep only in AsyncStorage).
- **Firestore Rules (to implement in Phase 1.4):**

  ```
  match /profiles/{uid} {
    allow read: if request.auth.uid == uid;
    allow write: if request.auth.uid == uid
                  && request.resource.data.email != null
                  && request.resource.data.name != null
                  && request.resource.data.sex != null;
  }

  match /usernames/{username} {
    allow read: if true; // Allow public check
    allow write: if request.auth != null; // Enforce via Cloud Function or client validation
  }
  ```

### Storage Strategy

- **Avatar images:** Firebase Storage at `avatars/{uid}/{timestamp}.jpg` (not in Firestore blob)
  - Compress & optimize on upload
  - Save resulting signed URL to `profiles/{uid}.avatar_url`
- **Profile documents:** All fields in `profiles/{uid}` except images
- **Local drafts:** AsyncStorage key `onboarding_draft:{uid}` for step-by-step recovery
  - Max size: 10MB per user
  - Auto-cleanup: Delete after successful Firestore write

### Draft Lifecycle

1. **Creation:** User starts onboarding → `useOnboardingDraft.saveDraft(step, data)` after each step
2. **Interruption:** App crashes/background → draft persists in AsyncStorage
3. **Recovery:** User logs back in → `useOnboardingDraft.loadDraft()` prefills form
4. **Completion:** User finishes onboarding → `saveProfileToFirestore()` succeeds → `useOnboardingDraft.clearDraft()` deletes
5. **Failure:** Save fails → draft REMAINS in AsyncStorage, user can retry without reentering data

## Configuration Decisions (Confirmed from Discussion)

| Question                                             | Decision                                                 | Rationale                                                        |
| ---------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------- |
| Onboarding flow (all-or-nothing vs skip individual)? | **Skip individual fields**                               | Better UX, less friction; required fields still enforced         |
| Avatar mandatory for signup?                         | **Optional**                                             | Can upload later in settings; initials fallback                  |
| When select AI provider (Claude/Gemini/GPT-4)?       | **NOT in onboarding** → settings/ai-keys.tsx later       | Don't block onboarding; user configures when ready               |
| Required fields minimum?                             | **name, email, sex, goal, level, equipment, username**   | Sufficient for workout/diet generation & AI personalization      |
| Profile edit after onboarding?                       | **ALL fields editable**                                  | No artificial restrictions; full flexibility                     |
| Validation schemas separate or shared?               | **Separate: onboardingSchema vs profileEditSchema**      | Different rules per context; less coupling                       |
| FormStepper: create or extend existing?              | **CREATE new `components/ui/FormStepper.tsx`**           | Reusable for future multi-step forms (Phase 03+); fills real gap |
| Avatar storage location?                             | **Firebase Storage** (not Firestore blob)                | Scalable, efficient, images not in DB                            |
| Firestore write: batch or transaction?               | **batch.commit()**                                       | Simpler, atomic for profiles + usernames                         |
| Error handling on save failure?                      | **3x auto-retry + keep draft locally**                   | Robust recovery without data loss                                |
| Profile display vs edit separation?                  | **YES: tab view (read-only) + settings/edit (editable)** | Clear separation, less complexity                                |
| Username format/rules?                               | **3-20 chars, a-zA-Z0-9\_, case-sensitive**              | Good balance of flexibility & simplicity                         |
| Username uniqueness check timing?                    | **Real-time as user types (debounced 500ms)**            | Instant feedback; better UX                                      |
| Username editability after onboarding?               | **Immutable OR 1x per month/year limit**                 | Prevent spam; stable identifiers                                 |
| Height/weight units?                                 | **Metric default (cm, kg); editable in settings**        | Consistency; internationalization ready                          |
| Dietary preferences selection?                       | **Hybrid: predefined chips + custom input**              | Balance between UX speed & customization                         |
| Available training days?                             | **Slider 1-7 days/week + optional**                      | Precise scheduling for AI workouts                               |
| Documentation for new components?                    | **Wiki doc (docs/components.md)**                        | Reference for future developers                                  |

## Files to Create / Modify

### NEW Files (19 total)

```
lib/
  validation/
    └─ schemas.ts (Zod schemas: onboarding, edit, username)
  firestore/
    ├─ profile.ts (saveProfileToFirestore with retry)
    └─ username.ts (reserveUsername)
  └─ username.ts (validation utilities)

components/ui/
  ├─ FormStepper.tsx (reusable multi-step shell)
  ├─ UsernameAvailability.tsx (real-time check input)
  ├─ DietaryPreferencePicker.tsx (hybrid chips + custom)
  └─ Avatar.tsx (EXTEND with upload mode)

hooks/
  ├─ useOnboardingDraft.ts (AsyncStorage draft mgmt)
  └─ useUsernameCheck.ts (debounced Firestore query)

app/(auth)/onboarding/
  ├─ _layout.tsx (FormStepper wrapper)
  ├─ personal.tsx (name, username, avatar, sex, age, height, weight)
  ├─ goals.tsx (goal, target_timeline)
  ├─ experience.tsx (level, equipment, available_days, injuries)
  └─ diet.tsx (allergies, restrictions, cuisines)

app/(tabs)/profile/
  └─ index.tsx (read-only profile view)

app/settings/
  └─ profile-edit.tsx (editable profile)
```

### MODIFY Files (5 total)

```
types/index.ts (add username, onboarding_complete, username_changed_at to UserProfile)
firestore.rules (add profiles & usernames rules)
app/_layout.tsx (add routing guard: onboarding_complete check)
app/(auth)/_layout.tsx (add Android back handling in onboarding)
stores/auth.store.ts (cache onboarding_complete, draft cleanup on logout)
```

### OPTIONAL

```
functions/
  └─ onProfileWrite.ts (Cloud Function for atomic username reservation)
```

## Deliverables

### Phase 1: Types, Schemas, Utilities

- ✅ Updated `types/index.ts` with username, onboarding_complete, username_changed_at
- ✅ `lib/validation/schemas.ts` with onboardingSchema, profileEditSchema, usernameSchema (Zod)
- ✅ `lib/username.ts` with validation & Firestore check utilities
- ✅ Updated `firestore.rules` for profiles & usernames collections

### Phase 2: Reusable Components

- ✅ `components/ui/FormStepper.tsx` (multi-step form container)
- ✅ `components/ui/Avatar.tsx` extended with upload mode + Firebase Storage integration
- ✅ `components/ui/UsernameAvailability.tsx` (real-time check input)
- ✅ `components/ui/DietaryPreferencePicker.tsx` (hybrid chips + custom input)

### Phase 3: Hooks & Local State

- ✅ `hooks/useOnboardingDraft.ts` (AsyncStorage draft recovery)
- ✅ `hooks/useUsernameCheck.ts` (debounced Firestore query + caching)

### Phase 4: Screens & Flows

- ✅ Complete 4-step onboarding flow (personal → goals → experience → diet)
- ✅ Firestore profile creation & update with retry logic (3x exponential backoff)
- ✅ Private profile tab view (read-only) + edit screen (post-onboarding)
- ✅ Onboarding completion detection & skip path with warning

### Phase 5-6: Backend & Navigation

- ✅ `lib/firestore/profile.ts` with saveProfileToFirestore() (atomic batch write)
- ✅ `lib/firestore/username.ts` with reserveUsername() (part of batch)
- ✅ Navigation guards in `app/_layout.tsx` (onboarding_complete routing)
- ✅ Auth store updated with profile cache & draft cleanup on logout

## Acceptance Criteria

### Functional Requirements

- ✅ **New user signup → onboarding:** Complete flow end-to-end without errors
- ✅ **Profile document creation:** Firestore contains profiles/{uid} with all required fields after completion
- ✅ **Onboarding detection:** App correctly detects onboarding_complete flag and routes appropriately
- ✅ **Profile view/edit:** Profile tab displays correct data, Edit button navigates to settings/profile-edit.tsx
- ✅ **Draft recovery:** If user interrupts onboarding, draft persists; user can continue from last step
- ✅ **Username uniqueness:** Real-time check prevents duplicate usernames, shows availability immediately
- ✅ **Avatar upload:** Can upload image to Firebase Storage, URL saved to profile (optional step)
- ✅ **Retry mechanism:** Failed Firestore writes trigger 3x auto-retry; manual retry available if all fail

### Technical Requirements

- ✅ **No TypeScript errors:** Strict mode enabled, all types properly inferred/declared
- ✅ **Component reusability:** FormStepper & DietaryPicker tested with mock data before integration
- ✅ **Zod validation:** Both onboarding & edit schemas parse/reject data correctly
- ✅ **Firestore rules:** Rules deploy successfully, block unauthorized writes
- ✅ **React Hook Form integration:** All screens use RHF with Zod resolver
- ✅ **Dark/light mode:** All screens theme-aware (via theme.store)
- ✅ **Error handling:** Network errors show toast + keep data in AsyncStorage

### Integration Requirements

- ✅ **Auth store integration:** Profile fetch + onboarding_complete cache works correctly
- ✅ **Navigation routing:** onboarding_complete check gates (tabs) route from new users
- ✅ **Settings integration:** Profile edit screen accessible from profile tab
- ✅ **No regression:** Existing Phase 01 foundation (auth, root layout) still functions

### UX/Accessibility Requirements

- ✅ **Progress visibility:** FormStepper shows clear progress (e.g., "Step 2 of 4")
- ✅ **Skip explanations:** Modal explains consequences of skipping particular fields
- ✅ **Error messages:** Clear, actionable error text on validation failures
- ✅ **Loading states:** Avatar upload, username check show loading indicators
- ✅ **Fallbacks:** No avatar → show initials; no data → show defaults
- ✅ **Mobile-friendly:** Forms work on small screens, buttons have adequate hit areas

## Constraints

- Do **NOT** implement workout, nutrition, or community features in this phase (defer to Phase 04+)
- Do **NOT** add AI provider selection (defer to Phase 06 / settings/ai-keys.tsx)
- Do **NOT** implement email verification (already handled in Phase 01 auth)
- Do **NOT** implement deep linking or profile discovery by username (defer to Phase 07+)
- Keep onboarding forms minimal & direct; maintain backward compatibility with Phase 01 foundation
- Do not create duplicate components; follow CLAUDE.md reuse policy (extend Avatar, create FormStepper only if gap exists)

## QA & Verification Checklist

### Phase 1: Setup & Schema

- [ ] UserProfile interface updated in types/index.ts (username, onboarding_complete, username_changed_at)
- [ ] Zod schemas compile & parse valid/invalid data correctly
- [ ] Reserved username list included in validation
- [ ] Firestore rules deploy without errors
- [ ] Firestore emulator tests for rules pass locally

### Phase 2: Components

- [ ] FormStepper renders all steps in sequence
- [ ] FormStepper disables Next button when step validation fails
- [ ] Avatar upload shows preview, uploads to Firebase Storage, returns URL
- [ ] Avatar fallback (initials) displays when no avatar_url exists
- [ ] UsernameAvailability shows ✓/✗/⏳ states correctly
- [ ] Username check debounces (500ms) before Firestore query
- [ ] DietaryPreferencePicker allows multi-select + custom input
- [ ] All components render in both dark & light themes

### Phase 3: Hooks & Local State

- [ ] useOnboardingDraft saves/loads AsyncStorage correctly
- [ ] useOnboardingDraft clears on successful Firestore write
- [ ] useUsernameCheck returns cached results within 5min TTL
- [ ] useUsernameCheck debounces before querying Firestore

### Phase 4: Screens

- [ ] New user can flow through all 4 steps without errors
- [ ] Each step prefilled from draft if available
- [ ] Skip action shows warning modal + confirms choice
- [ ] Previous button disables on step 0
- [ ] Profile tab displays name, @username, avatar, stats (xp, streak)
- [ ] Edit button navigates to settings/profile-edit.tsx
- [ ] Profile edit screen shows username with change-limit warning

### Phase 5-6: Backend & Navigation

- [ ] saveProfileToFirestore() writes profiles/{uid} + usernames/{username} atomically
- [ ] Failed write keeps draft in AsyncStorage
- [ ] Retry logic (3x with exponential backoff) works correctly
- [ ] Success: onboarding_complete = true persists to Firestore
- [ ] Draft cleared from AsyncStorage only after successful write
- [ ] reserveUsername() prevents duplicate usernames
- [ ] New user → (auth) screens
- [ ] Authed + !onboarding_complete → redirect to onboarding
- [ ] Authed + onboarding_complete → (tabs) screens
- [ ] Logout clears profile + draft + redirects to login
- [ ] Android back in onboarding shows warning modal

## Implementation Notes

### Dependency Resolution Order

Given parallelization, recommended execution order:

**Day 1 (Phase 1, parallel all 4 steps):**  
Complete types, schemas, username lib, Firestore rules (all independent, no blocking)

**Day 1-2 (Phase 2, parallel all 4 components):**  
FormStepper, Avatar extend, UsernameAvailability, DietaryPicker (all independent)

**Day 2 (Phase 3, parallel 2 hooks):**  
useOnboardingDraft, useUsernameCheck (both depend on Phase 1, otherwise independent)

**Day 2-3 (Phase 4, parallel all 7 screens):**  
All onboarding steps + profile screens (depend on Phase 2, internally parallelizable)

**Day 3 (Phase 5 & 6):**  
Backend functions (Phase 5) → Navigation wiring (Phase 6, final integration)

**Estimated Time:** 3-4 days (1 full-time dev with parallelization; 2-3 devs can reduce to 2 days)

### Key Technical Decisions

- **Zod Schema Split:** Separate onboarding vs edit intentional; different validation rules per context
- **FormStepper Reusability:** Create new component (not Modal extension) to prepare for Phase 03+ multi-step forms
- **Avatar Upload:** Async operation with loading state; must not freeze UI thread
- **Username Check:** Debounce 500ms to avoid excessive Firestore queries; local cache 5min TTL
- **Batch Write:** Use `writeBatch()` not `transaction` for simpler code (atomic for 2 docs: profiles + usernames)
- **Draft in AsyncStorage:** Sync backup logic; can mirror to Firestore `onboarding_drafts/{uid}` collection if needed later

### Risk Mitigations

| Risk                                           | Severity | Mitigation                                                    |
| ---------------------------------------------- | -------- | ------------------------------------------------------------- |
| Username race condition on simultaneous writes | HIGH     | Use Cloud Function or Firestore transaction; enforce in rules |
| Avatar upload blocks UI                        | MEDIUM   | Run upload async, show spinner, handle errors with try-catch  |
| AsyncStorage quota exceeded                    | LOW      | Cleanup old drafts on app start; max 10MB per user            |
| Firestore rules too permissive                 | HIGH     | Test in emulator + code review before production push         |
| Validation regex performance                   | LOW      | Use simple a-zA-Z0-9\_ check; avoid complex patterns          |

### Future Extensibility

- **FormStepper component:** Designed for reuse in settings wizards, coaching flows, community challenges (Phase 03+)
- **DietaryPreferencePicker:** Can extend with API-sourced ingredient lists, allergen DB integration
- **Username:** Can add profile discovery/search in Phase 07 (community feature)
- **Profile schema:** Ready for achievements, badges, workout history links (Phase 08-09)
