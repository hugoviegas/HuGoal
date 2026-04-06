import type { AIProvider } from "@/types";

// Pricing per 1000 tokens
const PRICING: Record<AIProvider, number> = {
  gemini: 0.0, // free for preview/dev
  claude: 0.003, // $0.003 per 1K tokens
  openai: 0.005, // $0.005 per 1K tokens
};

export const DEFAULT_MONTHLY_BUDGET_USD = 10.0;

export function estimateTokensFromText(text: string): number {
  if (!text) return 0;
  // rough heuristic: 4 chars per token
  return Math.max(1, Math.ceil(text.length / 4));
}

export function calculateCost(provider: AIProvider, tokens: number): number {
  const pricePer1k = PRICING[provider] ?? 0;
  return Number(((tokens / 1000) * pricePer1k).toFixed(6));
}

export function estimateCostForText(
  provider: AIProvider,
  text: string,
): number {
  const tokens = estimateTokensFromText(text);
  return calculateCost(provider, tokens);
}

export default {
  estimateTokensFromText,
  calculateCost,
  estimateCostForText,
};
