import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import type {
  CommunityGroup,
  GroupMember,
  ChallengeType,
  GroupMembership,
  GroupVisibility,
  ChallengeConfig,
} from "@/types";

// ─── Group CRUD ──────────────────────────────────────────────────────────────

export async function createGroup(params: {
  uid: string;
  user_name: string;
  user_avatar?: string;
  name: string;
  description?: string;
  avatarUri?: string;
  challenge_type: ChallengeType;
  challenge_config: ChallengeConfig;
  membership: GroupMembership;
  visibility: GroupVisibility;
  started_at?: string;
  ended_at?: string;
}): Promise<string> {
  try {
    let avatar_url: string | undefined;

    if (params.avatarUri) {
      const response = await fetch(params.avatarUri);
      const blob = await response.blob();
      const path = `community_groups/${params.uid}/${Date.now()}.jpg`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, blob);
      avatar_url = await getDownloadURL(storageRef);
    }

    const groupPayload: Record<string, unknown> = {
      creator_id: params.uid,
      name: params.name,
      description: params.description ?? "",
      challenge_type: params.challenge_type,
      challenge_config: params.challenge_config,
      membership: params.membership,
      visibility: params.visibility,
      member_count: 1,
      status: "active",
      started_at: params.started_at
        ? new Date(params.started_at)
        : serverTimestamp(),
      ended_at: params.ended_at ? new Date(params.ended_at) : null,
      created_at: serverTimestamp(),
    };

    if (avatar_url) {
      groupPayload.avatar_url = avatar_url;
    }

    const docRef = await addDoc(
      collection(db, "community_groups"),
      groupPayload,
    );

    // Creator auto-joins as member
    const memberPayload: Record<string, unknown> = {
      user_id: params.uid,
      user_name: params.user_name,
      joined_at: serverTimestamp(),
      current_score: 0,
      current_rank: 1,
      last_activity: serverTimestamp(),
    };

    if (params.user_avatar) {
      memberPayload.user_avatar = params.user_avatar;
    }

    await setDoc(
      doc(db, "community_groups", docRef.id, "members", params.uid),
      memberPayload,
    );

    // Create challenge participants entry
    await setDoc(
      doc(db, "challenge_participants", docRef.id, "participants", params.uid),
      {
        user_id: params.uid,
        group_id: docRef.id,
        score: 0,
        rank: 1,
        progress_history: [],
        trend: "stable",
        completed: false,
        updated_at: serverTimestamp(),
      },
    );

    return docRef.id;
  } catch (e: unknown) {
    console.error("[community][groups] createGroup failed", {
      uid: params.uid,
      name: params.name,
      challenge_type: params.challenge_type,
      membership: params.membership,
      visibility: params.visibility,
      error: e,
    });
    throw e;
  }
}

export async function getGroup(
  groupId: string,
): Promise<CommunityGroup | null> {
  const snap = await getDoc(doc(db, "community_groups", groupId));
  if (!snap.exists()) return null;
  return firestoreToGroup(snap.id, snap.data());
}

export async function getUserGroups(uid: string): Promise<CommunityGroup[]> {
  // Query groups where user is a member (via subcollection approach)
  // We query the members subcollection across all groups isn't feasible,
  // so we use a denormalized approach: store member UIDs in group or query challenge_participants
  const primaryQuery = query(
    collection(db, "community_groups"),
    where("status", "==", "active"),
    orderBy("created_at", "desc"),
    limit(50),
  );

  const fallbackQuery = query(
    collection(db, "community_groups"),
    where("status", "==", "active"),
    limit(50),
  );

  const snap = await getDocs(primaryQuery).catch(async (error) => {
    console.error(
      "[community][groups] getUserGroups primary query failed",
      error,
    );
    return getDocs(fallbackQuery);
  });

  const allGroups = snap.docs.map((d) => firestoreToGroup(d.id, d.data()));

  // Filter to groups where user is a member
  const userGroups: CommunityGroup[] = [];
  for (const group of allGroups) {
    const memberSnap = await getDoc(
      doc(db, "community_groups", group.id, "members", uid),
    );
    if (memberSnap.exists()) {
      userGroups.push(group);
    }
  }

  return userGroups;
}

export async function getPublicGroups(): Promise<CommunityGroup[]> {
  const primaryQuery = query(
    collection(db, "community_groups"),
    where("visibility", "==", "public"),
    where("status", "==", "active"),
    orderBy("member_count", "desc"),
    limit(30),
  );

  const fallbackQuery = query(
    collection(db, "community_groups"),
    where("visibility", "==", "public"),
    where("status", "==", "active"),
    limit(30),
  );

  const snap = await getDocs(primaryQuery).catch(async (error) => {
    console.error(
      "[community][groups] getPublicGroups primary query failed",
      error,
    );
    return getDocs(fallbackQuery);
  });

  return snap.docs.map((d) => firestoreToGroup(d.id, d.data()));
}

