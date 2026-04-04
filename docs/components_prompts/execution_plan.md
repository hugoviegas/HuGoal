# Plano de Execucao - Componentes de Interface BetterU

## Objetivo

Transformar os prompts da pasta components_prompts em componentes e telas nativos para Expo React Native, mantendo edicao, personalizacao e consistencia visual com o app.

## Decisoes Arquiteturais

- Os prompts sao web-first (shadcn, Radix, Portal CSS, framer-motion).
- No BetterU mobile, o padrao sera React Native + NativeWind + Reanimated + Gesture Handler.
- Nao vamos fazer copy/paste literal dos prompts; vamos adaptar comportamento e API de props.
- Sempre que possivel, componentes novos devem ser controlados por props, com variantes e estado externo.

## Mapeamento por Prompt

| Prompt                     | Tipo              | Acao                               | Complexidade | Destino sugerido                              |
| -------------------------- | ----------------- | ---------------------------------- | ------------ | --------------------------------------------- |
| accordion.md               | Composto          | Implementar adaptacao RN           | M            | components/ui/Accordion.tsx                   |
| avatar_numbers.md          | Atomico           | Expandir Avatar atual              | S            | components/ui/Avatar.tsx                      |
| avatar_picker.md           | Composto          | Implementar adaptacao RN           | M            | components/community/AvatarPicker.tsx         |
| badge_notification_icon.md | Atomico           | Expandir Badge                     | S            | components/ui/Badge.tsx                       |
| breadcrumbs.md             | Atomico web       | Nao priorizar no mobile            | S            | opcional components/ui/Breadcrumb.tsx         |
| calendar_selection.md      | Composto complexo | Implementar com lib RN calendario  | L            | components/ui/CalendarPicker.tsx              |
| checkbox.md                | Atomico           | Implementar                        | S            | components/ui/Checkbox.tsx                    |
| coloured_badges.md         | Atomico           | Expandir Badge variantes           | S            | components/ui/Badge.tsx                       |
| dropdown_menu.md           | Composto          | Implementar via modal/action-sheet | M            | components/ui/DropdownMenu.tsx                |
| edit_profile.md            | Tela              | Adaptar para fluxo profile         | M            | app/settings/profile-edit.tsx                 |
| filter_popover.md          | Composto          | Implementar via modal filtragem    | M            | components/ui/FilterPopover.tsx               |
| form_questions.md          | Tela/fluxo        | Implementar stepper reutilizavel   | L            | components/ui/FormStepper.tsx                 |
| navbar_menu.md             | Navegacao         | Adaptar para tab bar existente     | M            | app/(tabs)/\_layout.tsx                       |
| pagination.md              | Composto          | Implementar para listas longas     | M            | components/ui/Pagination.tsx                  |
| progress_form_indicator.md | Atomico           | Implementar                        | S            | components/ui/ProgressFormIndicator.tsx       |
| quick_settings.md          | Tela/composito    | Adaptar para settings              | M            | app/settings/index.tsx                        |
| responsive_modal.md        | Composto          | Consolidar no Modal atual          | S            | components/ui/Modal.tsx                       |
| signup_page.md             | Tela              | Adaptar para auth existente        | M            | app/(auth)/signup.tsx                         |
| sliders.md                 | Atomico/composito | Implementar slider custom          | M            | components/ui/Slider.tsx                      |
| spinner_loader.md          | Atomico           | Implementar                        | S            | components/ui/Spinner.tsx                     |
| stacked_activity cards.md  | Composto          | Implementar apos feed              | M            | components/community/StackedActivityCards.tsx |
| tabs.md                    | Composto          | Implementar tabs internas          | S            | components/ui/Tabs.tsx                        |
| terms_and_conditions.md    | Tela              | Implementar legal/consentimento    | S            | app/settings/about.tsx                        |
| toasts.md                  | Sistema           | Integrar ao toast.store existente  | M            | components/ui/Toast.tsx                       |
| togle_button.md            | Atomico           | Implementar toggle padrao          | S            | components/ui/Toggle.tsx                      |
| tooltips.md                | Atomico           | Implementar tooltip contextual     | S            | components/ui/Tooltip.tsx                     |
| workout_cards.md           | Composto          | Implementar cards de treino        | M            | components/workouts/WorkoutCard.tsx           |

