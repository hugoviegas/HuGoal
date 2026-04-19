import * as SecureStore from "expo-secure-store";
import { Buffer } from "buffer";
import { gcm } from "@noble/ciphers/aes.js";
import { pbkdf2 } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";

import type { ChatMessage } from "@/stores/chat.store";

const KEY_PREFIX = "chat_crypto_key";
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEY_LENGTH = 32;
const AES_GCM_IV_BYTES = 12;
const BACKUP_WRAP_SUFFIX = "backup_wrap_v1";

const rawKeyCache = new Map<string, Uint8Array>();

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function fromBase64(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64"));
}

function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  const cryptoObj = globalThis.crypto;

  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
    cryptoObj.getRandomValues(bytes);
    return bytes;
  }

  for (let index = 0; index < length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }

  return bytes;
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

function noblePbkdf2(
  password: string,
  salt: string,
  iterations: number,
  keyLen: number,
): Uint8Array {
  return pbkdf2(sha256, password, salt, { c: iterations, dkLen: keyLen });
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

  const derived = noblePbkdf2(
    uid,
    reverseUid(uid),
    PBKDF2_ITERATIONS,
    PBKDF2_KEY_LENGTH,
  );

  await safeSetStoredKey(storageKey, toBase64(derived));
  rawKeyCache.set(uid, derived);
  return derived;
}

function deriveBackupWrapKey(uid: string): Uint8Array {
  return noblePbkdf2(
    `${uid}:${BACKUP_WRAP_SUFFIX}`,
    `${reverseUid(uid)}:${BACKUP_WRAP_SUFFIX}`,
    PBKDF2_ITERATIONS,
    PBKDF2_KEY_LENGTH,
  );
}

export async function deriveKey(uid: string): Promise<Uint8Array> {
  if (!uid.trim()) {
    throw new Error("Cannot derive chat key without uid");
  }

  const cached = rawKeyCache.get(uid);
  if (cached) {
    return cached;
  }

  return getOrCreateRawKey(uid);
}

export async function encryptMessages(
  uid: string,
  messages: ChatMessage[],
): Promise<string> {
  const key = await deriveKey(uid);
  const iv = getRandomBytes(AES_GCM_IV_BYTES);

  const payload = JSON.stringify(messages);
  const plaintext = new TextEncoder().encode(payload);
  const ciphertext = gcm(key, iv).encrypt(plaintext);
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
    const payload = fromBase64(encrypted);

    if (payload.length <= AES_GCM_IV_BYTES) {
      return [];
    }

    const iv = payload.slice(0, AES_GCM_IV_BYTES);
    const ciphertext = payload.slice(AES_GCM_IV_BYTES);

    const decrypted = gcm(key, iv).decrypt(ciphertext);

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

  const ciphertext = gcm(wrapKey, iv).encrypt(rawKey);
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

  const restoredRaw = gcm(wrapKey, iv).decrypt(ciphertext);
  await safeSetStoredKey(getKeyStorageKey(uid), toBase64(restoredRaw));

  rawKeyCache.set(uid, restoredRaw);
}
