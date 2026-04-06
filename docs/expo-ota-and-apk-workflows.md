# Expo OTA e Build no GitHub Actions

Este projeto agora possui tres workflows organizados por ambiente:

- `.github/workflows/expo-ota-update.yml`: preview OTA (Android) para branches que nao sao `main`.
- `.github/workflows/expo-build-apk.yml`: build development (Android APK) para branches que nao sao `main`.
- `.github/workflows/expo-publish-main.yml`: build de publish para a branch `main`.

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

O token deve ser criado no painel do Expo (`expo.dev`) em Account Settings > Access Tokens.
Depois, salve no secret `EXPO_TOKEN` do GitHub.

## Como baixar os builds

1. Para development APK, abra o workflow `Build Development APK (Android)`.
2. Baixe na aba `Artifacts` ou no release `development-apk-latest`.
3. Para publish (main), abra o workflow `Publish Build (Main)` e baixe o artifact/release `publish-main-latest`.

## Como o app recebe update OTA

- O app ja esta configurado com:
  - `updates.checkAutomatically = ON_LOAD`
  - `updates.fallbackToCacheTimeout = 0`
- Resultado: ao abrir o app, ele verifica update automaticamente.
- Tambem existe acao manual em `Settings > App Updates > Check for updates`.

## Regras de versionamento

- Branches nao-main (preview/development): bump `patch` (ex.: `1.0.0` -> `1.0.1`).
- Branch `main` (publish): bump `minor` (ex.: `1.0.0` -> `1.1.0`).
- O workflow aplica o bump durante o CI em `app.json` e `package.json` para que a versao apareca no app.
- A tela de Settings mostra a versao atual do app.

## Observacoes

- O build instalado no aparelho deve estar no canal/branch correto (ex.: `preview`) para receber os updates desse branch.
- `eas.json` ja foi configurado com canais por perfil (`development`, `preview`, `production`).
- Para maior estabilidade, os workflows agora chamam `npx --yes eas-cli@latest ...` diretamente nos passos de build/update.
- Existe validacao explicita do `EXPO_TOKEN` no inicio do job para falhar cedo com mensagem clara quando o secret nao estiver disponivel.
- Para reduzir tempo de execucao, os workflows usam:
  - cache de `~/.npm`, `~/.expo` e `~/.eas`
  - `npm ci --prefer-offline --no-audit`
  - filtro de `paths` para nao disparar build/update em commits que so alteram docs/arquivos nao relevantes para app.
  - skip de run obsoleto para builds (se existir commit mais novo na branch, o build antigo e ignorado).
