Para a próxima atualização iremos reformular toda a estrutura da pagina nutrition.
Eu preciso que a pagina seja simples, direta, rápida e fácil de usar e que mostre as informações necessárias.
Atualmente nós temos a ia que analisa uma foto e retorna o json e preenche as informações do prato, mas ainda não está muito rápido e eficiente e a interface não ajuda muito, eu preciso transformar a pagina inicial em uma espécie de chat coach, porém ainda com as informações gerais dos detalhes do dia, vamos também usar a mesma ideia de calendário que temos na pagina workout, inclusive podemos até copiar o mesmo elemento para que ele fique igual a parte de cima, sera a mesma ideia de poder visualizar a semana passada, atual e seguinte e clicar para ver os registros dos dias passados.
vamos ter um widget totalmente reformulado mostrando os principais macronutrientes do dia, mas tambem teremos uma página dedicada para visualizar o relatório completo de estatísticas [nessa parte eu preciso que um agente trabalhe muito bem na parte visual e talvez vamos precisar de uma outra atualização para detalhar mais o que teremos]
A parte do chat vai ser um formato em que o usuário vai poder enviar texto, audio e foto para a IA, e com isso ela vai calcular os macronutrientes.
Como vai funcionar:
1- o usuario digita um texto por exemplo: "Eu comi de manhã um pão com ovo mexido e um cafe com leite" a ia pode tentar calcular tudo isso usando informações genéricas, e retornar tudo completo cada item separados, onde então o usuário pode editar cada um deles individualmente e salvar, ou ele pode mandar uma outra mensagem pedindo para alterar especificando mais detalhes e aí sim salvar corretamente;
2- O usuário manda um áudio: "Hoje eu almocei 200g de arroz, 200g de peito de frango, 100g de brocolis e 100g de pure de batata". nesse caso a gente precisa de ter um conversor de áudio em texto bem preciso, retornar o texto como mensagem para que o usuário possa visualizar o que ele disse transcrito, vamos deixar essa mensagem salva local e o áudio salvo temporário também por 24h, o registro de mensagens reseta todo dia as 00:00, da mesma forma a ia vai analisar o que foi dito, com todas as informações e retornar o json e da mesma forma o usuário pode confirmar e salvar, ou editar e salvar.
3- imagem: mantendo da mesma forma porem ao enviar a imagem no chat ela fica armazenada por 24h também, nesse caso vamos usar o storage do firebase [precisa configurar corretamente as pastas para que seja seguro e encriptado, com o autodelete de 24h ou às 00:00 do próximo dia.

4- vamos adicionar uma Pagina de "Minha dispensa" nela vai conter todos os alimentos ja adicionados pelo usuário ou pela IA, essa vai ser uma biblioteca pessoal de cada usuário e ele vai poder editar conforme seus produtos, essa atualização eu creio que seja a mais importante pois vamos ter que configurar o sistema para que a IA analise primeiro todos os itens ja existentes e priorise usar as propriedades do existente ao invés de um novo, entao teremos id do item nome e informações nutricionais completas.
Para ficar ainda mais preciso nos iremos ter a função de adicionar item com IA, isso vai permitir que o usuário envie foto da tabela nutritional do alimento e a ia vai automaticamente ler e preencher todas as informações, por exemplo, digamos que eu adicione uma tabela de um biscoito, a ia conseguiu identificar tudo corretamente e salvou com o nome "biscoito digestive" quando o usuario disser que comeu dois biscoitos, o sistema ira enviar sempre a lista de nomes de todos os itens no catalogo dele e se algum condizer com o que ele comeu o sistema irá considerar a tabela nutricional do existente.
Isso pode ser um pouco complexo de fazer então eu preciso que um agente especialista trabalhe completamente em todos os pontos para que o frontend seja intuitivo e com instruções, tenha um minitutorial de como usar e enviar de forma facil, depois teremos um engenheiro dedicado para que o backend seja perfeito e saiba o que vai ser feito via IA ou próprio sistema, e enfim usar os frameworks corretos que tanto android quanto IOS consigam funcionar tudo, e a IA do dispositivo vai receber todas as informações necessárias com o prompt correto, e retronar o arquivo correto para que o sistema consiga ler e distribuir todas as informações.

5- você pode reconstruir a pagina nutritions toda do zero para essa atualização, aproveite somente as lógicas e como usamos a IA para entender imagens.
Vamos ter o sistema de streak de nutritions tambem igual da página workouots, aproveite os componentes de design existentes para facilitar o desenvolvimento.

analise meu repo atual para entender e criar o prompt correto e direcionado para essa atualizacao, se possivel separe em fases e cada fase precisa ser testada no final.

Tenho tudo que preciso para criar um prompt preciso e completo. Vou agora gerar com base na análise do repo.

**Stack confirmada:** React Native + Expo Router, Firebase, NativeWind/Tailwind, Zustand, `@anthropic-ai/sdk` + `@google/generative-ai`, `react-native-reanimated`, `lucide-react-native`.

**Estrutura atual da nutrition:** `index.tsx`, `add-food.tsx`, `log.tsx`, `plan.tsx`, `history.tsx`, `library.tsx`, `ai-debug.tsx`.

**Workout como referência:** tem `index.tsx` (84KB — contém o calendário semanal), `history.tsx`, `create.tsx`, `library.tsx`.

---

**Goal:** Rebuild the entire `app/(tabs)/nutrition` module from scratch with a Coach Chat interface, week calendar (cloned from workouts), macro widget, statistics page, "Minha Dispensa" pantry library, nutrition streak system, and full AI integration via text, audio, and image — phased for testability.

**Context:**

- Stack: React Native 0.81 + Expo Router ~6, Firebase v12, NativeWind v4 (Tailwind v3), Zustand v5, `react-native-reanimated` v4, `@anthropic-ai/sdk` + `@google/generative-ai`, `expo-image-picker`, `expo-camera`, `expo-av` (for audio), `lucide-react-native`, `date-fns`
- Existing files to REPLACE (keep only logic references):
  - `app/(tabs)/nutrition/index.tsx` — current main screen (MacroSummary, WaterTracker, MealSection, FloatingActionMenu pattern)
  - `app/(tabs)/nutrition/add-food.tsx` — image AI analysis (reuse the AI image→JSON logic)
  - `app/(tabs)/nutrition/log.tsx`, `history.tsx`, `library.tsx`, `plan.tsx`, `ai-debug.tsx`
- Reference components to CLONE (do NOT modify):
  - `app/(tabs)/workouts/index.tsx` — extract the `WeekCalendar` component (prev/current/next week navigation, day selection, streak dots) and reuse it identically in nutrition
- Existing stores: `useNutritionStore` (Zustand), `useAuthStore`, `useThemeStore`, `useToastStore`
- Existing lib: `lib/firestore/nutrition.ts` (`listNutritionLogs`, `deleteNutritionLog`, `updateNutritionLog`, `listWaterLogs`, `addWaterLog`), `lib/macro-calculator.ts`
- Existing design tokens: `constants/spacing.ts`, `constants/typography.ts`, theme colors via `useThemeStore`
- Firebase Storage rules already exist at `storage.rules` — extend them for nutrition images
- Firestore rules at `firestore.rules` — extend for new `pantry` and `chatMessages` collections

**Task:**

Deliver this as **5 phases**, each ending with a defined test checklist.

---

### Phase 1 — Week Calendar + Macro Widget + Streak

**Files to create/replace:**

- `app/(tabs)/nutrition/index.tsx` — full rebuild
- `components/nutrition/NutritionWeekCalendar.tsx` — extracted/cloned from workouts `WeekCalendar`, adapted for nutrition data
- `components/nutrition/MacroWidget.tsx` — compact daily widget showing Calories, Protein, Carbs, Fat as circular/ring progress indicators
- `stores/nutrition.store.ts` — add `selectedDate`, `setSelectedDate`, `streakDays: string[]`, `chatMessages: ChatMessage[]`

**Requirements:**

- Top section: identical week calendar to workouts (prev/curr/next week swipe, day dots for logged days, streak fire icon on streak days, today highlighted)
- Selecting a past day loads that day's logs (read-only view)
- Macro widget below calendar: 4 ring progress bars (Calories, Protein, Carbs, Fat) — compact, single row, values from `todayTotals` vs `dailyGoal`
- Nutrition streak: calculate from Firestore logs (consecutive days with ≥1 log), display streak count badge same style as workouts streak

**Test checklist:**

- [ ] Calendar renders and navigates prev/next week
- [ ] Tapping a past day loads logs for that date
- [ ] Macro rings update when logs change
- [ ] Streak badge shows correct count

---

### Phase 2 — Coach Chat Interface (Text + Display)

**Files to create/replace:**

- `app/(tabs)/nutrition/index.tsx` — add chat section below macro widget
- `components/nutrition/NutritionChat.tsx` — chat UI component
- `lib/ai/nutritionChatAI.ts` — AI service for text analysis
- `lib/firestore/nutritionChat.ts` — save/load messages for current day (reset at 00:00)

**Requirements:**

- Chat occupies bottom 60% of screen, scrollable, above keyboard
- Message types: `user_text`, `user_audio_transcript`, `user_image`, `ai_response`, `ai_food_items`
- AI response for text: parse food description → return structured JSON array:

```json
[
  {
    "name": "Pão",
    "quantity": 1,
    "unit": "slice",
    "calories": 80,
    "protein_g": 3,
    "carbs_g": 15,
    "fat_g": 1
  }
]
```

- Each AI food item renders as an editable card (inline edit: name, quantity, calories, protein, carbs, fat)
- "Save All" button saves confirmed items to Firestore as a nutrition log for the current meal slot (auto-detect meal by time of day)
- User can reply with corrections ("adiciona 200ml de leite") and AI updates the pending items
- Messages persist locally for the day (AsyncStorage keyed by `uid_date`), reset at 00:00

**AI Prompt for text analysis:**

```
You are a precise nutrition coach. Analyze the user's food description and return ONLY a valid JSON array.
Each item: { "name": string, "quantity": number, "unit": string, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "confidence": "high"|"medium"|"low" }
Use generic nutritional values. If quantity is unspecified, use a standard serving.
User message: "{userMessage}"
User's pantry items (prioritize exact matches): {pantryItemsJSON}
```

**Test checklist:**

- [ ] User types food description → AI returns editable cards
- [ ] User edits individual card values
- [ ] "Save All" saves to Firestore and updates macro widget
- [ ] Messages reset at midnight
- [ ] Correction message updates pending items

---

### Phase 3 — Audio Input (Speech-to-Text)

**Files to create/replace:**

- `components/nutrition/ChatInput.tsx` — input bar with text, mic, and camera buttons
- `lib/ai/speechToText.ts` — audio recording + transcription service

**Requirements:**

- Hold mic button to record (using `expo-av` `Audio.Recording`)
- On release: upload audio to Whisper API (OpenAI `openai` package already installed) or use `@google/generative-ai` audio capabilities
- Display transcribed text as a `user_audio_transcript` message bubble (editable before sending to AI)
- Store audio file temporarily: Firebase Storage at `users/{uid}/nutrition/audio/{date}/{timestamp}.m4a`
- Storage lifecycle: auto-delete rule at 24h OR at 00:00 next day (add `storage.rules` lifecycle config)
- After transcript displayed: automatically trigger food analysis (same flow as Phase 2 text)

**Storage rules to add (`storage.rules`):**

```
match /users/{userId}/nutrition/audio/{date}/{file} {
  allow read, write: if request.auth.uid == userId;
  // Note: add Firebase Storage lifecycle rule via console or CLI: delete after 1 day
}
match /users/{userId}/nutrition/images/{date}/{file} {
  allow read, write: if request.auth.uid == userId;
}
```

**Test checklist:**

- [ ] Hold mic → records audio
- [ ] Release → transcript appears as message
- [ ] Transcript auto-triggers AI food analysis
- [ ] Audio file stored in Firebase Storage
- [ ] Transcript bubble is editable

---

### Phase 4 — Image Input + Minha Dispensa (Pantry)

**Part A — Image in Chat:**

- Reuse AI image analysis logic from `add-food.tsx` (do NOT duplicate — extract to `lib/ai/nutritionImageAI.ts`)
- Image sent via chat → stored at `users/{uid}/nutrition/images/{date}/{timestamp}.jpg`
- Renders as image bubble in chat → AI returns food items JSON → same editable card flow
- Auto-delete same rules as audio

**Part B — Minha Dispensa page (`app/(tabs)/nutrition/pantry.tsx`):**

- List of all pantry items (Firestore: `users/{uid}/pantry/{itemId}`)
- Fields per item: `{ id, name, brand?, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, serving_size_g, serving_unit, createdAt, updatedAt }`
- Add item manually: form with all fields
- Add item with AI (image of nutrition label): `expo-image-picker` → send to AI → auto-fill form → user confirms
- Edit/delete each item
- Search/filter by name
- Mini-tutorial modal on first visit (show once via AsyncStorage flag): explain 3 steps (add food, AI reads label, chat uses your pantry)

**AI Prompt for nutrition label image:**

```
Analyze this nutrition label image. Return ONLY valid JSON:
{ "name": string, "brand": string|null, "calories_per_100g": number, "protein_per_100g": number, "carbs_per_100g": number, "fat_per_100g": number, "serving_size_g": number, "serving_unit": string }
If values are per serving (not per 100g), convert to per 100g. Return null for fields you cannot read.
```

**Pantry integration in chat AI:**

- Before sending user message to AI, load all pantry item names as context
- If AI detects a pantry item match (fuzzy name match), use the pantry item's exact nutritional values
- Mark matched items with `"source": "pantry"` in the response JSON

**Firestore rules to add:**

```
match /users/{userId}/pantry/{itemId} {
  allow read, write, delete: if request.auth.uid == userId;
}
```

**Test checklist:**

- [ ] Send image in chat → AI returns food items
- [ ] Image stored in Firebase Storage
- [ ] Pantry page lists, adds, edits, deletes items
- [ ] AI label scan fills pantry form correctly
- [ ] Chat AI uses pantry item values when name matches
- [ ] Tutorial modal shows on first visit only

---

### Phase 5 — Statistics Page + Navigation Cleanup

**Files to create/replace:**

- `app/(tabs)/nutrition/stats.tsx` — full statistics page
- `app/(tabs)/nutrition/_layout.tsx` — update routes
- `components/nutrition/NutritionNav.tsx` — top tab navigation within nutrition section (Chat | Stats | Pantry)

**Statistics page requirements:**

- Weekly macro averages (bar chart per day, stacked: protein/carbs/fat)
- Calorie trend line (7 and 30 days)
- Most logged foods (top 5 list)
- Goal achievement rate (% days hitting calorie + protein goals)
- Streak history visualization (calendar heatmap style)
- Use `react-native-svg` + `react-native-reanimated` for charts (already installed, no new deps)
- Design: clean cards, same `colors` tokens from `useThemeStore`, consistent with workouts stats style

**Navigation cleanup:**

- Remove old FAB (`FloatingActionMenu`) from nutrition
- Add persistent bottom input bar (ChatInput) visible only on Chat tab
- Header: streak badge + date selector (from calendar)
- Remove `ai-debug.tsx` from production routes (keep file, exclude from `_layout.tsx`)

**Test checklist:**

- [ ] Stats page loads and displays charts
- [ ] Weekly macro bars render correctly
- [ ] Streak heatmap renders
- [ ] Navigation between Chat / Stats / Pantry is smooth
- [ ] No regression on existing workout screens

---

**Output:** Complete TypeScript/TSX files for each phase, ready to drop into the existing repo. Follow existing code patterns: Zustand for state, `lib/firestore/` for all Firestore ops, `constants/spacing` and `constants/typography` for styling, `useThemeStore` for colors, `expo-router` for navigation. No new dependencies unless strictly necessary — use what's already in `package.json`. Each phase must be independently testable on device via `expo start`.

**Constraints:** No extra commentary. Strict TypeScript. No `any` types unless unavoidable. Match the existing naming conventions (camelCase files in `lib/`, PascalCase components). Reuse existing UI components from `components/ui/` before creating new ones. Each phase output ends with the test checklist rendered as comments at the top of the main changed file.
