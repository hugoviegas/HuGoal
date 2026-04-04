import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from './firebase';

export function getCollection(name: string) {
  return collection(db, name);
}

export function getDocRef(collectionName: string, id: string) {
  return doc(db, collectionName, id);
}

export async function getDocument<T>(
  collectionName: string,
  id: string
): Promise<T | null> {
  const docSnap = await getDoc(doc(db, collectionName, id));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as T;
}

export async function queryDocuments<T>(
  collectionName: string,
  ...constraints: QueryConstraint[]
): Promise<T[]> {
  const q = query(collection(db, collectionName), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}

export async function createDocument(
  collectionName: string,
  data: DocumentData
): Promise<string> {
  const docRef = await addDoc(collection(db, collectionName), {
    ...data,
    created_at: serverTimestamp(),
  });
  return docRef.id;
}

export async function setDocument(
  collectionName: string,
  id: string,
  data: DocumentData
): Promise<void> {
  await setDoc(doc(db, collectionName, id), data, { merge: true });
}

export async function updateDocument(
  collectionName: string,
  id: string,
  data: Partial<DocumentData>
): Promise<void> {
  await updateDoc(doc(db, collectionName, id), data);
}

export async function deleteDocument(
  collectionName: string,
  id: string
): Promise<void> {
  await deleteDoc(doc(db, collectionName, id));
}

export { where, orderBy, limit, onSnapshot, serverTimestamp };
