# Template Operacional - Revisao por Fase

Use este arquivo como modelo ao finalizar qualquer fase (01 a 10).
Copie este template para um novo arquivo e preencha todos os campos antes de marcar a fase como concluida.

## 1) Identificacao da Revisao

- Fase:
- Onda:
- Data:
- Responsavel principal:
- Agente(s) envolvidos:
- Branch:
- Commit(s) principais:
- Status da fase: Em revisao | Aprovada | Reprovada

## 2) Escopo Planejado x Entregue

### 2.1 Escopo planejado da fase

- Itens previstos no plano:
- Arquivo(s) de referencia da fase:

### 2.2 Escopo entregue

- Funcionalidades implementadas:
- Itens parcialmente entregues:
- Itens nao iniciados:

### 2.3 Mudancas fora do escopo

- Houve mudanca fora do escopo? Sim | Nao
- Se sim, justificar:
- Impacto em producao:
- Acao de mitigacao (feature flag/backward-compatible):

## 3) Reuso de Componentes (Obrigatorio)

### 3.1 Componentes reaproveitados

- Lista de componentes reutilizados:
- Ajustes realizados para adaptacao:

### 3.2 Componentes novos

- Lista de componentes novos criados:
- Justificativa de criacao (lacuna real):
- Confirmacao de nao duplicacao:

### 3.3 Conformidade de API minima

Marcar para cada componente novo/adaptado:

- Props visuais (variant, size, tone, fullWidth): OK | N/A
- Props de estado (value/defaultValue/open etc): OK | N/A
- Props de comportamento (loading/disabled/editable): OK | N/A
- Props de estilo (className/contentClassName/containerClassName): OK | N/A
- Eventos (onPress/onChange/onSelect): OK | N/A

## 4) QA Funcional (Padrao QA Senior)

- Fluxo principal ponta a ponta validado: Sim | Nao
- Estado loading validado: Sim | Nao
- Estado empty validado: Sim | Nao
- Estado error + retry validado: Sim | Nao
- Casos de borda relevantes validados: Sim | Nao

Evidencias:

- Fluxo testado 1:
- Fluxo testado 2:
- Fluxo testado 3:

## 5) QA Tecnico

- TypeScript sem novos erros da fase: Sim | Nao
- Lint sem novos erros da fase: Sim | Nao
- Build/execucao local da fase: Sim | Nao
- Regressao em componentes compartilhados: Nao detectada | Detectada
- Duplicacao indevida de componente: Nao detectada | Detectada

Comandos executados:

- Comando 1:
- Comando 2:
- Comando 3:

Resultado resumido:

-

## 6) QA UX/UI

- Consistencia com design system: Sim | Nao
- Acessibilidade minima (labels/hit area/feedback): Sim | Nao
- Tema claro/escuro validado: Sim | Nao
- Comportamento em Android validado: Sim | Nao
- Comportamento em iOS validado: Sim | Nao

Observacoes de UX/UI:

-

## 7) QA Integracao

- Integracao com stores existente sem quebra: Sim | Nao
- Integracao com navegacao sem rota morta: Sim | Nao
- Persistencia esperada funcionando: Sim | Nao | N/A
- Integracao com Firestore validada: Sim | Nao | N/A
- Integracao com SecureStore validada: Sim | Nao | N/A

## 8) Riscos, Pendencias e Debito Tecnico

### 8.1 Riscos residuais

- Risco:
- Impacto:
- Probabilidade:
- Mitigacao:

### 8.2 Pendencias abertas

- Pendencia 1:
- Pendencia 2:

### 8.3 Debito tecnico criado

- Item:
- Motivo:
- Prioridade:

## 9) Coordenacao de Agentes

- Escopo de cada agente foi respeitado: Sim | Nao
- Houve conflito de arquivo entre agentes: Sim | Nao
- Se houve conflito, como foi resolvido:
- Dependencias para proxima fase:

## 10) Gate de Aprovacao da Fase

### 10.1 Checklist final de conclusao

- Entregaveis da fase implementados: Sim | Nao
- Checklist QA completo executado: Sim | Nao
- Sem bloqueio critico aberto: Sim | Nao
- Resumo de validacao e riscos registrado: Sim | Nao

### 10.2 Decisao

- Decisao final: Aprovada | Em revisao | Reprovada
- Responsavel pela aprovacao:
- Data da aprovacao:
- Proxima fase autorizada: Sim | Nao

## 11) Resumo Executivo

- O que foi alterado:
- O que pode quebrar:
- O que nao foi coberto:
- Proximos passos seguros:
