# Workouts - HuGoal

## Visão Geral

O sistema de Workouts do HuGoal permite criar, gerenciar e executar treinos com suporte a IA para geração de planos de treino.

---

## Arquitetura

### Estrutura de Pastas

```
lib/workouts/
├── exercise-catalog.ts      # Catálogo de exercícios
├── exercise-cache.ts        # Cache de exercícios
├── exercise-filters.ts    # Filtros de busca
├── exercise-categorization-ai.ts
├── daily-workout-resolver.ts
├── weekly-schedule.ts
├── reschedule-workouts.ts
├── workout-template-validator.ts
├── workout-session-context.ts
├── workout-daily-override.ts
├── generated/             # Exercícios gerados
│   └── official-exercises.ts
├── media-upload.ts
└── muscle-slug-mapping.ts
```

---

## Tipos de Dados

### Exercise

```typescript
interface Exercise {
  id: string;
  name: string;           // Nome em português
  name_en: string;       // Nome em inglês
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment: EquipmentType[];
  difficulty: "beginner" | "intermediate" | "advanced";
  video_youtube_ids: string[];
  instructions_pt?: string;
  instructions_en?: string;
}
```

### WorkoutTemplate

```typescript
interface WorkoutTemplate {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  exercises: WorkoutExercise[];
  sections?: WorkoutSection[];
  estimated_duration_minutes: number;
  difficulty: Difficulty;
  is_ai_generated: boolean;
  schedule_day_of_week?: number;
  created_at: string;
}
```

### WorkoutExercise

```typescript
interface WorkoutExercise {
  exercise_id: string;
  name: string;
  sets: number;
  reps: number;
  rest_seconds: number;
  primary_muscles: string[];
  secondary_muscles: string[];
  order: number;
}
```

---

## Workout Store

### Arquivo: `stores/workout.store.ts`

```typescript
interface WorkoutState {
  isActive: boolean;
  currentExerciseIndex: number;
  currentSet: number;
  exercises: WorkoutExercise[];
  completedSets: CompletedSet[];
  elapsedSeconds: number;
  restSeconds: number;
  isResting: boolean;
  templateId: string | null;
  templateName: string | null;
  todayWorkout: WorkoutTemplateRecord | null;
  chatMessages: WorkoutChatMessage[];
}
```

#### Ações

```typescript
// Iniciar treino
useWorkoutStore.getState().start(templateId, templateName, exercises);

// Próximo exercício
useWorkoutStore.getState().nextExercise();

// Exercício anterior
useWorkoutStore.getState().prevExercise();

// Completar série
useWorkoutStore.getState().completeSet({
  exercise_id: "001",
  set_number: 1,
  reps: 12,
  weight_kg: 20
});

// Definir tempo de descanso
useWorkoutStore.getState().setResting(true, 60);

// Resetar
useWorkoutStore.getState().reset();
```

---

## Catálogo de Exercícios

### Fonte

O app usa catálogo bundelado local para inicialização instantânea:

```typescript
import { getExerciseCatalog } from "@/lib/workouts/exercise-catalog";

const { exercises, source } = await getExerciseCatalog();
// source: "bundled"
```

### Estrutura

```typescript
interface Exercise {
  id: string;
  name: string;
  name_en: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment: EquipmentType[];
  difficulty: "beginner" | "intermediate" | "advanced";
  video_youtube_ids: string[];
  images?: string[];
}
```

### Filtros

```typescript
import { buildMuscleTabs, toMuscleKey } from "@/lib/workouts/exercise-catalog";

// Converter nome para key
const key = toMuscleKey("Peito");
// "peito"

// Criar abas por músculo
const tabs = buildMuscleTabs(exercises);
// [{ id: "all", label: "All" }, { id: "peito", label: "Peito" }, ...]
```

---

## Execução de Treino

### Tela: Run Workout

```typescript
// app/(tabs)/workouts/[id]/run.tsx
// app/(tabs)/workouts/[id]/summary.tsx
```

#### Estados

```typescript
// Durante execução
const { isActive, currentExerciseIndex, exercises } = useWorkoutStore();

// Timer
const { elapsedSeconds, setElapsed } = useWorkoutStore();

// Descanso
const { isResting, restSeconds, setResting, tickRest } = useWorkoutStore();
```

#### Fluxo

1. Usuário toca em "Iniciar Treino"
2. Store inicializa com exercícios do template
3. Timer começa a contar
4. Usuário completa cada série
5. between séries, tempo de descanso
6. Ao final, tela de resumo com XP

