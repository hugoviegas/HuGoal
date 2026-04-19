import { create } from "zustand";
import type { Unsubscribe } from "firebase/firestore";
import type {
  CommunityPost,
  CommunityGroup,
  ChallengeParticipant,
  CommunityNotification,
  PublicProfile,
  GroupCheckIn,
} from "@/types";
import { loadFeed, setupFeedListener } from "@/lib/community-feed";
import {
  createPost,
  likePost,
  unlikePost,
  deletePost,
} from "@/lib/community-posts";
import {
  followUser,
  unfollowUser,
  blockUser,
  unblockUser,
  muteUser,
  unmuteUser,
  getFollowingIds,
  getBlockedUserIds,
  getMutedUserIds,
} from "@/lib/community-follows";
import {
  joinGroup,
  leaveGroup,
  deleteGroup,
  getUserGroups,
} from "@/lib/community-groups";
import { getLeaderboard } from "@/lib/community-leaderboard";
import {
  createCheckIn,
  getTodayCheckIn,
  getGroupCheckIns,
} from "@/lib/community-checkins";
import type { PostVisibility, PostLinkedContent } from "@/types";

interface CommunityState {
  // Feed
  feed: CommunityPost[];
  feedLoading: boolean;
  feedError: string | null;
  feedFromCache: boolean;
  feedSyncing: boolean;

  // Discover
  discoverPosts: CommunityPost[];
  suggestedPeople: PublicProfile[];

  // Groups
  groups: CommunityGroup[];
  groupsLoading: boolean;

  // Check-ins
  checkIns: Record<string, GroupCheckIn[]>;
  checkInsLoading: boolean;
  todayCheckIn: Record<string, GroupCheckIn | null>;

  // Leaderboard (per group)
  leaderboards: Record<string, ChallengeParticipant[]>;

  // Social state
  followingIds: string[];
  blockedIds: string[];
  mutedIds: string[];

  // Notifications
  notifications: CommunityNotification[];
  unreadCount: number;

  // Listeners
  _feedUnsubscribe: Unsubscribe | null;

  // Actions — Feed
  loadFeed: (uid: string) => Promise<void>;
  refreshFeed: (uid: string) => Promise<void>;
  startFeedListener: (uid: string) => Promise<void>;
  stopFeedListener: () => void;

