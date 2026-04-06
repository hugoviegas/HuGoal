# Phase 06 - AI Keys: Gerenciador Centralizado de Chaves

## Suggested Specialization

Secure storage, provider setup, and fallback coordination agent.

## Objective

Deliver a secure, user-friendly AI key management system with SecureStore (device-only), Firestore preference sync, automatic fallback between providers (Gemini → Claude → OpenAI), cost tracking, and compliance-first design (GDPR + privacy controls).

## Current Starting Point

- `lib/api-key-store.ts` already stores keys in SecureStore.
- `lib/ai-provider.ts` already calls the three providers.
- Settings screen structure exists but AI keys management needs to be built.
- No fallback chain, caching layer, or quota tracking exists yet.

## Discovery Outcomes

### Segurança Base & Armazenamento

- **Storage:** SecureStore (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`) como única camada para chaves
- **Multi-account:** Chaves isoladas por `user/{uid}` em SecureStore; novo login = setup novo (delete on logout)
- **Sincronização:** Preferência de provider sincronizada em `profiles/{uid}.preferred_ai_provider` (Firestore); chaves **NUNCA** tocam cloud
- **Fallback automático:** Se provider preferido falha (invalid/rate-limit), tenta próximo na fila (Gemini → Claude → OpenAI) sem blocar UX

### Suporte de Providers & Modelos

- **Providers suportados:** Gemini (Google), Claude (Anthropic), OpenAI (gpt-4o) - fallback order: Gemini → Claude → OpenAI
- **Modelos customizáveis:** User pode escolher modelo alternativo por provider em settings Advanced
- **Vision capability:** Usar provider com vision disponível (Gemini com prioridade); fallback automático para Claude/OpenAI
- **Admin controls:** Models definidos em `constants/ai-providers.ts` (centralized)

### Setup & Onboarding

- **Timing:** Soft prompt no onboarding (recomendado mas pulável); lazy setup quando user tenta usar feature com IA
- **Primeiro setup:** Modal onboarding 3-step (wizard): Escolher provider → Preencher API key → Teste de conectividade
- **Setup guides:** Webview in-app com links diretos para dashboards dos providers
- **No key fallback:** Toast simples "Add AI key in settings to unlock this feature" + link para settings

### UI/UX do Settings Screen

- **Layout:** Dropdown selector de provider + form dinâmica abaixo
- **Status display:** Auto-verify ao carregar screen; mostrar "Checked 2 minutes ago" + refresh button
- **Key editing:** Inline modal sheet (toque Edit → modal com textinput mascarado → validator → save)
- **Key visibility:** Mascarada default (••••••...XXXX); reveal toggle com timeout de 1 segundo
- **Ações:** Test, Edit, Copy Masked, Delete, View Logs (metadata only, sem chave)

### Teste de Conectividade & Validação

- **API call de teste:** countTokens (lightweight, zero cost/quota impact)
- **Categorização de erro:** 5 tipos (Invalid Key, Rate Limited, Network Error, Provider Down, Quota Exceeded)
- **UI feedback:** Button test + periodic background check (a cada 5 min se tiver chave, silent)
- **Caching de resultado:** Sempre fresh (cada tap = novo teste)
- **Quota tracking:** Mostrar usage % bar; link direto para official quota dashboard

### Integração com Domínios

- **API access pattern:** Serviços chamam `getApiKey(provider)` direto
- **Provider routing:** Sempre usa `preferred_provider` do perfil; sem override contextual
- **Fallback chain:** Centralizado em `lib/ai-fallback.ts` (shared logic)
- **Degraded mode:** Se all AI providers falham → feature degrada para manual
- **Concurrent calls:** Limitado a 2-3 requests paralelos max

### Compliance, Security & Logging

- **Logging policy:** Log com chave hashed (não plaintext)
- **Error reporting:** Report to Sentry com chave hashed em stack traces
- **Termos & consent:** One-time disclaimer ao primeiro setup (can dismiss)
- **Backup/export:** **Sem backup** (strict device-only)
- **Data residency:** Chaves device-only, preferência Firestore, metadata SQLite local

### Recursos Avançados & Otimizações

- **Response caching:** Smart TTL por tipo (24h plans, 2h images, 1h text)
- **Usage limiting:** Alerta preventivo ao atingir 80% da quota
- **Provider recommendation:** By capability-aware recomendação
- **Multi-key switching:** Fixo em runtime
- **Usage analytics:** Metadata tracking anonimizado (local SQLite)

### Edge Cases & Futuro

- **Sem chave:** App funciona 100% offline sem IA
- **Rotação de credenciais:** Auto-prompt ao detectar security event
- **Rastreamento de custo:** Estimated cost model (Gemini free, Claude $0.003/1K, OpenAI $0.005/1K)
- **Compliance GDPR:** GDPR-compliant + user controls (export on-device, delete right, SAR)
- **Futuro:** MVP only (nenhuma prep para HF, local LLM)

---

## Proposed Data Model

### Profiles Collection

`profiles/{uid}`

```json
{
  "preferred_ai_provider": "gemini",
  "ai_fallback_order": ["gemini", "claude", "openai"],
  "ai_models_config": {
    "gemini": "gemini-2.5-flash",
    "claude": "claude-sonnet-4-6",
    "openai": "gpt-4o"
  },
  "ai_keys_last_tested": {
    "gemini": timestamp,
    "claude": timestamp,
    "openai": timestamp
  },
  "ai_keys_test_status": {
    "gemini": "valid" | "invalid" | "rate_limited" | "unchecked",
    "claude": "valid" | "invalid" | "rate_limited" | "unchecked",
    "openai": "valid" | "invalid" | "rate_limited" | "unchecked"
  },
  "ai_keys_disclaimer_dismissed": true,
  "ai_usage_estimate": {
    "current_month_cost": 0.45,
    "requests_count": 124,
    "last_reset": timestamp
  }
}
```

### Local SecureStore (Device-Only)

```
hugoal_ai_key_gemini: "AIzaS..."
hugoal_ai_key_claude: "sk-ant-..."
hugoal_ai_key_openai: "sk-..."
```

### Local SQLite (Metadata)

`ai_usage_log` table

```
| id | provider | timestamp | duration_ms | success | error_type | cost_estimate |
|----|----------|-----------|-------------|---------|------------|---------------|
| 1  | gemini   | ...       | 250        | 1       | null       | 0.000005      |
| 2  | claude   | ...       | 1200       | 1       | null       | 0.0015        |
| 3  | openai   | ...       | 800        | 0       | rate_limited | null        |
```

### Response Cache (AsyncStorage)

```json
{
  "ai_cache_key": {
    "type": "diet_plan" | "meal_photo" | "text_gen",
    "provider": "gemini",
    "cached_at": timestamp,
    "expires_at": timestamp,
    "response": {...},
    "cost_estimate": 0.0015
  }
}
```

---

## Screens and Routes

- `app/settings/ai-keys.tsx` (NEW) - Provider manager, status, test, edit, delete, usage tracking
- `app/settings/index.tsx` (MODIFY) - Link to AI keys settings, show current provider status
- `app/settings/ai-analytics.tsx` (FUTURE) - Usage history + cost tracking (out of MVP scope)

## Components

`components/ui/` (shared, not domain-specific)

- `AIKeyCard.tsx` - Card de provider com status, masked key, actions
- `AIProviderSelector.tsx` - Dropdown selector de provider
- `AIKeyInputModal.tsx` - Modal 3-step (provider → key → verify)
- `AITestButton.tsx` - Button que roda countTokens test
- `AIStatusBadge.tsx` - Color badge (✓ valid, ⚠ unchecked, ✗ error)
- `AIQuotaWarning.tsx` - Alert banner se approaching 80% limit
- `AIUsageList.tsx` - List de logs (provider, timestamp, success/fail)

## Services

- `lib/api-key-store.ts` (EXTEND) - Add test, log, cost estimation
- `lib/ai-provider.ts` (EXTEND) - Add error categorization, duration tracking
- `lib/ai-fallback.ts` (NEW) ⭐ - Centralizado fallback logic + caching coordinator
- `lib/ai-cost-calculator.ts` (NEW) - Pricing models per provider
- `lib/ai-usage-tracker.ts` (NEW) - SQLite logging + quota estimation
- `lib/ai-cache.ts` (NEW) - AsyncStorage caching layer (TTL-based)

## Stores

- `stores/ai-keys.store.ts` (NEW) - Active provider, test status, usage metadata
  - State: `preferredProvider`, `keyStatuses`, `usageThisMonth`, `cacheHits`
  - Actions: `switchProvider()`, `testKey()`, `updateStatus()`, `trackUsage()`

---

## Screen Behavior

### AI Keys Settings Screen (`app/settings/ai-keys.tsx`)

Layout:

```
[Header: AI Provider Settings]

[Dropdown: Gemini ▼]  <-- Provider selector
[✓ Valid - Last tested 2 minutes ago] [Refresh>]

Key Preview (masked):
  AIzaS...XXXX [👁️ Show 1s] [📋 Copy]

Status Log:
  ✓ Test 1 (2 min ago) - 250ms
  ✓ Test 0 (15 min ago) - 280ms

Actions:
  [Edit Key]  [Delete]  [View Logs]

---

Provider Info:
  💡 For nutrition meal photos, Gemini has best results
  [Setup Guide →]

---

Usage Estimate (This Month):
  Requests: 124
  Estimated Cost: $0.45
  [View Quota Dashboard →]

No Key? [Setup Gemini] [Setup Claude] [Setup OpenAI]
```

### AI Key Edit Modal

3-step flow:

1. **Confirm Provider:** Gemini (Google) selected
2. **Enter Key:** Textinput (masked) with live validator
3. **Test Connection:** countTokens test → pass/fail

### First-Time Onboarding Modal

Triggered at app start or lazy (when trying AI feature):

1. Choose provider (Gemini, Claude, OpenAI cards)
2. Get key (webview setup guide + paste input)
3. Verify it works (test connection)
4. One-time disclaimer (can dismiss)

---

## Implementation Phases (11 Sequential)

### Phase A - Data & Storage Foundation

1. Extend `api-key-store.ts`:
   - Add `testApiKey(provider)` - countTokens call
   - Add `logTestResult(provider, success, errorType, duration)`
   - Add `getTestStatus(provider)` - cached status
   - Add `estimateCost(provider, tokens)` - pricing model per provider

2. Create `lib/ai-cost-calculator.ts`:
   - Pricing tables (Gemini free, Claude $0.003/1K, OpenAI $0.005/1K)
   - `calculateCost(provider, tokens)` → $
   - `estimateMonthly(usageHistory)` → $ forecast

3. Create `lib/ai-usage-tracker.ts`:
   - SQLite table: `ai_usage_log`
   - `logUsage(provider, duration, success, errorType, cost)`
   - `getUsageThisMonth()` - summarize
   - `queryLogs(filter)` - for history view

4. Create `stores/ai-keys.store.ts` (Zustand):
   - State: `preferred_provider`, `key_statuses`, `usage_this_month`, `last_test_times`
   - Actions: `switchProvider()`, `setTestStatus()`, `loadUsage()`

### Phase B - Fallback & Centralized Logic

1. Create `lib/ai-fallback.ts` ⭐:
   - `callAI(type: 'text' | 'image', params)` - router with fallback
   - Built-in fallback chain: [preferred] → [fallback order]
   - Caching integration (check cache before API call)
   - Error categorization + logging

2. Update `ai-provider.ts`:
   - Add error categorization (5 types)
   - Track duration
   - Pass cost to tracker

### Phase C - UI Components

1. Build `AIKeyCard.tsx`
2. Build `AIProviderSelector.tsx`
3. Build `AIKeyInputModal.tsx` (3-step validation)
4. Build `AITestButton.tsx` (with loading + result)
5. Build `AIStatusBadge.tsx` (color-coded)

### Phase D - AI Keys Settings Screen

1. Build `app/settings/ai-keys.tsx`:
   - Dropdown provider selector + card current provider
   - Masked key, status, test history, actions
   - Usage estimate card + quota progress bar
   - Setup guides + provider recommendations

2. Update `app/settings/index.tsx`:
   - Add link "AI Provider Settings"
   - Show current provider + status badge

### Phase E - Onboarding Integration

1. Build onboarding modal (3-step wizard)
2. Integrate into post-signup flow
3. Update Phase 02 onboarding to suggest AI setup

### Phase F - Lazy Setup Trigger

1. Add guards in AI-using screens (workouts, nutrition, etc)
2. Toast + navigate to settings if no key
3. Build `useAIKeyOrRedirect()` hook

### Phase G - Multi-Account & Logout

1. Update auth logic: delete `hugoal_ai_key_*` on logout
2. Implement `deleteAllApiKeys()` function
3. Test multi-account device scenarios

### Phase H - Firestore Sync

1. Update `firestore.ts`:
   - Load preferences on login
   - Sync provider + test_status
   - **Never** sync keys

2. Extend profile sync (write preferred_provider only)

### Phase I - Caching Layer

1. Create `lib/ai-cache.ts`:
   - AsyncStorage schema with TTL (24h plans, 2h images, 1h text)
   - `cacheResponse()`, `getCached()`, `invalidate()`

2. Integrate into `ai-fallback.ts`:
   - Check cache before API call
   - Log cache hits

### Phase J - Quota Tracking & Warnings

1. Cost tracking in `ai-usage-tracker.ts`:
   - Estimate cost post-call
   - Monthly rolling sum
   - Alert at 80%

2. Warning badge in settings

### Phase K - Polish & Compliance

1. Add masked logging (hash first 16 chars of key)
2. Add disclaimer banner (first time, dismissible)
3. Test error handling (all 5 error types)
4. Add privacy controls (purge logs, export history, delete right)

---

## Verification Checkpoints

### Phase A

- [ ] `testApiKey()` calls countTokens for each provider
- [ ] Error categorization working (5 types captured)
- [ ] SQLite table persists logs
- [ ] Zustand store initializes correctly

### Phase B

- [ ] `callAI()` tries Gemini, falls back to Claude/OpenAI on error
- [ ] Cache check works: same prompt → no API call
- [ ] No plaintext keys in logs

### Phase C-D

- [ ] Settings screen displays provider + masked key + test history
- [ ] Modal wizard validates key format + tests connection
- [ ] Edit/delete/copy actions work
- [ ] Usage estimate calculates

### Phase E-K

- [ ] Onboarding modal shows 3-step flow
- [ ] Disclaimer displayed once on first setup
- [ ] Toast appears when trying AI feature without key
- [ ] Multi-account: logout clears keys
- [ ] Preferences synced across devices
- [ ] Cache: same meal photo → no API call
- [ ] Quota warning shows at 80%
- [ ] Cost tracking matches provider pricing
- [ ] GDPR: can export/purge local data

---

## Acceptance Criteria

- ✅ User can add, edit, test, delete API keys securely
- ✅ Keys survive app restarts and are **never** sent to cloud
- ✅ Preferences sync across devices via Firestore
- ✅ If primary provider fails, app **automatically** tries next provider (transparent to user)
- ✅ Settings screen shows masked key, status badge, test history
- ✅ Cost and quota estimates displayed in settings
- ✅ No plaintext key in logs, stack traces, error messages
- ✅ GDPR-compliant: user can purge local records and export data
- ✅ App works 100% offline without any AI key (full feature access, no AI)
- ✅ First-time onboarding guides user through 3-step setup

---

## Constraints

- SecureStore must be the **ONLY** persistence for keys
- No API key data in Firestore, cloud, or any server
- All error messages must NOT reveal key format or partial key
- Response cache must respect provider TTLs (24h, 2h, 1h)
- Test calls use countTokens (zero-cost); no large generations
- Fallback must be automatic; no user intervention needed
- Logout must delete all local keys
- GDPR & privacy-first: device-only storage, user controls only

---

## Open Questions & Recommendations

1. **Model selection:** Allow users to cherry-pick (Gemini Flash vs Pro)?
   - **Recommendation:** Advanced section (collapsed); fixed in MVP

2. **Analytics dashboard:** Show usage trends, forecasts, provider comparison?
   - **Recommendation:** Prepare schema but don't build UI (out of MVP)

3. **Fallback notification:** Toast when switching providers automatically?
   - **Recommendation:** Transparent toast ("Switched to Claude")

4. **Quota alert threshold:** 80% or 60%?
   - **Recommendation:** Start at 80%; user adjustable in settings

5. **Cost accuracy:** Estimated vs actual (invoice)?
   - **Recommendation:** Estimate only; recommend checking provider dashboard
