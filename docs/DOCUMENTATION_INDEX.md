# HuGoal - Documentação Completa do Projeto

## Visão Geral

**HuGoal** (anteriormente BetterU) é um aplicativo móvel de fitness e bem-estar desenvolvido com **Expo/React Native**. O aplicativo oferece rastreamento de nutrição, treinos, comunidade social e assistente de IA para auxiliar o usuário em sua jornada fitness.

- **Plataforma**: iOS + Android (Expo)
- **Estado**: Desenvolvimento Ativo
- **Branch Principal**: preview

---

## Stack Tecnológica

### Core
| Tecnologia | Versão | Descrição |
|------------|--------|-----------|
| Expo | 54.0.33 | Framework React Native |
| React Native | 0.81.5 | Biblioteca principal |
| TypeScript | 5.9.2 | Tipagem estática |
| Node.js | 20.x+ | Runtime |

### Estado & Persistência
| Tecnologia | Uso |
|------------|-----|
| Zustand | Gerenciamento de estado global |
| AsyncStorage | Persistência local |
| MMKV | Cache rápido (não disponível no Expo Go) |
| SecureStore | Dados sensíveis (tokens) |

### Navegação
| Tecnologia | Uso |
|------------|-----|
| expo-router | File-based routing |
| React Navigation | Navegação internar |

### Integração AI
| Tecnologia | Provider |
|------------|-----------|
| @anthropic-ai/sdk | Claude |
| @google/generative-ai | Gemini |
| openai | OpenAI |
| replicate | Modelos de imagem |

### Firebase
| Serviço | Uso |
|----------|-----|
| Firebase Auth | Autenticação |
| Firestore | Banco de dados |
| Storage | Imagens e mídias |

---

## Estrutura de Pastas

```
hugoal/
├── app/                    # Expo Router (file-based routing)
│   ├── (auth)/            # Grupo de autenticação
│   │   ├── login.tsx      # Login
│   │   ├── signup.tsx    # Cadastro
│   │   ├── verify-email.tsx
│   │   ├── welcome.tsx
│   │   └── onboarding/   # Fluxo de onboarding
│   │       ├── index.tsx
│   │       ├── gender.tsx
│   │       ├── age.tsx
│   │       ├── height.tsx
│   │       ├── weight.tsx
│   │       ├── goal.tsx
│   │       ├── goals.tsx
│   │       ├── experience.tsx
│   │       ├── diet.tsx
│   │       ├── level.tsx
│   │       └── profile-info.tsx
│   ├── (tabs)/            # Navegação por tabs
│   │   ├── home.tsx       # Dashboard
│   │   ├── profile.tsx    # Perfil do usuário
│   │   ├── nutrition/    # Nutrição
│   │   ├── workouts/     # Treinos
│   │   └── community/    # Comunidade
│   ├── settings/         # Configurações
│   │   ├── index.tsx
│   │   ├── profile-edit.tsx
│   │   ├── about.tsx
│   │   └── ai-keys.tsx
│   ├── user/             # Perfil público
│   │   └── [id].tsx
│   └── _layout.tsx        # Root layout
│
├── components/           # Componentes React
│   ├── ui/              # Design system base
│   ├── auth/            # Componentes de auth
│   ├── chat/            # Componentes de chat AI
│   ├── community/       # Componentes community
│   ├── dashboard/      # Dashboard widgets
│   ├── nutrition/       # Nutrição
│   ├── workouts/        # Treinos
│   └── shared/          # Componentes compartilhados
│
├── stores/              # Zustand stores
│   ├── auth.store.ts
│   ├── theme.store.ts
│   ├── nutrition.store.ts
│   ├── workout.store.ts
│   ├── community.store.ts
│   ├── chat.store.ts
│   ├── navigation.store.ts
│   ├── toast.store.ts
│   └��─ dashboard.store.ts
│
├── hooks/               # Custom React hooks
│   ├── useGoogleSignIn.ts
│   ├── useFoodLibrary.ts
│   ├── useNutritionGoal.ts
│   ├── useWorkoutChatPanel.ts
│   ├── useOnboardingDraft.ts
│   ├── useStreakValidator.ts
│   ├── useUsernameCheck.ts
│   └── useWeeklyActivity.ts
│
├── lib/                 # Utilitários e serviços
│   ├── ai/             # Serviços de IA
│   ├── chat/           # Serviços de chat
│   ├── firestore/      # Firestore helpers
│   ├── workouts/       # Utilitários de treino
│   ├── nutrition/      # Utilitários de nutrição
│   ├── firebase.ts     # Firebase config
│   ├── i18n.ts        # Internacionalização
│   └── api-key-store.ts
│
├── constants/           # Constantes do app
│   ├── colors.ts
│   ├── typography.ts
│   ├── spacing.ts
│   ├── design-system.ts
│   ├── equipmentCatalog.ts
│   └── ai-models.ts
│
├── types/               # Definições TypeScript
│   └── index.ts        # Todos os tipos do app
│
├── assets/             # Recursos estáticos
│   ├── images/
│   ├── audios/
│   └── coachai/      # dados do CoachAI
│
├── docs/               # Documentação
│   ├── agent-plans/
│   └── components_prompts/
│
└── __tests__/         # Testes
    └── integration/
```

