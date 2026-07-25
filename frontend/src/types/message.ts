export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';

export interface MessageResponse {
  id: string;
  channelId: string;
  senderId: string;
  type: MessageType;
  content: string | null;
  mediaId: string | null;
  /** null when the message doesn't belong to any topic. */
  topicId: string | null;
  edited: boolean;
  createdAt: string;
}

export interface SendMessageRequest {
  channelId: string;
  type: MessageType;
  content?: string;
  mediaId?: string;
  /** Optional: tags the message to one of the channel's topics. Omit to send a general message. */
  topicId?: string;
}
