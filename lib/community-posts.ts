import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import type {
  CommunityPost,
  CommunityComment,
  PostVisibility,
  PostMedia,
  PostLinkedContent,
  ReportReason,
} from "@/types";

// ─── Post CRUD ──────────────────────────────────────────────────────────────

export async function createPost(params: {
  uid: string;
  author_name: string;
  author_avatar_url?: string;
  content: string;
  mediaUris?: string[];
  linked_content?: PostLinkedContent;
  visibility: PostVisibility;
}): Promise<string> {
  const { uid, author_name, author_avatar_url, content, mediaUris, linked_content, visibility } = params;

  const media: PostMedia[] = [];

  if (mediaUris && mediaUris.length > 0) {
    for (let i = 0; i < mediaUris.length; i++) {
      const uri = mediaUris[i];
      const response = await fetch(uri);
      const blob = await response.blob();
      const path = `community_posts/${uid}/${Date.now()}_${i}.jpg`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      media.push({ type: "image", storage_url: url, order: i });
    }
  }

  const postData: Omit<CommunityPost, "id"> = {
    author_id: uid,
    author_name,
    author_avatar_url,
    content,
    content_length: content.length,
    media,
    linked_content,
    visibility,
    like_count: 0,
    comment_count: 0,
    liked_by: [],
    status: "published",
    flagged_count: 0,
    mod_reviewed: false,
    created_at: new Date().toISOString(),
  };

  const docRef = await addDoc(collection(db, "community_posts"), {
    ...postData,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  return docRef.id;
}

export async function likePost(postId: string, uid: string): Promise<void> {
  const postRef = doc(db, "community_posts", postId);
  await updateDoc(postRef, {
    liked_by: arrayUnion(uid),
    like_count: increment(1),
  });
}

export async function unlikePost(postId: string, uid: string): Promise<void> {
  const postRef = doc(db, "community_posts", postId);
  await updateDoc(postRef, {
    liked_by: arrayRemove(uid),
    like_count: increment(-1),
  });
}

export async function deletePost(postId: string): Promise<void> {
  await updateDoc(doc(db, "community_posts", postId), {
    status: "removed",
    updated_at: serverTimestamp(),
  });
}

export async function getPost(postId: string): Promise<CommunityPost | null> {
  const snap = await getDoc(doc(db, "community_posts", postId));
  if (!snap.exists()) return null;
  return firestoreToPost(snap.id, snap.data());
}

export async function getPostsByAuthor(uid: string): Promise<CommunityPost[]> {
  const q = query(
    collection(db, "community_posts"),
    where("author_id", "==", uid),
    orderBy("created_at", "desc"),
    limit(50),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => firestoreToPost(d.id, d.data()))
    .filter((p) => p.status !== "removed");
}

export async function reportPost(
  postId: string,
  reporterId: string,
  reason: ReportReason,
  evidenceUri?: string,
): Promise<void> {
  let evidence_url: string | undefined;
  if (evidenceUri) {
    const response = await fetch(evidenceUri);
    const blob = await response.blob();
    const path = `content_reports/${reporterId}/${Date.now()}.jpg`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob);
    evidence_url = await getDownloadURL(storageRef);
  }

  await addDoc(collection(db, "content_reports"), {
    reporter_id: reporterId,
    reported_type: "post",
    reported_id: postId,
    reason,
    evidence_url,
    status: "pending",
    created_at: serverTimestamp(),
  });

  await updateDoc(doc(db, "community_posts", postId), {
    flagged_count: increment(1),
    flagged_reason: reason,
    status: "flagged",
  });
}

export async function reportComment(
  commentId: string,
  postId: string,
  reporterId: string,
  reason: ReportReason,
): Promise<void> {
  await addDoc(collection(db, "content_reports"), {
    reporter_id: reporterId,
    reported_type: "comment",
    reported_id: commentId,
    reason,
    status: "pending",
    created_at: serverTimestamp(),
  });
}

// ─── Comments ────────────────────────────────────────────────────────────────

export async function createComment(params: {
  postId: string;
  uid: string;
  author_name: string;
  author_avatar_url?: string;
  content: string;
  reply_to?: string;
}): Promise<string> {
  const { postId, uid, author_name, author_avatar_url, content, reply_to } = params;

  const docRef = await addDoc(
    collection(db, "community_posts", postId, "comments"),
    {
      author_id: uid,
      author_name,
      author_avatar_url,
      content,
      reply_to: reply_to ?? null,
      like_count: 0,
      status: "published",
      created_at: serverTimestamp(),
    },
  );

  await updateDoc(doc(db, "community_posts", postId), {
    comment_count: increment(1),
  });

  return docRef.id;
}

export async function deleteComment(postId: string, commentId: string): Promise<void> {
  await updateDoc(doc(db, "community_posts", postId, "comments", commentId), {
    status: "removed",
  });
  await updateDoc(doc(db, "community_posts", postId), {
    comment_count: increment(-1),
  });
}

export async function likeComment(postId: string, commentId: string): Promise<void> {
  await updateDoc(doc(db, "community_posts", postId, "comments", commentId), {
    like_count: increment(1),
  });
}

export async function getComments(postId: string): Promise<CommunityComment[]> {
  const q = query(
    collection(db, "community_posts", postId, "comments"),
    where("status", "==", "published"),
    orderBy("created_at", "asc"),
  );
  const snap = await getDocs(q);
  const flat = snap.docs.map((d) => firestoreToComment(d.id, postId, d.data()));
  return buildCommentTree(flat);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function firestoreToPost(id: string, data: Record<string, unknown>): CommunityPost {
  return {
    id,
    author_id: data.author_id as string,
    author_name: data.author_name as string,
    author_avatar_url: data.author_avatar_url as string | undefined,
    content: data.content as string,
    content_length: data.content_length as number ?? 0,
    media: (data.media as PostMedia[]) ?? [],
    linked_content: data.linked_content as PostLinkedContent | undefined,
    visibility: data.visibility as PostVisibility,
    like_count: data.like_count as number ?? 0,
    comment_count: data.comment_count as number ?? 0,
    liked_by: (data.liked_by as string[]) ?? [],
    status: (data.status as CommunityPost["status"]) ?? "published",
    flagged_count: data.flagged_count as number ?? 0,
    mod_reviewed: data.mod_reviewed as boolean ?? false,
    mod_approved: data.mod_approved as boolean | undefined,
    created_at: tsToIso(data.created_at),
    updated_at: tsToIso(data.updated_at),
  };
}

function firestoreToComment(id: string, postId: string, data: Record<string, unknown>): CommunityComment {
  return {
    id,
    post_id: postId,
    author_id: data.author_id as string,
    author_name: data.author_name as string,
    author_avatar_url: data.author_avatar_url as string | undefined,
    content: data.content as string,
    reply_to: data.reply_to as string | undefined,
    like_count: data.like_count as number ?? 0,
    status: (data.status as CommunityComment["status"]) ?? "published",
    created_at: tsToIso(data.created_at),
  };
}

function tsToIso(ts: unknown): string {
  if (!ts) return new Date().toISOString();
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  if (typeof ts === "string") return ts;
  return new Date().toISOString();
}

function buildCommentTree(flat: CommunityComment[]): CommunityComment[] {
  const map = new Map<string, CommunityComment>();
  const roots: CommunityComment[] = [];

  flat.forEach((c) => {
    map.set(c.id, { ...c, replies: [] });
  });

  map.forEach((c) => {
    if (c.reply_to && map.has(c.reply_to)) {
      const parent = map.get(c.reply_to)!;
      parent.replies = parent.replies ?? [];
      parent.replies.push(c);
    } else {
      roots.push(c);
    }
  });

  return roots;
}

export { firestoreToPost };
