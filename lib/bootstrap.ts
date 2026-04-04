import { getApiKey } from './api-key-store';
import type { AIProvider } from '@/types';

export interface BootstrapResult {
  hasApiKey: boolean;
  configuredProviders: AIProvider[];
}

/**
 * Runs at startup to prepare any local state that doesn't require Firebase.
 * Firebase auth and profile hydration are handled by auth.store.ts `initialize()`.
 */
export async function bootstrapApp(): Promise<BootstrapResult> {
  const providers: AIProvider[] = ['gemini', 'claude', 'openai'];
  const configured: AIProvider[] = [];

  for (const provider of providers) {
    const key = await getApiKey(provider);
    if (key) configured.push(provider);
  }

  return {
    hasApiKey: configured.length > 0,
    configuredProviders: configured,
  };
}
