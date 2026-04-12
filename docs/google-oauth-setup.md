# Configuração Google Sign-In (Expo + Firebase)

Este guia descreve os passos para configurar corretamente os Client IDs Google, Firebase e Expo para o projeto `betteru`.

## Valores confirmados no projeto

- `slug`: `betteru` (arquivo [app.json](app.json))
- `android.package`: `com.hugoviegas.betteru` (atualizado em [app.json](app.json))
- `ios.bundleIdentifier`: `com.hugoviegas.betteru` (atualizado em [app.json](app.json))
- `expo owner` (whoami): `hviegas`

## Redirect URI (Expo)

- Expo (proxy / Expo Go): `https://auth.expo.io/@hviegas/betteru`
- Para confirmar localmente o redirect gerado pelo seu ambiente, execute no código ou Node:

```bash
node -e "console.log(require('expo-auth-session').AuthSession.makeRedirectUri({ useProxy: true }))"
```

Adicione o URI `https://auth.expo.io/@hviegas/betteru` em: Google Cloud Console → APIs & Services → Credentials → Web client → Authorized redirect URIs.

## Passo a passo (resumido)

1. Google Cloud Console
   - Projeto: selecione o projeto do seu app.
   - OAuth consent screen: configure (External / Testing) e adicione test users.
   - Credentials → Create → OAuth client ID:
     - Web client: copie o `Client ID` (usar em `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`) e adicione o redirect `https://auth.expo.io/@hviegas/betteru`.
     - Android client: crie com `package` = `com.hugoviegas.betteru` e adicione SHA‑1 (ver abaixo).
     - iOS client: crie com `bundle id` = `com.hugoviegas.betteru`.

2. Firebase
   - Authentication → Sign-in method → habilite **Google**.
   - Project settings → Add app (Android/iOS) se for build nativa:
     - Android: informe `com.hugoviegas.betteru` e o SHA‑1; baixe `google-services.json`.
     - iOS: informe `com.hugoviegas.betteru` e baixe `GoogleService-Info.plist`.

3. Variáveis de ambiente (local)
   - Atualize `.env` (ou use EAS secrets) com os Client IDs obtidos:

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<WEB_CLIENT_ID.apps.googleusercontent.com>
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<ANDROID_CLIENT_ID.apps.googleusercontent.com>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<IOS_CLIENT_ID.apps.googleusercontent.com>
```

4. EAS / Produção
   - Obtenha SHA‑1 de produção (EAS):

```bash
eas credentials
```

- Adicione esse SHA‑1 no Android OAuth client no Google Cloud e em Firebase (Android app settings).
- Guarde os Client IDs como EAS secrets para builds:

```bash
eas secret:create --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value <WEB_CLIENT_ID>
eas secret:create --name EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID --value <ANDROID_CLIENT_ID>
eas secret:create --name EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID --value <IOS_CLIENT_ID>
```

## Comandos úteis

- Ver owner Expo (já executado):

```bash
npx expo whoami
# -> hviegas
```

- Ver redirect URI que o pacote usa:

```bash
node -e "console.log(require('expo-auth-session').AuthSession.makeRedirectUri({ useProxy: true }))"
```

- SHA‑1 debug (local):

```bash
# Windows
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
# macOS/Linux
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

## Erros comuns

- `redirect_uri_mismatch`: adicione o redirect URI exato no Web client.
- `DEVELOPER_ERROR` (Android): SHA‑1 incorreto; confirme o SHA‑1 usado para criar o Android client.
- Usuários em modo Testing não autenticam: adicione emails em OAuth consent screen → Test users.

## Alterações aplicadas pelo agente

- Atualizei [app.json](app.json) — `android.package` e `ios.bundleIdentifier` passam a ser `com.hugoviegas.betteru`.

## Checklist final antes de testar

- [ ] Criar Web/Android/iOS OAuth clients no Google Cloud com os valores corretos.
- [ ] Adicionar redirect `https://auth.expo.io/@hviegas/betteru` no Web client.
- [ ] Habilitar Google Sign‑in no Firebase e registrar apps Android/iOS (SHA‑1).
- [ ] Definir as `EXPO_PUBLIC_GOOGLE_*` variáveis localmente ou via EAS secrets.

Se quiser eu também:

- gerar o patch para atualizar `scheme` em `app.json` para `betteru` (opcional),
- ou aplicar as mudanças em outros arquivos caso me indique que devo substituir `com.hugoal.app` em mais locais (já não existem referências encontradas).

---

Arquivo gerado automaticamente pelo assistente para ajudar a completar a configuração.
