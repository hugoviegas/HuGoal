# EAS Environment Variables Setup

## Overview

This document provides step-by-step instructions to set up EXPO*PUBLIC*\* environment variables in EAS Build for preview and production deployments.

**Problem:** EAS builds fail or show blank screens because Firebase and other EXPO*PUBLIC*\* variables are undefined at bundle time.

**Solution:** Register secrets in EAS Dashboard via CLI, then reference them in `eas.json` env blocks.

---

## Step 1: Authenticate with EAS

```bash
eas login
```

Verify authentication:

```bash
eas whoami
```

---

## Step 2: Register EAS Secrets for Firebase

Run the following commands to create project-scoped secrets. Replace placeholder values with your actual Firebase config:

```bash
# API Key
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "YOUR_FIREBASE_API_KEY"

# Auth Domain
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "YOUR_PROJECT_ID.firebaseapp.com"

# Project ID
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "YOUR_PROJECT_ID"

# Storage Bucket
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "YOUR_PROJECT_ID.appspot.com"

# Messaging Sender ID
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "YOUR_MESSAGING_SENDER_ID"

# App ID
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_APP_ID --value "YOUR_FIREBASE_APP_ID"
```

### Where to Find Firebase Config Values

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click "Project Settings" (gear icon)
4. Go to "General" tab
5. Scroll to "Your apps" section
6. Click on your app → copy the config object

Example Firebase config:

```json
{
  "apiKey": "AIzaSyD_example",
  "authDomain": "myproject-123.firebaseapp.com",
  "projectId": "myproject-123",
  "storageBucket": "myproject-123.appspot.com",
  "messagingSenderId": "123456789",
  "appId": "1:123456789:web:abcd1234"
}
```

---

## Step 3: Verify Secrets Registered

List all project secrets:

```bash
eas secret:list --scope project
```

Output should show:

```
EXPO_PUBLIC_FIREBASE_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
EXPO_PUBLIC_FIREBASE_PROJECT_ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID
```

---

## Step 4: Verify eas.json Configuration

Check `eas.json` includes env blocks for preview and production profiles:

```json
{
  "build": {
    "preview": {
      "env": {
        "APP_ENV": "preview",
        "EXPO_PUBLIC_FIREBASE_API_KEY": "$EXPO_PUBLIC_FIREBASE_API_KEY",
        "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN": "$EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
        "EXPO_PUBLIC_FIREBASE_PROJECT_ID": "$EXPO_PUBLIC_FIREBASE_PROJECT_ID",
        "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET": "$EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
        "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID": "$EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
        "EXPO_PUBLIC_FIREBASE_APP_ID": "$EXPO_PUBLIC_FIREBASE_APP_ID"
      }
    },
    "production": {
      "env": {
        "APP_ENV": "production",
        "EXPO_PUBLIC_FIREBASE_API_KEY": "$EXPO_PUBLIC_FIREBASE_API_KEY",
        "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN": "$EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
        "EXPO_PUBLIC_FIREBASE_PROJECT_ID": "$EXPO_PUBLIC_FIREBASE_PROJECT_ID",
        "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET": "$EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
        "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID": "$EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
        "EXPO_PUBLIC_FIREBASE_APP_ID": "$EXPO_PUBLIC_FIREBASE_APP_ID"
      }
    }
  }
}
```

✅ **This is already updated** in the current `eas.json`

---

## Step 5: Build and Test

### Preview Build

```bash
eas build --platform android --profile preview
```

### Production Build

```bash
eas build --platform android --profile production
```

Monitor build progress:

```bash
eas build:list
eas build:view <BUILD_ID>
```

---

## Troubleshooting

### ❌ "Initialization Error - Missing required environment variable"

**Cause:** Secret was not registered or eas.json env block is missing reference.

**Solution:**

1. Run `eas secret:list --scope project` to verify secret exists
2. Check `eas.json` includes the variable in the env block
3. Rebuild after confirming both steps

### ❌ Blank/Frozen Screen on EAS App Install

**Cause:** Firebase initialized with undefined config (silent failure).

**Solution:**

1. Check console logs for `[Firebase Init Error]`
2. Verify all 6 Firebase secrets are registered
3. Rebuild with correct secrets

### ❌ "Error: Cannot find secret"

**Cause:** Trying to build before secrets are created.

**Solution:**

- Run all 6 `eas secret:create` commands from Step 2
- Verify with `eas secret:list --scope project`

---

## Updated Code Changes

### ✅ `eas.json`

- Added `env` block to `preview` profile with all 6 EXPO*PUBLIC_FIREBASE*\* variables
- Added `env` block to `production` profile with all 6 EXPO*PUBLIC_FIREBASE*\* variables
- Variables use `$VARIABLE_NAME` syntax to reference EAS secrets

### ✅ `lib/firebase.ts`

- Added validation loop that checks all required Firebase config keys
- Throws clear error message if any key is undefined
- Error message includes helpful guidance on how to fix the issue

### ✅ `app/_layout.tsx`

- Added `initError` state to capture initialization errors
- Added error boundary that displays visible error screen instead of blank/frozen UI
- Error screen shows the actual error message and guidance
- Normal app UI only renders if initialization succeeds

---

## Local Development (no EAS secrets needed)

For local development, create `.env.local` in project root (gitignored):

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=your_local_value
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_local_value
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_local_value
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_local_value
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_local_value
EXPO_PUBLIC_FIREBASE_APP_ID=your_local_value
```

Then run:

```bash
npm start
```

The local `.env.local` file is loaded automatically by Expo and is not committed to git.

---

## References

- [EAS Documentation - Environment Variables](https://docs.expo.dev/build-reference/variables/)
- [Expo Secrets](https://docs.expo.dev/build-reference/variables/#using-secrets-in-eas-json)
- [Firebase Console](https://console.firebase.google.com)
- [EAS CLI Reference](https://docs.expo.dev/eas/cli/)

---

**Last Updated:** April 16, 2026  
**Status:** ✅ Setup Complete
