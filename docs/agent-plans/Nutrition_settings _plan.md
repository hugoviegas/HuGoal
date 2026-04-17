Nutrition — Plano de Atualização
Fase 1 — RDI Onboarding & Settings
O que precisamos perguntar (Mifflin-St Jeor)
A fórmula padrão da indústria para calcular RDI é a Mifflin-St Jeor combinada com o multiplicador TDEE (Total Daily Energy Expenditure). Precisamos de 5 dados essenciais:

Pergunta Campo Tipo
Sexo biológico sex male / female
Idade age número (anos)
Altura height_cm número (cm) — já temos no onboarding
Peso atual current_weight_kg número (kg) — já temos no onboarding
Objetivo de peso goal_weight_kg número (kg) — novo
Nível de atividade activity_level low/moderate/high/very_high — igual às imagens
Objetivo principal goal lose/maintain/gain
O cálculo final:

BMR (homem) =
10
×
p
e
s
o

- 6.25
  ×
  a
  l
  t
  u
  r
  a
  −
  5
  ×
  i
  d
  a
  d
  e
- 5
  10×peso+6.25×altura−5×idade+5

BMR (mulher) =
10
×
p
e
s
o

- 6.25
  ×
  a
  l
  t
  u
  r
  a
  −
  5
  ×
  i
  d
  a
  d
  e
  −
  161
  10×peso+6.25×altura−5×idade−161

TDEE = BMR × activity multiplier (1.2 → 1.9 dependendo do nível)

RDI = TDEE − 500 kcal (para perda) / TDEE (manter) / TDEE + 300 (ganho)

Estrutura de arquivos novos
text
app/(tabs)/nutrition/
settings.tsx ← já existe, será completamente refatorado
onboarding/
\_layout.tsx ← novo
index.tsx ← intro screen (texto "Vamos definir seus Goals")
goals.tsx ← objetivo: perder / manter / ganhar
goal-weight.tsx ← peso alvo (reutiliza WeightPicker do onboarding)
activity.tsx ← nível de atividade (layout igual às imagens)
result.tsx ← exibe o RDI calculado + salva

lib/nutrition/rdi.ts ← função pura calculateRDI(inputs) → number
DB — Firestore / user profile
Os dados devem ser salvos no documento do utilizador (users/{uid}) com campos novos:

ts
nutritionGoal: {
sex: "male" | "female";
age: number;
height_cm: number;
current_weight_kg: number;
goal_weight_kg: number;
activity_level: "low" | "moderate" | "high" | "very_high";
goal: "lose" | "maintain" | "gain";
rdi_kcal: number; // calculado e salvo
macro_split: { // padrão: 30P/40C/30F
protein_pct: number;
carbs_pct: number;
fat_pct: number;
};
updated_at: Timestamp;
}
Settings refatorada
O settings.tsx atual tem só placeholders "Coming soon". Após o onboarding, ele passa a:

Mostrar o RDI calculado e os macros resultantes

Ter um botão "Recalculate my RDI" que relança o onboarding

Permitir edição manual dos campos (peso, goal, atividade) inline

Manter o ajuste de unidades (g vs oz) e os reminders que já existem

Fase 2 — Reorganização do Backend/Frontend de Nutrition
Situação atual (identificada no código)
O index.tsx tem dois botões — Dispensa e Log Meal . O pantry.tsx carrega via listPantryItems(user.uid) do Firestore , mas provavelmente o path da collection está desatualizado face ao novo schema. O library.tsx existe separado, duplicando a lógica de catálogo.

Estratégia de unificação
text
pantry.tsx → renomear/refatorar para food-library.tsx
library.tsx → ELIMINAR (merge na food-library)
A food-library.tsx vira a única fonte de verdade para alimentos salvos, com:

Search + filtro por categoria/macro

Edit / Delete inline (já implementado no pantry atual )

AI label scan (já implementado )

Reuso direto no add-food.tsx e log.tsx via hook useFoodLibrary()

Fix do Pantry não carregando
O bug é quase certamente o path da Firestore collection. Precisamos confirmar em lib/firestore/pantry.ts se o path bate com o schema atual. O fix é:

Verificar a collection path (users/{uid}/pantry vs pantry/{uid}/items ou similar)

Garantir regras de segurança Firestore para o novo path

Adicionar índice composto se a query fizer orderBy + where

Navegação limpa
O index.tsx de nutrition deve ter apenas:

Botão Log Meal → /(tabs)/nutrition/log

Botão Food Library (substituindo Dispensa) → /(tabs)/nutrition/food-library

Acesso a Settings pelo header icon (já existe o settings.tsx)
