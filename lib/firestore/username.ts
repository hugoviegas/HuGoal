import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function reserveUsername(
  username: string,
  uid: string,
): Promise<void> {
  const normalized = username.trim();

  await runTransaction(db, async (transaction) => {
    const usernameRef = doc(db, "usernames", normalized);
    const existing = await transaction.get(usernameRef);

    if (existing.exists() && existing.data()?.uid !== uid) {
      throw new Error("Username is already taken");
    }

    transaction.set(
      usernameRef,
      {
        uid,
        created_at: serverTimestamp(),
      },
      { merge: true },
    );
  });
}
