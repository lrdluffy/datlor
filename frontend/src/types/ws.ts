import { ChannelMemberResponse, ChannelResponse } from './channel';
import { MessageResponse } from './message';
import { GroupInviteResponse, GroupMemberResponse } from './group';

export type WsEventType =
  | 'MESSAGE_NEW'
  | 'CHANNEL_DELETED'
  | 'MESSAGE_SCHEDULED'
  | 'CHANNEL_CREATED'
  | 'MEMBER_JOINED'
  | 'MEMBER_ROLE_UPDATED'
  | 'MEMBER_STATUS_UPDATED'
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

export type MembersTopicEvent = WsEvent<ChannelMemberResponse>;
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
