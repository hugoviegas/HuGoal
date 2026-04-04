# Phase 07 - Community

## Suggested specialization

Community agent.

## Objective

Deliver the social layer: posts, follows, feed discovery, groups, public profiles, and challenge leaderboards.

## Current Starting Point

- Community types already exist.
- No community screens, post flows, or group screens exist yet.

## Screens and Routes

- `app/(tabs)/community/index.tsx` for the main feed.
- `app/(tabs)/community/discover.tsx` for discovery and suggestions.
- `app/(tabs)/community/[postId].tsx` for post detail and comments.
- `app/(tabs)/community/groups/index.tsx` for the user's groups.
- `app/(tabs)/community/groups/create.tsx` for creating a challenge group.
- `app/(tabs)/community/groups/[id].tsx` for group detail and leaderboard.
- `app/(tabs)/profile/index.tsx` for the user's own social profile.
- `app/user/[id].tsx` for public profiles.

## Step-by-Step Work

1. Build the feed and discover screens.
2. Add post detail, comments, and create-post flows.
3. Add follow and unfollow data flows.
4. Build groups list, create group, and group detail screens.
5. Add a leaderboard view for challenge participants.
6. Use Firestore listeners for real-time feed updates.
7. Keep leaderboard authority on server-side logic or Cloud Functions instead of client-side math.

## Screen Behavior

### Feed

- Show posts from followed users and public content in a timeline.
- Support text, images, shared workout links, and shared diet links.
- Show like count, comment count, author info, and visibility state.
- Add pull-to-refresh and pagination so the feed stays responsive.
- If there are no followed users, show discovery suggestions instead of an empty dead end.

### Discover

- Show suggested people, trending posts, and highlighted groups.
- Provide a search entry for users or content.
- Encourage the user to follow people or join a group.

### Post Detail

- Show the full post content, comments, image viewer, and linked workout/diet cards.
- Allow commenting, liking, and navigating to the author profile.
- If post media is missing, keep the text content visible.

### Groups

- The group list should show active groups, challenge type, dates, and progress.
- Group creation should ask for name, description, avatar, challenge type, goal, start and end dates, and whether the challenge is open or invite-based.
- Group detail should show the leaderboard, members, challenge goal, progress, and the current status of the challenge.

### Profiles

- The user's own profile should show avatar, bio, follower count, following count, streak, XP, recent posts, and a clear edit action.
- Public profiles should show the same social summary but with a follow button instead of edit actions.
- Profiles should link to achievements and recent public posts.

## Behavior Rules

- Likes and comment counts should update in real time where possible, but the client should not be the source of truth for challenge rankings.
- Posts should be draft-first if media upload fails; the app should keep the typed text and retry the upload.
- If a post has a linked workout or diet, the card should surface a preview so the relationship is obvious.
- If a group has no members yet, show a join or invite prompt rather than an empty leaderboard.
- If a profile has no public posts, show the latest workouts or a friendly empty state with a follow CTA.

## Data and Storage

- `community_posts` stores author, content, media, linked workout or diet, counts, visibility, and timestamps.
- `community_follows` stores follower and following relationships.
- `community_groups` stores challenge metadata, member list, and status.
- `challenge_participants` stores the authoritative progress and rank state.
- Firebase Storage should hold post images and group avatars.
- Recommended profile denormalizations: follower count, following count, and public post count for fast profile rendering.

## Configuration Questions

- Is the default post visibility followers-only or public? Recommendation: followers-only with a public toggle.
- Are groups open join or invite-only in MVP? Recommendation: open join for MVP, with invite-only as a future enhancement.
- Should likes be optimistic in the UI? Recommendation: yes, with server reconciliation.
- Should the app support comments on group challenges, or only on posts? Recommendation: support comments on posts first, then extend if needed.
- Which profile counters should be denormalized in Firestore for speed? Recommendation: follower count, following count, and public post count.

## Deliverables

- A working community feed.
- Follow and group flows.
- Challenge leaderboard UI.
- Public and private profile surfaces that reflect social activity.

## Acceptance Criteria

- A post appears in the feed after creation.
- Follow state affects the visible feed or discover data.
- Group and leaderboard screens render from Firestore data.
- Public profiles expose follower/following counts and user posts.

## Constraints

- Do not make the client the source of truth for challenge rankings.
- Keep real-time subscriptions scoped so they do not overfetch.
