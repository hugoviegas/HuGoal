import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
  type Auth,
} from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Validate Firebase config at initialization time
const requiredConfigKeys = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
] as const;

const missingConfigKeys = requiredConfigKeys.filter(
  (key) => !firebaseConfig[key as keyof typeof firebaseConfig],
);

const firebaseInitError =
  missingConfigKeys.length > 0
    ? `[Firebase Init Error] Missing required environment variable(s): ${missingConfigKeys
        .map((key) => `EXPO_PUBLIC_FIREBASE_${key.toUpperCase()}`)
        .join(
          ", ",
        )}. This is required for EAS builds. Please ensure all EXPO_PUBLIC_FIREBASE_* secrets are registered in EAS dashboard and referenced in eas.json env blocks.`
    : null;

const isFirebaseReady = firebaseInitError === null;

if (!isFirebaseReady && firebaseInitError) {
  console.error(firebaseInitError);
}

type FirebaseAppType = ReturnType<typeof getApp>;
type FirestoreType = ReturnType<typeof getFirestore>;
type StorageType = ReturnType<typeof getStorage>;

let app: FirebaseAppType;
let auth: Auth;
let db: FirestoreType;
let storage: StorageType;

if (isFirebaseReady) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

  try {
    if (Platform.OS !== "web") {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } else {
      auth = getAuth(app);
    }
  } catch {
    // Auth already initialized (e.g. fast refresh).
    auth = getAuth(app);
  }

  try {
    db =
      Platform.OS === "web"
        ? initializeFirestore(app, {
            localCache: persistentLocalCache({
              tabManager: persistentMultipleTabManager(),
            }),
          })
        : initializeFirestore(app, {
            experimentalAutoDetectLongPolling: true,
          });
  } catch {
    db = getFirestore(app);
  }
  storage = getStorage(app);
} else {
  // Keep exports stable so callers can gate usage through isFirebaseReady.
  app = null as unknown as FirebaseAppType;
  auth = null as unknown as Auth;
  db = null as unknown as FirestoreType;
  storage = null as unknown as StorageType;
}

export { app, auth, db, storage, isFirebaseReady, firebaseInitError };
