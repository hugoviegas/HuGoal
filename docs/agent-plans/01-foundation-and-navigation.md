# Phase 01 - Foundation and Navigation

## Suggested specialization

Foundation agent.

## Objective

Turn the repository into a working Expo Router app shell with auth routing, theme and locale bootstrapping, and predictable entry points for the rest of the product.

---

## TL;DR

Transformar o app em um Expo Router shell funcionando com autenticação, routing inteligente (welcome → login/signup → onboarding → tabs), e foundação de componentes UI refatorados. Bootstrapping sincronizado com Firebase auth + profile fetch, tema/locale detectados no device, e settings básicos (dark/light, idioma, logout). Resultado: um app que abre em Expo Go sem red screens, com navegação limpa entre auth/onboarding/tabs e placeholder screens para roadmap futuro.

---

## Current Starting Point

- `app/` route folders already exist, but the route files are mostly empty.
- Firebase, auth state, theme state, i18n, and core helpers already exist in `lib/` and `stores/`.
- Shared UI atoms exist in `components/ui/` but are **stubs/placeholders** needing refactor.
- `App.tsx` = stub (needs replace com Expo Router root layout).
- **tsconfig.json** = strict mode ✅
- **Package.json** = has all dependencies; no new installs needed.

---

## Confirmed Decisions (from planning phase)

### Startup & Bootstrap

- **Startup Order**: SecureStore creds → Splash/Loading → Firebase init → Fetch profile → Init locale/theme
- **Onboarding Flag**: Stored in both Zustand cache + Firestore (sync required)
- **Profile Fetch Error**: Show "Error loading profile" screen with Retry button (keep auth session alive)
- **Logout Flow**: Firebase sign-out → clear auth store only → redirect to login (reuse Firestore cache)
- **Offline Persistence**: YES; Firebase offline persistence ON (users can signin with cached data if offline)

### UI & Navigation

- **Tab Bar**: Floating at bottom-center with icons + labels; animates on scroll
- **Settings Content**: Dark/Light toggle + Language selector + Logout + Edit Profile link + About/Terms link
- **Welcome Screen**: Landing page with app description + "Sign In" & "Sign Up" buttons
- **Splash During Boot**: No native splash; just React spinner + background while loading
- **Icons**: lucide-react-native for 99%; custom SVG only if not available
- **UI Components**: Extend + refactor all 6 stubs (Button, Input, Modal, Avatar, GlassCard, Toast) with new props/states

### Forms & Auth

- **Form Validation**: YES; React Hook Form + Zod (email format, password length > 6, terms checkbox)
- **Email Verification**: YES; send verification email on signup; block signin until verified

### Styling & Theme

- **Tailwind vs StyleSheet**: Mix (Tailwind for layout, StyleSheet for dynamic styles)
- **Status Bar**: Adaptive to theme (dark mode → dark status bar)
- **Toast Position**: Top (below status bar)

### Navigation & Routing

- **Provider Nesting**: GestureHandlerRootView → SafeAreaProvider → ThemeProvider → ToastProvider → PortalHost → FirebaseApp → AuthProvider
- **Android Back Button**: Customized (disable back in onboarding; prev-tab in tabs)
- **Deep Linking**: NO (implement Phase 07+)
- **Screen Transitions**: Custom (slide-from-right for auth, fade for tabs)
- **Safe Areas**: Use `useSafeAreaInsets()` in layouts; padding as needed

### Localization

- **Locale Default**: Device locale; unsupported values → EN
- **Translations Phase 01**: Hard-coded EN/PT strings (i18n cleanup Phase 03+ Onda 1)

### Infrastructure

- **EAS Build**: YES; create eas.json with development/preview/production profiles
- **Env Vars**: Public vars in app.json/eas.json; secrets in .env.local (gitignored)
- **Versioning**: Via npm script that increments versionCode
- **Images**: assets/images/ui/ (logos) + assets/images/backgrounds/ (screens)
- **Fonts**: Poppins/Roboto already configured ✅
- **Orientation**: Portrait only (landscape in Phase 10)
- **Session Timeout**: NO
- **Logging**: Sentry for crash reporting + console logs
- **Firestore Rules**: YES; basic rules (read profiles/{uid} allowed, write gated)
- **Keyboard**: Default behavior (push content up)
- **Error Boundary**: Root layout only (no granular components)

