# Community - HuGoal

## Visão Geral

O sistema de Comunidade do HuGoal permite/social entre usuários com:
- Feed de posts
- Grupos e desafios
- Check-ins
- Leaderboard
- Follow/unfollow
- Sistema de moderação

---

## Estrutura de Pastas

```
lib/
├── community-feed.ts        # Feed de posts
├── community-posts.ts       # Operações de posts
├── community-groups.ts      # Grupos
├── community-checkins.ts    # Check-ins
├── community-follows.ts   # Seguidores
├── community-leaderboard.ts
├── community-time.ts
├── community-posts.ts

stores/
├── community.store.ts

components/community/
├── FeedPost.tsx
├── FeedEmptyState.tsx
├── GroupsList.tsx
├── GroupCard.tsx
├── CheckInCard.tsx
├── LikeButton.tsx
├── FollowButton.tsx
├── LeaderboardRow.tsx
├── NewPostCard.tsx
├── UserSuggestionCard.tsx
```

---

## Tipos de Dados

### CommunityPost

```typescript
interface CommunityPost {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar_url?: string;
  content: string;
  content_length: number;
  media: PostMedia[];
  linked_content?: {
    type: "workout" | "nutrition" | "achievement";
    target_id: string;
    title: string;
  };
  visibility: "public" | "followers";
  like_count: number;
  comment_count: number;
  liked_by: string[];
  status: "published" | "draft" | "flagged" | "removed";
  created_at: string;
}
```

### PostMedia

```typescript
interface PostMedia {
  type: "image";
  storage_url: string;
  order: number;
}
```

### CommunityGroup

```typescript
interface CommunityGroup {
  id: string;
  creator_id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  challenge_type: "workout" | "nutrition" | "activity" | "streak";
  challenge_config: {
    goal: string;
    target_value: number;
    unit: string;
  };
  membership: "open" | "invite_only";
  visibility: "public" | "private";
  member_count: number;
  status: "active" | "ended";
}
```

### GroupCheckIn

```typescript
interface GroupCheckIn {
  id: string;
  group_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  challenge_type: ChallengeType;
  metric_value: number;
  metric_unit: string;
  notes?: string;
  media?: {
    storage_url: string;
    width?: number;
    height?: number;
    taken_at?: string;
  }[];
  like_count: number;
  comment_count: number;
  checked_in_at: string;
  date: string; // YYYY-MM-DD
}
```

### ChallengeParticipant

```typescript
interface ChallengeParticipant {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  group_id: string;
  score: number;
  rank: number;
  trend: "up" | "down" | "stable";
  completed: boolean;
  progress_history: Array<{ timestamp: string; score: number }>;
}
```

---

## Community Store

### Arquivo: `stores/community.store.ts`

#### Estado

```typescript
interface CommunityState {
  // Feed
  feed: CommunityPost[];
  feedLoading: boolean;
  feedFromCache: boolean;

  // Groups
  groups: CommunityGroup[];
  groupsLoading: boolean;

  // Check-ins
  checkIns: Record<string, GroupCheckIn[]>;
  todayCheckIn: Record<string, GroupCheckIn | null>;

  // Leaderboard
  leaderboards: Record<string, ChallengeParticipant[]>;

  // Social
  followingIds: string[];
  blockedIds: string[];
  mutedIds: string[];
}
```

---

## Feed

### Carregar Feed

```typescript
import { useCommunityStore } from "@/stores/community.store";

// Carregar feed do usuário
await useCommunityStore.getState().loadFeed(userId);

// Feed discovery (pessoas para seguir)
const { discoverPosts, suggestedPeople } = useCommunityStore();
```

### Posts

```typescript
// Criar post
await createPost({
  content: "Meu progresso hoje!",
  media: [],
  visibility: "public"
});

// Like/unlike
await likePost(postId);
await unlikePost(postId);

// Deletar
await deletePost(postId);
```

### UI

```typescript
import { FeedPost } from "@/components/community/FeedPost";

<FeedPost
  post={post}
  onLike={() => likePost(post.id)}
  onComment={() => navigate(`/community/${post.id}`)}
  onShare={() => sharePost(post.id)}
/>
```

---

## Grupos

### Operações

```typescript
// Criar grupo
const group = await createGroup({
  name: "Desafio Perda de Peso",
  description: "Vamos perder juntos!",
  challenge_type: "nutrition",
  challenge_config: { goal: "Peso", target_value: 5, unit: "kg" },
  visibility: "public",
  membership: "open"
});

// Entrar/sair
await joinGroup(groupId);
await leaveGroup(groupId);

// Deletar (criador)
await deleteGroup(groupId);
```

### UI

```typescript
import { GroupCard } from "@/components/community/GroupCard";

<GroupCard
  group={group}
  onPress={() => navigate(`/community/groups/${group.id}`)}
/>

import { GroupsList } from "@/components/community/GroupsList";

<GroupsList
  groups={groups}
  onJoin={joinGroup}
  onLeave={leaveGroup}
/>
```