## Ondas de Implementacao

### Onda 1 - Fundacao UI (base reaproveitavel)

Escopo:

- Spinner
- Checkbox
- Toggle
- Badge (com variantes e contador)
- Tooltip
- ProgressFormIndicator
- Tabs internas

Saidas:

- Biblioteca base de atomicos para telas e compostos.
- Props padronizadas: size, variant, disabled, loading, className.

Criterio de pronto:

- Todos os componentes com estado controlado e nao-controlado.
- Suporte a tema claro/escuro.
- Acessibilidade minima: labels e hit area.

### Onda 2 - Sobreposicoes e Seletores

Escopo:

- Modal consolidado
- DropdownMenu (modal/action sheet)
- FilterPopover
- Accordion
- Slider
- AvatarPicker

Saidas:

- Padrao unico para overlays e menus contextuais.
- Componentes editaveis para filtros e configuracoes.

Criterio de pronto:

- Comportamento consistente em Android e iOS.
- Sem dependencia de Radix/DOM.

### Onda 3 - Componentes de dominio

Escopo:

- WorkoutCard
- Pagination
- CalendarPicker
- StackedActivityCards

Saidas:

- Blocos prontos para workouts, community e historicos.

Criterio de pronto:

- Integracao com dados mock e depois com Firestore.
- Estados loading, empty e error tratados.

### Onda 4 - Telas e Fluxos completos

Escopo:

- signup_page -> tela real de cadastro
- edit_profile -> tela real de perfil
- quick_settings -> tela real de preferencias
- form_questions -> stepper para onboarding
- terms_and_conditions -> secao legal
- navbar_menu -> refinamento do tab layout

Saidas:

- Fluxos completos montados com os componentes das ondas anteriores.

Criterio de pronto:

- Fluxo navegavel de ponta a ponta.
- Persistencia de preferencias e formularios.

## Padrao de API dos Componentes

Cada componente novo deve seguir:

- Props visuais: variant, size, tone, fullWidth.
- Props de estado: value, defaultValue, open, onOpenChange, checked, onCheckedChange.
- Props de comportamento: loading, disabled, editable.
- Props de estilo: className, contentClassName, containerClassName.
- Eventos: onPress, onChange, onSelect.

## Regras de Qualidade

- Nao acoplar componente em regra de negocio.
- Componente deve funcionar com dados mock antes de dados reais.
- Evitar animacao pesada sem necessidade.
- Priorizar legibilidade e reuso.
- Criar docs de uso rapido no topo do arquivo (exemplo de props e caso de uso).

## Dependencias Tecnicas Recomendadas

- Reanimated e Gesture Handler para interacoes/animacoes.
- react-native-svg para icones e variacoes visuais mais complexas.
- Biblioteca de calendario RN para calendar_selection.
- Evitar importar Radix, framer-motion web ou APIs de DOM.

## Riscos e Mitigacoes

- Risco: prompt web com comportamento nao-portavel.
  Mitigacao: traduzir para contrato de props, nao para implementacao literal.

- Risco: divergencia visual entre telas.
  Mitigacao: primeiro construir tokens e variantes na Onda 1.

- Risco: overlays com UX inconsistente.
  Mitigacao: um unico padrao de Modal/Sheet para todos os menus e popovers.

## Ordem Recomendada de Agentes

1. Agente Design System: Onda 1
2. Agente Interacoes UI: Onda 2
3. Agente Dominio Workouts/Community: Onda 3
4. Agente Fluxos Auth/Settings/Onboarding: Onda 4

## Entregavel Final Esperado

- Todos os prompts analisados e mapeados para equivalente mobile.
- Biblioteca de componentes editavel e personalizada para BetterU.
- Fluxos principais construiveis sem retrabalho visual.
- Base pronta para execucao por fases no projeto.