### QA & Testing

- **Test Strategy**: Basic integration tests ✅ (not full e2e)
- **Device Testing**: YES; manual tests on real iOS + Android devices
- **TypeScript**: Strict mode ✅ (already set in tsconfig.json)
- **Linting**: Verify existing eslint config; enforce if exists

### Documentation

- **Git Branch**: feature/01-foundation
- **Dev Docs**: YES; docs/development-setup.md (run, Firebase config, env vars, debugging)
- **PR Template**: NO (free PRs)
- **Sentry**: YES
- **Analytics**: NO (future phase)
- **Notifications**: NO (Phase 08+)

### Design Reference

- **Design Mockups**: No Figma; use screenshots/mockups in assets/designs/ as reference
- **Logout Feedback**: Show "Logout confirmed" screen + auto-redirect to welcome after 2s

---

## Screens and Routes

### Auth Flow

- `app/(auth)/welcome.tsx` - Landing with app description + Sign In / Sign Up buttons
- `app/(auth)/login.tsx` - Email + Password + Sign In button
- `app/(auth)/signup.tsx` - Email + Password + Confirm + Terms checkbox + Create Account button
- `app/(auth)/logout-feedback.tsx` - Confirmation screen (temporary, auto-redirects)

### Onboarding Flow

- `app/(auth)/onboarding/_layout.tsx` - Stepper shell (back button disabled)
- `app/(auth)/onboarding/index.tsx` - Redirect to step-1
- `app/(auth)/onboarding/step-1.tsx` through `step-4.tsx` - Placeholder steps (details Phase 02)

### Main App

- `app/(tabs)/_layout.tsx` - Floating tab bar with 5 tabs (Dashboard, Workouts, Nutrition, Community, Profile)
- `app/(tabs)/dashboard.tsx` - Placeholder
- `app/(tabs)/workouts/index.tsx` - Placeholder
- `app/(tabs)/nutrition/index.tsx` - Placeholder
- `app/(tabs)/community/index.tsx` - Placeholder
- `app/(tabs)/profile/index.tsx` - Placeholder

### Settings

- `app/settings/_layout.tsx` - Settings route group wrapper
- `app/settings/index.tsx` - Dark/Light toggle, Language selector, Edit Profile link, About/Terms link, Logout button
- `app/settings/about.tsx` - App version, description, license (BUSL 1.1), terms link

---

## Step-by-Step Work (Executable Tasks)

### PHASE 01A: Infrastructure & Bootstrapping

#### Task 1: Update auth.store.ts

- Add field: `onboarding_completed: boolean = false`
- Add method: `setOnboardingCompleted(value: boolean)` → sync local + Firestore
- Add method: `logout()` → Firebase sign-out → clear auth store → navigate to login
- Add field: `isInitializing: boolean` for splash state during boot

#### Task 2: Create navigation.store.ts _(parallel with Task 1)_

- New Zustand store tracking: `currentTab`, `authFlow`, `onboardingStep`
- Used by root layout to avoid duplication in routing logic

#### Task 3: Setup Sentry _(parallel)_

- Install: `@sentry/react-native` + `@sentry/tracing`
- Create: `lib/sentry.ts` with initialization
- Integrate in root layout to capture errors early
- Configure to catch auth, profile fetch, and navigation errors

#### Task 4: Create lib/bootstrap.ts _(depends on Tasks 1, 2)_

- Function `initializeApp()` orchestrating:
  1. SecureStore read (API keys)
  2. Firebase init
  3. Auth hydration via onAuthStateChanged
  4. Profile fetch from Firestore (`profiles/{uid}`)
  5. Locale init (device locale fallback EN)
  6. Theme init (system preference)
- Returns: `{ user, profile, locale, theme, error }`
- Error handling: still returns user if profile fails (graceful degradation)

