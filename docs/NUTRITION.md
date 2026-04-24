# Nutrition - HuGoal

## Visão Geral

O sistema de Nutrição do HuGoal permite:
- Logging de refeições (manual e por IA)
- Controle de macros (calorias, proteína, carboidratos, gordura)
- Água/hidratação
- Biblioteca de alimentos (pantry)
- Plano alimentar
- Chat com IA para análise

---

## Estrutura de Pastas

```
lib/
├── nutrition/
│   ├── rdi.ts              # Ingestão diária recomendada
│   └── unified-food.ts     # Modelo unificado de alimento
├── firestore/
│   ├── nutrition.ts         # Operações Firestore
│   ├── nutrition-settings.ts
│   ├── nutrition-reminders.ts
│   └── nutritionChat.ts
├── nutrition-ai.ts         # Chat AI
├── nutrition-vision.ts      # Análise de imagem
├── macro-calculator.ts      # Cálculo de macros
├── food-service.ts         # Serviços de alimentos
├── nutritionChat.ts       # Chat de nutrição

stores/
├── nutrition.store.ts     # Estado global
├── nutrition-onboarding.store.ts

components/nutrition/
├── NutritionChat.tsx
├── AddFoodModal.tsx
├── FoodItemCard.tsx
├── MacroRing.tsx
├── MacroSummary.tsx
├── MealSection.tsx
├── WaterTracker.tsx
├── NutritionWeekCalendar.tsx
```

---

## Tipos de Dados

### MealType

```typescript
type MealType = 
  | "breakfast"   // Café da manhã
  | "lunch"      // Almoço
  | "dinner"     // Jantar
  | "snack"      // Lanche
  | "pre_workout"
  | "post_workout";
```

### NutritionItem

```typescript
interface NutritionItem {
  food_name: string;
  brand?: string;
  serving_size_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  source: "manual" | "ocr" | "ai_photo" | "ai_generated";
  photo_url?: string;
  ai_suggested?: boolean;
  confidence?: number;
}
```

### NutritionLog

```typescript
interface NutritionLog {
  id: string;
  user_id: string;
  logged_at: string;
  meal_type: MealType;
  items: NutritionItem[];
  total: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  image_url?: string;
  metadata?: {
    source: "manual" | "nutrition_review" | "ai_generated";
    review_session_id?: string;
    ai_model?: string;
  };
}
```

### DailyNutritionGoal

```typescript
interface DailyNutritionGoal {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}
```

---

## Nutrition Store

### Arquivo: `stores/nutrition.store.ts`

```typescript
interface NutritionState {
  todayLogs: NutritionLog[];
  dailyGoal: DailyNutritionGoal;
  waterMl: number;
  selectedDate: string;
  streakDays: string[];
  chatMessages: ChatMessage[];
  selectedFoodSelection: {
    item: NutritionItem;
    editIndex: number | null;
  } | null;
}
```

#### Ações

```typescript
// Adicionar log
useNutritionStore.getState().addLog(nutritionLog);

// Remover log
useNutritionStore.getState().removeLog(logId);

// Definir meta diária
useNutritionStore.getState().setDailyGoal({
  calories: 2000,
  protein_g: 150,
  carbs_g: 200,
  fat_g: 65
});

// Água
useNutritionStore.getState().addWater(250); // +250ml
useNutritionStore.getState().setWater(0); // Reset

// Chat
useNutritionStore.getState().addChatMessage(message);
useNutritionStore.getState().clearChatMessages();

// Totais do dia (computed)
const { todayTotals } = useNutritionStore();
```

---

## Meta Diária (RDI)

### C��lculo (lib/nutrition/rdi.ts)

```typescript
import { calculateRDI } from "@/lib/nutrition/rdi";

const result = calculateRDI({
  sex: "male",
  age: 30,
  height_cm: 180,
  current_weight_kg: 80,
  goal_weight_kg: 75,
  activity_level: "moderate",
  goal: "lose"
});

// result = { bmr, tdee, rdi_kcal, macro_split }
```

### Split de Macros

```typescript
const macro_split = {
  protein_pct: 30,  // ~2g/kg
  carbs_pct: 40,    // Restante
  fat_pat: 30       // ~0.8g/kg
};
```

---

## Chat de Nutrição (AI)

### Text Analysis

```typescript
import { analyzeNutritionChatText } from "@/lib/nutrition-ai";

const items = await analyzeNutritionChatText(
  "Café com pão integral e ovo"
);
// Retorna: [NutritionItem]
```

### Image Analysis

```typescript
import { analyzeMealImageToChatItems } from "@/lib/nutrition-vision";

const items = await analyzeMealImageToChatItems(photoUri);
// Analisa foto da refeição e retorna items
```

#### Fluxo

1. Usuário envia mensagem de texto ou foto
2. AI analisa e retorna `NutritionItem[]`
3. Usuário confirma/edita items
4. Items adicionados ao log do dia

