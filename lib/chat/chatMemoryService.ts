import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { distance as levenshteinDistance } from "fastest-levenshtein";

import { generateText } from "@/lib/ai-provider";
import { getResolvedApiKey } from "@/lib/api-key-store";
import { db } from "@/lib/firebase";
import { generateId } from "@/lib/utils";
import type { ChatMemoryDocument } from "@/lib/chat/chatHistoryService";
import type { ChatMessage } from "@/stores/chat.store";
import type { AIProvider } from "@/types";

const MEMORY_PROMPT = `Analyse this chat history and extract SHORT, reusable facts about the user.
Return ONLY a valid JSON array. Each item:
{ "category": "preference"|"goal"|"habit"|"constraint"|"personality", "content": string (max 80 chars), "weight": 0.0–1.0 }
Rules:
- Max 8 memories per extraction. Quality over quantity.
- Only extract objective, reusable facts: "Trains 4x/week", "Lactose intolerant", "Prefers morning workouts", "Goal: lose 5kg by July".
- Do NOT extract session-specific content: "Asked about chest exercises today".
- Personality: tone of voice, emoji use, language style (e.g. "Uses Portuguese, informal tone").
- Weight: 1.0 = highly actionable (dietary constraint), 0.5 = useful preference, 0.1 = minor style note.`;

const FALLBACK_CHAIN: AIProvider[] = ["gemini", "claude", "openai"];

type MemoryCategory =
  | "preference"
  | "goal"
  | "habit"
  | "constraint"
  | "personality";

interface ExtractedMemory {
  category: MemoryCategory;
  content: string;
  weight: number;
}

function memoriesCollection(uid: string) {
  return collection(db, "users", uid, "chat_memories");
}

async function providerOrder(
  preferredProvider: AIProvider,
): Promise<AIProvider[]> {
  const chain = Array.from(
    new Set<AIProvider>([preferredProvider, ...FALLBACK_CHAIN]),
  );

  const resolved = await Promise.all(
    chain.map(async (provider) => {
      const key = await getResolvedApiKey(provider);
      return key.key ? provider : null;
    }),
  );

  return resolved.filter((entry): entry is AIProvider => entry !== null);
}

function normalizedDistance(a: string, b: string): number {
  if (!a || !b) {
    return 1;
  }

  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  return distance / Math.max(a.length, b.length, 1);
}

function parseMemoryResponse(rawText: string): ExtractedMemory[] {
  const cleaned = rawText
    .replace(/```json?\n?/gi, "")
    .replace(/```/g, "")
    .trim();

  const parsed = JSON.parse(cleaned) as unknown;
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((entry): ExtractedMemory | null => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const raw = entry as Record<string, unknown>;
      const category = String(raw.category ?? "").trim() as MemoryCategory;
      const content = String(raw.content ?? "")
        .trim()
        .slice(0, 80);
      const weight = Math.max(
        0,
        Math.min(
          1,
          typeof raw.weight === "number"
            ? raw.weight
            : Number(raw.weight ?? 0.5),
        ),
      );

      if (!content) {
        return null;
      }

      if (
        category !== "preference" &&
        category !== "goal" &&
        category !== "habit" &&
        category !== "constraint" &&
        category !== "personality"
      ) {
        return null;
      }

      return {
        category,
        content,
        weight,
      };
    })
    .filter((entry): entry is ExtractedMemory => entry !== null)
    .slice(0, 8);
}

function toConversationWindow(messages: ChatMessage[]): string {
  const textMessages = messages
    .filter((message): message is ChatMessage & { text: string } => {
      return message.type === "text" && typeof message.text === "string";
    })
    .slice(-30);

  if (textMessages.length === 0) {
    return "[]";
  }

  return JSON.stringify(
    textMessages.map((message) => ({
      role: message.role,
      text: message.text,
      createdAt: message.createdAt,
    })),
  );
}

function asChatMemoryDocument(
  id: string,
  raw: Record<string, unknown>,
): ChatMemoryDocument {
  return {
    id,
    category: raw.category as ChatMemoryDocument["category"],
    content: typeof raw.content === "string" ? raw.content : "",
    extractedAt: (raw.extractedAt as Timestamp | null) ?? null,
    sourceSessionId:
      typeof raw.sourceSessionId === "string" ? raw.sourceSessionId : "",
    weight: typeof raw.weight === "number" ? raw.weight : 0,
  };
}

export async function loadMemories(
  uid: string,
  maxResults = 10,
): Promise<ChatMemoryDocument[]> {
  const memoriesQuery = query(
    memoriesCollection(uid),
    orderBy("weight", "desc"),
    limit(maxResults),
  );

  const snapshot = await getDocs(memoriesQuery);
  return snapshot.docs.map((entry) =>
    asChatMemoryDocument(entry.id, entry.data() as Record<string, unknown>),
  );
}

export function injectMemoriesIntoPrompt(
  memories: ChatMemoryDocument[],
): string {
  if (!memories.length) {
    return "";
  }

  const topMemories = memories.slice(0, 10);
  const lines = topMemories.map(
    (memory) =>
      `- [${memory.category} | ${memory.weight.toFixed(2)}] ${memory.content}`,
  );

  return `<user_memories>\n${lines.join("\n")}\n</user_memories>`;
}

export async function extractMemoriesFromSession(
  uid: string,
  messages: ChatMessage[],
  sessionId: string,
  preferredProvider: AIProvider,
): Promise<void> {
  const windowText = toConversationWindow(messages);
  if (windowText === "[]") {
    return;
  }

  const order = await providerOrder(preferredProvider);
  let extracted: ExtractedMemory[] = [];
  let lastError: unknown = null;

  for (const provider of order) {
    try {
      const response = await generateText(
        provider,
        MEMORY_PROMPT,
        `Chat history JSON:\n${windowText}`,
      );
      extracted = parseMemoryResponse(response.text);
      if (extracted.length > 0) {
        break;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (extracted.length === 0) {
    if (lastError) {
      console.warn("[chatMemoryService] Memory extraction failed", lastError);
    }
    return;
  }

  const existing = await loadMemories(uid, 100);

  for (const memory of extracted) {
    const duplicate = existing.find(
      (candidate) =>
        normalizedDistance(candidate.content, memory.content) <= 0.2,
    );

    if (duplicate) {
      await setDoc(
        doc(memoriesCollection(uid), duplicate.id),
        {
          weight: Math.max(duplicate.weight, memory.weight),
          extractedAt: serverTimestamp(),
          sourceSessionId: sessionId,
        },
        { merge: true },
      );
      continue;
    }

    const id = generateId().slice(0, 10);
    await setDoc(doc(memoriesCollection(uid), id), {
      id,
      category: memory.category,
      content: memory.content,
      extractedAt: serverTimestamp(),
      sourceSessionId: sessionId,
      weight: memory.weight,
    });
  }
}
