# Phase 07 - Community: Plano Completo Consolidado

## TL;DR - Recomendação de Arquitetura

**Objetivo:** Camada social completa com one-way follow (Twitter-style), feed cronológico hybrid (following + discover), posts ricos (text + images + linked content), groups com challenges (autoridade Cloud Functions), leaderboards completos, threaded comments, moderação community-driven, e compliance GDPR.

---

## Decisões Arquiteturais (9 Tiers)

### Tier 1: Arquitetura Social & Relações

- **Follow model:** One-way follow (Twitter-style); user A pode seguir user B sem reciprocidade
- **Blocking & muting:** Ambos suportados
  - **Block:** Bidirecional; blocker não vê posts, blocked não vê posts
  - **Mute:** Unilateral; posts ocultos mas sem bloqueio
- **Network privacy:** User-controlled per profile (followers/following lists públicos ou privados)
- **Profile visibility:** Público por default; toggle para private
- **Friend requests:** Não em MVP; só one-way follow

### Tier 2: Feed & Timeline

- **Algorithm:** Cronológico puro (recentes primeiro); sem algoritmo ML em MVP
- **Feed contents:** Híbrido - posts de following + discover tab separada (trending)
- **Pagination:** Infinite scroll (load mais silent)
- **Empty feed strategy:** Sugerir users para seguir (carousel) + link para Discover tab
- **Real-time updates:** Híbrido - counters (likes, comments) real-time; posts novos carregam manual (pull-to-refresh)

### Tier 3: Posts & Conteúdo

- **Post types suportados:**
  - Text (+ emoji)
  - Images (carousel multi-image)
  - Linked workouts (com preview card)
  - Linked nutrition (meal plans/logs)
  - Achievement badges
- **Visibility:** Ambos - followers-only (default) ou public (per-post toggle)
- **Media handling:** Draft mode - se upload falha, texto preservado; retry inline depois
- **Linked content:** Interactive card (title + stats + "Try" button para abrir)
- **Length limit:** 500 caracteres (short-form)

### Tier 4: Groups & Challenges

- **Group participation:** Creator choice - open join ou invite-only
- **Challenge types:**
  - Workout-based (exercise count, volume)
  - Nutrition-based (consistency, macro targets)
  - Activity-based (calories burned)
  - Streak-based (consecutive days)
- **Leaderboard authority:** Cloud Functions (recalculam rank on event) - **cliente NUNCA** é source of truth
- **Group privacy:** Both - public ou private (creator choice)
- **Tie-breaking:** Secondary score - volume total ou consistency score

### Tier 5: Leaderboards & Rankings

- **Display:** Rank + score + progress bar (para próximo tier)
- **Participant visibility:** Todos os participantes (full transparency)
- **Rank history:** Trend only (↑ going up, ↓ down, → stable)
- **Rank notifications:** Nenhum em MVP (no ranks alerts)
- **Rewards:** XP + badges + cosmetics (avatar frame, nickname color)

### Tier 6: UI/UX & Interações

- **Optimistic updates:** Selective - likes updatam instant na UI, comments esperam
- **Comments:** Threaded - replies aninhadas ao comment original (não flat)
- **Profile tabs:** Posts + achievements + stats (workout count, streak, XP)
- **Discover sorting:** Both tabs - trending posts (most liked today) + suggested people (mutual followers)
- **Share:** Both - generate link (web preview) + native share sheet (WhatsApp, Instagram, etc)

### Tier 7: Notificações & Real-time

- **Notification types:** Like, Comment, Follow, Group invite, Challenge started
- **Delivery:** In-app + push selective (user configura per type)
- **Batching:** Hybrid - real-time in-app (individual actions), batch push (hourly "5 people liked...")
- **Real-time scope:** Full real-time (todas as ações em tempo real)
- **Listener limits:** Top 100 posts do feed (não unlimited para performance)

### Tier 8: Recursos Avançados & Moderação

