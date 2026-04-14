# Handoff: Investigação de Quebra Global de Estilos (HuGoal)

**Data:** 2026-04-14  
**Branch atual:** `preview`  
**Status:** Em andamento — causa raiz identificada, correção pendente de validação

---

## 1. Objetivo

Identificar e corrigir a razão pela qual todos os estilos visuais do app
HuGoal (Expo/React Native) quebraram após uma atualização de código. O
usuário relata que mesmo após `expo start --clear` e atualização OTA, os
estilos permanecem quebrados — especialmente no Android via Expo Go.

---

## 2. Contexto essencial

### Stack
| Pacote | Versão |
|---|---|
| Expo SDK | 54.0.33 |
| React Native | 0.81.5 |
| NativeWind | 4.2.3 |
| react-native-css-interop | 0.2.3 |
| React Native Reanimated | 4.1.7 |
| react-native-worklets | 0.5.1 (dep transitiva do Reanimated 4 — **não é conflito**) |
| TypeScript | 5.3.3 |

### Restrições importantes
- `darkMode: "class"` no `tailwind.config.js` — 351 instâncias de `dark:` classes no projeto. **Não pode ser removido.**
- Dark mode via NativeWind (`dark:` utilities) é SEPARADO do dark mode via Zustand (`useThemeStore` → `colors.xxx`). Ambos coexistem.
- `edgeToEdgeEnabled: true` no `app.json` → requer rebuild nativo (não funciona via OTA nem Expo Go padrão).
- `runtimeVersion: "1.0.0"` fixo no `app.json` (foi mudado de `{ "policy": "sdkVersion" }` para evitar rejeição de OTA por patch do SDK).

### Decisões já tomadas
- Todos os `<Stack>` aninhados devem ter `contentStyle: { backgroundColor: colors.background }` — sem isso, as telas ficam com fundo transparente no Android com `edgeToEdgeEnabled: true`.
- Componentes Android não usam `BlurView` (glass effect) — recebem fallback opaco com `colors.card`.
- `withOpacity(color, alpha)` de `@/lib/color` — uso obrigatório no lugar de concatenação hex (`colors.primary + "CC"`).
- Ícones: SOMENTE `lucide-react-native`. Nunca emoji.

---

## 3. O que já foi feito

### Fixes aplicados (já no código, branch `preview`)

1. **`app/(tabs)/workouts/_layout.tsx`** — Adicionado `contentStyle: { backgroundColor: colors.background }` e `useThemeStore`.
2. **`app/(tabs)/nutrition/_layout.tsx`** — Mesmo padrão.
3. **`app/(tabs)/community/_layout.tsx`** — Mesmo padrão. Modais com `animation: "slide_from_bottom"`.
4. **`app/(tabs)/community/groups/_layout.tsx`** — Mesmo padrão.
5. **`app/user/_layout.tsx`** — `contentStyle` adicionado (já tinha `useThemeStore` mas Stack estava sem).
6. **`app/_layout.tsx`** — Removido `style={{ flex: 1 }}` redundante do root `<View>` (mantido apenas via `className="flex-1"`). **Atenção: esta mudança pode ser a causa de um problema secundário — ver seção 6.**
7. **`components/ui/GlassCard.tsx`** — Adicionado branch Android com fundo opaco (`colors.card`, `elevation: 4`) em vez de `BlurView` semi-transparente.
8. **`components/ui/modern-mobile-menu.tsx`** — Adicionado fallback View com `backgroundColor: colors.card` para Android (sem BlurView).
9. **`components/ui/Spinner.tsx`** — `useNativeDriver: false → true` em todos os 6 `Animated.timing`.
10. **`components/dashboard/DashboardHeader.tsx`** — Substituídas cores hardcoded (`rgba`, `#9ca3af`, `#fff`) por `colors.mutedForeground`, `colors.primaryForeground`, `withOpacity()`.
11. **`components/dashboard/widgets/CommunityWidget.tsx`** — Substituída concatenação hex (`colors.primary + "CC"`) por `withOpacity()`. Cor `#fff` → `colors.primaryForeground`.
12. **`components/dashboard/widgets/WorkoutWidget.tsx`** — Cores `#fff` nos botões → `colors.accentForeground` / `colors.primaryForeground`.
13. **`metro.config.js`** — Adicionado alias `"lucide-react" → lucide-react-native` para evitar erro de DOM import em build nativo.
14. **`app.json`** — OTA: `fallbackToCacheTimeout: 3000`, `checkAutomatically: "ON_LOAD"`. `runtimeVersion: "1.0.0"`.
15. **`package.json`** — Restaurado `lucide-react: "^0.462.0"` (usado por `InteractiveMenuWeb.tsx`).