  // Actions — Posts
  createPost: (params: {
    uid: string;
    author_name: string;
    author_avatar_url?: string;
    content: string;
    mediaUris?: string[];
    linked_content?: PostLinkedContent;
    visibility: PostVisibility;
  }) => Promise<string>;
  likePost: (postId: string, uid: string) => Promise<void>;
  unlikePost: (postId: string, uid: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;

  // Actions — Social
  loadSocialState: (uid: string) => Promise<void>;
  followUser: (followerUid: string, targetUid: string) => Promise<void>;
  unfollowUser: (followerUid: string, targetUid: string) => Promise<void>;
  blockUser: (blockerUid: string, targetUid: string) => Promise<void>;
  unblockUser: (blockerUid: string, targetUid: string) => Promise<void>;
  muteUser: (muterUid: string, targetUid: string) => Promise<void>;
  unmuteUser: (muterUid: string, targetUid: string) => Promise<void>;

  // Actions — Groups
  loadGroups: (uid: string) => Promise<void>;
  joinGroup: (
    groupId: string,
    uid: string,
    user_name: string,
    user_avatar?: string,
  ) => Promise<void>;
  leaveGroup: (
    groupId: string,
    uid: string,
    isCreator?: boolean,
  ) => Promise<void>;
  loadLeaderboard: (groupId: string) => Promise<void>;

  // Actions — Check-ins
  loadCheckIns: (groupId: string, date?: string) => Promise<void>;
  loadTodayCheckIn: (groupId: string, uid: string) => Promise<void>;
  submitCheckIn: (
    groupId: string,
    uid: string,
    params: {
      user_name: string;
      user_avatar?: string;
      challenge_type: GroupCheckIn["challenge_type"];
      metric_value: number;
      metric_unit: string;
      notes?: string;
      imageUri?: string;
      exifDateTimeOriginal?: string;
    },
  ) => Promise<void>;
}

export const useCommunityStore = create<CommunityState>((set, get) => ({
  feed: [],
  feedLoading: false,
  feedError: null,
  feedFromCache: false,
  feedSyncing: false,
  discoverPosts: [],
  suggestedPeople: [],
  groups: [],
  groupsLoading: false,
  checkIns: {},
  checkInsLoading: false,
  todayCheckIn: {},
  leaderboards: {},
  followingIds: [],
  blockedIds: [],
  mutedIds: [],
  notifications: [],
  unreadCount: 0,
  _feedUnsubscribe: null,

  // ── Feed ────────────────────────────────────────────────────────────────────

  loadFeed: async (uid) => {
    set({ feedLoading: true, feedError: null, feedSyncing: false });
    try {
      const feed = await loadFeed(uid);
      set({
        feed,
        feedLoading: false,
        feedFromCache: false,
        feedSyncing: false,
      });
    } catch (e: unknown) {
      set({
        feedError: (e as Error).message ?? "Failed to load feed",
        feedLoading: false,
        feedSyncing: false,
      });
    }
  },

  refreshFeed: async (uid) => {
    try {
      const feed = await loadFeed(uid);
      set({ feed });
    } catch {
      // silent refresh failure
    }
  },

  startFeedListener: async (uid) => {
    get().stopFeedListener();

    const [followingIds, blockedIds, mutedIds] = await Promise.all([
      getFollowingIds(uid),
      getBlockedUserIds(uid),
      getMutedUserIds(uid),
    ]);

    set({ followingIds, blockedIds, mutedIds });

    const unsub = setupFeedListener(
      uid,
      followingIds,
      blockedIds,
      mutedIds,
      (posts, meta) => {
        const fromCache = meta?.fromCache ?? false;
        set({
          feed: posts,
          feedFromCache: fromCache,
          feedSyncing: fromCache,
        });
      },
    );

    set({ _feedUnsubscribe: unsub });
  },

  stopFeedListener: () => {
    const unsub = get()._feedUnsubscribe;
    if (unsub) {
      unsub();
      set({ _feedUnsubscribe: null });
    }
  },

  // ── Posts ───────────────────────────────────────────────────────────────────

  createPost: async (params) => {
    const postId = await createPost(params);
    get().refreshFeed(params.uid);
    return postId;
  },

  likePost: async (postId, uid) => {
    set((state) => ({
      feed: state.feed.map((p) =>
        p.id === postId
          ? {
              ...p,
              like_count: p.liked_by.includes(uid)
                ? p.like_count
                : p.like_count + 1,
              liked_by: p.liked_by.includes(uid)
                ? p.liked_by
                : [...p.liked_by, uid],
            }
          : p,
      ),
    }));
    await likePost(postId, uid);
  },

  unlikePost: async (postId, uid) => {
    set((state) => ({
      feed: state.feed.map((p) =>
        p.id === postId
          ? {
              ...p,
              like_count: p.liked_by.includes(uid)
                ? p.like_count - 1
                : p.like_count,
              liked_by: p.liked_by.filter((id) => id !== uid),
            }
          : p,
      ),
    }));
    await unlikePost(postId, uid);
  },

  deletePost: async (postId) => {
    await deletePost(postId);
    set((state) => ({
      feed: state.feed.filter((p) => p.id !== postId),
    }));
  },

  // ── Social ──────────────────────────────────────────────────────────────────

  loadSocialState: async (uid) => {
    const [followingIds, blockedIds, mutedIds] = await Promise.all([
      getFollowingIds(uid),
      getBlockedUserIds(uid),
      getMutedUserIds(uid),
    ]);
    set({ followingIds, blockedIds, mutedIds });
  },

  followUser: async (followerUid, targetUid) => {
    await followUser(followerUid, targetUid);
    set((state) => ({
      followingIds: [...state.followingIds, targetUid],
    }));
  },

  unfollowUser: async (followerUid, targetUid) => {
    await unfollowUser(followerUid, targetUid);
    set((state) => ({
      followingIds: state.followingIds.filter((id) => id !== targetUid),
    }));
  },

  blockUser: async (blockerUid, targetUid) => {
    await blockUser(blockerUid, targetUid);
    set((state) => ({
      blockedIds: [...state.blockedIds, targetUid],
      followingIds: state.followingIds.filter((id) => id !== targetUid),
      feed: state.feed.filter((p) => p.author_id !== targetUid),
    }));
  },

  unblockUser: async (blockerUid, targetUid) => {
    await unblockUser(blockerUid, targetUid);
    set((state) => ({
      blockedIds: state.blockedIds.filter((id) => id !== targetUid),
    }));
  },

  muteUser: async (muterUid, targetUid) => {
    await muteUser(muterUid, targetUid);
    set((state) => ({
      mutedIds: [...state.mutedIds, targetUid],
      feed: state.feed.filter((p) => p.author_id !== targetUid),
    }));
  },

  unmuteUser: async (muterUid, targetUid) => {
    await unmuteUser(muterUid, targetUid);
    set((state) => ({
      mutedIds: state.mutedIds.filter((id) => id !== targetUid),
    }));
  },

  // ── Groups ──────────────────────────────────────────────────────────────────

  loadGroups: async (uid) => {
    set({ groupsLoading: true });
    try {
      const groups = await getUserGroups(uid);
      set({ groups, groupsLoading: false });
    } catch {
      set({ groupsLoading: false });
    }
  },

  joinGroup: async (groupId, uid, user_name, user_avatar) => {
    await joinGroup(groupId, uid, user_name, user_avatar);
    await get().loadGroups(uid);
  },

  leaveGroup: async (groupId, uid, isCreator = false) => {
    if (isCreator) {
      await deleteGroup(groupId, uid);
    } else {
      await leaveGroup(groupId, uid);
    }
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== groupId),
    }));
  },

  loadLeaderboard: async (groupId) => {
    const participants = await getLeaderboard(groupId);
    set((state) => ({
      leaderboards: { ...state.leaderboards, [groupId]: participants },
    }));
  },

  // ── Check-ins ───────────────────────────────────────────────────────────────

  loadCheckIns: async (groupId, date) => {
    set({ checkInsLoading: true });
    try {
      const checkIns = await getGroupCheckIns(groupId, date);
      set((state) => ({
        checkIns: { ...state.checkIns, [groupId]: checkIns },
        checkInsLoading: false,
      }));
    } catch {
      set({ checkInsLoading: false });
    }
  },

  loadTodayCheckIn: async (groupId, uid) => {
    try {
      const checkIn = await getTodayCheckIn(groupId, uid);
      set((state) => ({
        todayCheckIn: { ...state.todayCheckIn, [groupId]: checkIn },
      }));
    } catch {
      // silent
    }
  },

  submitCheckIn: async (groupId, uid, params) => {
    const checkInId = await createCheckIn({ groupId, uid, ...params });
    // Refresh check-ins for this group
    await get().loadCheckIns(groupId);
    // Update today's check-in cache
    const todayCheckIn = await getTodayCheckIn(groupId, uid);
    set((state) => ({
      todayCheckIn: { ...state.todayCheckIn, [groupId]: todayCheckIn },
    }));
    return;
  },
}));