---

## IA para Treinos

### Geração de Treinos

```typescript
import { analyzeWorkoutChatMessage } from "@/lib/ai/workoutChatAI";

const response = await analyzeWorkoutChatMessage(messages);
// Retorna workout gerado ou modificado
```

### Chat Context

```typescript
// lib/workouts/workout-session-context.ts
interface WorkoutSessionContext {
  templates: WorkoutTemplateRecord[];
  userLevel: FitnessLevel;
  userEquipment: Equipment[];
  schedule: WeeklySchedule;
}
```

---

## Agendamento

### Schedule Semanal

```typescript
import { resolveDailyWorkout } from "@/lib/workouts/daily-workout-resolver";

const workout = resolveDailyWorkout(date, schedule);
// Retorna treino do dia baseado no schedule
```

### Reschedule

```typescript
import { rescheduleWorkouts } from "@/lib/workouts/reschedule-workouts";

await rescheduleWorkouts(userId, skipDates);
// Reprograma treinos automaticamente
```

---

## Dados do Firestore

```
workouts/{workoutId}
├── template: WorkoutTemplate
├── session: WorkoutSession

users/{userId}
├── workout_settings: WorkoutSettings
```

### Operations

```typescript
import { getWorkouts, createWorkout, updateWorkout } from "@/lib/firestore/workouts";

const workouts = await getWorkouts(userId);
const workout = await createWorkout(template);
await updateWorkout(workoutId, { name: "Novo Nome" });
```

---

## XP e Conquistas

### Cálculo de XP

```typescript
// Base XP por treino
const BASE_XP = 50;

// Bonus por duração
const durationBonus = Math.floor(durationSeconds / 60);

// Bonus por dificuldade
const difficultyMultiplier = { beginner: 1, intermediate: 1.5, advanced: 2 };

xpEarned = BASE_XP + durationBonus + difficultyMultiplier;
```

---

## Componentes

### WorkoutCard

```typescript
import { WorkoutCard } from "@/components/workouts/WorkoutCard";

<WorkoutCard
  template={template}
  onPress={() => navigate(`/workouts/${template.id}`)}
  onStart={() => startWorkout(template.id)}
/>
```

### ExerciseCard

```typescript
import { ExerciseCard } from "@/components/workouts/ExerciseCard";

<ExerciseCard
  exercise={exercise}
  setsCompleted={3}
  currentSet={1}
/>
```

### MuscleMap

```typescript
import { MuscleMap } from "@/components/workouts/MuscleMap";

<MuscleMap
  primary={["peito", "ombro"]}
  secondary={["tríceps"]}
/>
```

---

## Rotas

| Rota | Arquivo | Descrição |
|------|--------|-----------|
| `/workouts` | `index.tsx` | Lista de treinos |
| `/workouts/create` | `create.tsx` | Criar treino |
| `/workouts/library` | `library.tsx` | Biblioteca de exercícios |
| `/workouts/history` | `history.tsx` | Histórico |
| `/workouts/[id]` | `[id]/index.tsx` | Detalhes |
| `/workouts/[id]/edit` | `[id]/edit.tsx` | Editar |
| `/workouts/[id]/run` | `[id]/run.tsx` | Executar |
| `/workouts/[id]/summary` | `[id]/summary.tsx` | Resumo |

---

## Equipamentos

### Tipos

```typescript
type EquipmentType = 
  | "none"
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "bodyweight"
  | "band"
  | "kettlebell";
```

### Catálogo

O app tem catálogo completo em `constants/equipmentCatalog.ts`:

```typescript
const EQUIPMENT_CATALOG = [
  { id: "barbell", label: "Barra", category: "free_weights" },
  { id: "dumbbell", label: "Haltere", category: "free_weights" },
  { id: "kettlebell", label: "Kettlebell", category: "free_weights" },
  // ...
];
```

---

## Imagens de Exercícios

### Upload

```typescript
import { uploadExerciseMedia } from "@/lib/workouts/media-upload";

const urls = await uploadExerciseMedia(exerciseId, localUri);
// Upload de imagem para Firebase Storage
```

---

## Próximos Funcionalidades

- **Rest Timer**: Timer automático entre séries
- **Voice Commands**: Comandos de voz durante treino
- **Video Demonstrations**: Vídeos em streaming
- **Social Challenges**: Desafios entre usuários

---

**Última Atualização**: 2026-04-24