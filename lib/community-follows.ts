import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  serverTimestamp,
  updateDoc,
  increment,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { CommunityFollow, PublicProfile } from "@/types";

// ─── Follow ───────────────────────────────────────────────────────────────────

export async function followUser(followerUid: string, targetUid: string): Promise<void> {
  const existing = await getFollowDoc(followerUid, targetUid);
  if (existing) return;

  await addDoc(collection(db, "community_follows"), {
    follower_id: followerUid,
    following_id: targetUid,
    is_muted: false,
    is_blocked: false,
    created_at: serverTimestamp(),
  });

  // Increment counters on both profiles
  await updateDoc(doc(db, "profiles", followerUid), {
    following_count: increment(1),
  });
  await updateDoc(doc(db, "profiles", targetUid), {
    follower_count: increment(1),
  });

  // Create notification for the target user
  await addDoc(collection(db, "notifications", targetUid, "events"), {
    type: "follow",
    actor_id: followerUid,
    read: false,
    created_at: serverTimestamp(),
  });
}

export async function unfollowUser(followerUid: string, targetUid: string): Promise<void> {
  const followSnap = await getDocs(
    query(
      collection(db, "community_follows"),
      where("follower_id", "==", followerUid),
      where("following_id", "==", targetUid),
    ),
  );

  for (const d of followSnap.docs) {
    await deleteDoc(d.ref);
  }

  await updateDoc(doc(db, "profiles", followerUid), {
    following_count: increment(-1),
  });
  await updateDoc(doc(db, "profiles", targetUid), {
    follower_count: increment(-1),
  });
}

export async function isFollowing(followerUid: string, targetUid: string): Promise<boolean> {
  const snap = await getDocs(
    query(
      collection(db, "community_follows"),
      where("follower_id", "==", followerUid),
      where("following_id", "==", targetUid),
    ),
  );
  return !snap.empty;
}

// ─── Block ────────────────────────────────────────────────────────────────────

export async function blockUser(blockerUid: string, targetUid: string): Promise<void> {
  // Unfollow both directions first
  await unfollowUser(blockerUid, targetUid).catch(() => null);
  await unfollowUser(targetUid, blockerUid).catch(() => null);

  const existing = await getDocs(
    query(
      collection(db, "user_blocks"),
      where("blocker_id", "==", blockerUid),
      where("blocked_id", "==", targetUid),
    ),
  );
  if (!existing.empty) return;

  await addDoc(collection(db, "user_blocks"), {
    blocker_id: blockerUid,
    blocked_id: targetUid,
    reason: "user_input",
    created_at: serverTimestamp(),
  });
}

export async function unblockUser(blockerUid: string, targetUid: string): Promise<void> {
  const snap = await getDocs(
    query(
      collection(db, "user_blocks"),
      where("blocker_id", "==", blockerUid),
      where("blocked_id", "==", targetUid),
    ),
  );
  for (const d of snap.docs) {
    await deleteDoc(d.ref);
  }
}

export async function isBlocked(blockerUid: string, targetUid: string): Promise<boolean> {
  const snap = await getDocs(
    query(
      collection(db, "user_blocks"),
      where("blocker_id", "==", blockerUid),
      where("blocked_id", "==", targetUid),
    ),
  );
  return !snap.empty;
}

export async function getBlockedUserIds(uid: string): Promise<string[]> {
  const snap = await getDocs(
    query(collection(db, "user_blocks"), where("blocker_id", "==", uid)),
  );
  return snap.docs.map((d) => d.data().blocked_id as string);
}

// ─── Mute ─────────────────────────────────────────────────────────────────────

export async function muteUser(muterUid: string, targetUid: string): Promise<void> {
  const existing = await getDocs(
    query(
      collection(db, "user_mutes"),
      where("muter_id", "==", muterUid),
      where("muted_id", "==", targetUid),
    ),
  );
  if (!existing.empty) return;

  await addDoc(collection(db, "user_mutes"), {
    muter_id: muterUid,
    muted_id: targetUid,
    created_at: serverTimestamp(),
  });
}

export async function unmuteUser(muterUid: string, targetUid: string): Promise<void> {
  const snap = await getDocs(
    query(
      collection(db, "user_mutes"),
      where("muter_id", "==", muterUid),
      where("muted_id", "==", targetUid),
    ),
  );
  for (const d of snap.docs) {
    await deleteDoc(d.ref);
  }
}

export async function getMutedUserIds(uid: string): Promise<string[]> {
  const snap = await getDocs(
    query(collection(db, "user_mutes"), where("muter_id", "==", uid)),
  );
  return snap.docs.map((d) => d.data().muted_id as string);
}

