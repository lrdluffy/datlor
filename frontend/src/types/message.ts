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

export interface GroupMessageRequest {
  groupId: string;
  type: MessageType;
  content?: string;
  mediaId?: string;
  /** US-19: a future ISO timestamp defers delivery; omit (or past/now) sends immediately. */
  scheduledAt?: string;
}