- **Report system:** Structured - reason dropdown + evidence upload (screenshot)
- **Moderation:** Community + escalate
  - Community voting: users downvote/flag content
  - Escalate: flagged pela comunidade → mod team review
- **Blocked user actions:** Post hidden (strict) - quando user X bloqueia user Y, posts Y não aparecem para X
- **Content rules:** Strict approval (manual) - all new posts require mod review antes de aparecer (MVP conservative)
- **Reported content:** Visible pending review; hidden se approved como violação

### Tier 9: Compliance, Safety & Futuro

- **Age gating:** Verify on signup (age confirmation)
- **Data retention:** Forever (posts nunca deletados automáticamente; user pode delete)
- **Privacy:** GDPR-compliant - opt-in analytics, data export, right to deletion
- **Future prep:** Architecture pronta para live streaming, voice/video calls, stories (24h), cross-app badges, creator monetization

---

## Proposed Data Model

### Community Posts

`community_posts/{postId}`

```json
{
  "author_id": "uid",
  "author_name": "John",
  "author_avatar_url": "https://...",
  "content": "Check out my leg day!",
  "content_length": 24,
  "media": [
    {
      "type": "image",
      "storage_url": "gs://betteru.../post_123_img_0.jpg",
      "order": 0
    }
  ],
  "linked_content": {
    "type": "workout" | "nutrition" | "achievement",
    "target_id": "workout_xyz",
    "title": "Leg Day 2024-04-05",
    "preview": { ... }
  },
  "visibility": "followers" | "public",
  "like_count": 42,
  "comment_count": 7,
  "liked_by": ["uid1", "uid2", ...],
  "status": "published" | "draft" | "flagged" | "removed",
  "created_at": timestamp,
  "updated_at": timestamp,
  "flagged_reason": "spam" | "inappropriate" | null,
  "flagged_count": 2,
  "mod_reviewed": false,
  "mod_approved": null
}
```

### Community Follows

`community_follows/{followId}`

```json
{
  "follower_id": "uid_a",
  "following_id": "uid_b",
  "created_at": timestamp,
  "is_muted": false,
  "is_blocked": false
}
```

### User Blocks & Mutes

`user_blocks/{blockId}`

```json
{
  "blocker_id": "uid_a",
  "blocked_id": "uid_b",
  "created_at": timestamp,
  "reason": "user_input" | "auto_spam"
}
```

`user_mutes/{muteId}`

```json
{
  "muter_id": "uid_a",
  "muted_id": "uid_b",
  "created_at": timestamp
}
```

### Community Comments

`community_posts/{postId}/comments/{commentId}`

```json
{
  "author_id": "uid",
  "author_name": "Jane",
  "author_avatar_url": "https://...",
  "content": "Great workout!",
  "reply_to": "commentId_parent" | null,
  "like_count": 5,
  "created_at": timestamp,
  "status": "published" | "flagged" | "removed"
}
```

### Community Groups

`community_groups/{groupId}`

```json
{
  "creator_id": "uid",
  "name": "30-Day Squat Challenge",
  "description": "...",
  "avatar_url": "gs://betteru.../group_123.jpg",
  "challenge_type": "workout" | "nutrition" | "activity" | "streak",
  "challenge_config": {
    "goal": "30 squats",
    "target_value": 30,
    "unit": "count"
  },
  "membership": "open" | "invite_only",
  "visibility": "public" | "private",
  "member_count": 15,
  "created_at": timestamp,
  "started_at": timestamp,
  "ended_at": timestamp,
  "status": "active" | "ended"
}
```

### Group Members

`community_groups/{groupId}/members/{uid}`

```json
{
  "user_id": "uid",
  "joined_at": timestamp,
  "current_score": 25,
  "current_rank": 2,
  "last_activity": timestamp
}
```

### Challenge Participants (Authoritative Leaderboard)

`challenge_participants/{challengeId}/participants/{uid}`

