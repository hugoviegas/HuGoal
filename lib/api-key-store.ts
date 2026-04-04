import * as SecureStore from 'expo-secure-store';
import type { AIProvider } from '@/types';

const KEY_PREFIX = 'betteru_ai_key_';

export async function saveApiKey(
  provider: AIProvider,
  key: string
): Promise<void> {
  await SecureStore.setItemAsync(`${KEY_PREFIX}${provider}`, key, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getApiKey(
  provider: AIProvider
): Promise<string | null> {
  return SecureStore.getItemAsync(`${KEY_PREFIX}${provider}`);
}

export async function deleteApiKey(provider: AIProvider): Promise<void> {
  await SecureStore.deleteItemAsync(`${KEY_PREFIX}${provider}`);
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return '****';
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}
