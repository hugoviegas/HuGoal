# Auth & Firebase - HuGoal

## Visão Geral

O HuGoal usa Firebase para autenticação e banco de dados. O sistema implementa autenticação com Google e persiste dados no Firestore.

---

## Configuração

### Variáveis de Ambiente

Criar `.env.local` baseado em `.env.example`:

```env
# Firebase Auth
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=

# Google OAuth (obrigatório para sign-in)
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
```

---

## Inicialização do Firebase

### Arquivo: `lib/firebase.ts`

```typescript
import { initializeApp, getApps } from "firebase/app";
import { initializeAuth, getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  // ...
};

// Inicialização
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = initializeAuth(app, { persistence: ... });
const db = initializeFirestore(app, { ... });
const storage = getStorage(app);

export { app, auth, db, storage, isFirebaseReady };
```

### Validação

O Firebase verifica se todas as variáveis obrigatórias estão configuradas. Se faltar alguma, `isFirebaseReady` será `false` e operações não serão executadas:

```typescript
import { isFirebaseReady, firebaseInitError } from "@/lib/firebase";

if (!isFirebaseReady) {
  console.error(firebaseInitError); // Mostra variáveis faltando
}
```

---

## Autenticação

### Provedor: Google Sign-In

O app usa **Google OAuth** como método principal de autenticação via `expo-auth-session`.

#### Hook: `useGoogleSignIn`

```typescript
import { useGoogleSignIn } from "@/hooks/useGoogleSignIn";

function LoginScreen() {
  const { isReady, isLoading, signInWithGoogle } = useGoogleSignIn();

  const handleSignIn = async () => {
    const result = await signInWithGoogle();
    // result.isNewProfile === true se for novo usuário
  };

  return <Button onPress={handleSignIn} loading={isLoading}>Entrar com Google</Button>;
}
```

#### Fluxo

1. Usuário clica em "Entrar com Google"
2. Expo Auth Session abre navegador para OAuth Google
3. Usuário retorna com ID token
4. Credential criado com `GoogleAuthProvider.credential(idToken)`
5. `signInWithCredential` login no Firebase Auth
6. Perfil criado em Firestore se não existir

#### Estados

| Estado | Descrição |
|--------|-----------|
| `isReady` | OAuth request pronto |
| `isLoading` | Autenticação em progresso |

#### Tratamento de Erros

- **Conta com provedor diferente**: Detecta e mostra mensagem clara
- **Login.cancelado**: Usuário fechou navegador
- **Conta já existe**: Instrui usar provedor original

---

## Auth Store

### Arquivo: `stores/auth.store.ts`

```typescript
import { create } from "zustand";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  status: "loading" | "authenticated" | "unauthenticated";

  setUser: (user: User | null) => void;
  signOut: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
}
```

#### Cache de Perfil

O auth store usa cache local para inicialização rápida:

- **MMKV**: Armazenamento rápido (Production)
- **Memory fallback**: Para Expo Go

```typescript
// Cache key: "auth_profile_cache"
const AUTH_CACHE_KEY = "auth_profile_cache";
```

#### Estado de Autenticação

| Estado | Significado |
|-------|------------|
| `loading` | Verificando auth inicial |
| `authenticated_cached` | Usuário logado (cache) |
| `authenticated` | Verificado com Firebase |
| `unauthenticated` | Não logado |

---

## Firestore

### Estrutura de Dados

```
users/{uid}
├── profile              # UserProfile
│
workouts/{workoutId}
├── template            # WorkoutTemplate
├── session            # WorkoutSession
│
nutrition/{userId}
├── logs/{logId}        # NutritionLog
├── settings           # NutritionSettings
├── pantry            # FoodLibraryItem[]
│
community/
├── posts/{postId}
├── groups/{groupId}
├── checkins/{checkInId}
```

### Helper Functions

