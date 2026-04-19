import { readFileSync } from "fs";
import { resolve } from "path";
import type { Firestore } from "firebase/firestore";
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

import type { ChatMessage } from "@/stores/chat.store";

const PROJECT_ID = "demo-hugoal";
const FIRESTORE_HOST = "127.0.0.1";
const FIRESTORE_PORT = 39123;
const TEST_UID = "integration-user";

const mockCache = new Map<string, ChatMessage[]>();
const mockMemory = {
  text: "[]",
};

let testEnv: RulesTestEnvironment;
let authedDb: Firestore;

function makeMessages(): ChatMessage[] {
  return [
    {
      id: "m1",
      role: "user",
      type: "text",
      text: "I train in the morning and prefer short sessions.",
      createdAt: new Date().toISOString(),
    },
    {
      id: "m2",
      role: "assistant",
      type: "text",
      text: "Great, we can do 30-minute plans.",
      createdAt: new Date().toISOString(),
    },
  ];
}

describe("chat history + memory services (Firestore emulator)", () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host: FIRESTORE_HOST,
        port: FIRESTORE_PORT,
        rules: readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8"),
      },
    });

    authedDb = testEnv
      .authenticatedContext(TEST_UID)
      .firestore() as unknown as Firestore;
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    mockCache.clear();
    mockMemory.text = "[]";
    await testEnv.clearFirestore();
  });

  it("syncs encrypted session metadata and loads messages with cache-first behavior", async () => {
    jest.doMock("@/lib/firebase", () => ({ db: authedDb }));
    jest.doMock("@/lib/chat/chatCrypto", () => ({
      encryptMessages: async (_uid: string, messages: ChatMessage[]) =>
        Buffer.from(JSON.stringify(messages), "utf8").toString("base64"),
      decryptMessages: async (_uid: string, encrypted: string) =>
        JSON.parse(
          Buffer.from(encrypted, "base64").toString("utf8"),
        ) as ChatMessage[],
    }));
    jest.doMock("@/lib/chat/chatLocalCache", () => ({
      cacheMessages: (sessionId: string, messages: ChatMessage[]) => {
        mockCache.set(sessionId, messages);
      },
      getCachedMessages: (sessionId: string) =>
        mockCache.get(sessionId) ?? null,
      isCacheStale: () => false,
      clearCache: (sessionId: string) => {
        mockCache.delete(sessionId);
      },
    }));
    jest.doMock("expo-secure-store", () => {
      const secureStore = new Map<string, string>();
      return {
        getItemAsync: async (key: string) => secureStore.get(key) ?? null,
        setItemAsync: async (key: string, value: string) => {
          secureStore.set(key, value);
        },
      };
    });

    const historyService =
      require("@/lib/chat/chatHistoryService") as typeof import("@/lib/chat/chatHistoryService");

    const context = "home" as const;
    const messages = makeMessages();

    const session = await historyService.createSession(TEST_UID, context);
    await historyService.appendToSession(TEST_UID, session.sessionId, messages);

    const listed = await historyService.listSessions(TEST_UID, context, 20);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.sessionId).toBe(session.sessionId);
    expect(listed[0]?.messageCount).toBe(messages.length);
    expect(listed[0]?.preview).toContain("I train in the morning");

    const loaded = await historyService.loadSession(
      TEST_UID,
      session.sessionId,
      {
        forceRemote: true,
      },
    );
    expect(loaded).toHaveLength(messages.length);
    expect(loaded[0]?.type).toBe("text");

    await historyService.archiveSession(TEST_UID, session.sessionId);
    const afterArchive = await historyService.listSessions(
      TEST_UID,
      context,
      20,
    );
    expect(afterArchive).toHaveLength(0);
  });

  it("extracts memories and deduplicates by normalized levenshtein threshold", async () => {
    jest.doMock("@/lib/firebase", () => ({ db: authedDb }));
    jest.doMock("@/lib/api-key-store", () => ({
      getResolvedApiKey: async () => ({ key: "fake", source: "user" as const }),
    }));
    jest.doMock("@/lib/ai-provider", () => ({
      generateText: async () => ({ text: mockMemory.text }),
    }));

    const memoryService =
      require("@/lib/chat/chatMemoryService") as typeof import("@/lib/chat/chatMemoryService");

    const sessionId = "session-memory-1";
    const messages = makeMessages();

    mockMemory.text = JSON.stringify([
      {
        category: "habit",
        content: "Prefers short workout sessions under 45 min",
        weight: 0.8,
      },
      {
        category: "preference",
        content: "Trains in the morning",
        weight: 0.7,
      },
    ]);

    await memoryService.extractMemoriesFromSession(
      TEST_UID,
      messages,
      sessionId,
      "gemini",
    );

    let loaded = await memoryService.loadMemories(TEST_UID, 10);
    expect(loaded.length).toBe(2);

    mockMemory.text = JSON.stringify([
      {
        category: "habit",
        content: "Prefers short workout sessions under 45 mins",
        weight: 0.95,
      },
    ]);

    await memoryService.extractMemoriesFromSession(
      TEST_UID,
      messages,
      sessionId,
      "gemini",
    );

    loaded = await memoryService.loadMemories(TEST_UID, 10);
    expect(loaded.length).toBe(2);

    const merged = loaded.find((entry) =>
      entry.content.includes("short workout"),
    );
    expect(merged).toBeDefined();
    expect((merged?.weight ?? 0) >= 0.95).toBe(true);

    const promptBlock = memoryService.injectMemoriesIntoPrompt(loaded);
    expect(promptBlock.includes("<user_memories>")).toBe(true);
  });
});
