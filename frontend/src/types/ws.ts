import { ChannelMemberResponse, ChannelResponse } from './channel';
import { MessageResponse } from './message';

export type WsEventType =
  | 'MESSAGE_NEW'
  | 'CHANNEL_DELETED'
  | 'CHANNEL_CREATED'
  | 'MEMBER_JOINED'
  | 'MEMBER_ROLE_UPDATED'
  | 'MEMBER_STATUS_UPDATED';

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

export type MembersTopicEvent = WsEvent<ChannelMemberResponse>;

export type ChannelCreatedEvent = WsEvent<ChannelResponse>;

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
