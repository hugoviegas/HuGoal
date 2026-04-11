import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ChallengeParticipant, Trend } from "@/types";

// ─── Leaderboard Query (read-only; ranks set by Cloud Functions) ──────────────

export async function getLeaderboard(groupId: string): Promise<ChallengeParticipant[]> {
  const q = query(
    collection(db, "challenge_participants", groupId, "participants"),
    orderBy("rank", "asc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => firestoreToParticipant(d.id, groupId, d.data()));
}

export async function getMyRank(groupId: string, uid: string): Promise<ChallengeParticipant | null> {
  const snap = await getDoc(doc(db, "challenge_participants", groupId, "participants", uid));
  if (!snap.exists()) return null;
  return firestoreToParticipant(snap.id, groupId, snap.data());
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function firestoreToParticipant(
  uid: string,
  groupId: string,
  data: Record<string, unknown>,
): ChallengeParticipant {
  const history = (data.progress_history as Array<{ timestamp: unknown; score: number }>) ?? [];

  return {
    id: uid,
    user_id: uid,
    user_name: data.user_name as string ?? "",
    user_avatar: data.user_avatar as string | undefined,
    group_id: groupId,
    score: data.score as number ?? 0,
    rank: data.rank as number ?? 0,
    progress_history: history.map((h) => ({
      timestamp: tsToIso(h.timestamp),
      score: h.score,
    })),
    trend: (data.trend as Trend) ?? "stable",
    completed: data.completed as boolean ?? false,
    completed_at: data.completed_at ? tsToIso(data.completed_at) : undefined,
    updated_at: tsToIso(data.updated_at),
  };
}

function tsToIso(ts: unknown): string {
  if (!ts) return new Date().toISOString();
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  if (typeof ts === "string") return ts;
  return new Date().toISOString();
}
