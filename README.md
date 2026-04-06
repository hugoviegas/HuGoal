# HuGoal 🎯

> **Your AI-Powered Personal Fitness Companion** — Transform your fitness journey with intelligent workout planning, nutrition tracking, and community support.

[![License](https://img.shields.io/badge/license-BUSL%201.1-blue.svg)](LICENSE)
[![Expo](https://img.shields.io/badge/expo-54.0-blueviolet.svg)](https://expo.dev)
[![React Native](https://img.shields.io/badge/react--native-0.74+-green.svg)](https://reactnative.dev)
[![Firebase](https://img.shields.io/badge/firebase-v9+-orange.svg)](https://firebase.google.com)
[![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)](https://www.typescriptlang.org)

---

## 📱 Overview

**HuGoal** is a cutting-edge mobile fitness application built with **Expo** and **React Native**, designed to help users achieve their fitness goals through:

- **🤖 AI-Powered Workouts** — Personalized training plans powered by Claude and Gemini
- **🥗 Smart Nutrition Tracking** — AI-driven meal recognition and macro analysis
- **👥 Community Features** — Connect with friends, share achievements, and stay motivated
- **📊 Real-Time Dashboard** — Track progress with beautiful, interactive charts
- **🔄 Cross-Platform** — Runs on Android, iOS, and Web (via Metro bundler)
- **☁️ Cloud Sync** — Firebase & Firestore for seamless data persistence
- **🌍 Multi-Language** — English (EN) and Portuguese (PT) support

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** or **yarn**
- **Expo CLI** (installed via `npx expo`)
- **Android Studio** (for Android development) or **Xcode** (for iOS development)
- **Firebase Project** with Firestore configured

### Installation

```bash
# Clone the repository
git clone https://github.com/hugovntr/HuGoal.git
cd HuGoal

# Install dependencies
npm install

# Configure Firebase
# 1. Create a Firebase project: https://firebase.google.com
# 2. Copy your Firebase config
# 3. Update lib/firebase.ts with your credentials

# Install Expo CLI globally (if not already installed)
npm install -g expo-cli

# Start the development server
npm run start
```

### Running the App

```bash
# Start Expo development server
npm run start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on Web
npm run web

# Build and publish (EAS)
npm run eas:build:android
npm run eas:publish
```

---

## 📁 Project Structure

```
HuGoal/
├── app/                          # Expo Router pages
│   ├── (auth)/                   # Authentication screens
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   ├── welcome.tsx
│   │   └── onboarding/
│   ├── (tabs)/                   # Main tab navigation
│   │   ├── dashboard.tsx         # Home screen with progress
│   │   ├── workouts.tsx          # Workout management
│   │   ├── nutrition.tsx         # Nutrition tracking
│   │   ├── community.tsx         # Social features
│   │   └── profile.tsx           # User profile
│   └── settings/                 # Settings screens
│
├── components/                   # Reusable UI components
│   ├── ui/                       # Base components (Button, Input, Card, etc.)
│   ├── workouts/                 # Workout-specific components
│   ├── nutrition/                # Nutrition-specific components
│   └── community/                # Community-specific components
│
├── stores/                       # Zustand stores (state management)
│   ├── auth.store.ts             # Authentication state
│   ├── nutrition.store.ts        # Nutrition data
│   ├── workout.store.ts          # Workout data
│   ├── theme.store.ts            # Theme (light/dark)
│   └── toast.store.ts            # Toast notifications
│
├── lib/                          # Utilities and services
│   ├── firebase.ts               # Firebase initialization
│   ├── firestore.ts              # Firestore queries
│   ├── nutrition-ai.ts           # AI nutrition analysis
│   ├── ai-provider.ts            # Claude/Gemini integration
│   ├── api-key-store.ts          # Secure API key storage
│   └── macro-calculator.ts       # Nutrition calculations
│
├── hooks/                        # Custom React hooks
│   ├── useRootRoute.ts
│   ├── useHideMainTabBar.ts
│   └── useOnboardingDraft.ts
│
├── constants/                    # Design tokens and constants
│   ├── colors.ts                 # Color palette
│   ├── typography.ts             # Font sizes and styles
│   ├── spacing.ts                # Margin/padding tokens
│   ├── radius.ts                 # Border radius values
│   ├── elevation.ts              # Shadow effects
│   └── design-system.ts          # Unified exports
│
├── types/                        # TypeScript type definitions
│   └── index.ts                  # Global types
│
├── locales/                      # Internationalization
│   ├── en.json                   # English strings
│   └── pt.json                   # Portuguese strings
│
├── assets/                       # Images, fonts, icons
│   ├── images/
│   ├── fonts/
│   └── icons/
│
├── docs/                         # Documentation
│   ├── agent-plans/              # Phase-based implementation plans
│   ├── components_prompts/       # Component specifications
│   └── development-setup.md      # Detailed setup guide
│
├── .github/workflows/            # CI/CD pipelines
│   ├── expo-build-apk.yml        # Android build workflow
│   └── expo-publish-main.yml     # OTA update workflow
│
├── app.json                      # Expo configuration
├── eas.json                      # EAS (Expo Application Services) config
├── firebase.json                 # Firebase hosting config
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript configuration
├── tailwind.config.js            # NativeWind (Tailwind for RN)
└── README.md                     # This file
```

---

## 🎨 Tech Stack

### Frontend
- **React Native** + **Expo** — Cross-platform mobile development
- **Expo Router** — File-based routing (similar to Next.js)
- **NativeWind** — Tailwind CSS for React Native
- **Reanimated 3** — Complex animations
- **Gesture Handler** — Smooth gesture recognition
- **React Hook Form** — Form state management

### Backend & Database
- **Firebase** — Authentication & real-time database
- **Firestore** — NoSQL cloud database
- **Firebase Storage** — Image & file storage
- **Firebase Hosting** — Web deployment

### AI & External Services
- **Claude API** — Advanced AI for workout planning & nutrition analysis
- **Google Gemini API** — Food image recognition & macro estimation
- **Google Cloud Vision** — OCR for nutrition label parsing

### Tools & Services
- **EAS (Expo Application Services)** — Build & deployment
- **EAS Update** — OTA (Over-The-Air) updates
- **Sentry** — Error tracking & monitoring
- **TypeScript** — Type-safe development

---

## 🔐 Security & Environment Setup

### Firebase Rules

Firestore security rules are configured in `firestore.rules` to ensure:
- Users can only read their own data
- Real-time friend requests with proper validation
- Secure community posts and comments

### API Keys Management

Sensitive API keys are stored securely using:
- **SecureStore** (React Native) on mobile
- Environment variables on services
- Never hardcoded in source

Store keys in platform-specific secure storage or `.env` file:
```
HUGOAL_AI_KEY_CLAUDE=sk-ant-...
HUGOAL_AI_KEY_GEMINI=AIzaSy...
```

---

## 📚 Features Detail

### 🏋️ Workouts
- **AI-Generated Plans** — Based on goals, experience level, and preferences
- **Exercise Library** — 200+ exercises with video demonstrations
- **Progress Tracking** — Log reps, sets, weights, and RPE
- **Workout History** — View past workouts and trends

### 🥗 Nutrition
- **Meal Tracking** — Log meals with photo recognition via AI
- **Macro Calculator** — Real-time macro breakdown
- **Diet Plans** — AI-personalized nutrition plans
- **Water Intake** — Daily hydration tracking
- **Food Library** — Searchable database with nutritional info

### 👥 Community
- **Friend Requests** — Connect with other users
- **Workout Sharing** — Share workout achievements
- **Leaderboards** — Compete friendly with friends
- **Group Challenges** — Participate in community challenges

### 📊 Dashboard
- **Progress Overview** — Weight, body metrics, strength gains
- **AI Insights** — Personalized recommendations
- **Weekly Summary** — Stats and achievements recap

---

## 🚀 Deployment

### Android APK (Preview Build)
```bash
npm run build:apk
```
APK available under EAS releases with automatic version tagging.

### iOS (App Store)
```bash
npm run build:ios
```

### OTA Updates
```bash
npm run publish
```
Updates deployed immediately to all users running the app.

---

## 🛠️ Development

### Type Checking
```bash
npm run tsc-check
```

### Linting
```bash
npm run lint
```

### Code Style
- **ESLint** — Enforce code standards
- **Prettier** — Automatic code formatting
- **NativeWind** — Consistent styling with Tailwind

### Testing
```bash
npm test
```

---

## 📖 Documentation

- **[Development Setup Guide](docs/development-setup.md)** — Detailed environment setup
- **[Main Plan](docs/main_plan.md)** — High-level architecture
- **[Agent Plans](docs/agent-plans/)** — Phase-by-phase implementation details
- **[Component Specs](docs/components_prompts/)** — UI component specifications

---

## 📋 Roadmap

### Phase 01 ✅
- Foundation & authentication
- Onboarding flow
- Tab navigation
- Basic settings

### Phase 02 (In Progress)
- Workout management UI
- Nutrition tracking
- Dashboard with charts
- Real-time features

### Phase 03 (Planned)
- Community features
- AI-powered recommendations
- Advanced analytics
- Video tutorials

### Phase 04+ (Future)
- Wearable integration (Apple Watch, Wear OS)
- Social features enhancement
- Premium subscription
- AI coaching

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Standards
- Write TypeScript with strict mode
- Follow ESLint rules
- Add JSDoc comments for complex functions
- Test components in isolation
- Update documentation as needed

---

## 📝 License

This project is licensed under the **Business Source License 1.1 (BUSL 1.1)**.

- ✅ Free for personal, non-commercial use
- ✅ Free for evaluation (4-year evaluation period)
- ❌ Commercial use requires a license
- See [LICENSE](LICENSE) for full terms

---

## 🐛 Issues & Support

### Reporting Bugs
Report issues on [GitHub Issues](https://github.com/hugovntr/HuGoal/issues) with:
- Clear description
- Steps to reproduce
- Screenshots/videos if applicable
- Device & OS information

### Getting Help
- **Documentation**: Check [docs/](docs/)
- **GitHub Discussions**: Ask community
- **Discord Community**: (Coming soon)

---

## 👨‍💻 Author

**Hugo Viegas**
- GitHub: [@hugovntr](https://github.com/hugovntr)
- Project: [HuGoal](https://github.com/hugovntr/HuGoal)

---

## 🙏 Acknowledgments

- Built with [Expo](https://expo.dev) & [React Native](https://reactnative.dev)
- UI components inspired by modern design systems
- AI powered by [Claude](https://anthropic.com) & [Google Gemini](https://google.com/gemini)
- Community fitness inspiration

---

## 📞 Contact

- **Issues**: [GitHub Issues](https://github.com/hugovntr/HuGoal/issues)
- **Discussions**: [GitHub Discussions](https://github.com/hugovntr/HuGoal/discussions)
- **Email**: Contact via GitHub profile

---

**Made with ❤️ for fitness enthusiasts worldwide**

_Last updated: April 2025_
