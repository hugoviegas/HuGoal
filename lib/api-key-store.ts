import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { AIProvider } from "@/types";

const KEY_PREFIX = "betteru_ai_key_";

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

export function maskApiKey(key: string): string {
  if (key.length <= 8) return "****";
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}
