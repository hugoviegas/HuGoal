## Plan: Auth UX + Onboarding 7 Etapas

Vamos entregar uma primeira experiência premium do HuGoal com login/signup reformulados, Google Sign-In integrado (mantendo email/senha), onboarding migrado para 7 etapas com footer padrão de workouts, correção do redirecionamento pós-verificação de email, e trilha de entregabilidade de emails via domínio customizado no Firebase. A abordagem prioriza reuso do design system existente e mudanças backward-compatible.

**Steps**

1. Fase 0 - Congelamento de escopo e baseline (bloqueia todas as demais)
1. Confirmar o escopo híbrido: email/senha + Google ativo, e Google como CTA principal.
1. Congelar requisitos do onboarding em 7 etapas e mapear equivalências com o modelo atual de perfil para evitar regressão de dados.
1. Levantar baseline de navegação/auth atual e registrar critérios de aceitação por fluxo: signup, verificação, login, entrada no onboarding, conclusão do onboarding.

1. Fase 1 - Arquitetura de Auth e roteamento (depende da Fase 0)
1. Ajustar o estado de autenticação para considerar email verificado no roteamento, sem depender de deep link.
1. Inserir estado intermediário de verificação de email no roteamento raiz para usuários autenticados porém não verificados.
1. Criar tela dedicada de verificação com ações: reenviar email, atualizar status (reload user), trocar conta, ir para login.
1. Garantir que apenas usuários com perfil incompleto e email validado avancem para onboarding.
1. Preservar fallback para erro de perfil e tela de retry já existente.

1. Fase 2 - Login/Signup totalmente remodelados (paralela com Fase 3, depende da Fase 0)
1. Redesenhar login com nova hierarquia visual, mantendo tokens do design system e acessibilidade.
1. Redesenhar signup no mesmo padrão visual, mantendo validações existentes e UX de teclado.
1. Adicionar seção social com Google como provedor funcional e Facebook oculto/desabilitado por enquanto.
1. Manter email/senha como caminho alternativo e garantir consistência de mensagens de erro.
1. Remover emoji da UI de auth e trocar por iconografia lucide-react-native conforme regra do repositório.

1. Fase 3 - Integração Google Sign-In no Expo/Firebase (depende da Fase 0; paralela com Fase 2)
1. Adotar fluxo OAuth Google compatível com Expo Router e Firebase Auth para Android/iOS.
1. Configurar provider no Firebase Console e credenciais Google para pacotes/bundle ids do app.
1. Implementar persistência do vínculo de conta no mesmo modelo do auth store atual.
1. Definir política de account linking para emails já existentes: unir credenciais quando houver match seguro.
1. Incluir tratamento explícito para cancelamento de login e erro de credencial inválida.

1. Fase 4 - Refatoração do onboarding para 7 etapas (depende das Fases 1 e 2)
1. Reestruturar o fluxo de onboarding em 7 rotas/steps mantendo persistência de draft já existente.
1. Trocar navegação de rodapé para o mesmo componente/padrão usado em criação de workouts (continue, back, indicador de steps).
1. Etapa 1 Gender: dois cards visuais principais e seleção final em um único campo com dropdown (Male, Female, Other).
1. Etapa 2 Age: usar CalendarLume para data de nascimento com validação obrigatória de maior de 18 anos.
1. Etapa 3 Weight: seletor KG/LB e régua horizontal deslizável com step de 0.1kg e default 75.0kg.
1. Etapa 4 Height: régua vertical deslizável em cm com limites seguros e snapping consistente.
1. Etapa 5 Goal: opções Loss Weight, Gain Weight, Muscle Mass Gain, Shape Body, Stay Fit.
1. Etapa 6 Level: Beginner, Intermediate, Advance com seleção exclusiva.
1. Etapa 7 Profile Info: Full Name, Username com validador atual, telefone opcional, ação final de criar perfil.
1. Garantir estados de loading, error e retry por etapa em falhas de persistência.

1. Fase 5 - Novos primitivos UI necessários para onboarding (depende da Fase 4 desenho de interação)
1. Criar componente de régua horizontal reutilizável para peso (com unidade e step decimal).
1. Criar componente de régua vertical reutilizável para altura.
1. Padronizar API desses componentes seguindo contrato do repositório (value/defaultValue/onChange/loading/disabled/className).
1. Garantir compatibilidade dark/light e comportamento fluido em Android/iOS.

1. Fase 6 - Persistência e modelo de dados do perfil (depende da Fase 4)
1. Atualizar schemas de validação para refletir campos do novo onboarding 7 etapas.
1. Ajustar mapeamento entre campos coletados e estrutura de profile salva no Firestore.
1. Preservar compatibilidade com usuários antigos com campos faltantes (fallback seguro).
1. Garantir que onboarding_complete só seja true após validação completa e save bem-sucedido.

1. Fase 7 - Tutorial completo de entregabilidade de email com domínio próprio (paralela com Fases 2-6, depende da Fase 0)
1. Trilha recomendada (rápida): Firebase Auth com domínio customizado em emails de autenticação.
1. No Firebase Console Authentication Email Templates, configurar domínio customizado para From e action links.
1. Publicar DNS TXT e CNAME no domínio hugoviegas.dev até status de Verification complete.
1. Aplicar domínio customizado e validar recebimento em Gmail, Outlook e iCloud com inbox placement.
1. Configurar SPF/DKIM/DMARC corretamente em um único SPF record consolidado.
1. Configurar custom email action handler para verificar email/reset com continue URL apontando para rota segura do app/web handler.
1. Explicar limitação: Cloudflare Email Routing é ótimo para recebimento/forwarding e não substitui SMTP de envio transacional.
1. Trilha futura opcional (avançada): migrar para Firebase Authentication with Identity Platform para SMTP custom quando necessário.
1. Incluir checklist anti-spam: warmup, reputação de domínio, conteúdo de template, monitor de bounce/spam complaint.

