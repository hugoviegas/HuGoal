import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { AIProvider } from '@/types';
import { getApiKey } from './api-key-store';

interface AIResponse {
  text: string;
}

export class AIError extends Error {
  constructor(
    message: string,
    public readonly code: 'RATE_LIMIT' | 'NETWORK' | 'SERVER' | 'AUTH' | 'TIMEOUT' | 'UNKNOWN',
    public readonly provider: AIProvider,
    public readonly retryAfter?: number,
  ) {
    super(message);
    this.name = 'AIError';
  }
}

const REQUEST_TIMEOUT_MS = 30000;

const RATE_LIMIT_CONFIG = {
  requestsPerMinute: 60,
  requestsPerDay: 1000,
};

interface RateLimitState {
  minuteCount: number;
  dayCount: number;
  minuteResetAt: number;
  dayResetAt: number;
}

const rateLimitState: RateLimitState = {
  minuteCount: 0,
  dayCount: 0,
  minuteResetAt: Date.now() + 60000,
  dayResetAt: Date.now() + 86400000,
};

function resetRateLimitCounters(): void {
  const now = Date.now();
  if (now > rateLimitState.minuteResetAt) {
    rateLimitState.minuteCount = 0;
    rateLimitState.minuteResetAt = now + 60000;
  }
  if (now > rateLimitState.dayResetAt) {
    rateLimitState.dayCount = 0;
    rateLimitState.dayResetAt = now + 86400000;
  }
}

function checkRateLimit(): void {
  resetRateLimitCounters();
  if (rateLimitState.minuteCount >= RATE_LIMIT_CONFIG.requestsPerMinute) {
    throw new AIError(
      'Rate limit exceeded. Please wait before making more requests.',
      'RATE_LIMIT',
      'gemini' as AIProvider,
      Math.ceil((rateLimitState.minuteResetAt - Date.now()) / 1000),
    );
  }
  if (rateLimitState.dayCount >= RATE_LIMIT_CONFIG.requestsPerDay) {
    throw new AIError(
      'Daily request limit exceeded.',
      'RATE_LIMIT',
      'gemini' as AIProvider,
      Math.ceil((rateLimitState.dayResetAt - Date.now()) / 1000),
    );
  }
  rateLimitState.minuteCount++;
  rateLimitState.dayCount++;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new AIError('Request timed out', 'TIMEOUT', 'gemini' as AIProvider)), timeoutMs),
    ),
  ]);
}

interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 10000 },
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === options.maxRetries) {
        throw lastError;
      }

      const isRetryable =
        lastError instanceof AIError
          ? ['RATE_LIMIT', 'NETWORK', 'SERVER', 'TIMEOUT'].includes(lastError.code)
          : true;

      if (!isRetryable) {
        throw lastError;
      }

      const delay = Math.min(
        options.baseDelayMs * Math.pow(2, attempt),
        options.maxDelayMs,
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<AIResponse> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemPrompt,
  });
  const result = await model.generateContent(userPrompt);
  return { text: result.response.text() };
}

async function callClaude(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<AIResponse> {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });
  const textBlock = response.content.find((b) => b.type === 'text');
  return { text: textBlock?.text ?? '' };
}

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<AIResponse> {
  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });
  return { text: response.choices[0]?.message?.content ?? '' };
}

function classifyError(error: unknown, provider: AIProvider): AIError {
  if (error instanceof AIError) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('rate') || message.includes('quota') || message.includes('limit')) {
      return new AIError(error.message, 'RATE_LIMIT', provider);
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('ECONNREFUSED')) {
      return new AIError(error.message, 'NETWORK', provider);
    }
    if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('server')) {
      return new AIError(error.message, 'SERVER', provider);
    }
    if (message.includes('401') || message.includes('403') || message.includes('api key')) {
      return new AIError(error.message, 'AUTH', provider);
    }
    if (message.includes('timeout')) {
      return new AIError(error.message, 'TIMEOUT', provider);
    }
  }

  return new AIError('An unexpected error occurred', 'UNKNOWN', provider);
}