```json
{
  "user_id": "uid",
  "group_id": "group_xyz",
  "score": 30,
  "rank": 1,
  "progress_history": [
    { "timestamp": ts1, "score": 5 },
    { "timestamp": ts2, "score": 12 }
  ],
  "trend": "up" | "down" | "stable",
  "completed": true,
  "completed_at": timestamp,
  "updated_at": timestamp
}
```

### User Reports

`content_reports/{reportId}`

```json
{
  "reporter_id": "uid",
  "reported_type": "post" | "comment" | "user",
  "reported_id": "target_id",
  "reason": "spam" | "harassment" | "inappropriate" | "other",
  "evidence_url": "gs://betteru.../report_evidence_123.jpg",
  "status": "pending" | "approved" | "dismissed",
  "created_at": timestamp,
  "reviewed_at": timestamp,
  "reviewer_id": "mod_uid"
}
```

### User Profile Extensions (Denormalized in profiles/{uid})

```json
{
  "follower_count": 42,
  "following_count": 18,
  "public_post_count": 7,
  "network_visibility": "public" | "private",
  "profile_visibility": "public" | "private",
  "age_verified": true,
  "last_post_at": timestamp
}
```

---

## Screens and Routes

- `app/(tabs)/community/index.tsx` (NEW) - Main feed (following + real-time updates)
- `app/(tabs)/community/discover.tsx` (NEW) - Discover tab (trending + suggested people)
- `app/(tabs)/community/[postId].tsx` (NEW) - Post detail (full content, threaded comments)
- `app/(tabs)/community/create-post.tsx` (NEW) - Create post flow
- `app/(tabs)/community/groups/index.tsx` (NEW) - User's groups list
- `app/(tabs)/community/groups/create.tsx` (NEW) - Create challenge group
- `app/(tabs)/community/groups/[id].tsx` (NEW) - Group detail + leaderboard
- `app/(tabs)/profile/index.tsx` (MODIFY) - User's own profile (posts + achievements + stats)
- `app/user/[id].tsx` (NEW) - Public profile (public posts + follow button)
- `app/settings/blocked-users.tsx` (NEW) - Manage blocks/mutes

## Components

`components/ui/` (shared)

- `FeedPost.tsx` - Post card (text + image carousel + linked content + like/comment actions)
- `CommentThread.tsx` - Nested comment display with replies
- `CommentInput.tsx` - Comment textinput + media picker
- `LikeButton.tsx` - Optimistic like with counter
- `FollowButton.tsx` - Follow/unfollow toggle + state
- `GroupCard.tsx` - Group preview (name + members + challenge type)
- `LeaderboardRow.tsx` - Rank + user + score + progress bar
- `PostCreationForm.tsx` - Main post editor (text + media + visibility toggle + linked content)
- `UserSuggestionCard.tsx` - User preview for discover (avatar + name + follow button)
- `ReportModal.tsx` - Report form (structured reason + evidence)

`components/community/` (specific)

- `FeedEmptyState.tsx` - "Follow someone to start" + suggestions
- `CommunityCounts.tsx` - Follower/following/post count display
- `LeaderboardHeader.tsx` - Challenge goal + progress + status
- `GroupCreateForm.tsx` - Multi-step group creation (name → type → dates → settings)

## Services

- `lib/community-feed.ts` (NEW) - Feed query + real-time listeners (top 100 posts)
- `lib/community-posts.ts` (NEW) - Create, comment, like, delete posts
- `lib/community-follows.ts` (NEW) - Follow, unfollow, block, mute logic
- `lib/community-groups.ts` (NEW) - Group CRUD + membership
- `lib/community-leaderboard.ts` (NEW) - Query leaderboard (read-only; writes via Cloud Function)
- `lib/community-notifications.ts` (NEW) - Notification preferences + tracking

## Stores

- `stores/community.store.ts` (NEW)
  - State: `feed`, `friendsList`, `currentUser`, `groups`, `leaderboard`
  - Actions: `loadFeed()`, `createPost()`, `likePost()`, `followUser()`, `joinGroup()`

