import { getRandomBytes } from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Buffer } from "buffer";

import type { ChatMessage } from "@/stores/chat.store";

const KEY_PREFIX = "chat_crypto_key";
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEY_LENGTH = 32;
const AES_GCM_IV_BYTES = 12;
const BACKUP_WRAP_SUFFIX = "backup_wrap_v1";

// WeakMap does not support string keys; Map is used for uid-keyed cache.
const cryptoKeyCache = new Map<string, CryptoKey>();
const rawKeyCache = new Map<string, Uint8Array>();

function getSubtleCrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("Web Crypto SubtleCrypto is unavailable");
  }

  return subtle;
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function fromBase64(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64"));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const sliced = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
  return sliced as ArrayBuffer;
}

function getKeyStorageKey(uid: string): string {
  const safeUid = uid.replace(/[^\w.-]/g, "_");
  return `${KEY_PREFIX}.${safeUid}`;
}

async function safeGetStoredKey(storageKey: string): Promise<string | null> {
  try {
    const available =
      typeof SecureStore.isAvailableAsync === "function"
        ? await SecureStore.isAvailableAsync()
        : false;

    if (available && typeof SecureStore.getItemAsync === "function") {
      return await SecureStore.getItemAsync(storageKey);
    }
  } catch {
    // Fall through to web storage fallback.
  }

  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(storageKey);
    }
  } catch {
    // Ignore storage access errors.
  }

  return null;
}

async function safeSetStoredKey(
  storageKey: string,
  value: string,
): Promise<void> {
  try {
    const available =
      typeof SecureStore.isAvailableAsync === "function"
        ? await SecureStore.isAvailableAsync()
        : false;

    if (available && typeof SecureStore.setItemAsync === "function") {
      await SecureStore.setItemAsync(storageKey, value);
      return;
    }
  } catch {
    // Fall through to web storage fallback.
  }

  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(storageKey, value);
    }
  } catch {
    // Ignore storage access errors.
  }
}

function reverseUid(uid: string): string {
  return uid.split("").reverse().join("");
}

async function subtlePbkdf2(
  password: string,
  salt: string,
  iterations: number,
  keyLen: number,
): Promise<Uint8Array> {
  const subtle = getSubtleCrypto();
  const enc = new TextEncoder();
  const baseKey = await subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

  const derivedBits = await subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations,
      hash: "SHA-256",
    },
    baseKey,
    keyLen * 8,
  );

  return new Uint8Array(derivedBits);
}

async function getOrCreateRawKey(uid: string): Promise<Uint8Array> {
  const cached = rawKeyCache.get(uid);
  if (cached) {
    return cached;
  }

  const storageKey = getKeyStorageKey(uid);
  const stored = await safeGetStoredKey(storageKey);
  if (stored) {
    const storedBytes = fromBase64(stored);
    rawKeyCache.set(uid, storedBytes);
    return storedBytes;
  }

  const derived = await subtlePbkdf2(
    uid,
    reverseUid(uid),
    PBKDF2_ITERATIONS,
    PBKDF2_KEY_LENGTH,
  );

  await safeSetStoredKey(storageKey, toBase64(derived));
  rawKeyCache.set(uid, derived);
  return derived;
}

async function deriveBackupWrapKey(uid: string): Promise<CryptoKey> {
  const wrapRaw = await subtlePbkdf2(
    `${uid}:${BACKUP_WRAP_SUFFIX}`,
    `${reverseUid(uid)}:${BACKUP_WRAP_SUFFIX}`,
    PBKDF2_ITERATIONS,
    PBKDF2_KEY_LENGTH,
  );

  return getSubtleCrypto().importKey(
    "raw",
    toArrayBuffer(wrapRaw),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function deriveKey(uid: string): Promise<CryptoKey> {
  if (!uid.trim()) {
    throw new Error("Cannot derive chat key without uid");
  }

  const cached = cryptoKeyCache.get(uid);
  if (cached) {
    return cached;
  }

  const rawKey = await getOrCreateRawKey(uid);
  const cryptoKey = await getSubtleCrypto().importKey(
    "raw",
    toArrayBuffer(rawKey),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );

  cryptoKeyCache.set(uid, cryptoKey);
  return cryptoKey;
}

export async function encryptMessages(
  uid: string,
  messages: ChatMessage[],
): Promise<string> {
  const key = await deriveKey(uid);
  const subtle = getSubtleCrypto();
  const iv = getRandomBytes(AES_GCM_IV_BYTES);

  const payload = JSON.stringify(messages);
  const plaintext = new TextEncoder().encode(payload);
  const encrypted = await subtle.encrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(iv),
    },
    key,
    plaintext,
  );

  const ciphertext = new Uint8Array(encrypted);
  const result = new Uint8Array(iv.length + ciphertext.length);
  result.set(iv, 0);
  result.set(ciphertext, iv.length);

  return toBase64(result);
}

export async function decryptMessages(
  uid: string,
  encrypted: string,
): Promise<ChatMessage[]> {
  if (!encrypted.trim()) {
    return [];
  }

  try {
    const key = await deriveKey(uid);
    const subtle = getSubtleCrypto();
    const payload = fromBase64(encrypted);

    if (payload.length <= AES_GCM_IV_BYTES) {
      return [];
    }

    const iv = payload.slice(0, AES_GCM_IV_BYTES);
    const ciphertext = payload.slice(AES_GCM_IV_BYTES);

    const decrypted = await subtle.decrypt(
      {
        name: "AES-GCM",
        iv: toArrayBuffer(iv),
      },
      key,
      toArrayBuffer(ciphertext),
    );

    const text = new TextDecoder().decode(decrypted);
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
  } catch (error) {
    console.warn(
      "[chatCrypto] Failed to decrypt messages. Returning empty list.",
      error,
    );
    return [];
  }
}

export async function exportKeyForBackup(uid: string): Promise<string> {
  const raw = await getOrCreateRawKey(uid);
  return toBase64(raw);
}

export async function encryptKeyForCloudBackup(uid: string): Promise<string> {
  const rawKey = await getOrCreateRawKey(uid);
  const wrapKey = await deriveBackupWrapKey(uid);
  const iv = getRandomBytes(AES_GCM_IV_BYTES);

  const encrypted = await getSubtleCrypto().encrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(iv),
    },
    wrapKey,
    toArrayBuffer(rawKey),
  );

  const ciphertext = new Uint8Array(encrypted);
  const result = new Uint8Array(iv.length + ciphertext.length);
  result.set(iv, 0);
  result.set(ciphertext, iv.length);
  return toBase64(result);
}

export async function restoreKeyFromCloudBackup(
  uid: string,
  encryptedBlob: string,
): Promise<void> {
  const payload = fromBase64(encryptedBlob);
  if (payload.length <= AES_GCM_IV_BYTES) {
    throw new Error("Invalid backup payload");
  }

  const wrapKey = await deriveBackupWrapKey(uid);
  const iv = payload.slice(0, AES_GCM_IV_BYTES);
  const ciphertext = payload.slice(AES_GCM_IV_BYTES);

  const decrypted = await getSubtleCrypto().decrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(iv),
    },
    wrapKey,
    toArrayBuffer(ciphertext),
  );

  const restoredRaw = new Uint8Array(decrypted);
  await safeSetStoredKey(getKeyStorageKey(uid), toBase64(restoredRaw));

  rawKeyCache.set(uid, restoredRaw);
  cryptoKeyCache.delete(uid);
}
