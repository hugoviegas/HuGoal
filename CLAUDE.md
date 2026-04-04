# BetterU - Regras Operacionais para Claude Code

Estas regras sao obrigatorias para qualquer agente Claude Code atuando neste repositorio.

## 1) Fontes de Verdade

Antes de iniciar qualquer tarefa, o agente deve ler e seguir:

1. `docs/agent-plans/README.md`
2. `docs/agent-plans/01-foundation-and-navigation.md` ate `docs/agent-plans/10-polish.md`
3. `docs/components_prompts/execution_plan.md`

Se houver conflito entre instrucoes, priorizar:

1. Arquivos de fase (`docs/agent-plans/*`)
2. Plano de componentes (`docs/components_prompts/execution_plan.md`)
3. Solicitacao atual do usuario

## 2) Politica de Reuso de Componentes (Obrigatoria)

Antes de criar qualquer componente novo, o agente deve:

1. Procurar componente existente em `components/ui`, `components/workouts`, `components/nutrition` e `components/community`.
2. Tentar estender/parametrizar componente existente.
3. So criar novo componente quando houver lacuna real.

Regra de decisao:

- Se 70% ou mais do comportamento ja existe: reutilizar e estender.
- Se menos de 70% e o acoplamento ficar ruim: criar novo componente com API padrao.

Proibicoes:

- Duplicar componente com nome diferente e mesma funcao.
- Copiar implementacao web literal (Radix/DOM/framer-motion web) sem adaptacao para Expo RN.

## 3) Contrato Minimo dos Componentes

Todo novo componente deve considerar, quando aplicavel:

- Props visuais: `variant`, `size`, `tone`, `fullWidth`.
- Props de estado: `value`, `defaultValue`, `open`, `onOpenChange`, `checked`, `onCheckedChange`.
- Props de comportamento: `loading`, `disabled`, `editable`.
- Props de estilo: `className`, `contentClassName`, `containerClassName`.
- Eventos: `onPress`, `onChange`, `onSelect`.

Requisitos adicionais:

- Suportar tema claro/escuro.
- Ter estado de loading, empty e error quando for componente de dados.
- Evitar acoplamento com regra de negocio de dominio.

## 4) Execucao por Fases (Sem Quebrar Producao)

O agente deve trabalhar por fase fechada, sem misturar escopos:

- Onda/Fase atual apenas.
- Nao avancar para proxima fase sem gate de revisao aprovado.

Obrigatorio ao fim de cada fase:

1. Revisar o que foi implementado contra os criterios da fase.
2. Validar build/lint/tipos/testes relevantes da fase.
3. Registrar pendencias e riscos antes de seguir.

Regra de seguranca:

- Se houver impacto em fluxo produtivo existente, criar ajuste backward-compatible ou feature flag local da fase.

## 5) Coordenacao de Agentes

Quando houver multiplos agentes, o Claude Code deve organizar por trilha:

1. Agente Design System (Onda 1)
2. Agente Interacoes UI (Onda 2)
3. Agente Dominio (Onda 3)
4. Agente Fluxos/Telas (Onda 4)

Cada agente deve receber:

- Escopo fechado
- Entradas e saidas esperadas
- Lista de dependencias
- Criterios de aceite

Regras de isolamento:

- Um agente nao modifica escopo de outro sem autorizacao explicita.
- Evitar edicoes paralelas no mesmo arquivo quando nao necessario.

## 6) Revisao Continua (Padrao QA Senior)

Ao finalizar cada fase, executar checklist de QA:

### 6.1 QA Funcional

- Fluxo principal da fase funciona ponta a ponta.
- Estados de erro possuem fallback e retry.
- Estados de loading nao travam a interface.

### 6.2 QA Tecnico

- TypeScript sem novos erros relacionados a fase.
- Sem regressao em componentes compartilhados.
- Sem duplicacao indevida de componentes.

### 6.3 QA de UX/UI

- Consistencia visual com design system.
- Acessibilidade minima: labels, hit area, feedback visual.
- Comportamento coerente em Android e iOS.

### 6.4 QA de Integracao

- Integracao com stores existentes sem quebra.
- Integracao com navegacao sem rotas mortas.
- Persistencia funcionando (Firestore/SecureStore/local state), quando aplicavel.

## 7) Politica de Revisao de Codigo

O agente deve fazer auto-revisao antes de concluir:

1. O que foi alterado
2. O que pode quebrar
3. O que nao foi coberto
4. Proximos passos seguros

Se nao conseguir validar algo localmente, deve declarar explicitamente.

## 8) Criterio de Conclusao de Fase

Uma fase so pode ser marcada como concluida quando:

1. Entregaveis da fase foram implementados.
2. Checklist QA foi executado.
3. Nao ha bloqueios criticos abertos.
4. Existe resumo de validacao e riscos residuais.

Sem isso, a fase deve permanecer como "em revisao".

## 9) Regra Final

Sempre priorizar estabilidade, reuso, e entrega incremental segura.
Melhor evoluir com consistencia do que acelerar com retrabalho e regressao.