- `stores/notifications.store.ts` (NEW)
  - State: `unreadNotifications`, `preferences`
  - Actions: `setPreference()`, `dismissNotification()`

---

## Screen Behavior

### Feed (`app/(tabs)/community/index.tsx`)

```
[Header: Community Feed]

[Pull-to-refresh indicator]

[Post 1]
  avatar | name | "2h ago"
  "Yesterday's leg day! 💪"
  [image carousel]
  [👍 42] [💬 7]

[Post 2]
  "Just finished 30-day challenge!"
  [achievement badge preview]
  [Video linked: "Strength Training #1"]
  [👍 15] [💬 2]

[Post 3 - empty state if no following]
  "No posts yet. Follow some friends!"
  [Suggested users carousel]
  [Discover →]

[∞ Infinite scroll continued...]

[Real-time like counter update visible]
```

### Post Detail (`app/(tabs)/community/[postId].tsx`)

```
[Full post content]
  [author profile]
  [post text + images fullscreen]
  [linked workout/achievement card clickable]

[Engagement section]
  [👍 42 likes] [💬 7 comments]

[Comments section]
  [Comment 1]
    John: "Awesome!"
    [Reply] [Like]
    [Reply 1 - nested]
      Jane: "Thanks John!"

  [Comment 2]
    Sarah: "How long did it take?"
    [Reply] [Like]

[Comment input box]
  [avatar] [textinput "Write a comment..."] [image button]
```

### Discover (`app/(tabs)/community/discover.tsx`)

Tab 1: **Trending Posts**

```
[Hot posts today]
  [Post 1 - Most liked]
  [Post 2 - Most commented]
```

Tab 2: **Suggested People**

```
[User cards - mutual followers]
  [avatar] [name] [follow button]
  [shared followers: "Followed by 3 friends"]
```

### Group Detail (`app/(tabs)/community/groups/[id].tsx`)

```
[Group header]
  [avatar] | "30-Day Squat Challenge"
  "Active challenge • Ends Apr 30" | [Members: 15]

[Challenge goal]
  [Progress bar] 25/30 squats

[Leaderboard]
  Rank | User | Score | Trend
  1    | John | 30    | ↑ (completed)
  2    | You  | 25    | → (stable)
  3    | Jane | 22    | ↓

[Members list]
  [invite button] [leave group]

[linked workouts]
  Recent workouts by members...
```

### Create Post (`app/(tabs)/community/create-post.tsx`)

```
[Step 1: Content]
  [avatar] [name]
  [textinput: 500 char limit with counter]
  [emoji picker button]

[Step 2: Media (optional)]
  [image picker] [+ Add image]
  [image carousel preview]

[Step 3: Linked content (optional)]
  [dropdown: Link workout / Link nutrition / Add badge]
  [preview card of linked content]

[Step 4: Visibility]
  [toggle: Followers only / Public]

[Buttons]
  [Draft] [Publish]

[If upload fails: Draft mode triggers]
  "Images failed to upload. Retry or continue?"
  [Retry] [Save draft]
```

### Create Group (`app/(tabs)/community/groups/create.tsx`)

**Step 1: Basic Info**

```
[Name input]
[Description textarea]
[Avatar picker]
```

**Step 2: Challenge Type**

```
Workout | Nutrition | Activity | Streak
```

**Step 3: Goal & Dates**

```
[Goal input: "30 workouts" / "50g protein daily"]
[Start date] [End date]
```

**Step 4: Settings**

```
Membership: [Open join] [Invite only]
Visibility: [Public] [Private]
```

**[Create]**

---

## Implementation Phases (12 Sequential)

### Phase A - Data Foundation & Profile

1. Update `profiles/{uid}`:
   - Add follower_count, following_count, public_post_count (denormalized)
   - Add network_visibility, profile_visibility, age_verified

2. Create Firestore collections:
   - `community_posts/{postId}` - Posts schema
   - `community_follows/{followId}` - Follow relationships
   - `user_blocks/{blockId}` - Blocks
   - `user_mutes/{muteId}` - Mutes