### O que foi descartado/investigado e eliminado
- **`react-native-worklets` como conflito** → FALSO ALARME. É dep transitiva legítima do Reanimated 4 (`npm ls react-native-worklets` confirma). Não remover.
- **Erro TypeScript em `workouts/index.tsx:815`** (implicit `any`) → `npx tsc --noEmit` retorna ZERO erros. Não é causa do problema.
- **Imports inválidos em `workouts/index.tsx`** → Todos os exports confirmados existem em `lib/firestore/workouts.ts`, `lib/workouts/adapt-workout.ts`, `lib/workouts/daily-workout-resolver.ts`.

---

## 4. Estado atual

### Root cause identificada: `newArchEnabled` flip sem rebuild nativo

O commit `b434daf` (13 abr 2026) fez:
```
- "newArchEnabled": false   ← REMOVIDO
```

Efeito: Com Expo SDK 54, o padrão é `newArchEnabled: true` (New Architecture / Fabric). Ao remover o `false`, o app passou de **Old Architecture → New Architecture** sem rebuild nativo.

**Sintoma**: Expo Go não foi recompilado com a nova configuração. A renderização via Fabric + NativeWind `react-native-css-interop 0.2.3` produz comportamento inesperado — estilos aplicados via `className` NativeWind podem falhar silenciosamente.

O app.json hoje tem explicitamente `"newArchEnabled": true`, e os estilos continuam quebrados porque:
1. O Expo Go instalado no dispositivo foi compilado com Old Architecture
2. NativeWind `react-native-css-interop 0.2.3` pode ter incompatibilidades com RN 0.81.5 + New Architecture sem build dedicado

### O que funciona
- TypeScript compila sem erros (`npx tsc --noEmit` → 0 erros)
- Todos os imports em `workouts/index.tsx` são válidos
- Todos os Stack layouts têm `contentStyle`
- Colors inline via `useThemeStore().colors` funcionam (Zustand independente)

### O que está quebrado
- Estilos NativeWind via `className` (especialmente `dark:` utilities) podem não aplicar corretamente no Android via Expo Go
- Visual do app no Android está desalinhado / sem estilos corretos

### Estado do git
```
Branch: preview
Working tree: CLEAN (nenhuma mudança uncommitted)
Stash: stash@{0} em feat/expo-mobile-setup (.firebase/logs/ — irrelevante)
```

---

## 5. Próximos passos

### Caminho A — Quick fix (testar imediatamente)

Reverter temporariamente para Old Architecture para confirmar que é essa a causa:

```json
// app.json
"newArchEnabled": false
```

Depois:
```bash
cd HuGoal
npx expo start --clear
```

Abrir no Expo Go e verificar se os estilos voltam. Se voltar → **causa confirmada**. Seguir para Caminho B.

---

### Caminho B — Fix correto (produção)

Manter `"newArchEnabled": true` e fazer um build nativo dedicado:

```bash
# Dev build com New Architecture para Android
eas build --profile development --platform android
```

Instalar o APK gerado e testar. Isso compila o Hermes + Fabric + TurboModules corretamente com NativeWind.

Se ainda houver problemas após o dev build, atualizar `react-native-css-interop` para versão mais recente compatível com RN 0.81:
```bash
npm install react-native-css-interop@latest
```
(verificar se NativeWind 4.2.3 aceita a nova versão do css-interop)

---

### Caminho C — Investigar o `style={{ flex: 1 }}` removido

Em `app/_layout.tsx`, o root `<View>` foi simplificado de:
```tsx
<View className={isDark ? "dark flex-1" : "flex-1"} style={{ flex: 1 }}>
```
para:
```tsx
<View className={isDark ? "dark flex-1" : "flex-1"}>
```

Se NativeWind falhar ao processar `className="flex-1"` (ex: em determinadas builds), o root View não terá `flex: 1` e o layout colapsa completamente. Restaurar o `style={{ flex: 1 }}` como safety net:

**Arquivo**: `app/_layout.tsx`, linha 54
```tsx
<View className={isDark ? "dark flex-1" : "flex-1"} style={{ flex: 1 }}>
```

---

### Caminho D — Esclarecimento visual com o usuário

Confirmar com o usuário **exatamente** o que está "quebrado":
- Só os `dark:` utilities (estilos de dark mode via NativeWind)?
- As cores `colors.primary`, `colors.background` do Zustand?
- O layout (flex, padding, altura)?
- Tudo acima?

Essa distinção define se o problema é NativeWind, Zustand, ou o layout engine (Fabric).

---

## 6. Perguntas em aberto