1. Fase 8 - QA e validação final (depende de todas)
1. Validar fluxos manuais ponta a ponta: signup email, recebimento de email, verify, login, onboarding incompleto, onboarding completo, logout, login com Google.
1. Validar guardas de navegação: usuário não verificado não entra no onboarding.
1. Rodar checagens locais: npm run lint e npx tsc --noEmit.
1. Testar UX de teclado, safe-area e animações em Android e iOS.
1. Validar regras Firestore e erros de permissão nos writes de perfil.

1. Sequenciamento de execução recomendado
1. Bloco A (paralelo): Fase 2 e Fase 3.
1. Bloco B (sequencial): Fase 1 depois Fase 4.
1. Bloco C (paralelo): Fase 5 e Fase 7.
1. Bloco D (sequencial): Fase 6 depois Fase 8.

**Relevant files**

- d:/HugoViegas/Documentos/HuGoal/app/(auth)/login.tsx — remodelação visual, CTA Google, mensagens de erro.
- d:/HugoViegas/Documentos/HuGoal/app/(auth)/signup.tsx — remodelação visual, fluxo de verificação, CTA Google.
- d:/HugoViegas/Documentos/HuGoal/stores/auth.store.ts — estado de auth, email verification gating, fetch profile, transições.
- d:/HugoViegas/Documentos/HuGoal/hooks/useRootRoute.ts — roteamento root para estado verify_email/onboarding/tabs.
- d:/HugoViegas/Documentos/HuGoal/app/index.tsx — redirecionamento principal conforme estado da sessão.
- d:/HugoViegas/Documentos/HuGoal/app/(auth)/\_layout.tsx — guardas do grupo auth.
- d:/HugoViegas/Documentos/HuGoal/app/(auth)/onboarding/\_layout.tsx — shell do onboarding 7 etapas.
- d:/HugoViegas/Documentos/HuGoal/app/(auth)/onboarding/personal.tsx — ponto de referência para fields/draft atuais.
- d:/HugoViegas/Documentos/HuGoal/app/(auth)/onboarding/goals.tsx — ponto de referência de OptionPicker.
- d:/HugoViegas/Documentos/HuGoal/app/(auth)/onboarding/experience.tsx — ponto de referência de níveis/equipamentos.
- d:/HugoViegas/Documentos/HuGoal/app/(auth)/onboarding/diet.tsx — persistência final e conclusão atual.
- d:/HugoViegas/Documentos/HuGoal/app/(tabs)/workouts/create.tsx — padrão de footer com continue/back/steps.
- d:/HugoViegas/Documentos/HuGoal/components/ui/ProgressFormIndicator.tsx — componente base do footer de steps.
- d:/HugoViegas/Documentos/HuGoal/components/ui/FormStepper.tsx — componente atual do onboarding (base para refatoração).
- d:/HugoViegas/Documentos/HuGoal/components/ui/CalendarLume.tsx — seletor de data para validação 18+.
- d:/HugoViegas/Documentos/HuGoal/components/ui/OptionPicker.tsx — seleção visual para gender/goal/level.
- d:/HugoViegas/Documentos/HuGoal/components/ui/Input.tsx — profile info final com username validator.
- d:/HugoViegas/Documentos/HuGoal/lib/validation/schemas.ts — regras de validação por etapa e constraints.
- d:/HugoViegas/Documentos/HuGoal/lib/firestore/profile.ts — persistência do perfil onboarding.
- d:/HugoViegas/Documentos/HuGoal/firestore.rules — garantias de escrita de perfil.
- d:/HugoViegas/Documentos/HuGoal/lib/firebase.ts — auth setup/persistence e integração provider.
- d:/HugoViegas/Documentos/HuGoal/app.json — configuração de scheme e ajustes para fluxo auth.

**Verification**

1. Fluxo email/senha novo usuário: signup, recebimento de email, verify, login, redirecionamento obrigatório para onboarding.
2. Fluxo bloqueio: usuário autenticado sem email verificado não acessa onboarding nem tabs.
3. Fluxo Google: login por Google cria/recupera profile e entra no onboarding quando onboarding_complete for false.
4. Fluxo onboarding 7 etapas: avançar/voltar, persistência de draft, validação de cada etapa, conclusão em step 7.
5. Regra 18+: datas inválidas bloqueiam avanço na etapa Age.
6. Precisão de peso: step 0.1kg com troca KG/LB consistente e sem drift visual.
7. Precisão de altura: régua vertical responde ao gesto e mantém valor persistido.
8. Username validator: disponibilidade e formato validados antes de confirmar perfil.
9. Rodar npm run lint sem novos erros.
10. Rodar npx tsc --noEmit sem novos erros.
11. Smoke test Android + iOS para safe area, teclado e footer inferior fixo.
12. Entregabilidade: validar SPF/DKIM/DMARC e queda de spam em conta de teste.

**Decisions**

- Mantido escopo híbrido: email/senha + Google.
- Gender salvo em um único campo.
- Prioridade de email: domínio customizado do Firebase antes de SMTP custom.
- Incluído no escopo: correção de roteamento pós-verificação e onboarding 7 etapas.
- Excluído deste ciclo: deep linking completo cross-platform e Facebook provider funcional.

**Further Considerations**

1. Estratégia de lançamento: usar feature flag para onboarding 7 etapas e liberar por cohorts para reduzir risco.
2. Métrica mínima pós-release: taxa de conclusão de onboarding, abandono por etapa e taxa de spam folder em verificação de email.
3. Próximo passo de email avançado: avaliar migração para Identity Platform somente se o domínio customizado não atingir entregabilidade esperada.
