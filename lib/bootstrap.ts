import { getApiKey } from "./api-key-store";
import type { AIProvider } from "@/types";

export interface BootstrapResult {
  hasApiKey: boolean;
  configuredProviders: AIProvider[];
}

export interface BootstrapDeferredResult {
  completedAt: number;
}

const PROVIDERS: AIProvider[] = ["gemini", "claude", "openai"];

/**
 * Reads only startup-critical settings that should be available as soon as possible.
 */
export async function bootstrapCritical(): Promise<BootstrapResult> {
  const keys = await Promise.all(
    PROVIDERS.map((provider) => getApiKey(provider)),
  );
  const configured = PROVIDERS.filter((_, index) => {
    const key = keys[index];
    return typeof key === "string" && key.trim().length > 0;
  });

  return {
    hasApiKey: configured.length > 0,
    configuredProviders: configured,
  };
}

/**
 * Placeholder for non-critical startup work. Keep this out of the initial render path.
 */
export async function bootstrapDeferred(): Promise<BootstrapDeferredResult> {
  return {
    completedAt: Date.now(),
  };
}

/**
 * Runs at startup to prepare any local state that doesn't require Firebase.
 * Firebase auth and profile hydration are handled by auth.store.ts `initialize()`.
 */
export async function bootstrapApp(): Promise<BootstrapResult> {
  const critical = await bootstrapCritical();
  setTimeout(() => {
    void bootstrapDeferred();
  }, 0);
  return critical;
}
