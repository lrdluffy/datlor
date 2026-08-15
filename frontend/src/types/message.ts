export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
export type ChatType = 'CHANNEL' | 'GROUP' | 'DM';
export type MessageStatus = 'PENDING' | 'SENT';

/** Shared shape for BOTH channel and group messages - chatType tells you which. */
export interface MessageResponse {
  id: string;
  chatType: ChatType;
  chatId: string;
  senderId: string;
  type: MessageType;
  content: string | null;
  mediaId: string | null;
  /** null when the message doesn't belong to any topic (channels only - groups never have topics). */
  topicId: string | null;
  edited: boolean;
  status: MessageStatus;
  /** null for an immediate message; set for a scheduled one (US-19). */
  scheduledAt: string | null;
  createdAt: string;
  /** Non-null once the message has been deleted (soft delete) - see the MESSAGE_DELETED WS event. */
  deletedAt: string | null;
}

export interface SendMessageRequest {
  channelId: string;
  type: MessageType;
  content?: string;
  mediaId?: string;
  /** Optional: tags the message to one of the channel's topics. Omit to send a general message. */
  topicId?: string;
  /** US-19: a future ISO timestamp defers delivery; omit (or past/now) sends immediately. */
  scheduledAt?: string;
}

/** Only the original sender may ever edit their own message - enforced server-side. */
export interface EditMessageRequest {
  channelId: string;
  messageId: string;
  content: string;
}

/** Allowed for the message's own sender OR a channel admin/moderator (MODERATOR+) - enforced server-side. */
export interface DeleteMessageRequest {
  channelId: string;
  messageId: string;
}

export interface GroupMessageRequest {
  groupId: string;
  type: MessageType;
  content?: string;
  mediaId?: string;
  /** US-19: a future ISO timestamp defers delivery; omit (or past/now) sends immediately. */
  scheduledAt?: string;
}

/** Group-equivalent of {@link EditMessageRequest}. */
export interface EditGroupMessageRequest {
  groupId: string;
  messageId: string;
  content: string;
}

/** Group-equivalent of {@link DeleteMessageRequest} - privileged actor here is a group ADMIN. */
export interface DeleteGroupMessageRequest {
  groupId: string;
  messageId: string;
}