---

## Rotas de Navegação

### Autenticação (auth/)
| Rota | Arquivo | Descrição |
|------|--------|-----------|
| /auth | auth.tsx | Tela principal de login/cadastro |
| /onboarding | onboarding/index.tsx | Início do onboarding |
| /onboarding/gender | gender.tsx | Seleção de gênero |
| /onboarding/age | age.tsx | Input de idade |
| /onboarding/personal | personal.tsx | Nome e username |
| /onboarding/height | height.tsx | Altura em cm |
| /onboarding/weight | weight.tsx | Peso em kg |
| /onboarding/goal | goal.tsx | Objetivo principal |
| /onboarding/goals | goals.tsx | Múltiplos objetivos |
| /onboarding/experience | experience.tsx | Niveau de experiência |
| /onboarding/diet | diet.tsx | Preferências dietéticas |
| /onboarding/level | level.tsx | Días de treino |
| /onboarding/profile-info | profile-info.tsx | Resumo do perfil |

### Abas Principais (tabs/)
| Aba | Rota | Descrição |
|-----|------|-----------|
| Home | /home | Dashboard principal |
| Workouts | /workouts | Lista de treinos |
| Nutrition | /nutrition | Tracking nutricional |
| Community | /community | Feed social |
| Profile | /profile | Perfil do usuário |

### Configurações (settings/)
| Rota | Descrição |
|------|-----------|
| /settings | Menu de configurações |
| /settings/profile-edit | Editar perfil |
| /settings/about | Sobre o app |
| /settings/ai-keys | Configurar chaves de API |

---

## Stores Zustand

### auth.store.ts
Gerencia autenticação e perfil do usuário.
```typescript
// Principais estados e ações
- user: UserProfile | null
- status: AuthStatus
- signInWithGoogle()
- signOut()
- updateProfile(data)
```

### nutrition.store.ts
Gerencia dados nutricionais.
```typescript
// Principais estados e ações
- dailyLogs: Record<string, NutritionLog[]>
- settings: NutritionSettings
- addFoodLog(date, log)
- updateSettings(settings)
```

### workout.store.ts
Gerencia treinos e exercícios.
```typescript
// Principais estados e ações
- templates: WorkoutTemplate[]
- sessions: WorkoutSession[]
- activeWorkout: WorkoutSession | null
- createTemplate(template)
- startWorkout(id)
- completeWorkout(results)
```

### community.store.ts
Gerencia feed social e grupos.
```typescript
// Principais estados e ações
- posts: CommunityPost[]
- groups: CommunityGroup[]
- createPost(content)
- joinGroup(id)
- checkIn(groupId, data)
```

### theme.store.ts
Gerencia tema visual.
```typescript
// Estados
- theme: 'light' | 'dark' | 'system'
- primaryColor: string
```

---

## Tipos Principais (types/index.ts)

### Usuário
```typescript
type Goal = "lose_fat" | "gain_muscle" | "maintain" | "recomp"
type FitnessLevel = "beginner" | "intermediate" | "advanced"
type Sex = "male" | "female" | "other"

interface UserProfile {
  id: string
  email: string
  name: string
  username: string
  xp: number
  streak_current: number
  streak_longest: number
  onboarding_complete: boolean
  // ...outros campos
}
```

