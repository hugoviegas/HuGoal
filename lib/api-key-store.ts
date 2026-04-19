import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { auth } from "./firebase";
import { getDocument } from "./firestore";
import type { AIProvider, UserProfile } from "@/types";

const KEY_PREFIX = "betteru_ai_key_";
const PROVIDERS: AIProvider[] = ["gemini", "claude", "openai"];

function storageKey(provider: AIProvider): string {
  return `${KEY_PREFIX}${provider}`;
}

function getWebStorage(): Storage | null {
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) {
    return null;
  }

  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export async function saveApiKey(
  provider: AIProvider,
  key: string,
): Promise<void> {
  const k = storageKey(provider);

  if (Platform.OS === "web") {
    const webStorage = getWebStorage();
    if (webStorage) {
      webStorage.setItem(k, key);
    }
    return;
  }

  await SecureStore.setItemAsync(k, key, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getApiKey(provider: AIProvider): Promise<string | null> {
  const k = storageKey(provider);

  if (Platform.OS === "web") {
    const webStorage = getWebStorage();
    return webStorage ? webStorage.getItem(k) : null;
  }

  try {
    return await SecureStore.getItemAsync(k);
  } catch {
    return null;
  }
}

function previewKeyByProvider(provider: AIProvider): string | null {
  const env =
    provider === "gemini"
      ? (process.env.EXPO_PUBLIC_GEMINI_SHARED_API_KEY ??
        process.env.GEMINI_API_KEY ??
        null)
      : __DEV__
        ? provider === "claude"
          ? (process.env.CLAUDE_API_KEY ?? null)
          : (process.env.OPENAI_API_KEY ?? null)
        : null;

  if (!env || !env.trim()) return null;
  return env.trim();
}

async function currentUserHasProAccess(): Promise<boolean> {
  // Eagerly check local state to avoid network roundtrips after login
  const { useAuthStore } = require("@/stores/auth.store");
  const localProfile = useAuthStore.getState().profile;
  if (localProfile?.is_pro) return true;

  const currentUser = auth?.currentUser;
  if (!currentUser) return false;

  try {
    const fetchedProfile = await getDocument<UserProfile>(
      "profiles",
      currentUser.uid,
    );
    return fetchedProfile?.is_pro === true;
  } catch {
    return false;
  }
}

export async function getResolvedApiKey(
  provider: AIProvider,
): Promise<{ key: string | null; source: "user" | "preview" | "none" }> {
  const userKey = await getApiKey(provider);
  if (userKey && userKey.trim()) {
    return { key: userKey.trim(), source: "user" };
  }

  const previewKey = previewKeyByProvider(provider);
  if (previewKey) {
    if (provider === "gemini") {
      const hasProAccess = await currentUserHasProAccess();
      if (!hasProAccess && !__DEV__) {
        return { key: null, source: "none" };
      }
    }

    return { key: previewKey, source: "preview" };
  }

  return { key: null, source: "none" };
}

export async function deleteApiKey(provider: AIProvider): Promise<void> {
  const k = storageKey(provider);

  if (Platform.OS === "web") {
    const webStorage = getWebStorage();
    if (webStorage) {
      webStorage.removeItem(k);
    }
    return;
  }

  try {
    await SecureStore.deleteItemAsync(k);
  } catch {
    // Best-effort cleanup.
  }
}

export async function deleteAllApiKeys(): Promise<void> {
  await Promise.all(PROVIDERS.map((provider) => deleteApiKey(provider)));
}

export async function listApiKeySources(): Promise<
  Record<AIProvider, "user" | "preview" | "none">
> {
  const entries = await Promise.all(
    PROVIDERS.map(async (provider) => {
      const resolved = await getResolvedApiKey(provider);
      return [provider, resolved.source] as const;
    }),
  );

  return Object.fromEntries(entries) as Record<
    AIProvider,
    "user" | "preview" | "none"
  >;
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return "****";
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}