#### Task 5: Setup environment & EAS _(parallel)_

- Create: `.env.local` (gitignored) with Firebase config
- Create: `eas.json` with 3 profiles (development, preview, production)
- Create: `scripts/version-bump.js` → increments versionCode in app.json & eas.json
- Add npm script: `"version:bump": "node scripts/version-bump.js"`
- Create: `.env.example` as template

---

### PHASE 01B: Root Layout & Providers

#### Task 6: Replace App.tsx

- Become Expo Router entry point
- Export: `import { Stack } from 'expo-router'` (delegate to app/\_layout.tsx)

#### Task 7: Create app/\_layout.tsx (Root Layout) _(depends on Tasks 2-6)_

- Provider nesting (optimized):
  ```
  GestureHandlerRootView
    → SafeAreaProvider
    → ThemeProvider
    → ToastProvider
    → PortalHost
    → FirebaseApp (wait for init)
    → AuthProvider (onAuthStateChanged)
    → RootLayoutContent
  ```
- RootLayoutContent logic:
  - Call `useAuthStore.initialize()` in useEffect
  - Call `initializeApp()` → store results
  - While `isInitializing`: show spinner + background (no native splash yet)
  - After init: decide route via Router hook (see Task 8)
- Error Boundary wrapper (root only, no granular)
- StatusBar adaptive: dark theme → dark status bar, light → light

#### Task 8: Create Router Logic (useRootRoute hook) _(depends on Task 7)_

- Hook returns: `{ route: 'loading'|'welcome'|'login'|'signup'|'onboarding'|'tabs'|'error', errorMessage }`
- Logic:
  ```
  if (isInitializing || !initialized) → 'loading'
  if (!user) → 'welcome'
  if (user && !profile) → 'error' (with retry button)
  if (user && !profile.onboarding_completed) → 'onboarding'
  if (user && profile.onboarding_completed) → 'tabs'
  ```
- Used by RootLayoutContent to conditionally render Stack.Screen groups

---

### PHASE 01C: Auth Flows

#### Task 9: Create app/(auth)/\_layout.tsx _(depends on Task 8)_

- Route group wrapper for auth screens
- Screen options: position 'absolute', custom transition slide-from-right

#### Task 10: Create app/(auth)/welcome.tsx _(depends on Task 9)_

- Landing screen: logo + description + "Sign In" button + "Sign Up" button
- Hard-coded EN/PT strings (e.g., "Welcome to HuGoal")
  @@- Hard-coded EN/PT strings (e.g., "Welcome to HuGoal")
- Navigation: Sign In → push `login`; Sign Up → push `signup`

#### Task 11: Create app/(auth)/login.tsx _(depends on Task 9)_

- Form: Email input + Password input
- Validation: React Hook Form + Zod (email format, password > 6 chars)
- onSubmit: `auth.signInWithEmailAndPassword()` → set user → watch auth store
- Show loading state during signin
- Error display: email not found, wrong password, network error
- Links: "Sign Up" + "Forgot password?" (inactive Phase 01)

#### Task 12: Create app/(auth)/signup.tsx _(depends on Task 9)_

- Form: Email + Password + Confirm Password + "I agree to Terms" checkbox
- Validation: Zod (email, pwd > 6, pwd == confirm, terms required)
- onSubmit: `auth.createUserWithEmailAndPassword()` → send verification email → show "Check your email" blocker
- Block signin via form until email verified (set modal overlay)
- Link: "Already have account?" → navigate to login

---

### PHASE 01D: Onboarding

#### Task 13: Create app/(auth)/onboarding/\_layout.tsx _(depends on Task 9)_

- Nested route group for stepper steps
- Screen options: disable back gesture (custom Android back handler prevents back in onboarding)

#### Task 14: Create app/(auth)/onboarding/index.tsx _(depends on Task 13)_

- Redirect: `redirect('./step-1')`

#### Task 15: Create app/(auth)/onboarding/step-{1-4}.tsx _(depends on Task 13)_

- Placeholder screens (details in Phase 02)
- Each step: title + description + "Next" button
- Step 4: "Finish" button → call `useAuthStore.setOnboardingCompleted(true)` → navigate to tabs