```typescript
import {
  getDocument,
  setDocument,
  updateDocument,
  deleteDocument,
  queryDocuments,
  createDocument,
} from "@/lib/firestore";

// Ler documento
const profile = await getDocument<UserProfile>("profiles", userId);

// Criar documento
const id = await createDocument("profiles", { name: "John" });

// Atualizar
await updateDocument("profiles", userId, { xp: 100 });

// Query com filtros
const posts = await queryDocuments(
  "posts",
  where("author_id", "==", userId),
  orderBy("created_at", "desc"),
  limit(20)
);
```

### Tipos de Dados

```typescript
// Perfil do usuário
interface UserProfile {
  id: string;
  email: string;
  name: string;
  username: string;
  avatar_url?: string;
  xp: number;
  streak_current: number;
  streak_longest: number;
  onboarding_complete: boolean;
  created_at: string;
}

// Grupo de comunidade
interface CommunityGroup {
  id: string;
  name: string;
  description?: string;
  member_count: number;
  challenge_type: "workout" | "nutrition";
}
```

---

## Realtime Updates

Para escutar mudanças em tempo real:

```typescript
import { onSnapshot } from "firebase/firestore";
import { doc } from "firebase/firestore";

useEffect(() => {
  const docRef = doc(db, "profiles", userId);
  const unsubscribe = onSnapshot(docRef, (snapshot) => {
    const data = snapshot.data();
    // Atualiza UI quando mudar
  });

  return () => unsubscribe();
}, [userId]);
```

---

## Storage

Para imagens e mídias:

```typescript
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

async function uploadImage(uri: string, path: string) {
  const storageRef = ref(storage, path);
  const response = await fetch(uri);
  const blob = await response.blob();
  
  const snapshot = await uploadBytes(storageRef, blob);
  const url = await getDownloadURL(snapshot.ref);
  
  return url;
}
```

---

## Regras de Segurança (Firestore)

### Arquivo: `firestore.rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    //-usuários sóemodem editar próprio perfil
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    // Posts públicos para leitura
    match /posts/{postId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth.uid == resource.data.author_id;
    }
  }
}
```

---

## Storage Rules

### Arquivo: `storage.rules`

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /avatars/{userId} {
      allow read: if true;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

---

## Boas Práticas

### 1. Validar Configuração

Sempre verifique `isFirebaseReady` antes de usar serviços:

```typescript
import { isFirebaseReady } from "@/lib/firebase";

if (!isFirebaseReady) {
  return; // Firebase não configurado
}
```

### 2. Tratar Erros

```typescript
try {
  await signInWithGoogle();
} catch (error: any) {
  if (error.code === "auth/account-exists-with-different-credential") {
    // Mostrar mensagem específica
  }
}
```

### 3. Usar Cache

Perfis são cacheados para inicialização instantânea:

```typescript
const { profile } = useAuthStore(); // Já vem do cache
```

### 4. Logout Limpo

```typescript
await signOut(auth);

// Limpar stores
useWorkoutStore.getState().reset();
useNutritionStore.getState().reset();
// ...
```

---

## Expo Go vs Production

| Feature | Expo Go | Production |
|----------|--------|-------------|
| MMKV Cache | ❌ Não disponível | ✅ Rápido |
| OAuth | ✅ Proxy Expo | ✅ Direto |
| Offline Cache | ⚠️ Limitado | ✅ Firestore cache |

---

## Troubleshooting

### "Google sign-in not ready"
- Verificar variáveis EXPO_PUBLIC_GOOGLE_* Client IDs

### "Missing Firebase config"
- Verificar EXPO_PUBLIC_FIREBASE_* em `.env.local`

### "Auth already initialized"
- Erro de hot reload, ignorar (handled)

### "Network error"
- Verificar conexão ou usar emulador com rede permitida

---

## Próximos Passos

- **Email/Password auth**: Implementar se necessário
- **Magic Link**: Autenticação sem senha
- **2FA**: Autenticação em dois fatores

---

**Última Atualização**: 2026-04-24