// ─── Membership ──────────────────────────────────────────────────────────────

export async function joinGroup(
  groupId: string,
  uid: string,
  user_name: string,
  user_avatar?: string,
): Promise<void> {
  const groupRef = doc(db, "community_groups", groupId);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) throw new Error("Group not found");

  const group = groupSnap.data();
  if (group.membership === "invite_only")
    throw new Error("This group is invite-only");

  const memberRef = doc(db, "community_groups", groupId, "members", uid);
  const existingMember = await getDoc(memberRef);
  if (existingMember.exists()) return;

  await setDoc(memberRef, {
    user_id: uid,
    user_name,
    user_avatar,
    joined_at: serverTimestamp(),
    current_score: 0,
    current_rank: 0,
    last_activity: serverTimestamp(),
  });

  await updateDoc(groupRef, {
    member_count: increment(1),
  });

  await setDoc(
    doc(db, "challenge_participants", groupId, "participants", uid),
    {
      user_id: uid,
      group_id: groupId,
      score: 0,
      rank: 0,
      progress_history: [],
      trend: "stable",
      completed: false,
      updated_at: serverTimestamp(),
    },
  );
}

export async function leaveGroup(groupId: string, uid: string): Promise<void> {
  await deleteDoc(doc(db, "community_groups", groupId, "members", uid));
  await updateDoc(doc(db, "community_groups", groupId), {
    member_count: increment(-1),
  });
  await deleteDoc(
    doc(db, "challenge_participants", groupId, "participants", uid),
  );
}

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const snap = await getDocs(
    collection(db, "community_groups", groupId, "members"),
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      user_id: d.id,
      user_name: (data.user_name as string) ?? "",
      user_avatar: data.user_avatar as string | undefined,
      joined_at: tsToIso(data.joined_at),
      current_score: (data.current_score as number) ?? 0,
      current_rank: (data.current_rank as number) ?? 0,
      last_activity: tsToIso(data.last_activity),
    };
  });
}

export async function isMember(groupId: string, uid: string): Promise<boolean> {
  const snap = await getDoc(
    doc(db, "community_groups", groupId, "members", uid),
  );
  return snap.exists();
}

export async function deleteGroup(groupId: string, uid: string): Promise<void> {
  const groupRef = doc(db, "community_groups", groupId);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) return;
  const groupData = groupSnap.data();
  if (groupData.creator_id !== uid) throw new Error("Only the creator can delete a group");

  // Delete all members subcollection docs
  const membersSnap = await getDocs(
    collection(db, "community_groups", groupId, "members"),
  );
  for (const memberDoc of membersSnap.docs) {
    await deleteDoc(memberDoc.ref);
  }

  // Delete all challenge_participants subcollection docs
  const participantsSnap = await getDocs(
    collection(db, "challenge_participants", groupId, "participants"),
  );
  for (const participantDoc of participantsSnap.docs) {
    await deleteDoc(participantDoc.ref);
  }

  // Delete the group document itself
  await deleteDoc(groupRef);
}

export async function editGroup(
  groupId: string,
  uid: string,
  params: {
    name?: string;
    description?: string;
    avatarUri?: string;
  },
): Promise<void> {
  const groupRef = doc(db, "community_groups", groupId);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) throw new Error("Group not found");
  if (groupSnap.data().creator_id !== uid)
    throw new Error("Only the creator can edit a group");

  const updates: Record<string, unknown> = {};
  if (params.name) updates.name = params.name;
  if (params.description !== undefined) updates.description = params.description;

  if (params.avatarUri) {
    const response = await fetch(params.avatarUri);
    const blob = await response.blob();
    const path = `community_groups/${uid}/${Date.now()}.jpg`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob);
    updates.avatar_url = await getDownloadURL(storageRef);
  }

  if (Object.keys(updates).length > 0) {
    await updateDoc(groupRef, updates);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function firestoreToGroup(
  id: string,
  data: Record<string, unknown>,
): CommunityGroup {
  return {
    id,
    creator_id: data.creator_id as string,
    name: data.name as string,
    description: data.description as string | undefined,
    avatar_url: data.avatar_url as string | undefined,
    challenge_type: data.challenge_type as ChallengeType,
    challenge_config: (data.challenge_config as ChallengeConfig) ?? {
      goal: "",
      target_value: 0,
      unit: "",
    },
    membership: (data.membership as GroupMembership) ?? "open",
    visibility: (data.visibility as GroupVisibility) ?? "public",
    member_count: (data.member_count as number) ?? 0,
    status: (data.status as "active" | "ended") ?? "active",
    created_at: tsToIso(data.created_at),
    started_at: tsToIso(data.started_at),
    ended_at: data.ended_at ? tsToIso(data.ended_at) : undefined,
  };
}

function tsToIso(ts: unknown): string {
  if (!ts) return new Date().toISOString();
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  if (typeof ts === "string") return ts;
  return new Date().toISOString();
}

export { firestoreToGroup };
