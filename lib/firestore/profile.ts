import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { onboardingSchema, profileEditSchema } from "@/lib/validation/schemas";
import type { UserProfile } from "@/types";

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

interface SaveProfileOptions {
  retries?: number;
  backoffMs?: number[];
}

export async function saveProfileToFirestore(
  uid: string,
  profile: Partial<UserProfile>,
  options: SaveProfileOptions = {},
): Promise<void> {
  const retries = options.retries ?? 3;
  const backoffMs = options.backoffMs ?? [1000, 2000, 4000];

  const payload = { ...profile, onboarding_complete: true };

  // Validate before touching Firestore
  const parsed = onboardingSchema.safeParse(payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const field = first?.path?.join(".") ?? "";
    const msg = first?.message ?? "Invalid profile data";
    throw new Error(field ? `${field}: ${msg}` : msg);
  }

  const cleanProfile = stripUndefined(profile as Record<string, unknown>);
  const cleanParsed = stripUndefined(parsed.data as Record<string, unknown>);

  const username = (profile.username ?? "").trim();

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await runTransaction(db, async (transaction) => {
        // ① Reserve username atomically (same transaction as profile write)
        if (username) {
          const usernameRef = doc(db, "usernames", username);
          const existing = await transaction.get(usernameRef);

          if (existing.exists() && existing.data()?.uid !== uid) {
            throw new Error("Username is already taken");
          }

          transaction.set(
            usernameRef,
            { uid, created_at: serverTimestamp() },
            { merge: true },
          );
        }

        // ② Save profile
        const profileRef = doc(db, "profiles", uid);
        transaction.set(
          profileRef,
          {
            ...cleanProfile, // keep non-schema fields (email, xp, streak, etc.)
            ...cleanParsed, // validated+transformed schema fields
            id: uid,
            updated_at: serverTimestamp(),
          },
          { merge: true },
        );
      });

      return;
    } catch (error) {
      if (attempt >= retries) {
        throw error;
      }
      await wait(backoffMs[Math.min(attempt - 1, backoffMs.length - 1)]);
    }
  }
}

export async function updateProfileInFirestore(
  uid: string,
  profilePatch: Partial<UserProfile>,
  options: SaveProfileOptions = {},
): Promise<void> {
  const retries = options.retries ?? 3;
  const backoffMs = options.backoffMs ?? [1000, 2000, 4000];

  const parsed = profileEditSchema.safeParse(profilePatch);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const field = first?.path?.join(".") ?? "";
    const msg = first?.message ?? "Invalid profile data";
    throw new Error(field ? `${field}: ${msg}` : msg);
  }

  const cleanParsed = stripUndefined(parsed.data as Record<string, unknown>);

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await runTransaction(db, async (transaction) => {
        const profileRef = doc(db, "profiles", uid);
        transaction.set(
          profileRef,
          {
            ...cleanParsed,
            updated_at: serverTimestamp(),
          },
          { merge: true },
        );
      });

      return;
    } catch (error) {
      if (attempt >= retries) {
        throw error;
      }
      await wait(backoffMs[Math.min(attempt - 1, backoffMs.length - 1)]);
    }
  }
}