async function callProvider(
  provider: AIProvider,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<AIResponse> {
  switch (provider) {
    case 'gemini':
      return callGemini(apiKey, systemPrompt, userPrompt);
    case 'claude':
      return callClaude(apiKey, systemPrompt, userPrompt);
    case 'openai':
      return callOpenAI(apiKey, systemPrompt, userPrompt);
  }
}

export async function generateText(
  provider: AIProvider,
  systemPrompt: string,
  userPrompt: string,
  useRetry = true,
): Promise<AIResponse> {
  const apiKey = await getApiKey(provider);
  if (!apiKey) {
    throw new AIError(`No API key configured for ${provider}`, 'AUTH', provider);
  }

  checkRateLimit();

  const call = () =>
    withTimeout(
      callProvider(provider, apiKey, systemPrompt, userPrompt),
      REQUEST_TIMEOUT_MS,
    );

  if (useRetry) {
    try {
      return await withRetry(call);
    } catch (error) {
      throw classifyError(error, provider);
    }
  }

  try {
    return await call();
  } catch (error) {
    throw classifyError(error, provider);
  }
}

async function analyzeImageWithGemini(
  apiKey: string,
  base64Image: string,
  prompt: string,
): Promise<AIResponse> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const result = await model.generateContent([
    prompt,
    { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
  ]);
  return { text: result.response.text() };
}

async function analyzeImageWithClaude(
  apiKey: string,
  base64Image: string,
  prompt: string,
): Promise<AIResponse> {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: base64Image },
          },
          { type: 'text', text: prompt },
        ],
      },
    ],
  });
  const textBlock = response.content.find((b) => b.type === 'text');
  return { text: textBlock?.text ?? '' };
}

async function analyzeImageWithOpenAI(
  apiKey: string,
  base64Image: string,
  prompt: string,
): Promise<AIResponse> {
  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
          { type: 'text', text: prompt },
        ],
      },
    ],
  });
  return { text: response.choices[0]?.message?.content ?? '' };
}

async function callAnalyzeImage(
  provider: AIProvider,
  apiKey: string,
  base64Image: string,
  prompt: string,
): Promise<AIResponse> {
  switch (provider) {
    case 'gemini':
      return analyzeImageWithGemini(apiKey, base64Image, prompt);
    case 'claude':
      return analyzeImageWithClaude(apiKey, base64Image, prompt);
    case 'openai':
      return analyzeImageWithOpenAI(apiKey, base64Image, prompt);
  }
}

export async function analyzeImage(
  provider: AIProvider,
  base64Image: string,
  prompt: string,
  useRetry = true,
): Promise<AIResponse> {
  const apiKey = await getApiKey(provider);
  if (!apiKey) {
    throw new AIError(`No API key configured for ${provider}`, 'AUTH', provider);
  }

  checkRateLimit();

  const call = () =>
    withTimeout(
      callAnalyzeImage(provider, apiKey, base64Image, prompt),
      REQUEST_TIMEOUT_MS,
    );

  if (useRetry) {
    try {
      return await withRetry(call);
    } catch (error) {
      throw classifyError(error, provider);
    }
  }

  try {
    return await call();
  } catch (error) {
    throw classifyError(error, provider);
  }
}

export function getRateLimitInfo(): { requestsThisMinute: number; requestsToday: number; minuteResetIn: number; dayResetIn: number } {
  resetRateLimitCounters();
  return {
    requestsThisMinute: rateLimitState.minuteCount,
    requestsToday: rateLimitState.dayCount,
    minuteResetIn: Math.max(0, Math.ceil((rateLimitState.minuteResetAt - Date.now()) / 1000)),
    dayResetIn: Math.max(0, Math.ceil((rateLimitState.dayResetAt - Date.now()) / 1000)),
  };
}

export function resetRateLimits(): void {
  rateLimitState.minuteCount = 0;
  rateLimitState.dayCount = 0;
  rateLimitState.minuteResetAt = Date.now() + 60000;
  rateLimitState.dayResetAt = Date.now() + 86400000;
}