---

### PHASE 01E: Tabs & Main App

#### Task 16: Create app/(tabs)/\_layout.tsx _(depends on Task 8)_

- Floating tab bar: 5 tabs (Dashboard, Workouts, Nutrition, Community, Profile)
- Icons: lucide-react-native
- Tab bar options: position 'bottom', animation on scroll (opacity fade)
- Screen options: fade transitions between tabs

#### Task 17: Create tab destination placeholders _(depends on Task 16)_

- `app/(tabs)/dashboard.tsx` - Placeholder screen
- `app/(tabs)/workouts/index.tsx` - Placeholder screen
- `app/(tabs)/nutrition/index.tsx` - Placeholder screen
- `app/(tabs)/community/index.tsx` - Placeholder screen
- `app/(tabs)/profile/index.tsx` - Placeholder screen

---

### PHASE 01F: Settings & Global

#### Task 18: Create app/settings/\_layout.tsx _(depends on Task 16)_

- Settings route group wrapper

#### Task 19: Create app/settings/index.tsx (Settings Main) _(depends on Task 18)_

- Row: "Dark Mode" toggle → update theme store → apply globally
- Row: "Language" selector (PT/EN) → update i18n → apply globally
- Row: "Edit Profile" link → navigate `/settings/profile-edit` (placeholder Phase 01)
- Row: "About" link → navigate `/settings/about`
- Row: "Logout" button → show confirmation modal → logout with 2s feedback redirect

#### Task 20: Create app/settings/about.tsx _(depends on Task 18)_

- App version (from app.json)
- HuGoal description
- License: BUSL 1.1
- Link to Terms & Conditions

---

### PHASE 01G: UI Components Refactor

#### Task 21: Refactor components/ui/\* _(parallel with Tasks 16-20)_

- **Button.tsx**:
  - Props: `variant` (primary|secondary|ghost), `size` (sm|md|lg), `tone` (default|success|danger), `loading`, `disabled`, `className`
  - Support dark/light theme + proper contrast

- **Input.tsx**:
  - Props: `variant` (default|outline), `size` (sm|md|lg), `placeholder`, `secureTextEntry` (password), `prefixIcon`, `suffixIcon`, `errorMessage`, `disabled`, `className`
  - Keyboard behavior: default (push content up)

- **Modal.tsx**:
  - Props: `open`, `onOpenChange`, `children`, `contentClassName`, `animationDuration`
  - Responsive: sheet on mobile, modal on tablet

- **Avatar.tsx**:
  - Props: `size` (sm|md|lg|xl), `source` (image|initials), `tone` (color variants), `className`

- **GlassCard.tsx**:
  - Props: `variant` (default|bordered), `size` (sm|md|lg), `className`, `contentClassName`

- **Toast.tsx**:
  - Props: `position` (top by default), `variant` (success|error|info|warning), `duration` (2500ms default), `dismissible`
  - Integrate with `toast.store.ts`

---

### PHASE 01H: Firestore Rules & Auth Config

#### Task 22: Create firestore.rules _(parallel)_

- Rule: Allow read `profiles/{uid}` if `request.auth.uid == uid`
- Rule: Allow write `profiles/{uid}` if `request.auth.uid == uid` (for Phase 02+)
- Deploy to Firebase Console manually (not automated)

#### Task 23: Verify Firebase Auth Config _(parallel)_

- Ensure: Email/Password provider enabled in Firebase Console
- Ensure: Email verification enabled
- Ensure: Firebase offline persistence enabled (call `enableIndexedDbPersistence()` after Firebase init)

---

### PHASE 01I: Dev Docs & Git

#### Task 24: Create docs/development-setup.md _(depends on completed app)_

- Section: Quick Start (clone, npm install, .env.local, run `npm start`)
- Section: Firebase Config (where to get credentials, how to populate .env.local)
- Section: Running on Device (android/iOS Expo run commands)
- Section: Debugging (console logs prefixed, Sentry dashboard, Reactotron optional)
- Section: Troubleshooting (red screen solutions, common errors)

