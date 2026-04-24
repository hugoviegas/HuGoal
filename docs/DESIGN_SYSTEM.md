# Design System - HuGoal

## Visão Geral

O Design System do HuGoal é baseado em design tokens centralizados em `constants/`. O sistema segue uma abordagem de **Utility-First** com NativeWind + StyleSheet custom.

---

## Cores

### Paleta Light

| Token | Valor | Uso |
|-------|-------|-----|
| `background` | `#FFFFFF` | Fundo principal |
| `foreground` | `#0E1117` | Texto principal |
| `card` | `#FFFFFF` | Cards e superfícies |
| `cardBorder` | `#E0E4EF` | Bordas de cards |
| `surface` | `#F2F5FB` | Superfícies secundárias |
| `primary` | `#0EA5B0` | **Cor principal** (teal) |
| `primaryForeground` | `#FFFFFF` | Texto sobre primary |
| `secondary` | `#EEF2FA` | Elementos secundários |
| `secondaryForeground` | `#3B4369` | Texto sobre secondary |
| `muted` | `#9099B8` | Elementos desabilitados |
| `mutedForeground` | `#636B8A` | Texto secundário |
| `accent` | `#1DB89A` | Destaques (teal claro) |
| `accentForeground` | `#FFFFFF` | Texto sobre accent |
| `destructive` | `#EF4444` | Ações destrutivas |
| `glassBg` | `rgba(255,255,255,0.76)` | Background glass |
| `glassBorder` | `rgba(224,228,239,0.76)` | Borda glass |
| `tabBar` | `rgba(255,255,255,0.90)` | Tab bar |
| `tabBarBorder` | `rgba(0,0,0,0.07)` | Borda tab bar |

### Paleta Dark

| Token | Valor | Uso |
|-------|-------|-----|
| `background` | `#16181C` | Fundo principal |
| `foreground` | `#F2F4FA` | Texto principal |
| `card` | `#16181C` | Cards |
| `cardBorder` | `#2A2D3A` | Bordas |
| `surface` | `#22252F` | Superfícies |
| `primary` | `#22C4D5` | **Cor principal** |
| `primaryForeground` | `#0A1016` | Texto sobre primary |
| `secondary` | `#2A2D3A` | Elementos secundários |
| `secondaryForeground` | `#C8CCE0` | Texto sobre secondary |
| `muted` | `#5B6080` | Elementos desabilitados |
| `mutedForeground` | `#8B90AA` | Texto secundário |
| `accent` | `#25D0AD` | Destaques |
| `accentForeground` | `#0A1016` | Texto sobre accent |
| `destructive` | `#F87171` | Ações destrutivas |
| `glassBg` | `rgba(22,24,28,0.76)` | Background glass |
| `glassBorder` | `rgba(42,45,58,0.76)` | Borda glass |
| `tabBar` | `rgba(22,24,28,0.90)` | Tab bar |
| `tabBarBorder` | `rgba(255,255,255,0.07)` | Borda tab bar |

### Uso em Componentes

```typescript
import { useThemeStore } from '@/stores/theme.store';

function MyComponent() {
  const colors = useThemeStore(s => s.colors);
  return <View style={{ backgroundColor: colors.background }} />;
}
```

---

## Tipografia

### Hierarquia

| Estilo | Tamanho | Peso | Line Height | Uso |
|-------|---------|------|------------|-----|
| `display` | 36px | 800 | 44px | Títulos principais |
| `h1` | 28px | 700 | 36px | Cabeçalhos |
| `h2` | 22px | 700 | 30px | Subtítulos |
| `h3` | 18px | 600 | 26px | Títulos de seção |
| `body` | 16px | 400 | 24px | Texto principal |
| `bodyMedium` | 16px | 500 | 24px | Texto médio |
| `small` | 14px | 400 | 20px | Texto pequeno |
| `smallMedium` | 14px | 500 | 20px | Texto pequeno médio |
| `caption` | 12px | 500 | 16px | Legendas |
| `label` | 11px | 600 | 14px | Labels (uppercase) |
| `mono` | 14px | 400 | 20px | Código |

### Fontes

- **Principal**: Inter (iOS/Android)
- **Mono**: SpaceMono (código)

### Uso

```typescript
import { typography } from '@/constants/typography';

<Text style={typography.h1}>Título</Text>
<Text style={typography.body}>Texto</Text>
```

---

## Espaçamento

### Escala (4px base)

