import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { CommunityPost, PostMedia, PostLinkedContent, PostVisibility } from "@/types";
import { getFollowingIds, getBlockedUserIds, getMutedUserIds } from "@/lib/community-follows";
import { firestoreToPost } from "@/lib/community-posts";

const FEED_LIMIT = 100;

// ─── Feed Loading ─────────────────────────────────────────────────────────────

export async function loadFeed(uid: string): Promise<CommunityPost[]> {
  const [followingIds, blockedIds, mutedIds] = await Promise.all([
    getFollowingIds(uid),
    getBlockedUserIds(uid),
    getMutedUserIds(uid),
  ]);

  if (followingIds.length === 0) return [];

  const excludeIds = new Set([...blockedIds, ...mutedIds]);

  // Firestore 'in' queries support max 30 items; chunk if needed
  const chunks = chunkArray(followingIds, 30);
  let allPosts: CommunityPost[] = [];

  for (const chunk of chunks) {
    const q = query(
      collection(db, "community_posts"),
      where("author_id", "in", chunk),
      where("status", "==", "published"),
      orderBy("created_at", "desc"),
      limit(FEED_LIMIT),
    );
    const snap = await getDocs(q);
    const posts = snap.docs
      .map((d) => firestoreToPost(d.id, d.data() as Record<string, unknown>))
      .filter((p) => !excludeIds.has(p.author_id));
    allPosts = allPosts.concat(posts);
  }

  // Sort by created_at desc and cap at FEED_LIMIT
  return allPosts
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, FEED_LIMIT);
}

// ─── Real-time listener ───────────────────────────────────────────────────────

export function setupFeedListener(
  uid: string,
  followingIds: string[],
  blockedIds: string[],
  mutedIds: string[],
  onUpdate: (posts: CommunityPost[]) => void,
): Unsubscribe {
  if (followingIds.length === 0) {
    onUpdate([]);
    return () => {};
  }

  const excludeIds = new Set([...blockedIds, ...mutedIds]);
  const chunk = followingIds.slice(0, 30); // First chunk only for real-time

  const q = query(
    collection(db, "community_posts"),
    where("author_id", "in", chunk),
    where("status", "==", "published"),
    orderBy("created_at", "desc"),
    limit(FEED_LIMIT),
  );

  return onSnapshot(q, (snap) => {
    const posts = snap.docs
      .map((d) => firestoreToPost(d.id, d.data() as Record<string, unknown>))
      .filter((p) => !excludeIds.has(p.author_id));
    onUpdate(posts);
  });
}

// ─── Discover ────────────────────────────────────────────────────────────────

export async function loadTrendingPosts(uid: string): Promise<CommunityPost[]> {
  const blockedIds = await getBlockedUserIds(uid);
  const excludeIds = new Set(blockedIds);

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const q = query(
    collection(db, "community_posts"),
    where("visibility", "==", "public"),
    where("status", "==", "published"),
    where("created_at", ">=", Timestamp.fromDate(yesterday)),
    orderBy("created_at", "desc"),
    limit(100),
  );

  const snap = await getDocs(q);
  return snap.docs
    .map((d) => firestoreToPost(d.id, d.data() as Record<string, unknown>))
    .filter((p) => !excludeIds.has(p.author_id))
    .sort((a, b) => b.like_count - a.like_count)
    .slice(0, 30);
}

export async function loadDiscoverListener(
  uid: string,
  onUpdate: (posts: CommunityPost[]) => void,
): Promise<Unsubscribe> {
  const blockedIds = await getBlockedUserIds(uid);
  const excludeIds = new Set(blockedIds);

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const q = query(
    collection(db, "community_posts"),
    where("visibility", "==", "public"),
    where("status", "==", "published"),
    where("created_at", ">=", Timestamp.fromDate(yesterday)),
    orderBy("created_at", "desc"),
    limit(100),
  );

  return onSnapshot(q, (snap) => {
    const posts = snap.docs
      .map((d) => firestoreToPost(d.id, d.data() as Record<string, unknown>))
      .filter((p) => !excludeIds.has(p.author_id))
      .sort((a, b) => b.like_count - a.like_count)
      .slice(0, 30);
    onUpdate(posts);
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