#### Task 25: Create branch & prepare for review _(depends on all Tasks)_

- Branch: `feature/01-foundation`
- Commits: Group by section (01A, 01B, etc) for reviewability
- Update: package.json version to 0.1.0

---

## Relevant Files

### Create

**Core Layout & Bootstrap**

- `app/_layout.tsx` — Root layout with providers + bootstrap logic
- `lib/bootstrap.ts` — Orchestration of startup sequence
- `lib/sentry.ts` — Sentry initialization + error handling
- `stores/navigation.store.ts` — Navigation state management

**Auth Flows**

- `app/(auth)/_layout.tsx` — Auth route group
- `app/(auth)/welcome.tsx` — Landing screen
- `app/(auth)/login.tsx` — Sign-in form
- `app/(auth)/signup.tsx` — Sign-up form
- `app/(auth)/logout-feedback.tsx` — Confirmation screen (optional; can be modal)

**Onboarding**

- `app/(auth)/onboarding/_layout.tsx` — Stepper shell
- `app/(auth)/onboarding/index.tsx` — Redirect to step-1
- `app/(auth)/onboarding/step-1.tsx` through `step-4.tsx` — Placeholder steps

**Main App**

- `app/(tabs)/_layout.tsx` — Floating tab bar
- `app/(tabs)/dashboard.tsx` — Placeholder
- `app/(tabs)/workouts/index.tsx` — Placeholder
- `app/(tabs)/nutrition/index.tsx` — Placeholder
- `app/(tabs)/community/index.tsx` — Placeholder
- `app/(tabs)/profile/index.tsx` — Placeholder

**Settings**

- `app/settings/_layout.tsx` — Settings route group
- `app/settings/index.tsx` — Main settings screen (dark/light, language, links, logout)
- `app/settings/about.tsx` — App info + license

**Infrastructure**

- `eas.json` — EAS Build profiles (development, preview, production)
- `.env.local` — Environment variables (gitignored)
- `.env.example` — Template for .env.local
- `firestore.rules` — Firestore security rules
- `scripts/version-bump.js` — Version increment script
- `docs/development-setup.md` — Developer documentation

### Modify

**App Root**

- `App.tsx` — Replace with Expo Router entry point

**Stores**

- `stores/auth.store.ts` — Add `onboarding_completed`, `setOnboardingCompleted()`, `logout()`, `isInitializing`

**UI Components**

- `components/ui/Button.tsx` — Refactor with variant, size, tone, loading, disabled props
- `components/ui/Input.tsx` — Refactor with variant, size, prefixIcon, suffixIcon, errorMessage props
- `components/ui/Modal.tsx` — Refactor with open, onOpenChange, responsive props
- `components/ui/Avatar.tsx` — Refactor with size, source, tone props
- `components/ui/GlassCard.tsx` — Refactor with variant, size props
- `components/ui/Toast.tsx` — Refactor with position, variant, duration, dismissible props

**Config**

- `package.json` — Add `"version:bump"` script
- `tsconfig.json` — Validate strict mode (already set ✅)

---

## Verification Checklist

### Build & Bootstrap

- [ ] `npm install` runs without errors (no new deps needed)
- [ ] `npm start` launches in Expo Go
- [ ] App shows spinner while bootstrapping; no red screens
- [ ] After bootstrap complete: logged-out user lands on welcome screen

### Auth Flow (Happy Path)

- [ ] Welcome screen visible with navigation buttons
- [ ] Sign Up: form validation works (email, password, terms)
- [ ] Sign Up: email verification email sent + blocker shown
- [ ] After email verified (manual): sign in with credentials
- [ ] After signin: app redirects to onboarding (not tabs)

### Onboarding

- [ ] Onboarding Step 1-4 placeholder screens visible
- [ ] Step 1 → 2 → 3 → 4 navigation works
- [ ] Step 4 "Finish" button → sets `onboarding_completed` → redirects to tabs
- [ ] Android back button disabled during onboarding

### Tab Navigation