3. Create indexes:
   - posts by created_at (feed sorting)
   - posts by author_id (user posts)
   - follows by follower_id (who's following)

### Phase B - Follow & Block System

1. Build `lib/community-follows.ts`:
   - `followUser(uid, targetUid)` - add to collection, increment counter
   - `unfollowUser(uid, targetUid)` - remove, decrement
   - `blockUser(uid, targetUid)` - add block
   - `unblockUser(uid, targetUid)` - remove block
   - `muteUser(uid, targetUid)` - add mute
   - `unmuteUser(uid, targetUid)` - remove mute
   - `getFollowingList(uid)` - query all following
   - `getFollowersList(uid)` - query all followers

2. Security rules: Can follow anyone, can block anyone, view follows only if network_visibility = public

### Phase C - Post Management

1. Build `lib/community-posts.ts`:
   - `createPost(content, media, linkedContent, visibility)` - create + upload media to Storage
   - `likePost(postId, uid)` - add uid to liked_by, increment counter
   - `unlikePost(postId, uid)` - remove, decrement
   - `deletePost(postId)` - soft delete (mark as removed, keep history)
   - `reportPost(postId, reason, evidence)` - create report + flag post
   - `getPostsByAuthor(uid)` - query user's posts

2. Draft handling: If media upload fails, save post draft to local AsyncStorage + show notification

### Phase D - Feed & Real-time

1. Build `lib/community-feed.ts`:
   - `loadFeed(uid)` - query posts from following + filter blocks/mutes
   - `setupFeedListener(uid)` - real-time listener (top 100 posts, counters only)
   - `loadDiscover(uid)` - trending posts + suggested people
   - Implement real-time like/comment counters

2. Set up Firestore listeners:
   - listener on `community_posts` with limit 100, orderBy created_at desc
   - listener on likes/comments collections for counters

### Phase E - Post Detail & Comments

1. Build post detail screen (`app/(tabs)/community/[postId].tsx`):
   - Display full post + linked content (clickable)
   - Show comments with threading (replies nested)
   - Optimistic like button (update instant)

2. Comment system:
   - `createComment(postId, content, parentCommentId?)` - write to subcollection
   - `deleteComment(commentId)` - soft delete
   - `getComments(postId)` - load all with threading
   - Display depth limit (max 3 levels for UI performance)

### Phase F - Profile Screens

1. Build user's own profile (`app/(tabs)/profile/index.tsx`):
   - Display avatar, bio, follower/following counts, streak, XP
   - Tabs: Posts, Achievements, Stats
   - Edit button for user's own profile
   - Denormalized counters from profiles/{uid}

2. Build public profile (`app/user/[id].tsx`):
   - Same layout but with Follow button instead of Edit
   - Block/report button in menu

3. Privacy: Respect network_visibility and profile_visibility settings

### Phase G - Groups & Leaderboards

1. Build `lib/community-groups.ts`:
   - `createGroup(name, challenge_type, goal, dates, settings)` - create group
   - `joinGroup(groupId, uid)` - add member
   - `leaveGroup(groupId, uid)` - remove member
   - `getGroupMembers(groupId)` - query members
   - `getLeaderboard(groupId)` - read from challenge_participants (Cloud Function authority)

2. Create group screens:
   - `app/(tabs)/community/groups/index.tsx` - list user's groups
   - `app/(tabs)/community/groups/create.tsx` - multi-step group creation
   - `app/(tabs)/community/groups/[id].tsx` - group detail + leaderboard

3. Cloud Function: On workout/nutrition completion, update challenge_participants collection with new rank

### Phase H - Discover & Suggestions

1. Build discover screen:
   - Tab 1: Trending posts (most liked today)
   - Tab 2: Suggested people (mutual followers)
   - Search functionality (search users)

2. Suggested people logic:
   - Query users that user is NOT following
   - Sort by mutual followers (users followed by user's followers)
   - Top 12 suggestions

### Phase I - Notifications

1. Build `lib/community-notifications.ts`:
   - `onLikeNotification(postId, likerUid)` - trigger
   - `onCommentNotification(commentId, uid)` - trigger
   - `onFollowNotification(followerUid)` - trigger
   - Batch notifications hourly (5 people liked → 1 push)

2. Firestore collection: `notifications/{uid}/events/{eventId}`

3. Cloud Messaging: Set up FCM for push notifications

### Phase J - Moderation & Reporting

1. Build reporting UI:
   - Modal with structured form (reason dropdown + evidence upload)
   - Report post / comment / user

2. Create reports collection:
   - `content_reports/{reportId}` with status tracking

3. Mod dashboard (future): ability to review, approve/dismiss reports

### Phase K - Real-time Optimization

1. Listener management:
   - Subscribe to top 100 posts only (not unlimited)
   - Unsubscribe when unmounting screen
   - Implement listener pooling to avoid duplicate subscriptions

2. Test performance:
   - Monitor active listeners count
   - Optimize query performance with indexes

### Phase L - Polish & Compliance

1. Age verification: Add age check on signup (GDPR)
2. Privacy settings: Export user data, delete account flow
3. Block/mute management: Settings screen to view/manage
4. Content moderation: Flag posts on strict approval (manual mod review)
5. Accessibility: Labels, hit areas, focus management

---

## Verification Checkpoints

### Phase A-C

- [ ] Post created, appears in Firestore
- [ ] Like count increments
- [ ] Follow/unfollow works; counts update
- [ ] Block/mute functional

### Phase D-E

- [ ] Feed loads posts from following only
- [ ] Real-time like counter updates instantly
- [ ] Comments with threads display correctly
- [ ] Optimistic like works (instant UI update)

### Phase F-G

- [ ] User profile displays follower/following counts
- [ ] Group created, members can join
- [ ] Leaderboard displays correct rank + score (from Cloud Function)
- [ ] Challenge participants update when workout completed

### Phase H-L

- [ ] Discover shows trending posts + suggested people
- [ ] Notifications sent (likes, comments, follows)
- [ ] Reports submitted and stored
- [ ] Privacy settings functional (export, delete)

---

## Acceptance Criteria

- ✅ User can create, like, comment on posts
- ✅ Feed shows posts from followed users only
- ✅ Follow/unfollow changes visible feed
- ✅ Can create challenge group + join
- ✅ Leaderboard displays correct rank (from Cloud Function, not client)
- ✅ Threaded comments display with nesting
- ✅ Notifications sent for likes, comments, follows
- ✅ Report system functional; reports stored
- ✅ Block/mute hide posts effectively
- ✅ Privacy settings enforced (network visibility, profile visibility)
- ✅ Age verified on signup; GDPR-compliant

---

## Constraints

- Client must **NEVER** be source of truth for leaderboard ranks
- No unlimited real-time listeners; cap at 100 posts per feed
- All posts require content moderation review before publishing (strict approval)
- Blocked posts must be hidden (not just de-ranked)
- Comments must be threaded (not flat) for UX
- Posts soft-deleted, never hard-deleted (history preservation)
- No live streaming in MVP (future only)

---

## Open Questions & Recommendations

1. **Trending algorithm:**
   - Simple: most liked today, or weighted by recency + engagement?
   - **Recommendation:** Most liked today for MVP; upgrade to weighted later

2. **Community moderation scale:**
   - Can scale to 1000+ users with community voting + escalation model?
   - **Recommendation:** Start with manual mod review; scale via community voting if growth warrants

3. **Group limits:**
   - Max groups per user? Max members per group?
   - **Recommendation:** No hard limit in MVP; monitor performance

4. **Challenges cross-framework:**
   - Can user in "30-day squat" also participate in "nutrition macro" challenge simultaneously?
   - **Recommendation:** YES; users can join multiple groups

5. **Cosmetic rewards accuracy:**
   - Badges/avatars should reflect actual rank or just visual?
   - **Recommendation:** Reflect actual rank; pulled from leaderboard in real-time