// ─── Lists ────────────────────────────────────────────────────────────────────

export async function getFollowingIds(uid: string): Promise<string[]> {
  const snap = await getDocs(
    query(collection(db, "community_follows"), where("follower_id", "==", uid)),
  );
  return snap.docs.map((d) => d.data().following_id as string);
}

export async function getFollowerIds(uid: string): Promise<string[]> {
  const snap = await getDocs(
    query(collection(db, "community_follows"), where("following_id", "==", uid)),
  );
  return snap.docs.map((d) => d.data().follower_id as string);
}

export async function getFollowingList(uid: string): Promise<CommunityFollow[]> {
  const snap = await getDocs(
    query(collection(db, "community_follows"), where("follower_id", "==", uid)),
  );
  return snap.docs.map((d) => ({
    id: d.id,
    follower_id: d.data().follower_id as string,
    following_id: d.data().following_id as string,
    is_muted: d.data().is_muted as boolean ?? false,
    is_blocked: d.data().is_blocked as boolean ?? false,
    created_at: tsToIso(d.data().created_at),
  }));
}

export async function getFollowersList(uid: string): Promise<CommunityFollow[]> {
  const snap = await getDocs(
    query(collection(db, "community_follows"), where("following_id", "==", uid)),
  );
  return snap.docs.map((d) => ({
    id: d.id,
    follower_id: d.data().follower_id as string,
    following_id: d.data().following_id as string,
    is_muted: d.data().is_muted as boolean ?? false,
    is_blocked: d.data().is_blocked as boolean ?? false,
    created_at: tsToIso(d.data().created_at),
  }));
}

export async function getBlockedUsers(uid: string): Promise<Array<{ id: string; blocked_id: string; created_at: string }>> {
  const snap = await getDocs(
    query(collection(db, "user_blocks"), where("blocker_id", "==", uid)),
  );
  return snap.docs.map((d) => ({
    id: d.id,
    blocked_id: d.data().blocked_id as string,
    created_at: tsToIso(d.data().created_at),
  }));
}

export async function getMutedUsers(uid: string): Promise<Array<{ id: string; muted_id: string; created_at: string }>> {
  const snap = await getDocs(
    query(collection(db, "user_mutes"), where("muter_id", "==", uid)),
  );
  return snap.docs.map((d) => ({
    id: d.id,
    muted_id: d.data().muted_id as string,
    created_at: tsToIso(d.data().created_at),
  }));
}

// ─── Suggested people ─────────────────────────────────────────────────────────

export async function getSuggestedUsers(uid: string): Promise<PublicProfile[]> {
  const followingIds = await getFollowingIds(uid);
  const blockedIds = await getBlockedUserIds(uid);
  const exclude = new Set([uid, ...followingIds, ...blockedIds]);

  // Get followers of people we follow (mutual connections)
  const candidateScores = new Map<string, number>();
  for (const followingId of followingIds.slice(0, 20)) {
    const theirFollowing = await getFollowingIds(followingId);
    for (const candidate of theirFollowing) {
      if (!exclude.has(candidate)) {
        candidateScores.set(candidate, (candidateScores.get(candidate) ?? 0) + 1);
      }
    }
  }

  const sorted = Array.from(candidateScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([id]) => id);

  const profiles: PublicProfile[] = [];
  for (const userId of sorted) {
    const snap = await getDoc(doc(db, "profiles", userId));
    if (snap.exists()) {
      const data = snap.data();
      if (data.profile_visibility !== "private") {
        profiles.push({
          id: userId,
          name: data.name as string,
          username: data.username as string,
          avatar_url: data.avatar_url as string | undefined,
          bio: data.bio as string | undefined,
          xp: data.xp as number ?? 0,
          streak_current: data.streak_current as number ?? 0,
          follower_count: data.follower_count as number ?? 0,
          following_count: data.following_count as number ?? 0,
          public_post_count: data.public_post_count as number ?? 0,
          network_visibility: (data.network_visibility as "public" | "private") ?? "public",
          profile_visibility: (data.profile_visibility as "public" | "private") ?? "public",
        });
      }
    }
  }

  return profiles;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getFollowDoc(followerUid: string, targetUid: string) {
  const snap = await getDocs(
    query(
      collection(db, "community_follows"),
      where("follower_id", "==", followerUid),
      where("following_id", "==", targetUid),
    ),
  );
  return snap.empty ? null : snap.docs[0];
}

function tsToIso(ts: unknown): string {
  if (!ts) return new Date().toISOString();
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  if (typeof ts === "string") return ts;
  return new Date().toISOString();
}
