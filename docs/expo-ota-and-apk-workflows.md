# Expo OTA e APK no GitHub Actions

Este projeto agora possui dois workflows:

- `.github/workflows/expo-ota-update.yml`: publica OTA (EAS Update) em cada commit.
- `.github/workflows/expo-build-apk.yml`: gera APK preview e publica no GitHub Release `preview-apk-latest`.

## OTA vs APK

- `eas update` NAO gera APK. Ele gera um pacote OTA (JS/assets) para apps ja instalados.
- Para instalar do zero no Android, voce precisa de um APK gerado por `eas build --profile preview --platform android`.

## Secrets necessarios

Configure em `Settings > Secrets and variables > Actions` no GitHub:

- `EXPO_TOKEN` (obrigatorio)
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `GEMINI_API_KEY`
- `FIREBASE_ADMIN_SDK_KEY`
- `ADMIN_BOOTSTRAP_KEY`
- `API_KEY_21ST`

## Gerar EXPO_TOKEN

No terminal local autenticado no Expo:

```bash
npx eas token:create
```

Copie o token e salve no segredo `EXPO_TOKEN` do GitHub.

## Como baixar o APK

1. Acesse `Actions` e abra o run de `Build Android APK and Publish`.
2. Baixe em `Artifacts` o arquivo APK.
3. Ou abra o release `preview-apk-latest` e baixe o APK de la.

## Como o app recebe update OTA

- O app ja esta configurado com:
  - `updates.checkAutomatically = ON_LOAD`
  - `updates.fallbackToCacheTimeout = 0`
- Resultado: ao abrir o app, ele verifica update automaticamente.
- Tambem existe acao manual em `Settings > App Updates > Check for updates`.

## Observacoes

- O build instalado no aparelho deve estar no canal/branch correto (ex.: `preview`) para receber os updates desse branch.
- `eas.json` ja foi configurado com canais por perfil (`development`, `preview`, `production`).
- Nos workflows CI, o comando usado e `eas` (nao `npx eas`) porque o EAS CLI e provisionado pelo `expo/expo-github-action`.
- Para reduzir tempo de execucao, os workflows usam:
  - cache de `~/.npm`, `~/.expo` e `~/.eas`
  - `npm ci --prefer-offline --no-audit`
  - filtro de `paths` para nao disparar build/update em commits que so alteram docs/arquivos nao relevantes para app.
