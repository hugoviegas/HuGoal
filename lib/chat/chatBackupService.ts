import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { generateId } from "@/lib/utils";
import {
  encryptKeyForCloudBackup,
  restoreKeyFromCloudBackup,
} from "@/lib/chat/chatCrypto";

export interface ChatBackupDocument {
  id: string;
  encryptedKeyBlob: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  version: number;
}

const BACKUP_SCHEMA_VERSION = 1;

function backupsCollection(uid: string) {
  return collection(db, "users", uid, "backup_keys");
}

function backupDoc(uid: string, backupId: string) {
  return doc(db, "users", uid, "backup_keys", backupId);
}

function mapBackup(
  id: string,
  data: Record<string, unknown>,
): ChatBackupDocument {
  return {
    id,
    encryptedKeyBlob:
      typeof data.encryptedKeyBlob === "string" ? data.encryptedKeyBlob : "",
    createdAt: (data.createdAt as Timestamp | null) ?? null,
    updatedAt: (data.updatedAt as Timestamp | null) ?? null,
    version:
      typeof data.version === "number" ? data.version : BACKUP_SCHEMA_VERSION,
  };
}

export async function createEncryptedKeyBackup(uid: string): Promise<string> {
  const id = generateId().slice(0, 12);
  const encryptedKeyBlob = await encryptKeyForCloudBackup(uid);

  await setDoc(backupDoc(uid, id), {
    id,
    encryptedKeyBlob,
    version: BACKUP_SCHEMA_VERSION,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return id;
}

export async function listEncryptedKeyBackups(
  uid: string,
  maxResults = 10,
): Promise<ChatBackupDocument[]> {
  const backupsQuery = query(
    backupsCollection(uid),
    orderBy("updatedAt", "desc"),
    limit(maxResults),
  );

  const snapshot = await getDocs(backupsQuery);
  return snapshot.docs.map((entry) =>
    mapBackup(entry.id, entry.data() as Record<string, unknown>),
  );
}

export async function restoreEncryptedKeyBackup(
  uid: string,
  backupId: string,
): Promise<void> {
  const snapshot = await getDoc(backupDoc(uid, backupId));
  if (!snapshot.exists()) {
    throw new Error("Backup document not found");
  }

  const data = snapshot.data();
  const encryptedKeyBlob =
    typeof data.encryptedKeyBlob === "string" ? data.encryptedKeyBlob : "";

  if (!encryptedKeyBlob) {
    throw new Error("Backup document is missing encrypted key blob");
  }

  await restoreKeyFromCloudBackup(uid, encryptedKeyBlob);
}

export async function restoreLatestEncryptedKeyBackup(
  uid: string,
): Promise<void> {
  const backups = await listEncryptedKeyBackups(uid, 1);
  const latest = backups[0];
  if (!latest) {
    throw new Error("No backup found for this account");
  }

  await restoreEncryptedKeyBackup(uid, latest.id);
}
