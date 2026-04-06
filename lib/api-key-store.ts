import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { AIProvider } from "@/types";

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
  // Do NOT use EXPO_PUBLIC_* variables here to avoid exposing secret keys
  // in client builds. Prefer non-public env vars which should be injected
  // at build time in native builds or provided via a secure server.
  const env =
    provider === "gemini"
      ? (process.env.GEMINI_API_KEY ?? null)
      : provider === "claude"
        ? (process.env.CLAUDE_API_KEY ?? null)
        : (process.env.OPENAI_API_KEY ?? null);

  if (!env || !env.trim()) return null;
  return env.trim();
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
