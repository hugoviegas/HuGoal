import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { AIProvider } from "@/types";
import { getResolvedApiKey } from "./api-key-store";

interface AIResponse {
  text: string;
}

interface AIRequestOptions {
  model?: string;
  apiKeyOverride?: string;
}

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  options?: AIRequestOptions,
): Promise<AIResponse> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: options?.model ?? "gemini-2.5-flash",
    systemInstruction: systemPrompt,
  });
  const result = await model.generateContent(userPrompt);
  return { text: result.response.text() };
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

  switch (provider) {
    case "gemini":
      return callGemini(apiKey, systemPrompt, userPrompt, options);
    case "claude":
      return callClaude(apiKey, systemPrompt, userPrompt, options);
    case "openai":
      return callOpenAI(apiKey, systemPrompt, userPrompt, options);
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

  if (provider === "gemini") {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: options?.model ?? "gemini-2.5-flash",
    });
    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType: "image/jpeg", data: base64Image } },
    ]);
    return { text: result.response.text() };
  }

  if (provider === "claude") {
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
    return { text: textBlock?.text ?? "" };
  }

  // OpenAI
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
  return { text: response.choices[0]?.message?.content ?? "" };
}