- [ ] Tab bar visible at bottom-center (floating)
- [ ] Clicking each tab loads placeholder screen
- [ ] Tab bar animates on scroll (if scrollable content in tab)
- [ ] Switching tabs works smoothly

### Settings

- [ ] Settings tab or settings page accessible
- [ ] Dark Mode toggle → applies theme across app immediately
- [ ] Language toggle PT ↔ EN → strings update (hard-coded Phase 01)
- [ ] Edit Profile link → navigates (placeholder Phase 01)
- [ ] About link → shows app info + license
- [ ] Logout button → shows confirmation → 2s feedback → redirects to welcome

### Error Handling

- [ ] Firebase offline (airplane mode): profile fetch error → retry screen works
- [ ] Invalid email signup: form error message shows
- [ ] Wrong password signin: error message shows
- [ ] Network error: graceful fallback visible

### Device Testing

- [ ] iOS physical device: notch/safe area respected, tap areas adequate
- [ ] Android physical device: back button behavior correct (disabled onboarding, prev-tab elsewhere), keyboard push-up works
- [ ] Both platforms: status bar adapts to theme, text readable

### Code Quality

- [ ] `npm run lint` passes (or verify eslint config exists)
- [ ] `tsc --noEmit` passes (strict mode, no any escapes)
- [ ] All new imports resolve (no red squiggles in editor)

---

## Decisions & Rationale

| Decision                          | Why                                                                                            |
| --------------------------------- | ---------------------------------------------------------------------------------------------- |
| Email verification required       | Ensures account ownership; reduces spam signups                                                |
| Logout feedback screen (2s delay) | UX clarity; user sees logout worked before redirect                                            |
| Floating tab bar (bottom-center)  | Modern mobile UX; matches HuGoal aesthetic                                                     |
| Hard-coded strings Phase 01       | Faster iteration; i18n cleanup Phase 03+ when translation keys stabilize                       |
| Sentry from start                 | Early error visibility; prevents surprises in production                                       |
| Android back customization        | Prevents accidental exits from onboarding; maintains UX consistency                            |
| No deep linking Phase 01          | Reduces scope; sharing/deep links Phase 07+ (community phase)                                  |
| Zustand cache + Firestore sync    | Offline resilience + source-of-truth consistency; minimal complexity Phase 01                  |
| New `navigation.store.ts`         | Centralizes routing logic; enables Phase 02+ complexity (nested navigators, conditional flows) |

---

## Further Considerations

### Firebase Emulator Setup _(Recommendation: Phase 02)_

- Purpose: Local dev/testing without Firebase bills
- Include: docker-compose or instructions for emulator setup
- Value: Faster iteration on auth flows; safe experimentation

### Accessibility Polish _(Recommendation: Phase 10)_

- WCAG 2.1 AA: semantic labels, hit areas ≥ 44pt, color contrast ≥ 4.5:1
- Phase 01: basic (e.g., `accessibilityLabel` props in inputs)
- Phase 10: comprehensive audit

### Performance Monitoring _(Recommendation: Phase 08)_

- Sentry performance ready now (breadcrumbs logged)
- Phase 08: active monitoring of Time To Screen (TTS) metrics

---

## Next Steps

✅ **Phase 01 planning complete** — all decisions confirmed, tasks detailed, files mapped

👉 **Implementation**: Assign to Foundation Agent with:

- This document
- memory/session/plan.md (decisions summary)
- CLAUDE.md (governance rules)
- phase-review-template.md (QA gate)

👉 **Gate**: Phase 01 formal sign-off via phase-review-template.md required before Phase 02 starts

- Section 3: Component reuse audit (verify 6 UI stubs extended, no duplication)
- Sections 4-8: QA (functional, technical, UX, integration, risks)
- Section 10: Approval gate (Phase 01 → Phase 02 unlock)

---

## Constraints

- Reuse existing Firebase and i18n modules; do not rewrite.
- Keep Phase 01 scoped to bootstrapping + navigation; no workout/nutrition/community/coach logic.
- No feature data written beyond reading `profiles/{uid}`.
- No deep linking, advanced animations, or accessibility polish (defer to later phases).
