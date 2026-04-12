# Componentes Shadcn Avatar Integrados

Três componentes web totalmente integrados e mesclados para gerenciamento de avatares e perfils.

## 📦 Componentes

### 1. **Avatar Base** (`avatar.tsx`)

Componente de avatar primitivo usando Radix UI.

```tsx
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/shadcn/avatar";

<Avatar>
  <AvatarImage src="..." alt="..." />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>;
```

**Features:**

- Primitivo Radix UI
- Fallback com iniciais
- Customizável

---

### 2. **Avatar Picker** (`avatar-picker.tsx`)

Seletor de avatar com animações e seleção interativa.

```tsx
import { AvatarPicker } from "@/components/ui/shadcn/avatar-picker";

<AvatarPicker />;
```

**Features:**

- 4 avatares pré-definidos
- Animações com `motion/react`
- Seleção com rotação smooth
- Card container responsivo
- Integração com Badge para contador

---

### 3. **Edit Profile Dialog** (`edit-profile.tsx`)

Dialog completo para edição de perfil com upload de imagens.

```tsx
import { EditProfileDialog } from "@/components/ui/shadcn/edit-profile";

<EditProfileDialog />;
```

**Features:**

- Upload background
- Upload avatar
- Bio com limite de caracteres (180)
- Preview em tempo real
- Hooks reutilizáveis

---

## 🎣 Hooks Auxiliares

### `useCharacterLimit`

Gerencia limite de caracteres em input/textarea.

```tsx
const { value, characterCount, handleChange, maxLength } = useCharacterLimit({
  maxLength: 180,
  initialValue: "Initial text",
});
```

### `useImageUpload`

Gerencia upload de imagens com preview.

```tsx
const {
  previewUrl,
  fileInputRef,
  handleThumbnailClick,
  handleFileChange,
  handleRemove,
} = useImageUpload({ onUpload: (url) => {} });
```

---

## 📋 Componentes Base Utilizados

- **Button** - Botões com variantes
- **Badge** - Badges para contadores
- **Card** - Container principal
- **Dialog** - Modal para edit profile
- **Input** - Campo de texto
- **Label** - Labels acessíveis
- **Textarea** - Área de texto
- **Avatar** - Avatar Radix UI

---

## 🎨 Styling

Todos os componentes usam:

- **Tailwind CSS** para utilitários
- **class-variance-authority** para variantes
- **NativeWind** compatível
- Dark/Light mode suportado

---

## 🚀 Demo Completa

Uma demo unificada está disponível em `demo-avatar-complete.tsx`:

```tsx
import DemoAvatarComplete from "@/components/ui/shadcn/demo-avatar-complete";

export default function Page() {
  return <DemoAvatarComplete />;
}
```

Mostra todos os 3 componentes funcionando juntos em um layout responsivo.

---

## 📦 Dependências Instaladas

```bash
@radix-ui/react-avatar
@radix-ui/react-dialog
@radix-ui/react-icons
@radix-ui/react-popover
@radix-ui/react-slot
motion
class-variance-authority
```

---

## 🔄 Integração Inteligente

Os componentes foram mesclados para:

1. **Reutilização máxima** - Avatar base usado em todos
2. **Consistência** - Mesmo theme e tokens
3. **Modularidade** - Cada componente independente
4. **Hooks isolados** - Reutilizáveis em outros componentes
5. **Estrutura organizada** - `/components/ui/shadcn/` dedicada

---

## 💡 Boas Práticas

- Use `AvatarPicker` para seleção interativa
- Use `Avatar + Badge` para notificações
- Use `EditProfileDialog` para gerenciar perfil
- Hooks podem ser reutilizados em outros componentes
- Todos os componentes suportam dark mode automaticamente

---

## 🎯 Próximos Passos

1. Integrar demo route em sua aplicação
2. Adaptar as imagens/avatares conforme necessário
3. Conectar com seu backend para persistência
4. Customizar cores usando design tokens

---

**Criado em:** 2026-04-12
**Estrutura:** Web Components (React + TypeScript)
**Compatibilidade:** React 19+, Tailwind 3.4+
