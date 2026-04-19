import Constants from "expo-constants";
import type { StateStorage } from "zustand/middleware";

type StorageBackend = {
  set: (key: string, value: string) => void;
  getString: (key: string) => string | undefined;
  remove: (key: string) => void;
};

const isExpoGo =
  Constants.appOwnership === "expo" ||
  Constants.executionEnvironment === "storeClient";

const memoryStores = new Map<string, Map<string, string>>();
const backendCache = new Map<string, StorageBackend | null>();

function getMemoryStore(storageId: string): Map<string, string> {
  const existing = memoryStores.get(storageId);
  if (existing) {
    return existing;
  }

  const created = new Map<string, string>();
  memoryStores.set(storageId, created);
  return created;
}

function getBackend(storageId: string): StorageBackend | null {
  if (backendCache.has(storageId)) {
    return backendCache.get(storageId) ?? null;
  }

  if (isExpoGo) {
    backendCache.set(storageId, null);
    return null;
  }

  try {
    const mmkv =
      require("react-native-mmkv") as typeof import("react-native-mmkv");
    const backend = mmkv.createMMKV({ id: storageId });
    backendCache.set(storageId, backend);
    return backend;
  } catch {
    backendCache.set(storageId, null);
    return null;
  }
}

export function createMMKVStateStorage(storageId: string): StateStorage {
  return {
    getItem: (name) => {
      const backend = getBackend(storageId);
      if (backend) {
        return backend.getString(name) ?? null;
      }

      return getMemoryStore(storageId).get(name) ?? null;
    },
    setItem: (name, value) => {
      const backend = getBackend(storageId);
      if (backend) {
        backend.set(name, value);
        return;
      }

      getMemoryStore(storageId).set(name, value);
    },
    removeItem: (name) => {
      const backend = getBackend(storageId);
      if (backend) {
        backend.remove(name);
        return;
      }

      getMemoryStore(storageId).delete(name);
    },
  };
}