---

## Biblioteca de Alimentos (Pantry)

### Adicionar Item

```typescript
import { addToPantry } from "@/lib/firestore/nutrition";

await addToPantry(userId, {
  name: "Arroz integral",
  brand: "Caminho Natural",
  serving_size_g: 100,
  calories: 110,
  protein_g: 2.5,
  carbs_g: 23,
  fat_g: 0.5
});
```

### Usar da Pantry

```typescript
// Na tela de adicionar alimento
const foods = await getPantry(userId);
// Mostra alimentos do usuário para selecionar
```

---

## Water Tracker

### Configurações

```typescript
interface HydrationSettings {
  daily_target_ml: number;  // Meta diária (ex: 2500ml)
  cup_size_ml: number;      // Tamanho do copo (ex: 250ml)
}
```

### Tracking

```typescript
const { waterMl, addWater, setDailyGoal } = useNutritionStore();

// Adicionar
addWater(250);

// Meta
setDailyGoal({ ...goal, water_goal_ml: 2500 });
```

---

## UI Components

### MacroSummary

```typescript
import { MacroSummary } from "@/components/nutrition/MacroSummary";

<MacroSummary
  consumed={todayTotals}
  goal={dailyGoal}
  showPct={true}
/>
```

### MealSection

```typescript
import { MealSection } from "@/components/nutrition/MealSection";

<MealSection
  type="breakfast"
  logs={breakfastLogs}
  onAdd={onAdd}
  onEdit={onEdit}
/>
```

### WaterTracker

```typescript
import { WaterTracker } from "@/components/nutrition/WaterTracker";

<WaterTracker
  consumed={waterMl}
  goal={2500}
/>
```

### NutritionWeekCalendar

```typescript
import { NutritionWeekCalendar } from "@/components/nutrition/NutritionWeekCalendar";

<NutritionWeekCalendar
  selectedDate={date}
  onSelectDate={(d) => setDate(d)}
  data={weekData}
/>
```

---

## Rotas

| Rota | Arquivo | Descrição |
|------|--------|-----------|
| `/nutrition` | `index.tsx` | Principal + Chat AI |
| `/nutrition/log` | `log.tsx` | Logging manual |
| `/nutrition/add-food` | `add-food.tsx` | Adicionar alimento |
| `/nutrition/food-library` | `food-library.tsx` | Biblioteca |
| `/nutrition/history` | `history.tsx` | Histórico |
| `/nutrition/pantry` | `pantry.tsx` | Despensa |
| `/nutrition/plan` | `plan.tsx` | Plano alimentar |
| `/nutrition/settings` | `settings.tsx` | Configurações |
| `/nutrition/ai-debug` | `ai-debug.tsx` | Debug AI |
| `/nutrition/onboarding` | `onboarding/index.tsx` | Onboarding nutrição |

---

## Firestore Data

```
nutrition/{userId}/
├── logs/{logId}      # NutritionLog
├── settings         # NutritionSettings
├── pantry          # FoodLibraryItem[]
├─��� reminders       # NutritionReminder[]
```

### Operações

```typescript
import {
  getNutritionLogs,
  addNutritionLog,
  getNutritionSettings,
  updateNutritionSettings,
  addToPantry,
  getPantryItems
} from "@/lib/firestore/nutrition";
```

---

## Calcular Macros

### Macro Calculator

```typescript
import { calculateMacros } from "@/lib/macro-calculator";

const totals = calculateMacros(items);
// { calories, protein_g, carbs_g, fat_g }
```

---

## Onboarding de Nutrição

```typescript
// app/(tabs)/nutrition/onboarding/

// Fluxo:
// 1. activity.tsx    - Nível de atividade
// 2. goal-weight.tsx - Peso objetivo
// 3. goals.tsx      - Metas de macros
// 4. result.tsx     - Resultado com RDI
```

---

## Food Service

Serviço para buscar alimentos:

```typescript
import { searchFoods } from "@/lib/food-service";

const foods = await searchFoods("frango");
// Busca em múltiplas fontes
```

---

## Modelo Unificado

### UnifiedFoodItem

```typescript
interface UnifiedFoodItem {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  serving_type: "weight" | "unit" | "liquid";
  base_serving_value: number;
  base_serving_unit: "g" | "ml" | "unit";
  unit_weight_g?: number;
  kcal_per_base: number;
  protein_g_per_base: number;
  carbs_g_per_base: number;
  fat_g_per_base: number;
  fiber_g_per_base?: number;
  barcode?: string;
}
```

---

## Próximas Funcionalidades

- **Barcode Scanner**: Ler código de barras
- **Meal Planning**: Planejador de refeições
- **Recipes**: Receitas com macros calculados
- **Shopping List**: Lista de compras

---

**Última Atualização**: 2026-04-24