| Token | Valor | Uso |
|-------|-------|-----|
| `xxs` | 4px | Pequenos gaps |
| `xs` | 8px | Ícones, badges |
| `sm` | 12px | Componentes pequenos |
| `md` | 16px | **Padrão** - padding/margin |
| `lg` | 20px | Espaçamento médio |
| `xl` | 24px | Seções |
| `2xl` | 32px | Grandes espaços |
| `3xl` | 40px |Headers |
| `4xl` | 48px | Layouts complexos |
| `5xl` | 64px | Containers |
| `6xl` | 80px | Landing pages |
| `7xl` | 96px | Full screen |

---

## Border Radius

| Token | Valor | Uso |
|-------|-------|-----|
| `xs` | 4px | Badges, small chips |
| `sm` | 8px | Buttons, small cards |
| `md` | 12px | Inputs, toggles |
| `lg` | 16px | Cards, modals |
| `xl` | 24px | Floating panels, tab bar |
| `full` | 9999px | Pills, avatars |

---

## Animações

### Duração

| Token | Valor | Uso |
|-------|-------|-----|
| `fast` | 100ms | Micro feedback (tap, checkbox) |
| `normal` | 200ms | UI transitions (sheet, tab) |
| `slow` | 350ms | Modal enter/exit, pages |
| `slower` | 500ms | Skeleton shimmer |

### Easing

| Token | Curva | Uso |
|-------|------|-----|
| `standard` | bezier(0.4, 0, 0.2, 1) | Maioria |
| `decelerate` | bezier(0, 0, 0.2, 1) | Elemento entra |
| `accelerate` | bezier(0.4, 0, 1, 1) | Elemento sai |
| `sharp` | bezier(0.4, 0, 0.6, 1) | Ações rápidas |

---

## Elevação (Sombras)

| Token | iOS | Android | Uso |
|------|-----|---------|-----|
| `xs` | y:1, r:2, o:0.06 | elevation:1 | Focus ring |
| `sm` | y:2, r:4, o:0.08 | elevation:2 | Card padrão |
| `md` | y:4, r:8, o:0.12 | elevation:4 | Sheet/modal |
| `lg` | y:8, r:16, o:0.18 | elevation:8 | TabBar, FAB |
| `xl` | y:12, r:24, o:0.24 | elevation:12 | Dialogs |

---

## Componentes Base

### Button
```typescript
import { Button } from '@/components/ui/Button';

<Button variant="primary" size="md">Texto</Button>
<Button variant="secondary" size="sm" disabled />
<Button variant="ghost" size="lg" loading />
```

**Props:**
- `variant`: `primary` | `secondary` | `ghost` | `destructive`
- `size`: `sm` | `md` | `lg`
- `disabled`: boolean
- `loading`: boolean

### Input
```typescript
import { Input } from '@/components/ui/Input';

<Input placeholder="Email" error="Invalid email" />
<Input secureTextEntry label="Password" />
```

**Props:**
- `label`: string
- `error`: string
- `disabled`: boolean

### Avatar
```typescript
import { Avatar } from '@/components/ui/Avatar';

<Avatar source={uri} size="lg" />
<Avatar name="John Doe" />
```

**Props:**
- `source`: ImageRequireSource
- `name`: string (fallback)
- `size`: `sm` | `md` | `lg`

### Badge
```typescript
import { Badge } from '@/components/ui/Badge';

<Badge>New</Badge>
<Badge tone="success">Active</Badge>
```

### Card
```typescript
import { Card } from '@/components/ui/shadcn/card';

<Card>
  <CardHeader>Title</CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

### Modal/BottomSheet
```typescript
import { BottomSheetModal } from '@/components/ui/BottomSheetModal';

<BottomSheetModal visible={visible} onClose={...}>
  Content
</BottomSheetModal>
```

---

## Pattern: Glassmorphism

O app usa efeitos glassmorphism para elementos flutuantes:

```typescript
// Glass effect
const glassStyle = {
  backgroundColor: colors.glassBg,
  borderColor: colors.glassBorder,
  borderWidth: 1,
};
```

---

## Theme Store

```typescript
import { useThemeStore } from '@/stores/theme.store';

const { theme, colors, setTheme } = useThemeStore();

// theme: 'light' | 'dark' | 'system'
// colors: lightColors ou darkColors
```

---

## Importação Centralizada

```typescript
import * as DS from '@/constants/design-system';

// DS.spacing.md       → 16
// DS.typography.h1    → { fontSize: 28, ... }
// DS.radius.lg        → 16
// DS.elevation.md    → ViewStyle
// DS.duration.normal → 200
```

---

## Próximos Componentes

Documentar componentes avançados:
- FormStepper
- ModernMobileMenu (Tab Bar)
- MacroRing/MacroBar
- NutritionWeekCalendar
- FeedPost/GroupCard

---

**Última Atualização**: 2026-04-24