---

## Check-ins

### Criar Check-in

```typescript
await createCheckIn({
  group_id: groupId,
  metric_value: 80, // kg
  metric_unit: "kg",
  notes: "Peso de hoje",
  media: [photoUri] // opcional
});
```

### Buscar Check-ins

```typescript
// Do grupo
const checkIns = await getGroupCheckIns(groupId);

// De hoje
const today = await getTodayCheckIn(groupId);
```

### UI

```typescript
import { CheckInCard } from "@/components/community/CheckInCard";

<CheckInCard
  checkIn={checkIn}
  onLike={() => likeCheckIn(checkIn.id)}
/>
```

---

## Leaderboard

### Buscar

```typescript
import { getLeaderboard } from "@/lib/community-leaderboard";

const participants = await getLeaderboard(groupId);
// Retorna ordenado por score
```

### UI

```typescript
import { LeaderboardRow } from "@/components/community/LeaderboardRow";

<LeaderboardRow
  participant={participant}
  rank={index + 1}
/>
```

---

## Seguidores (Follow)

### Operações

```typescript
// Follow/unfollow
await followUser(userId);
await unfollowUser(userId);

// Bloquear/desbloquear
await blockUser(userId);
await unblockUser(userId);

// Silenciar
await muteUser(userId);
await unmuteUser(userId);

// Buscar IDs
const following = await getFollowingIds(userId);
const blocked = await getBlockedUserIds(userId);
const muted = await getMutedUserIds(userId);
```

### UI

```typescript
import { FollowButton } from "@/components/community/FollowButton";

<FollowButton
  userId={userId}
  isFollowing={followingIds.includes(userId)}
  onFollow={() => followUser(userId)}
  onUnfollow={() => unfollowUser(userId)}
/>
```

---

## Moderação

### Flags

Postagens podem ser sinalizadas:

```typescript
interface ContentReport {
  id: string;
  reporter_id: string;
  reported_type: "post" | "comment" | "user";
  reported_id: string;
  reason: "spam" | "harassment" | "inappropriate" | "other";
  evidence_url?: string;
  status: "pending" | "approved" | "dismissed";
}
```

### Status de Post

```typescript
type PostStatus = "published" | "draft" | "flagged" | "removed";
```

O sistema marca posts como "flagged" automaticamente se:
- Muitas sinalizações
- Conteúdo impróprio detectado
- Usuários bloquados

---

## Rotas

| Rota | Arquivo | Descrição |
|------|--------|-----------|
| `/community` | `index.tsx` | Feed principal |
| `/community/discover` | `discover.tsx` | Descobrir posts |
| `/community/create-post` | `create-post.tsx` | Criar post |
| `/community/[postId]` | `[postId].tsx` | Detalhes post |
| `/community/groups` | `groups/index.tsx` | Lista de grupos |
| `/community/groups/create` | `groups/create.tsx` | Criar grupo |
| `/community/groups/[id]` | `groups/[id].tsx` | Detalhes grupo |
| `/community/groups/[id]/edit` | `groups/edit/[id].tsx` | Editar grupo |
| `/community/groups/check-in/[groupId]` | `groups/check-in/[groupId].tsx` | Check-in |

---

## Notificações

```typescript
interface CommunityNotification {
  id: string;
  user_id: string;
  type: "like" | "comment" | "follow" | "group_invite" | "challenge_started";
  actor_id: string;
  actor_name: string;
  target_id?: string;
  target_type?: "post" | "group";
  read: boolean;
  created_at: string;
}
```

---

## Firestore

```
community/
├── posts/{postId}          # CommunityPost
├── comments/{commentId}      # CommunityComment
├── groups/{groupId}        # CommunityGroup
├── checkins/{checkInId}    # GroupCheckIn

users/{userId}/
├── following/{uid}        # CommunityFollow
├── followers/{uid}
├── blocked/{uid}         # UserBlock
├── muted/{uid}           # UserMute
├── reports/{reportId}     # ContentReport
```

---

## Boas Práticas

### 1. Visibility

- **Public**: Todos podem ver
- **Followers**: Apenas seguidores

### 2. Check-in Frequency

Limitar 1 check-in por dia por grupo:

```typescript
// Verificar se já fez check-in hoje
const today = await getTodayCheckIn(groupId);
if (today) {
  // Já fez check-in, mostrar/edtar
}
```

### 3. Group Limits

- Máximo 3 perfis de localização por usuário
- Líderes de grupo podem editar

---

## Próximas Funcionalidades

- **Direct Messages**: Mensagens diretas
- **Stories**: Stories temporários
- **Live Streaming**: Transmissão ao vivo
- **Events**: Eventos comunitarios

---

**Última Atualização**: 2026-04-24