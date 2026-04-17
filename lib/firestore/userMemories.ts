import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface UserMemory {
  id: string;
  category: "workout" | "nutrition" | "general";
  content: string;
  created_at: string;
  updated_at: string;
}

export async function listMemories(
  uid: string,
  category?: UserMemory["category"],
): Promise<UserMemory[]> {
  const ref = collection(db, "users", uid, "memories");
  const constraints = category
    ? [where("category", "==", category), orderBy("created_at", "desc")]
    : [orderBy("created_at", "desc")];
  const snapshot = await getDocs(query(ref, ...constraints));
  return snapshot.docs.map((d) => d.data() as UserMemory);
}

export async function createMemory(
  uid: string,
  memory: Omit<UserMemory, "id" | "created_at" | "updated_at">,
): Promise<UserMemory> {
  const ref = doc(collection(db, "users", uid, "memories"));
  const now = new Date().toISOString();
  const record: UserMemory = {
    id: ref.id,
    ...memory,
    created_at: now,
    updated_at: now,
  };
  await setDoc(ref, record);
  return record;
}

export async function deleteMemory(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "memories", id));
}
