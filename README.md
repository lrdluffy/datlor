# Datlor — Identity + Core Messaging + Media Platform

Four sprints implemented against `SD_PROJ.pdf`:

**Sprint 1 — identity-service** (auth foundation)

| # | Item |
|---|------|
| 1 | Design & migrate core DB schema (`users`, `profiles`, `refresh_tokens`) |
| 2 | US-01 — User registration (email + password) |
| 3 | US-02 — User login with email/password |
| 4 | JWT access/refresh token flow |

**Sprint 2 — core-service** (real-time channels)

| # | Item |
|---|------|
| 1 | Design & migrate channel schema (`channels`, `channel_members`, `channel_topics`) |
| 2 | US-09 — Create channel + migrate messaging schema (`messages`, `search_outbox`) |
| 3 | US-04 — Send message in a public channel |
| 4 | US-05 — View channel messages in real time |
| 5 | US-10 — Channel settings screen (member list & roles) |
| 6 | US-11 — Assign channel member roles (owner/manager/moderator/member) |
| 7 | US-12 — Block/restrict a channel member |
| 8 | US-13 — Delete channel |

**Sprint 3 — topic-aware messaging** (messages MAY belong to a channel topic)

- `messages.topic_id` (nullable, FK → `channel_topics.id`, `ON DELETE SET NULL`) + `(chat_id, topic_id)` index
- Sending with or without a topic is both always allowed; a non-null `topicId` is validated server-side to belong to the same channel
- New STOMP destination `/topic/channels/{channelId}/topics/{topicId}` — a topic-tagged message is broadcast there **in addition to** the existing channel-wide `/topic/channels/{channelId}` stream
- REST history gained an optional `topicId` filter (`none` = messages with no topic)
- Frontend: per-topic filtered views, each independently paginated, plus a topic selector that also determines which topic a new message is sent to

**Sprint 4 — media, scheduling, groups, and profile/privacy**

| # | Item |
|---|------|
| 1 | Design & migrate media schema (`media_files`) (media-service) |
| 2 | US-18 — Attach media to a message (media-service & core-service) |
| 3 | US-19 — Schedule a message for later delivery (core-service) |
| 4 | Design & migrate group schema (`groups`, `group_members`, `group_invites`) (core-service) |
| 5 | Implement group creation & invitations (core-service) |
| 6 | US-15 — Edit user profile (identity-service) |
| 7 | US-17 — Privacy setting: allow direct group add toggle (identity-service & core-service) |

`media-service` is now a fully implemented microservice (see section 2 below)
rather than an empty scaffold.

**Sprint 5 — edit & delete a sent message**