1. **`newArchEnabled: false` resolve?** — Não testado. É o próximo passo crítico (Caminho A).
2. **O root View sem `style={{ flex: 1 }}` quebra o layout?** — Possível. Restaurar como safety net antes de outros testes.
3. **`react-native-css-interop 0.2.3` é compatível com RN 0.81.5 + New Architecture?** — Não confirmado. Pode precisar de upgrade.
4. **`edgeToEdgeEnabled: true` causa layout errado no Expo Go?** — Sim, provavelmente. O Expo Go não foi compilado com essa flag, então `useSafeAreaInsets()` pode retornar valores errados.
5. **Quando o usuário diz "não consigo definir nenhum estilo corretamente" — ele se refere a className NativeWind, inline styles, ou ambos?** — Resposta definirá o escopo do fix.

---

## 7. Artefatos relevantes

### Arquivos críticos
```
app/_layout.tsx                          ← Root layout, dark mode class, flex root
app/(tabs)/_layout.tsx                   ← Tabs, auth guard
app/(tabs)/workouts/_layout.tsx          ← Stack com contentStyle ✅
app/(tabs)/nutrition/_layout.tsx         ← Stack com contentStyle ✅
app/(tabs)/community/_layout.tsx         ← Stack com contentStyle ✅
app/(tabs)/community/groups/_layout.tsx  ← Stack com contentStyle ✅
app/user/_layout.tsx                     ← Stack com contentStyle ✅
app.json                                 ← newArchEnabled: true (ROOT CAUSE)
babel.config.js                          ← jsxImportSource: 'nativewind' + nativewind/babel
tailwind.config.js                       ← darkMode: "class" (IMUTÁVEL)
metro.config.js                          ← lucide-react alias + unstable_enablePackageExports
constants/colors.ts                      ← lightColors + darkColors
stores/theme.store.ts                    ← Zustand tema, isDark, colors
lib/color.ts                             ← withOpacity() helper
components/ui/GlassCard.tsx              ← Android fallback opaco ✅
components/ui/modern-mobile-menu.tsx     ← Android fallback opaco ✅
```

### Commit que causou o problema
```
b434daf — "chore: update package versions in package.json"
Mudanças reais:
  - Removeu "newArchEnabled": false de app.json  ← PROBLEMA
  - Mudou reanimated ~4.1.1 → 4.1.1
  - Adicionou react-native-worklets: 0.5.1 (legítimo como dep do Reanimated 4)
```

### Comandos úteis
```bash
# Verificar TypeScript
npx tsc --noEmit

# Iniciar metro com cache limpo
npx expo start --clear

# Verificar árvore de dependências do worklets
npm ls react-native-worklets

# Build dev client para Android (solução definitiva)
eas build --profile development --platform android

# Verificar versão do css-interop
node -e "console.log(require('./node_modules/react-native-css-interop/package.json').version)"
```

### Padrão de Stack layout correto (reference)
```tsx
import { Stack } from "expo-router";
import { useThemeStore } from "@/stores/theme.store";

export default function SomeStackLayout() {
  const colors = useThemeStore((s) => s.colors);
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
```

---

## 8. Instruções para a próxima sessão

### Tom e abordagem
- **Não** re-investigar os imports de `workouts/index.tsx` — já foram confirmados válidos.
- **Não** buscar erros TypeScript — `npx tsc --noEmit` retornou 0 erros.
- **Começar** pelo Caminho A: mudar `newArchEnabled: false`, testar no Expo Go, confirmar se é a causa.
- Se Caminho A confirmar, ir para Caminho B (EAS build dev client).
- **Restaurar `style={{ flex: 1 }}`** no root View de `app/_layout.tsx` como safety net antes de qualquer teste.

### Armadilhas conhecidas
- `react-native-worklets` NA `node_modules` não é conflito — é dep legítima do Reanimated 4. Nunca remover.
- `darkMode: "class"` no tailwind.config.js não pode ser removido (351 instâncias de `dark:` no projeto).
- OTA updates (expo-updates) **não servem para testar** mudanças que afetam `newArchEnabled`, `edgeToEdgeEnabled`, ou plugins nativos — precisam de rebuild completo via EAS.
- O usuário usa Expo Go para desenvolvimento. Qualquer mudança que requer rebuild nativo não será visível no Expo Go sem um novo APK/IPA.

### Contexto do usuário
- Projeto em desenvolvimento ativo (fitness app)
- Branch principal para PR: `feat/expo-mobile-setup`
- Branch de trabalho atual: `preview`
- O usuário entende React Native mas pode não ter familiaridade profunda com as diferenças entre Old/New Architecture e como afetam o workflow de desenvolvimento.
