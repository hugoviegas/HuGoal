import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { AIProvider } from "@/types";
import { getResolvedApiKey } from "./api-key-store";
import { calculateCost, estimateTokensFromText } from "./ai-cost-calculator";
import { logUsage } from "./ai-usage-tracker";

interface AIResponse {
  text: string;
}

interface AIRequestOptions {
  model?: string;
  apiKeyOverride?: string;
}

export type AIKeyTestStatus =
  | "valid"
  | "invalid"
  | "rate_limited"
  | "network_error"
  | "provider_down"
  | "quota_exceeded";

export interface AIKeyTestResult {
  status: AIKeyTestStatus;
  durationMs: number;
  errorMessage?: string;
}

function categorizeProviderError(error: unknown): AIKeyTestStatus {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  if (
    message.includes("401") ||
    message.includes("unauthorized") ||
    message.includes("invalid api") ||
    message.includes("authentication")
  ) {
    return "invalid";
  }
  if (
    message.includes("429") ||
    message.includes("rate") ||
    message.includes("too many requests")
  ) {
    return "rate_limited";
  }
  if (
    message.includes("quota") ||
    message.includes("billing") ||
    message.includes("insufficient_quota")
  ) {
    return "quota_exceeded";
  }
  if (
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("fetch failed") ||
    message.includes("econn")
  ) {
    return "network_error";
  }

  return "provider_down";
}

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  options?: AIRequestOptions,
): Promise<AIResponse> {
  const genAI = new GoogleGenerativeAI(apiKey);

  function buildCandidates(): string[] {
    if (options?.model) return [options.model];

    const combinedLength =
      (systemPrompt ?? "").length + (userPrompt ?? "").length;
    const simplePreferred = combinedLength < 800;

    const primary = simplePreferred
      ? ["gemini-3.1-flash-lite", "gemini-3-flash"]
      : ["gemini-3-flash", "gemini-3.1-flash-lite"];

    const fallbacks = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

    return [...primary, ...fallbacks];
  }

  const candidates = buildCandidates();
  let lastError: unknown = null;

  for (const candidate of candidates) {
    try {
      const model = genAI.getGenerativeModel({
        model: candidate,
        systemInstruction: systemPrompt,
      });
      const result = await model.generateContent(userPrompt);
      return { text: result.response.text() };
    } catch (err) {
      lastError = err;
      const status = categorizeProviderError(err);
      if (status === "quota_exceeded" || status === "rate_limited") {
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? new Error("Gemini: all model candidates failed");
}

async function callClaude(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  options?: AIRequestOptions,
): Promise<AIResponse> {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: options?.model ?? "claude-sonnet-4-6",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  const textBlock = response.content.find((b) => b.type === "text");
  return { text: textBlock?.text ?? "" };
}

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  options?: AIRequestOptions,
): Promise<AIResponse> {
  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: options?.model ?? "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  return { text: response.choices[0]?.message?.content ?? "" };
}

export async function generateText(
  provider: AIProvider,
  systemPrompt: string,
  userPrompt: string,
  options?: AIRequestOptions,
): Promise<AIResponse> {
  const resolved = options?.apiKeyOverride
    ? { key: options.apiKeyOverride, source: "user" as const }
    : await getResolvedApiKey(provider);
  const apiKey = resolved.key;
  if (!apiKey) {
    throw new Error(`No API key configured for ${provider}`);
  }

  const started = Date.now();
  try {
    let result: AIResponse | undefined;
    switch (provider) {
      case "gemini":
        result = await callGemini(apiKey, systemPrompt, userPrompt, options);
        break;
      case "claude":
        result = await callClaude(apiKey, systemPrompt, userPrompt, options);
        break;
      case "openai":
        result = await callOpenAI(apiKey, systemPrompt, userPrompt, options);
        break;
      default:
        throw new Error(`Unsupported provider ${provider}`);
    }

    const duration = Date.now() - started;
    try {
      const tokens = estimateTokensFromText(
        systemPrompt + " " + userPrompt + " " + (result.text ?? ""),
      );
      const cost = calculateCost(provider, tokens);
      void logUsage(provider, duration, true, null, cost);
    } catch (e) {
      // best-effort logging
      // eslint-disable-next-line no-console
      console.warn("[ai-provider] cost/log failed", e);
    }

    return result;
  } catch (err: unknown) {
    const duration = Date.now() - started;
    const errMsg = err instanceof Error ? err.message : String(err);
    void logUsage(provider, duration, false, errMsg, null).catch(() => {});
    throw err;
  }
}

export async function analyzeImage(
  provider: AIProvider,
  base64Image: string,
  prompt: string,
  options?: AIRequestOptions,
): Promise<AIResponse> {
  const resolved = options?.apiKeyOverride
    ? { key: options.apiKeyOverride, source: "user" as const }
    : await getResolvedApiKey(provider);
  const apiKey = resolved.key;
  if (!apiKey) {
    throw new Error(`No API key configured for ${provider}`);
  }

  const started = Date.now();
  try {
    let result: AIResponse | undefined;
    if (provider === "gemini") {
      const genAI = new GoogleGenerativeAI(apiKey);

      function buildImageCandidates(): string[] {
        if (options?.model) return [options.model];
        const simplePreferred = prompt.length < 400;
        const primary = simplePreferred
          ? ["gemini-3.1-flash-lite", "gemini-3-flash"]
          : ["gemini-3-flash", "gemini-3.1-flash-lite"];
        const fallbacks = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
        return [...primary, ...fallbacks];
      }

      const candidates = buildImageCandidates();
      let lastError: unknown = null;

      for (const candidate of candidates) {
        try {
          const model = genAI.getGenerativeModel({ model: candidate });
          const r = await model.generateContent([
            prompt,
            { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          ]);
          result = { text: r.response.text() };
          break;
        } catch (err) {
          lastError = err;
          const status = categorizeProviderError(err);
          if (status === "quota_exceeded" || status === "rate_limited") {
            continue;
          }
          throw err;
        }
      }

      if (!result) {
        throw lastError ?? new Error("Gemini image models failed");
      }
    } else if (provider === "claude") {
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model: options?.model ?? "claude-sonnet-4-6",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: base64Image,
                },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      });
      const textBlock = response.content.find((b) => b.type === "text");
      result = { text: textBlock?.text ?? "" };
    } else {
      const client = new OpenAI({ apiKey });
      const response = await client.chat.completions.create({
        model: options?.model ?? "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${base64Image}` },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      });
      result = { text: response.choices[0]?.message?.content ?? "" };
    }

    const duration = Date.now() - started;
    try {
      const overheadTokens = 100; // image processing overhead estimate
      const tokens =
        estimateTokensFromText(prompt + " " + (result?.text ?? "")) +
        overheadTokens;
      const cost = calculateCost(provider, tokens);
      void logUsage(provider, duration, true, null, cost);
    } catch (e) {
      // best-effort
      // eslint-disable-next-line no-console
      console.warn("[ai-provider] cost/log failed", e);
    }

    return result!;
  } catch (err: unknown) {
    const duration = Date.now() - started;
    const errMsg = err instanceof Error ? err.message : String(err);
    void logUsage(provider, duration, false, errMsg, null).catch(() => {});
    throw err;
  }
}

export async function testProviderApiKey(
  provider: AIProvider,
  apiKey: string,
): Promise<AIKeyTestResult> {
  const startedAt = Date.now();

  try {
    if (provider === "gemini") {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      await model.countTokens("ping");
    } else if (provider === "claude") {
      const client = new Anthropic({ apiKey });
      await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      });
    } else {
      const client = new OpenAI({ apiKey });
      await client.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      });
    }

    return {
      status: "valid",
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      status: categorizeProviderError(error),
      durationMs: Date.now() - startedAt,
      errorMessage:
        error instanceof Error ? error.message : "Unknown provider error",
    };
  }
}
