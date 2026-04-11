import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import type { GroupCheckIn, CheckInComment, CheckInMedia } from "@/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tsToIso(ts: unknown): string {
  if (!ts) return new Date().toISOString();
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  if (typeof ts === "string") return ts;
  return new Date().toISOString();
}

function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function exifDateToIso(exifDate: string): string {
  // EXIF format: "YYYY:MM:DD HH:MM:SS" → "YYYY-MM-DDTHH:MM:SS"
  try {
    const parts = exifDate.split(" ");
    if (parts.length !== 2) return new Date().toISOString();
    const datePart = parts[0].replace(/:/g, "-");
    const timePart = parts[1];
    return new Date(`${datePart}T${timePart}`).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function firestoreToCheckIn(
  id: string,
  groupId: string,
  data: Record<string, unknown>,
): GroupCheckIn {
  return {
    id,
    group_id: groupId,
    user_id: data.user_id as string,
    user_name: (data.user_name as string) ?? "",
    user_avatar: data.user_avatar as string | undefined,
    challenge_type: data.challenge_type as GroupCheckIn["challenge_type"],
    metric_value: (data.metric_value as number) ?? 0,
    metric_unit: (data.metric_unit as string) ?? "",
    notes: data.notes as string | undefined,
    media: (data.media as CheckInMedia[]) ?? [],
    like_count: (data.like_count as number) ?? 0,
    liked_by: (data.liked_by as string[]) ?? [],
    comment_count: (data.comment_count as number) ?? 0,
    checked_in_at: tsToIso(data.checked_in_at),
    date: (data.date as string) ?? getTodayDateString(),
  };
}

// ─── Check-in CRUD ───────────────────────────────────────────────────────────

export async function createCheckIn(params: {
  groupId: string;
  uid: string;
  user_name: string;
  user_avatar?: string;
  challenge_type: GroupCheckIn["challenge_type"];
  metric_value: number;
  metric_unit: string;
  notes?: string;
  imageUri?: string;
  exifDateTimeOriginal?: string;
}): Promise<string> {
  const today = getTodayDateString();

  // Upload image if provided
  let media: CheckInMedia[] = [];
  if (params.imageUri) {
    const response = await fetch(params.imageUri);
    const blob = await response.blob();
    const path = `group_check_ins/${params.groupId}/${params.uid}/${Date.now()}.jpg`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob);
    const storage_url = await getDownloadURL(storageRef);
    media = [
      {
        storage_url,
        taken_at: params.exifDateTimeOriginal
          ? exifDateToIso(params.exifDateTimeOriginal)
          : new Date().toISOString(),
      },
    ];
  }

  const payload: Record<string, unknown> = {
    user_id: params.uid,
    user_name: params.user_name,
    challenge_type: params.challenge_type,
    metric_value: params.metric_value,
    metric_unit: params.metric_unit,
    media,
    like_count: 0,
    liked_by: [],
    comment_count: 0,
    checked_in_at: serverTimestamp(),
    date: today,
    group_id: params.groupId,
  };

  if (params.user_avatar) payload.user_avatar = params.user_avatar;
  if (params.notes) payload.notes = params.notes;

  const checkInRef = await addDoc(
    collection(db, "group_check_ins", params.groupId, "check_ins"),
    payload,
  );

  // Update participant score
  const participantRef = doc(
    db,
    "challenge_participants",
    params.groupId,
    "participants",
    params.uid,
  );
  const participantSnap = await getDoc(participantRef);
  if (participantSnap.exists()) {
    await updateDoc(participantRef, {
      score: increment(params.metric_value),
      updated_at: serverTimestamp(),
    });
  }

  return checkInRef.id;
}

export async function getTodayCheckIn(
  groupId: string,
  uid: string,
): Promise<GroupCheckIn | null> {
  const today = getTodayDateString();
  const q = query(
    collection(db, "group_check_ins", groupId, "check_ins"),
    where("user_id", "==", uid),
    where("date", "==", today),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return firestoreToCheckIn(d.id, groupId, d.data());
}

export async function getGroupCheckIns(
  groupId: string,
  date?: string,
): Promise<GroupCheckIn[]> {
  const dateFilter = date ?? getTodayDateString();

  const primaryQuery = query(
    collection(db, "group_check_ins", groupId, "check_ins"),
    where("date", "==", dateFilter),
    orderBy("checked_in_at", "desc"),
    limit(50),
  );

  const fallbackQuery = query(
    collection(db, "group_check_ins", groupId, "check_ins"),
    where("date", "==", dateFilter),
    limit(50),
  );

  const snap = await getDocs(primaryQuery).catch(async (err) => {
    console.error("[checkins] getGroupCheckIns primary query failed", err);
    return getDocs(fallbackQuery);
  });

  return snap.docs.map((d) => firestoreToCheckIn(d.id, groupId, d.data()));
}

// ─── Likes ───────────────────────────────────────────────────────────────────

export async function likeCheckIn(
  groupId: string,
  checkInId: string,
  uid: string,
): Promise<void> {
  const ref_ = doc(db, "group_check_ins", groupId, "check_ins", checkInId);
  await updateDoc(ref_, {
    liked_by: arrayUnion(uid),
    like_count: increment(1),
  });
}

export async function unlikeCheckIn(
  groupId: string,
  checkInId: string,
  uid: string,
): Promise<void> {
  const ref_ = doc(db, "group_check_ins", groupId, "check_ins", checkInId);
  await updateDoc(ref_, {
    liked_by: arrayRemove(uid),
    like_count: increment(-1),
  });
}

// ─── Comments ────────────────────────────────────────────────────────────────

export async function getCheckInComments(
  groupId: string,
  checkInId: string,
): Promise<CheckInComment[]> {
  const q = query(
    collection(
      db,
      "group_check_ins",
      groupId,
      "check_ins",
      checkInId,
      "comments",
    ),
    orderBy("created_at", "asc"),
    limit(100),
  );

  const fallback = query(
    collection(
      db,
      "group_check_ins",
      groupId,
      "check_ins",
      checkInId,
      "comments",
    ),
    limit(100),
  );

  const snap = await getDocs(q).catch(async (err) => {
    console.error("[checkins] getCheckInComments query failed", err);
    return getDocs(fallback);
  });

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      check_in_id: checkInId,
      group_id: groupId,
      author_id: data.author_id as string,
      author_name: (data.author_name as string) ?? "",
      author_avatar: data.author_avatar as string | undefined,
      content: (data.content as string) ?? "",
      emoji_reaction: data.emoji_reaction as string | undefined,
      created_at: tsToIso(data.created_at),
    };
  });
}

export async function createCheckInComment(
  groupId: string,
  checkInId: string,
  params: {
    uid: string;
    author_name: string;
    author_avatar?: string;
    content: string;
    emoji_reaction?: string;
  },
): Promise<string> {
  const payload: Record<string, unknown> = {
    author_id: params.uid,
    author_name: params.author_name,
    content: params.content,
    created_at: serverTimestamp(),
  };

  if (params.author_avatar) payload.author_avatar = params.author_avatar;
  if (params.emoji_reaction) payload.emoji_reaction = params.emoji_reaction;

  const commentRef = await addDoc(
    collection(
      db,
      "group_check_ins",
      groupId,
      "check_ins",
      checkInId,
      "comments",
    ),
    payload,
  );

  // Increment comment count on check-in
  const checkInRef = doc(
    db,
    "group_check_ins",
    groupId,
    "check_ins",
    checkInId,
  );
  await updateDoc(checkInRef, { comment_count: increment(1) });

  return commentRef.id;
}