- US-20 — Edit a sent message: only the original sender may edit their own message (`messages.edited` flips to `true`)
- US-21 — Delete a sent message: the sender OR a channel admin/moderator (MODERATOR+) / group ADMIN may delete it (soft delete, `messages.deleted_at`)
- Both are real-time, multi-party STOMP actions (`/app/messages.edit`, `/app/messages.delete`, and the group equivalents) broadcasting `MESSAGE_UPDATED`/`MESSAGE_DELETED` — never exposed over REST, same as sending a message
- Closes the gap the "Known simplifications" section used to call out: creating a topic beyond the default `"معرفی"` one seeded at channel creation is now exposed
- Any member with access (ACTIVE status — the same threshold `MembershipService.requireCanSend` already uses to allow sending a message) may create one; topic names must be unique per channel (enforced by the DB's pre-existing `UNIQUE(channel_id, name)` constraint from V1, with a clean `ValidationException` pre-check)
- Real-time STOMP action (`/app/channels.topics.create`), broadcasting `TOPIC_CREATED` to `/topic/channels/{channelId}/members` — the same "channel structural changes" stream already used for `MEMBER_JOINED`/`MEMBER_ROLE_UPDATED`/`MEMBER_STATUS_UPDATED`/`CHANNEL_DELETED` — so a topic pill appears live for every other member currently viewing the channel, unlike `channels.create` itself (unicast-only, since nobody is subscribed to a channel that didn't exist a moment ago)
- Renaming/deleting a topic remains out of scope — only creation was requested
- Every member of a channel or group can filter that chat's own message history down to messages containing a query string, case-insensitively — `GET /api/channels/{channelId}/messages/search?q=...` and the group-equivalent `GET /api/groups/{groupId}/messages/search?q=...`
- Modeled as a plain REST read (same non-realtime reasoning `getHistory` already uses — see `ChannelRestController`'s class javadoc), with the same cursor-pagination shape (`before`/`limit`) as message history, so results can be paged through
- No full-text search index exists (`search_outbox` remains an unconsumed transactional outbox for a future indexing consumer - see section 8) — this is a case-insensitive substring (`LIKE`) scan over `messages.content`, mirroring `ChannelRepository.searchActiveChannels`'s existing pattern exactly rather than introducing new search infrastructure
- Not topic-scoped (a channel search spans every topic and no-topic messages together) and excludes soft-deleted messages, same as history
- Same permission tier as reading history (any member, including RESTRICTED ones — search is a read, not gated by the ACTIVE-only threshold sending a message requires)
- Frontend: a collapsible search bar in the channel/group header switches the message pane to a dedicated, read-only search-results view (query-highlighted, newest-first, paginated) — separate from the live chat's `MessageList`, since browsing search hits isn't the same interaction as following a live thread

---

## 1. Architecture at a glance

```
frontend (React + TS)
  ├─ REST  (axios)  ──────────► identity-service  :8081  (register/login/refresh/logout, profile edit, privacy toggle)
  ├─ REST  (axios)  ──────────► core-service :8082  (channel/group/member/history reads, delete channel, invites, direct-add)
  ├─ REST  (axios)  ──────────► media-service :8083  (file upload, metadata, content download)
  └─ STOMP over WS  ──────────► core-service :8082  /ws/connect
                                   authenticated via the JWT access token
                                   issued by identity-service (shared secret)

core-service also calls, service-to-service, over plain HTTP + a shared
X-Internal-Api-Key header (never through either service's database):
  ├─ core-service ──► identity-service  GET /internal/profiles/{userId}/privacy   (US-17)
  └─ core-service ──► media-service     GET /internal/media/{mediaId}/exists      (US-18)
```

**Why the split:** REST is used only for non-realtime reads/administrative
actions (deleting a channel, creating a group, sending/accepting/rejecting an
invite, editing a profile, uploading a file). Creating a channel, sending a
message (immediate or scheduled), changing a role, and blocking/restricting a
member are all real-time, multi-party events — every other member's screen
needs to update the instant one of these happens — so they flow exclusively
through STOMP `/app/**` destinations and are broadcast back out on
`/topic/channels/**` or `/topic/groups/**`. No REST endpoint exists for any
of those actions.

All three services validate the *same* HS256 JWT secret (`JWT_SECRET`), but
only identity-service ever signs a token; core-service's and media-service's
`JwtTokenValidator` classes are verification-only. Separately, the three
services also share an `INTERNAL_API_KEY` used **only** to guard the
`/internal/**` endpoints they call on each other (never a user-facing
surface) — see section 3.

---

## 2. Analysis & implementation notes

### Channel schema (`channels`, `channel_members`, `channel_topics`)
- `channels`: UUID PK, `name`, `description`, `created_by` (logical ref to
  identity-service's `users.id` — no cross-DB FK), `deleted_at` for the
  soft-delete used by US-13.
- `channel_members`: composite PK `(channel_id, user_id)` — this doubles as
  the required `unique(channel_id, user_id)` constraint. Carries `role`
  (`OWNER`/`MANAGER`/`MODERATOR`/`MEMBER`) and `status`
  (`ACTIVE`/`RESTRICTED`/`BLOCKED`) as separate columns, plus the ERD's
  `media_allowed` flag. Indexed on `user_id`.
- `channel_topics`: seeded with one default "معرفی" topic per new channel
  (matches the wireframe's `# معرفی` tag); unique on `(channel_id, name)`.

### Messaging schema (`messages`, `search_outbox`)
- `messages`: generic `chat_type`/`chat_id` pair (only `CHANNEL` is produced
  today, but the same table can carry `DM` messages later without a
  migration). `media_id` is a logical reference to media-service's
  `media_files` — different service, different database, so no FK. A DB
  trigger keeps `content_tsv` in sync for full-text search. Composite index
  on `(chat_id, created_at DESC)` serves the history-pagination query.
- `search_outbox`: **transactional outbox pattern** — every message
  insert writes a matching outbox row in the *same* DB transaction
  (`MessageServiceImpl.sendMessage`), so a future search-indexing consumer
  can safely poll `processed = false` without ever missing or double
  -processing an event.

### US-09 — Create channel
STOMP `SEND /app/channels.create` → `ChannelWebSocketController.createChannel`
→ `ChannelService.createChannel` (creates the channel, adds the caller as
`OWNER`, seeds the default topic) → replied to the creator only, on
`/user/queue/channels`, since nobody else is subscribed to a channel that
didn't exist a second ago. Other users see it next time they load
`ChannelListPage` (REST `GET /api/channels`).

### US-04 — Send message in a public channel
STOMP `SEND /app/messages.send` → validates the sender is an `ACTIVE`
member (`MembershipService.requireCanSend`) → persists `Message` +
`SearchOutbox` row → broadcasts a `MESSAGE_NEW` event to
`/topic/channels/{channelId}` (and, if the message carries a `topicId`,
*also* to `/topic/channels/{channelId}/topics/{topicId}` — see
"Topic-aware messaging" below). **Never available over REST** — this is
the one rule the spec is strictest about.

### US-05 — View channel messages in real time
Two halves, by design: history is a REST `GET
/api/channels/{id}/messages?before=&limit=` (cursor pagination, newest
page first) loaded once when a user opens a channel; everything after that
arrives live via the `/topic/channels/{channelId}` subscription opened at
the same time. `useChannelSession` (frontend) stitches the two together
into one ordered, ever-growing message list — now one per topic bucket,
see below.

### Topic-aware messaging
A message MAY belong to one of its channel's topics — this is a
first-class dimension through every layer, not a decoration:

- **DB**: `messages.topic_id` (nullable, FK → `channel_topics.id`,
  `ON DELETE SET NULL` so a deleted topic's messages fall back to the
  no-topic bucket instead of being destroyed), indexed on `(chat_id, topic_id)`.
- **Validation**: `MessageServiceImpl.resolveTopic` rejects a `topicId`
  that doesn't exist or belongs to a *different* channel
  (`InvalidTopicException`, mapped to `400`/`VALIDATION_ERROR` on REST/WS
  respectively). A topic never overrides channel permissions — the exact
  same `requireCanSend` (ACTIVE-membership) check runs regardless of
  whether the message is topic-tagged.
- **WS broadcast**: every message goes to the channel-wide
  `/topic/channels/{channelId}` stream ("all messages"); a topic-tagged
  message is *additionally* broadcast to
  `/topic/channels/{channelId}/topics/{topicId}` (filtered). Since the
  frontend can legitimately be subscribed to both at once, it de-duplicates
  incoming messages by `id`.
- **REST history**: `GET /api/channels/{id}/messages` gained an optional
  `topicId` param — omitted (unfiltered), a topic's UUID (that topic only),
  or the literal `none` (only messages with no topic). Each of these three
  views is paginated completely independently (`MessageRepository
  .findTopicHistoryPage`; the two spec-required finders,
  `findByChatIdAndTopicId`/`findByChatIdAndTopicIdIsNull`, are also
  available as simpler, unpaginated queries).
- **Frontend**: `useChannelSession` keeps one independently-paginated
  "bucket" per view (`All`, `no topic`, and one per real topic); switching
  `selectedTopicId` via the new `TopicSelector` component swaps which
  bucket is rendered *and* which topic newly sent messages are tagged
  with. `MessageList` shows a small `#topic-name` tag per message in the
  unfiltered view (redundant once already filtered to one topic).

### US-10 — Channel settings screen (member list & roles)
`GET /api/channels/{id}` (or the dedicated `GET
/api/channels/{id}/members`) loads the roster; `ChannelSettingsPage` renders
it via `RoleManagementPanel`, which also subscribes to
`/topic/channels/{channelId}/members` so role/status changes made by anyone
(including other admins acting concurrently) appear live.

### US-11 — Assign channel member roles
STOMP `SEND /app/channels.updateRole` → `MembershipService.updateRole`
enforces, in order: you cannot change your own role; the `OWNER`'s role can
never be changed; only `OWNER` may grant/revoke `MANAGER`; only `OWNER` or
`MANAGER` may assign a role at all; the actor must strictly outrank the
target's *current* role (so a `MANAGER` cannot touch another `MANAGER`).
Broadcasts `MEMBER_ROLE_UPDATED` to `/topic/channels/{channelId}/members`.

### US-12 — Block/restrict a channel member
STOMP `SEND /app/channels.blockMember` with `newStatus` ∈
`{ACTIVE, RESTRICTED, BLOCKED}` — the same handler lifts a
block/restriction by sending `ACTIVE`. `MembershipService.updateStatus`
requires the actor be `MODERATOR`+ and strictly outrank the target.
`RESTRICTED` members can still read (history + live feed, in every topic);
`BLOCKED` members are rejected even at the STOMP `SUBSCRIBE` stage by
`JwtChannelInterceptor` — for *any* of a channel's destinations, topic
-specific or not — so they stop receiving the channel's events immediately,
not just on their next send attempt. A topic never grants an exception to
this: blocked is blocked, in every topic and in the no-topic bucket alike.

### US-13 — Delete channel
Modeled as **REST**, not WS: `DELETE /api/channels/{id}` (`OWNER` only),
because it's a one-off administrative action rather than a live multi-party
event stream. It soft-deletes (`deleted_at`, message history is preserved
for audit) and then broadcasts a `CHANNEL_DELETED` event to both
`/topic/channels/{channelId}` and `/topic/channels/{channelId}/members` from
inside the service layer, so anyone currently viewing the channel is kicked
back to the channel list in real time even though the delete itself was
triggered over HTTP.

### Media schema (`media_files`) + US-18 — Attach media to a message
`media-service` owns exactly one table, `media_files` (`id`, `uploader_id`,
`file_url`, `file_type`, `size`, `created_at`), indexed on `uploader_id`.
`StorageService` is a small interface with one implementation today,
`LocalStorageServiceImpl`, which simulates an S3-like object store by
writing each upload to `{media.storage.root}/{mediaId}` on local disk —
swapping in a real S3/MinIO-backed implementation later touches only that
one class. **File bytes never enter core-service's or identity-service's
database**, only a `mediaId` (UUID) ever crosses a service boundary.

`POST /api/media` (multipart) uploads a file and returns its `MediaFileResponse`
(including `id`); `GET /api/media/{id}/content` streams the bytes back and is
deliberately left **public** (no JWT) so it can be dropped straight into an
`<img src>`/`<a href>`.

For US-18, `SendMessageRequest`/`GroupMessageRequest` both carry an optional
`mediaId`. Before persisting, `MessagePersistenceHelper` calls
`MediaServiceClient.mediaExists(mediaId)` — a service-to-service HTTP call to
media-service's `GET /internal/media/{id}/exists` (guarded by a shared
`X-Internal-Api-Key` header, not a user JWT) — and rejects the message with
`InvalidMediaException` if the file doesn't exist. **core-service never
queries media-service's database directly**; this HTTP call is the only
sanctioned way it learns whether a `mediaId` is real. The resulting
`MessageResponse.mediaId` flows through the same WebSocket broadcast as any
other message.

### US-19 — Schedule a message for later delivery
`messages` gained `scheduled_at` (nullable `TIMESTAMP`) and `status`
(`PENDING`/`SENT`, default `SENT`), with a partial index on `scheduled_at
WHERE status = 'PENDING'` so the dispatcher's polling query stays fast
regardless of how much `SENT` history piles up.

`SendMessageRequest`/`GroupMessageRequest` both carry an optional
`scheduledAt`. In `MessagePersistenceHelper.persist`, a future `scheduledAt`
persists the message as `PENDING` and — critically — `ChannelWebSocketController`/
`GroupWebSocketController` check the returned status and **do NOT broadcast
a `PENDING` message**; the sender instead gets a private
`MESSAGE_SCHEDULED` ack on `/user/queue/scheduled`. `ScheduledMessageDispatcher`
(`@Scheduled(fixedDelayString = "${scheduling.dispatcher.fixed-delay-ms}")`,
default every 5s) is the **only** place a scheduled message is ever
broadcast: it polls due `PENDING` rows, flips each to `SENT`, and publishes
a `MessageDispatchedEvent` — deliberately **inside** that same transaction.
A separate `MessageDispatchListener`, registered with
`@TransactionalEventListener(phase = AFTER_COMMIT)`, performs the actual
`SimpMessagingTemplate` broadcast only once that transaction has durably
committed, so a client can never see a `MESSAGE_NEW` event for a status
update that then failed to persist. From a receiving client's point of
view, a dispatched scheduled message is indistinguishable from one sent
immediately — it just arrived later.

### US-20/US-21 — Edit & delete a sent message
`messages` gained `deleted_at` (nullable `TIMESTAMP`, V6) alongside the
`edited` flag that already existed from V2 - the same soft-delete pattern
already used for `channels.deleted_at`: the row and its content are kept
for audit, only the read paths stop surfacing it once set.

Both actions are modeled as **STOMP**, not REST, same as sending a
message itself - editing/deleting is just as real-time and multi-party as
sending (every viewer's screen must update immediately), so
`/app/messages.edit` / `/app/messages.delete` (channels) and
`/app/groups.messages.edit` / `/app/groups.messages.delete` (groups) join
`/app/messages.send` / `/app/groups.messages.send` as the only ways to
mutate a message - there is still no REST endpoint for any message
mutation.

- **Edit**: `MessagePersistenceHelper.editMessage` enforces that ONLY the
  original sender may ever edit their own message - no admin/moderator
  exception, unlike delete. Sets `content` and flips `edited = true`,
  then broadcasts `MESSAGE_UPDATED` (full `MessageResponse`) to the same
  destination(s) `MESSAGE_NEW` would have gone to (channel-wide, plus the
  topic-scoped stream too when the message carries a `topicId`; group-wide
  for groups).
- **Delete**: `MessagePersistenceHelper.deleteMessage` allows the sender
  OR a "privileged" actor, where privilege is decided by the caller before
  reaching the shared helper: `MessageServiceImpl` requires the actor's
  channel role be `MODERATOR` or above (the exact same threshold US-12
  uses for block/restrict); `GroupMessageServiceImpl` requires `GroupRole
  .ADMIN` (groups have no moderator tier, per "Groups ≠ Channels"). Sets
  `deleted_at = now()` and broadcasts `MESSAGE_DELETED` the same way.
- **Guard against US-19 interaction**: a still-`PENDING` scheduled
  message cannot be edited or deleted through these actions
  (`MessagePersistenceHelper.requireLiveMessage` rejects it with
  `VALIDATION_ERROR`) - editing/deleting it here would race with
  `ScheduledMessageDispatcher`, which polls by `status = 'PENDING'` alone
  and knows nothing about either action.
- **History filtering**: `MessageRepository.findHistoryPage` and
  `findTopicHistoryPage` (the two queries actually used by REST history
  and the initial channel/group load) now exclude `deletedAt is not
  null` rows, mirroring `ChannelRepository.findActiveById`. Both
  transactional-outbox writes (`UPDATE`/`DELETE` operations) reuse the
  same `search_outbox` table as `CREATE`, in the same DB transaction as
  the message mutation.
- **Frontend**: `MessageList` shows an edit (✎) action only on the
  viewer's own messages, and a delete (🗑) action on the viewer's own
  messages OR any message when the viewer is a channel MODERATOR+/OWNER/
  MANAGER or a group ADMIN. `useChannelSession`/`useGroupSession` handle
  `MESSAGE_UPDATED` by replacing the message in place (in every bucket
  that currently holds it) and `MESSAGE_DELETED` by removing it from
  every bucket - a deleted message simply disappears from the timeline,
  same as how a deleted channel disappears from the channel list.

### Group schema (`groups`, `group_members`, `group_invites`)
Deliberately isolated from the channel schema — nothing in `groups.sql`
references a channel, and nothing in the channel schema references a group.
`groups`: UUID PK, `name`, `created_by`. `group_members`: composite PK
`(group_id, user_id)`, `role` (`ADMIN`/`MEMBER` — simpler than channels'
4-tier role, matching groups' "smaller scope"), `status` (`ACTIVE`/`LEFT` —
no `RESTRICTED`/`BLOCKED` tier). `group_invites`: `inviter_id`, `invitee_id`,
`status` (`PENDING`/`ACCEPTED`/`REJECTED`), with a **partial unique index**
on `(group_id, invitee_id) WHERE status = 'PENDING'` so a user can't have two
simultaneously-pending invites to the same group while still preserving
historical accept/reject rows from earlier invite cycles.

Group **messaging** reuses the same `messages` table (`chat_type = 'GROUP'`,
`chat_id = groupId`) via the shared `MessagePersistenceHelper`, but group
**membership/authorization** is entirely separate: `GroupMessageServiceImpl`
checks `GroupMemberRepository` (ACTIVE status only, no role hierarchy for
sending), never `ChannelMemberRepository`. `GroupWebSocketController` is a
distinct STOMP controller from `ChannelWebSocketController`, and
`/app/groups.messages.send` broadcasts to `/topic/groups/{groupId}` — a
separate stream from `/topic/channels/{channelId}`.

### Group creation & invitations
`POST /api/groups` creates the group and adds the creator as its sole
`ADMIN` — modeled as REST, like channel deletion, since it's a one-off
administrative action. `POST /api/groups/{id}/invites` (`ADMIN` only)
creates a `PENDING` invite and pushes a private `GROUP_INVITE_CREATED` event
to the invitee on `/user/queue/invites`. The invitee alone can
`POST /api/groups/invites/{id}/accept` or `.../reject`; accepting creates the
`GroupMember` row and broadcasts `GROUP_MEMBER_JOINED` to
`/topic/groups/{groupId}/members`, and **either** response privately notifies
the original inviter (`GROUP_INVITE_ACCEPTED`/`GROUP_INVITE_REJECTED`) on the
same `/user/queue/invites` queue.

### US-15 — Edit user profile
`UpdateProfileRequest` (`displayName`, `bio`, `avatarMediaId`) via
`PATCH /api/profiles/me`. `avatarMediaId` is a logical reference to a file
already uploaded to media-service — this endpoint only ever accepts an id,
never file bytes, matching the "core-service/identity-service store only a
mediaId" rule. (`profiles.avatar_url` from Sprint 1 was replaced with
`avatar_media_id UUID` in a dedicated migration — see `V2__profile_avatar_as_media_id.sql`.)

### US-17 — Privacy setting: allow direct group add toggle
`profiles.allow_direct_group_add` (added back in Sprint 1's initial schema)
is now exposed via `PATCH /api/profiles/me/privacy`. The enforcement side
lives in core-service: before `GroupServiceImpl.addMemberDirectly` adds
someone **without** an invite, it calls
`IdentityServiceClient.allowsDirectGroupAdd(userId)` — a service-to-service
call to identity-service's `GET /internal/profiles/{userId}/privacy`
(guarded by the same shared `X-Internal-Api-Key`) — and rejects with
`DirectAddNotAllowedException` (`403`) if the flag is `false`, so the caller
must fall back to `invite` instead. **core-service never reads
identity-service's `profiles` table directly**; this HTTP call is the only
sanctioned way it learns a user's preference.

---

## 3. WebSocket authentication & authorization

`JwtChannelInterceptor` (a Spring `ChannelInterceptor` on the client-inbound
STOMP channel) does two distinct jobs:

1. **On `CONNECT`** — reads the `Authorization: Bearer <token>` STOMP
   header, validates it with `JwtTokenValidator` (same secret
   identity-service signs with), and attaches a `StompPrincipal` to the
   session. Every later frame on that session is now tied to a real user.
2. **On `SUBSCRIBE`** to `/topic/channels/{id}`, `/topic/channels/{id}/members`,
   `/topic/channels/{id}/topics/{topicId}`, `/topic/groups/{id}`, or
   `/topic/groups/{id}/members` — checks the authenticated user is actually
   an active member of that channel/group. A valid JWT alone is not enough
   to listen in on an arbitrary live feed; you also have to belong to it.
   Authorization is always channel/group-scoped, never resource-scoped — a
   topic never carries its own separate ACL (see "Topic-aware messaging"
   above), and neither does a group's members sub-topic.

`@MessageMapping` handlers additionally re-check membership/role/status via
`MembershipService` (channels) or directly via `GroupMemberRepository`
(groups) before doing anything, and `@MessageExceptionHandler` methods on
both `ChannelWebSocketController` and `GroupWebSocketController` route
every rejection to the offending client's own `/user/queue/errors` — errors
are never broadcast to the whole channel/group.

---

## 4. STOMP destinations reference

| Destination | Direction | Purpose |
|---|---|---|
| `/ws/connect` | connect | SockJS-wrapped STOMP endpoint (also registered without SockJS for native WS clients) |
| `/app/channels.create` | client → server | US-09 |
| `/app/channels.topics.create` | client → server | Create an additional channel topic (see Sprint 6) |
| `/app/messages.send` | client → server | US-04 (payload includes optional `topicId`, `mediaId`, `scheduledAt`) |
| `/app/messages.edit` | client → server | Edit a sent channel message - sender only (see Sprint 5) |
| `/app/messages.delete` | client → server | Delete a sent channel message - sender or channel admin/moderator (see Sprint 5) |
| `/app/channels.updateRole` | client → server | US-11 |
| `/app/channels.blockMember` | client → server | US-12 |
| `/app/groups.messages.send` | client → server | Group-equivalent of `messages.send` (payload includes optional `mediaId`, `scheduledAt` - no `topicId`, groups have no topics) |
| `/app/groups.messages.edit` | client → server | Group-equivalent of `messages.edit` - sender only |
| `/app/groups.messages.delete` | client → server | Group-equivalent of `messages.delete` - sender or group ADMIN |
| `/topic/channels/{channelId}` | server → clients | `MESSAGE_NEW`/`MESSAGE_UPDATED`/`MESSAGE_DELETED` (all messages, any topic or none), `CHANNEL_DELETED` |
| `/topic/channels/{channelId}/topics/{topicId}` | server → clients | `MESSAGE_NEW`/`MESSAGE_UPDATED`/`MESSAGE_DELETED`, filtered to one topic — sent *in addition to* the channel-wide stream above whenever a message carries that `topicId` |
| `/topic/channels/{channelId}/members` | server → clients | `MEMBER_ROLE_UPDATED`, `MEMBER_STATUS_UPDATED`, `CHANNEL_DELETED`, `TOPIC_CREATED` |
| `/topic/groups/{groupId}` | server → clients | `MESSAGE_NEW`/`MESSAGE_UPDATED`/`MESSAGE_DELETED` for that group |
| `/topic/groups/{groupId}/members` | server → clients | `GROUP_MEMBER_JOINED` (on invite-accept or direct-add) |
| `/user/queue/channels` | server → creator only | `CHANNEL_CREATED` reply to `channels.create` |
| `/user/queue/invites` | server → invitee (on create) or inviter (on accept/reject) | `GROUP_INVITE_CREATED`, `GROUP_INVITE_ACCEPTED`, `GROUP_INVITE_REJECTED` |
| `/user/queue/scheduled` | server → sender only | `MESSAGE_SCHEDULED` — US-19 private ack that a message was deferred, NOT broadcast |
| `/user/queue/errors` | server → offending client only | rejected actions |

Every server → client payload is wrapped in the same envelope:
```json
{ "type": "MESSAGE_NEW", "timestamp": "...", "payload": { /* MessageResponse, ChannelMemberResponse, etc. */ } }
```
`MessageResponse.topicId` is `null` for a general, topic-less message (and
always `null` for group messages). `MessageResponse.chatType`
(`CHANNEL`/`GROUP`/`DM`) and `chatId` tell you which stream a message
belongs to — the same DTO shape is shared by both channel and group
messages. `MessageResponse.status` is `PENDING` until
`ScheduledMessageDispatcher` fires it, then `SENT`.

---

## 5. REST reference (non-realtime only)

**core-service**

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/channels` | channels the caller belongs to |
| GET | `/api/channels/{id}` | full detail: members + topics |
| GET | `/api/channels/{id}/members` | member list & roles (US-10) |
| GET | `/api/channels/{id}/messages?before=&limit=&topicId=` | paginated history (US-05, initial load); `topicId` omitted = unfiltered, a topic's UUID = that topic only, `none` = no-topic messages only |
| GET | `/api/channels/{id}/messages/search?q=&before=&limit=` | "6.4 جستجوی پیام‌ها" - case-insensitive substring search over this channel's message content, `q` required; not topic-scoped |
| DELETE | `/api/channels/{id}` | US-13, `OWNER` only |
| POST | `/api/groups` | create a group (creator becomes `ADMIN`) |
| GET | `/api/groups` | groups the caller belongs to |
| GET | `/api/groups/{id}` | full detail: members |
| GET | `/api/groups/{id}/messages?before=&limit=` | paginated history (group-equivalent of channel history) |
| GET | `/api/groups/{id}/messages/search?q=&before=&limit=` | group-equivalent of the channel message search above |
| POST | `/api/groups/{id}/invites` | `ADMIN` only - invite a user (starts the accept/reject flow) |
| POST | `/api/groups/invites/{id}/accept` | invitee only |
| POST | `/api/groups/invites/{id}/reject` | invitee only |
| GET | `/api/groups/invites/mine` | the caller's own pending invites, across every group |
| POST | `/api/groups/{id}/members` | US-17 - `ADMIN` only; adds a user WITHOUT an invite, `403` if their privacy profile forbids it |

**identity-service**

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/profiles/me` | the caller's own profile |
| PATCH | `/api/profiles/me` | US-15 - edit `displayName`/`bio`/`avatarMediaId` |
| PATCH | `/api/profiles/me/privacy` | US-17 - toggle `allowDirectGroupAdd` |

**media-service**

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/media` (multipart) | upload a file, returns its `mediaId` |
| GET | `/api/media/{id}` | file metadata |
| GET | `/api/media/{id}/content` | streams the raw bytes - deliberately public, no JWT (see section 2) |

**Internal, service-to-service only** (guarded by `X-Internal-Api-Key`, never called by the frontend)

| Method | Path | Purpose |
|---|---|---|
| GET | `/internal/profiles/{userId}/privacy` (identity-service) | US-17 - checked by core-service before a direct group add |
| GET | `/internal/media/{mediaId}/exists` (media-service) | US-18 - checked by core-service before accepting a message's `mediaId` |

Identity auth endpoints (`/api/auth/register|login|refresh|logout`) are
unchanged from Sprint 1 — see the inline comments in
`AuthController`/`AuthService` for details.

---

## 6. Running locally

### Full stack via Docker Compose
```bash
cd docker
docker compose up --build
```
Starts `identity-postgres` (`5432`), `identity-service` (`8081`),
`core-postgres` (`5433`), `core-service` (`8082`), `media-postgres`
(`5434`), and `media-service` (`8083`). Flyway migrates all three services'
schemas automatically on boot. `media-service`'s simulated storage
(`LocalStorageServiceImpl`) persists to a named Docker volume
(`media_files_data`) so uploads survive a container restart.

### Backend only (local Postgres, run each service in its own shell)
```bash
# identity-service
cd backend-services/identity-service
export DB_HOST=localhost DB_USER=identity_user DB_PASSWORD=identity_pass DB_NAME=identity_db
export JWT_SECRET=$(openssl rand -base64 48)
export INTERNAL_API_KEY=$(openssl rand -base64 32)
mvn spring-boot:run
```
```bash
# core-service — MUST use the same JWT_SECRET and INTERNAL_API_KEY as
# identity-service and media-service
cd backend-services/core-service
export DB_HOST=localhost DB_PORT=5433 DB_USER=core_user DB_PASSWORD=core_pass DB_NAME=core_db
export JWT_SECRET=<same value as identity-service's>
export INTERNAL_API_KEY=<same value as identity-service's>
export IDENTITY_SERVICE_BASE_URL=http://localhost:8081
export MEDIA_SERVICE_BASE_URL=http://localhost:8083
mvn spring-boot:run
```
```bash
# media-service — MUST use the same JWT_SECRET and INTERNAL_API_KEY
cd backend-services/media-service
export DB_HOST=localhost DB_PORT=5434 DB_USER=media_user DB_PASSWORD=media_pass DB_NAME=media_db
export JWT_SECRET=<same value as identity-service's>
export INTERNAL_API_KEY=<same value as identity-service's>
export MEDIA_STORAGE_ROOT=/tmp/datlor-media
mvn spring-boot:run
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Vite proxies `/api/auth/*` and `/api/profiles/*` → identity-service
(`8081`), `/api/channels/*`, `/api/groups/*`, and `/ws/*` (including the
WebSocket upgrade) → core-service (`8082`), and `/api/media/*` →
media-service (`8083`) — see `vite.config.ts`. Set `VITE_API_BASE_URL` /
`VITE_WS_URL` to override in production builds.

---

## 7. Environment variables

**identity-service**

| Variable | Default | Purpose |
|---|---|---|
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | `localhost` / `5432` / `identity_db` / `identity_user` / `identity_pass` | Postgres connection |
| `JWT_SECRET` | dev-only placeholder | HS256 signing key — **must** be a long random secret in production, and **must match core-service's and media-service's** |
| `JWT_ACCESS_EXP_MS` | `900000` (15 min) | Access token lifetime |
| `JWT_REFRESH_EXP_MS` | `604800000` (7 days) | Refresh token lifetime |
| `INTERNAL_API_KEY` | dev-only placeholder | Shared secret guarding `/internal/**` (US-17) — **must match core-service's** |

**core-service**

| Variable | Default | Purpose |
|---|---|---|
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | `localhost` / `5432` / `core_db` / `core_user` / `core_pass` | Postgres connection (separate DB from identity-service) |
| `JWT_SECRET` | dev-only placeholder | **Must exactly match** identity-service's/media-service's — this service only validates, never signs |
| `INTERNAL_API_KEY` | dev-only placeholder | **Must exactly match** identity-service's and media-service's — sent as `X-Internal-Api-Key` when calling their `/internal/**` endpoints |
| `IDENTITY_SERVICE_BASE_URL` | `http://localhost:8081` | Base URL for the US-17 privacy check |
| `MEDIA_SERVICE_BASE_URL` | `http://localhost:8083` | Base URL for the US-18 mediaId check |
| `SCHEDULER_FIXED_DELAY_MS` | `5000` | How often `ScheduledMessageDispatcher` polls for due messages (US-19) |
| `SCHEDULER_BATCH_SIZE` | `50` | Max due messages dispatched per poll |

**media-service**

| Variable | Default | Purpose |
|---|---|---|
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | `localhost` / `5432` / `media_db` / `media_user` / `media_pass` | Postgres connection (separate DB from identity-service/core-service) |
| `JWT_SECRET` | dev-only placeholder | **Must exactly match** identity-service's/core-service's — this service only validates, never signs |
| `INTERNAL_API_KEY` | dev-only placeholder | **Must exactly match** identity-service's and core-service's |
| `MEDIA_STORAGE_ROOT` | `/tmp/datlor-media` | Where `LocalStorageServiceImpl` simulates object storage on disk |
| `MEDIA_PUBLIC_BASE_URL` | `http://localhost:8083/api/media` | Base URL embedded in `MediaFile.fileUrl` |
| `MEDIA_MAX_FILE_SIZE_BYTES` | `26214400` (25 MB) | Upload size cap |

---

## 8. Known simplifications / follow-ups for later sprints

- **Member display names**: `channel_members` only stores `user_id` (a
  logical reference); the frontend currently renders a truncated UUID as a
  placeholder. A real deployment would enrich member rows with
  `display_name`/`avatar_url` from identity-service's `profiles` table,
  either via a batched lookup call or a small denormalized read model kept
  in sync via an event.
- **Token freshness on long-lived WS sessions**: the STOMP session is
  authenticated once at `CONNECT` time; it is not re-validated per frame
  after that, so a connection can outlive the access token that opened it.
  `socketService`'s `beforeConnect` hook re-reads the latest token on every
  (re)connect, which covers reconnects after a network blip, but a fully
  rigorous implementation would also proactively cycle the WS connection
  when the REST layer refreshes the access token.
- **`search_outbox` consumer**: rows are written but nothing currently
  drains them — a real search-indexing worker (Elasticsearch/OpenSearch,
  etc.) would poll `processed = false` and mark rows processed.
- **`@Valid` on STOMP `@Payload` DTOs**: Spring's WebSocket/STOMP support
  auto-wires a Bean Validation `Validator` for `@MessageMapping` arguments
  when Hibernate Validator is on the classpath (which it is here, via
  `spring-boot-starter-validation`), the same way `@Valid @RequestBody`
  works for REST — no extra config needed. If that ever changes upstream,
  the service-layer checks (`MembershipService`, `MessageServiceImpl`)
  still enforce every invariant that actually matters for correctness;
  only the friendliness of field-level error messages would regress.
- **Ownership transfer**: intentionally out of scope — `updateRole`
  explicitly rejects any attempt to change the `OWNER`'s role or promote a
  new one, so every channel always has exactly one, immutable owner for now.
- **Topic management**: creating a topic is now supported (see Sprint 6 above,
  `POST`-equivalent WS action `/app/channels.topics.create`); renaming or
  deleting an existing topic is still not exposed — a natural next slice,
  and the schema/mapper/validation are already shaped for it the same way
  creation was before this sprint.
- Consider rate-limiting `/api/auth/login` and `/api/auth/register`, and a
  scheduled cleanup of expired/revoked `refresh_tokens` rows (see Sprint 1
  notes, still applicable).
- **`/internal/**` protection is a shared-secret header, not network
  isolation**: `InternalApiKeyFilter` (identity-service and media-service)
  is a pragmatic in-code stand-in for what a real deployment would enforce
  with a private network segment / service mesh / mTLS between services.
  It's real protection against an internet-facing caller, but weaker than
  true network isolation.
- **Media validation is a live HTTP call on the hot path**: every message
  with a `mediaId` makes a synchronous call to media-service before
  persisting (US-18). This is correct and simple, but means a slow/down
  media-service directly slows/blocks message sending; a busier system
  might cache recent "exists" checks or accept eventual consistency instead
  (e.g. optimistic accept + async validation that flags/retracts a bad
  reference after the fact).
- **No storage quota / cleanup**: media-service never deletes an uploaded
  file once written, even if the message referencing it is later deleted
  or edited - there's no garbage collection of orphaned uploads yet.
- **Group ownership transfer / demoting the last ADMIN**: not implemented —
  there's currently no protection against a group ending up with zero
  ADMINs (e.g. if the sole admin were ever removed), mirroring the same
  "ownership transfer is out of scope" simplification channels already
  have, but slightly less enforced here since nothing currently prevents
  the single-ADMIN invariant from being violated.
- **No user directory / search**: inviting or direct-adding a group member
  requires already knowing their `userId` (UUID) - there's no
  search-by-email/name endpoint in identity-service yet, so the frontend's
  invite UI takes a raw id rather than a picker.
