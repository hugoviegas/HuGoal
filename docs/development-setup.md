# BetterU — Development Setup

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 20 LTS | https://nodejs.org |
| npm | ≥ 10 | bundled with Node |
| Expo CLI | latest | `npm install -g expo-cli` |
| EAS CLI | latest | `npm install -g eas-cli` |
| Git | any | https://git-scm.com |
| Android Studio | Hedgehog+ | for Android Emulator |
| Xcode | 15+ | macOS only, for iOS Simulator |

---

## Quick Start

```bash
# 1. Clone and enter the project
git clone https://github.com/hugoviegas/BetterU.git
cd BetterU

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Configure environment variables
cp .env.example .env.local
# → fill in your Firebase project credentials (see Firebase Config below)

# 4. Start Metro bundler
npm start
# Then press:
#   a  → open Android Emulator
#   i  → open iOS Simulator
#   s  → switch to Expo Go (scan QR)
```

---

## Firebase Config

1. Go to [Firebase Console](https://console.firebase.google.com) → create or select your project.
2. Enable **Authentication** → Sign-in method → **Email/Password** (with email verification).
3. Enable **Firestore Database** (start in test mode, then deploy `firestore.rules`).
4. Enable **Storage** (for avatar uploads in Phase 3+).
5. Go to Project Settings → Your apps → Add app (Android/iOS) → copy the config.
6. Populate `.env.local`:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIza...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

### Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
# or manually paste firestore.rules into Firebase Console → Firestore → Rules
```

---

## Running on a Physical Device

### Android

```bash
# Connect via USB (enable USB debugging in Developer Options)
npm run android
# Or scan the QR code with the Expo Go app
```

### iOS (macOS only)

```bash
# With Xcode + iOS Simulator
npm run ios
# Or scan the QR code with the Expo Go app (camera app on iOS 16+)
```

---

## Building APK / IPA with EAS

```bash
# Authenticate with EAS
eas login

# Development build (debug APK + iOS simulator)
eas build --profile development --platform android
eas build --profile development --platform ios

# Preview APK (internal distribution)
eas build --profile preview --platform android

# Production (AAB for Play Store / IPA for App Store)
eas build --profile production --platform all
```

See `eas.json` for full build profile configuration.

---

## Version Bumping

```bash
npm run version:bump        # patch: 1.0.0 → 1.0.1
npm run version:bump:minor  # minor: 1.0.0 → 1.1.0
npm run version:bump:major  # major: 1.0.0 → 2.0.0
```

This updates `version` in `app.json` and increments `android.versionCode`.

---

## AI API Keys

Users bring their own AI API keys (Claude, Gemini, GPT-4). Keys are stored encrypted in the device keychain via `expo-secure-store` and **never** sent to Firestore or any server.

To configure a key for testing, use the AI Keys screen in Settings (Phase 6+), or directly call `saveApiKey(provider, key)` from `lib/api-key-store.ts` in a test file.

---

## Project Structure

```
BetterU/
├── app/                    # Expo Router file-based routes
│   ├── _layout.tsx         # Root layout (providers + bootstrap)
│   ├── index.tsx           # Entry point (auth-based redirect)
│   ├── (auth)/             # Auth flow: welcome, login, signup, onboarding
│   ├── (tabs)/             # Main tabs: dashboard, workouts, nutrition, community, profile
│   └── settings/           # Settings: dark mode, language, about, logout
├── components/
│   └── ui/                 # Design system atoms: Button, Input, GlassCard, Avatar, Toast, Modal, TabBar
├── stores/                 # Zustand state: auth, theme, toast, navigation, workout
├── lib/                    # Infrastructure: firebase, firestore, i18n, bootstrap, ai-provider, api-key-store
├── types/                  # TypeScript types (Firestore schema + app types)
├── constants/              # Color tokens (light/dark)
├── hooks/                  # Shared hooks: useRootRoute
├── locales/                # i18n strings: en.json, pt.json
├── assets/                 # Images, fonts, icons
├── docs/                   # Phase plans, component prompts, this file
├── firestore.rules         # Firestore security rules
├── tailwind.config.js      # NativeWind v4 + Tailwind v3 config
├── metro.config.js         # Metro bundler with NativeWind
├── babel.config.js         # Babel: nativewind + reanimated plugin
├── eas.json                # EAS Build profiles
└── app.json                # Expo app config
```

---

## Debugging

### Red Screen / JS Error

1. Check Metro output for the exact import path that failed.
2. Common cause: missing `.env.local` → Firebase init fails.
3. Check `lib/firebase.ts` — all `process.env.EXPO_PUBLIC_*` must be set.

### Auth Not Persisting

- Firebase auth persistence is set to `AsyncStorage` (via `getReactNativePersistence`).
- On simulator reset or app reinstall, auth state is cleared (expected).

### NativeWind Classes Not Applying

- Ensure `global.css` is imported in `app/_layout.tsx` (`import '@/global.css'`).
- Verify `metro.config.js` uses `withNativeWind`.
- Clear Metro cache: `npm start -- --clear`.

### i18n Strings Not Loading

- Ensure `locales/en.json` and `locales/pt.json` exist.
- Verify `lib/i18n.ts` is imported in `app/_layout.tsx` (`import '@/lib/i18n'`).

---

## Common Commands

```bash
npm start                  # Start Metro
npm start -- --clear       # Start with cleared cache
npm run lint               # Run ESLint
npx tsc --noEmit           # TypeScript check (strict)
eas build --profile preview --platform android  # Build preview APK
```

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Unable to resolve module` | Run `npm start -- --clear` to clear Metro cache |
| `Firebase: No Firebase App` | Check `.env.local` has all `EXPO_PUBLIC_FIREBASE_*` vars |
| `getReactNativePersistence` type error | Covered by `types/firebase-rn.d.ts` augmentation |
| `nativewind class not applied` | Ensure file is in `tailwind.config.js` content paths |
| Build fails: missing notification-icon | `assets/notification-icon.png` must exist (copy from `assets/icon.png`) |