### Treinos
```typescript
interface WorkoutTemplate {
  id: string
  name: string
  exercises: WorkoutExercise[]
  sections?: WorkoutSection[]
  estimated_duration_minutes: number
  difficulty: Difficulty
}

interface WorkoutSession {
  id: string
  started_at: string
  ended_at: string
  duration_seconds: number
  sets_completed: CompletedSet[]
  xp_earned: number
}
```

### Nutrição
```typescript
type MealType = "breakfast" | "lunch" | "dinner" | "snack"

interface NutritionLog {
  id: string
  meal_type: MealType
  items: NutritionItem[]
  total: {
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
  }
}
```

### Comunidade
```typescript
interface CommunityPost {
  id: string
  author_id: string
  content: string
  media: PostMedia[]
  like_count: number
  comment_count: number
}

interface CommunityGroup {
  id: string
  name: string
  member_count: number
  challenge_type: ChallengeType
}
```

---

## Integração de IA

### Provedores Suportados
O app suporta múltiplos provedores de IA:
- **Claude** (Anthropic) - Chat e análise
- **Gemini** (Google) - Visão e texto
- **OpenAI** - GPT models
- **Replicate** - Modelos de imagem

### Arquivos Principais
- `lib/ai-provider.ts` - Factory de provedores
- `lib/ai/homeChatAI.ts` - Chat para home
- `lib/ai/nutritionChatAI.ts` - Chat de nutrição
- `lib/ai/workoutChatAI.ts` - Chat de treinos
- `lib/nutrition-vision.ts` - Análise de imagens de comida

---

## Fluxo de Onboarding

O onboarding guia o usuário através de:

1. **Autenticação** → Login/Cadastro com Google
2. **Gênero** → male/female/other
3. **Idade** → Input numérico
4. **Personal** → Nome e username
5. **Altura** → cm
6. **Peso** → kg
7. **Objetivo** → lose_fat/gain_muscle/maintain/recomp
8. **Experiência** → beginner/intermediate/advanced
9. **Dieta** → Restrições alimentares
10. **Level** → Dias por semana

---

## Firebase

### Estrutura de Dados Firestore

```
users/{userId}
├── profile          # UserProfile
├── workout_settings
├── nutrition_settings
├── dashboard_config
│
workouts/{workoutId}
├── template        # WorkoutTemplate
├── session        # WorkoutSession
│
nutrition/{userId}
├── logs/{logId}   # NutritionLog
├── settings      # NutritionSettings
├── pantry        # FoodLibraryItem[]
│
community/
├── posts/{postId}
├── groups/{groupId}
├── checkins/{checkInId}
│
users/{userId}/
    following/{followingId}
    followers/{followerId}
```

---

## Comandos Úteis

```bash
# Desenvolvimento
npm start              # Iniciar Expo
npm run start:go      # Expo Go
npm run start:go:lan  # Rede local

# Build
npm run android       # Build Android
npm run ios           # Build iOS

# Qualidade
npm run lint          # ESLint
npm run type-check    # TypeScript

# Testes
npm test              # Unit tests
npm run test:integration # Integração
```

---

## Variáveis de Ambiente

Criar `.env.local` baseado em `.env.example`:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=

# AI Keys (opcional)
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
OPENAI_API_KEY=
```

---

## Status de Implementação

| Módulo | Status | Notas |
|--------|--------|--------|
| Auth | ✅ Completo | Google Sign-In + Firebase |
| Onboarding | ✅ Completo | Fluxo completo com validation |
| Dashboard | ✅ Completo | Widgets customizáveis |
| Workouts | ✅ Completo | Templates + execução |
| Nutrition | ✅ Completo | AI logging + pantry |
| Community | ✅ Completo | Posts, grupos, check-ins |
| Chat AI | ✅ Completo | Claude/Gemini/OpenAI |
| settings | ✅ Completo | Perfil, AI keys, tema |

---

## Próximos Passos de Documentação

Para cada área abaixo, detailed documentação será criada:

1. **Design System** - Cores, tipografia, componentes base
2. **Autenticação** - Fluxo completo, Firebase integration
3. **Dashboard** - Widgets, configuração
4. **Workouts** - Criação, execução, AI generation
5. **Nutrição** - Logging, AI, pantry, settings
6. **Comunidade** - Feed, grupos, leaderboard
7. **Chat AI** - Providers, usage tracking
8. **Build & Deploy** - EAS, OTA updates

---

**Última Atualização**: 2026-04-24
**Versão**: 1.0.0 (preview)