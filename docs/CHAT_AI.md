# Chat AI - HuGoal

## Visão Geral

O HuGoal usa IA para múltiplas funcionalidades:
- Chat de nutrição (análise de texto e imagem)
- Chat de workouts (geração de planos)
- Chat inicial (assistente geral)
- Speech-to-text para input por voz

---

## Provedores Suportados

### Arquivo: `lib/ai-provider.ts`

O app suporta múltiplos provedores:

| Provedor | Pacote | Uso Principal |
|---------|-------|--------------|
| **Claude** | `@anthropic-ai/sdk` | Chat e análise |
| **Gemini** | `@google/generative-ai` | Visão e texto |
| **OpenAI** | `openai` | GPT models |

### Seleção

```typescript
import { createAIProvider, getProviderCapabilities } from "@/lib/ai-provider";

// Usar provedor configurado no perfil
const ai = createAIProvider("claude");

// Verificar capacidades
if (getProviderCapabilities(provider).supportsStreaming) {
  // Suporta streaming
}
```

---

## Configuração de API Keys

### Arquivo: `lib/api-key-store.ts`

```typescript
import { getResolvedApiKey, setApiKey, deleteApiKey } from "@/lib/api-key-store";

// Definir chave
await setApiKey("claude", "sk-ant-...");

// Buscar chave (com fallback)
const key = await getResolvedApiKey("claude");

// Remover
await deleteApiKey("claude");
```

### Tela de Configuração

```typescript
// app/settings/ai-keys.tsx
// Permite usuário definir suas próprias chaves de API
```

---

## Chat de Nutrição

### Arquivo: `lib/ai/nutritionChatAI.ts`

```typescript
import { analyzeNutritionChatText } from "@/lib/ai/nutritionChatAI";

const items = await analyzeNutritionChatText(
  "Café com leite e pão integral",
  context //上下文
);

// Retorna: NutritionItem[]
```

### Análise de Imagem

### Arquivo: `lib/ai/nutritionImageAI.ts`

```typescript
import { analyzeMealImageToChatItems } from "@/lib/ai/nutritionImageAI";

const items = await analyzeMealImageToChatItems(
  photoUri,
  { useVision: true }
);
```

### Fluxo

1. Usuário envia foto/refeição
2. AI analiza imagem/texto
3. Retorna `NutritionItem[]`
4. Usuário confirma/edita
5. Adiciona ao log

---

## Chat de Workouts

### Arquivo: `lib/ai/workoutChatAI.ts`

```typescript
import { analyzeWorkoutChatMessage } from "@/lib/ai/workoutChatAI";

const response = await analyzeWorkoutChatMessage(
  messages,
  {
    userLevel: "intermediate",
    userEquipment: ["barbell", "dumbbell"],
    targetMuscles: ["peito", "tríceps"]
  }
);
```

### Resposta

```typescript
interface WorkoutResponse {
  text: string;
  workout_patch?: Partial<WorkoutTemplate>;
  new_workout?: WorkoutTemplate;
}
```

---

## Chat Inicial (Home)

### Arquivo: `lib/ai/homeChatAI.ts`

```typescript
import { analyzeHomeChatMessage } from "@/lib/ai/homeChatAI";

const response = await analyzeHomeChatMessage(
  message,
  userContext
);
```

---

## Speech-to-Text

### Arquivo: `lib/ai/speechToText.ts`

```typescript
import { startSpeechRecognition, stopSpeechRecognition } from "@/lib/ai/speechToText";

// Iniciar reconhecimento de voz
const result = await startSpeechRecognition({
  language: "pt-BR",
  onResult: (transcript) => { },
  onError: (error) => { }
});

// Parar
await stopSpeechRecognition();
```

### Requer Expo Speech Recognition

```bash
npx expo install expo-speech-recognition
```

---

## Custo e Tracking

### Arquivo: `lib/ai-cost-calculator.ts`

```typescript
import { calculateCost, estimateTokensFromText } from "@/lib/ai-cost-calculator";

// Calcular custo
const cost = calculateCost({
  provider: "claude",
  model: "claude-3-5-sonnet-20241022",
  inputTokens: 1000,
  outputTokens: 500
});
// { inputCost: $0.003, outputCost: $0.015, total: $0.018 }
```

### Tracking

### Arquivo: `lib/ai-usage-tracker.ts`

```typescript
import { logUsage } from "@/lib/ai-usage-tracker";

await logUsage({
  provider: "claude",
  model: "claude-3-5-sonnet-20241022",
  tokens: 1500,
  cost: 0.018,
  feature: "nutrition-chat"
});
```

---

## Chat Store

### Arquivo: `stores/chat.store.ts`

```typescript
interface ChatState {
  messages: ChatMessage[];
  isProcessing: boolean;
  activeProvider: AIProvider;
}
```

### Adicionar Mensagem

```typescript
import { useChatStore } from "@/stores/chat.store";

useChatStore.getState().addMessage({
  type: "user_text",
  text: "Quero perder peso"
});

useChatStore.getState().addMessage({
  type: "ai_response",
  text: "Entendido! Vou criar um plano..."
});
```

---

## Componentes UI

### ChatInputBar

```typescript
import { ChatInputBar } from "@/components/nutrition/ChatInputBar";

<ChatInputBar
  onSend={handleSend}
  onVoicePress={handleVoice}
/>
```

### NutritionChat

```typescript
import { NutritionChat } from "@/components/nutrition/NutritionChat";

<NutritionChat
  messages={messages}
  onSend={handleSend}
  onImageSelect={handleImage}
/>
```

### MessageRenderer

```typescript
import { MessageRenderer } from "@/components/chat/MessageRenderer";

<MessageRenderer message={message} />
```

---

## Modelos Suportados

### Claude
- `claude-3-5-sonnet-20241022`
- `claude-3-opus-20240229`

### Gemini
- `gemini-1.5-pro`
- `gemini-1.5-flash`

### OpenAI
- `gpt-4o`
- `gpt-4-turbo`

---

## Prompt Engineering

O app usa prompts estruturados para cada 功能:

### Nutrição
```
Analise a seguinte descrição de refeição e retorne:
- Nome do alimento
- Porção
- Calorias
- Proteína
- Carboidratos
- Gordura

Input: "{user_input}"
```

### Workout
```
Crie um treino baseado nas preferências:
- Nível: {level}
- Equipamento: {equipment}
- Objetivos: {goals}

Retorne no formato WorkoutTemplate.
```

---

## Rate Limiting

O app implementa rate limiting local:

```typescript
const RATE_LIMIT = {
  per_minute: 10,
  per_hour: 100,
  per_day: 500
};
```

---

## Tratamento de Erros

```typescript
try {
  const items = await analyzeNutritionChatText(input);
} catch (error) {
  if (error.code === "rate_limited") {
    // Mostrar mensagem de limite
  }
  if (error.code === "invalid_api_key") {
    // Redirecionar para configurações
  }
}
```

---

## Configurações de Segurança

### API Keys no Device

- Armazenadas com Expo SecureStore
- Nunca expostas em logs
-Fallback para chave default se não configurada

---

## Próximas Funcionalidades

- **Voice Commands**: Comandos por voz durante workout
- **Image Generation**: Gerar imagens de treino
- **Personal Trainer AI**: Treinador virtual
- **Meal Planning AI**: Planejamento de refeições

---

**Última Atualização**: 2026-04-24