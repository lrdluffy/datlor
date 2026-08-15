import { ChannelMemberResponse, ChannelResponse, ChannelTopicResponse } from './channel';
import { MessageResponse } from './message';
import { GroupInviteResponse, GroupMemberResponse } from './group';

export type WsEventType =
    | 'MESSAGE_NEW'
    | 'MESSAGE_UPDATED'
    | 'MESSAGE_DELETED'
    | 'CHANNEL_DELETED'
    | 'MESSAGE_SCHEDULED'
    | 'CHANNEL_CREATED'
    | 'MEMBER_JOINED'
    | 'MEMBER_ROLE_UPDATED'
    | 'MEMBER_STATUS_UPDATED'
    | 'TOPIC_CREATED'
    | 'GROUP_MEMBER_JOINED'
    | 'GROUP_INVITE_CREATED'
    | 'GROUP_INVITE_ACCEPTED'
    | 'GROUP_INVITE_REJECTED';

export interface WsEvent<T> {
  type: WsEventType;
  timestamp: string;
  payload: T;
}

export interface WsErrorMessage {
  code: string;
  message: string;
  timestamp: string;
}

export type ChannelTopicEvent =
    | WsEvent<MessageResponse>
    | WsEvent<{ channelId: string }>;

export type GroupTopicEvent = WsEvent<MessageResponse>;

/**
 * TOPIC_CREATED shares this destination with the member events (see
 * ChannelWebSocketController.createTopic) - "channel structural changes",
 * not strictly member-only.
 */
export type MembersTopicEvent = WsEvent<ChannelMemberResponse> | WsEvent<ChannelTopicResponse>;
export type GroupMembersTopicEvent = WsEvent<GroupMemberResponse>;

export type ChannelCreatedEvent = WsEvent<ChannelResponse>;
export type GroupInviteEvent = WsEvent<GroupInviteResponse>;

/** Private ack that a message was scheduled rather than sent immediately (US-19). */
export type MessageScheduledEvent = WsEvent<MessageResponse>;

// ---- outbound request payloads (sent as STOMP SEND frame bodies) ----

export interface CreateChannelRequest {
  name: string;
  description?: string;
}

export interface UpdateRoleRequest {
  channelId: string;
  targetUserId: string;
  newRole: 'OWNER' | 'MANAGER' | 'MODERATOR' | 'MEMBER';
}

export interface UpdateMemberStatusRequest {
  channelId: string;
  targetUserId: string;
  newStatus: 'ACTIVE' | 'RESTRICTED' | 'BLOCKED';
}

/** Create an additional topic beyond the default one seeded at channel creation. */
export interface CreateTopicRequest {
  channelId: string;
  name: string;
}
