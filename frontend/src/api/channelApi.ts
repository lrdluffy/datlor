import { axiosClient } from './axiosClient';
import { ChannelDetailResponse, ChannelMemberResponse, ChannelResponse } from '../types/channel';
import { MessageResponse } from '../types/message';

export const channelApi = {
  /** Channels the current user belongs to - powers ChannelListPage. */
  listMyChannels: async (): Promise<ChannelResponse[]> => {
    const { data } = await axiosClient.get<ChannelResponse[]>('/channels');
    return data;
  },

  getChannel: async (channelId: string): Promise<ChannelDetailResponse> => {
    const { data } = await axiosClient.get<ChannelDetailResponse>(`/channels/${channelId}`);
    return data;
  },

  listMembers: async (channelId: string): Promise<ChannelMemberResponse[]> => {
    const { data } = await axiosClient.get<ChannelMemberResponse[]>(`/channels/${channelId}/members`);
    return data;
  },

  /**
   * US-05 (initial load only): cursor-paginated message history, newest
   * first. Pass the oldest `createdAt` currently loaded as `before` to
   * fetch the next older page. Live updates after this arrive via WS.
   *
   * Topic-aware filtering via the optional `topicId`:
   *  - omitted            → unfiltered, every message regardless of topic
   *  - a topic's id       → only that topic's messages
   *  - the literal 'none' → only messages that have NO topic
   */
  getHistory: async (channelId: string, before?: string, limit = 50, topicId?: string): Promise<MessageResponse[]> => {
    const { data } = await axiosClient.get<MessageResponse[]>(`/channels/${channelId}/messages`, {
      params: { before, limit, topicId },
    });
    return data;
  },

  /** US-13: Delete channel (soft delete, OWNER only). */
  deleteChannel: async (channelId: string): Promise<void> => {
    await axiosClient.delete(`/channels/${channelId}`);
  },
};
