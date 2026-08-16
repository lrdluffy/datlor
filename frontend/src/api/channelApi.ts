import { axiosClient } from './axiosClient';
import { ChannelDetailResponse, ChannelMemberResponse, ChannelResponse, UpdateChannelRequest } from '../types/channel';
import { MessageResponse } from '../types/message';

export const channelApi = {
  /** Channels the current user belongs to - powers ChannelListPage. */
  listMyChannels: async (): Promise<ChannelResponse[]> => {
    const { data } = await axiosClient.get<ChannelResponse[]>('/channels');
    return data;
  },

  /**
   * Search all channels by name, regardless of membership - pass an empty
   * string to browse recent channels. Each result's `viewerRole` is null
   * for channels not yet joined.
   */
  searchChannels: async (query: string): Promise<ChannelResponse[]> => {
    const { data } = await axiosClient.get<ChannelResponse[]>('/channels/search', {
      params: { q: query || undefined },
    });
    return data;
  },

  /** Self-service join - no invite needed (channels have no private tier, unlike groups). */
  joinChannel: async (channelId: string): Promise<ChannelMemberResponse> => {
    const { data } = await axiosClient.post<ChannelMemberResponse>(`/channels/${channelId}/join`);
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

  /**
   * filter this channel's messages down to ones
   * containing `query` (case-insensitive). Not topic-scoped - searches
   * across every topic and no-topic messages alike. Same cursor-pagination
   * shape as getHistory (pass the oldest `createdAt` currently loaded as
   * `before` for the next older page of results).
   */
  searchMessages: async (channelId: string, query: string, before?: string, limit = 50): Promise<MessageResponse[]> => {
    const { data } = await axiosClient.get<MessageResponse[]>(`/channels/${channelId}/messages/search`, {
      params: { q: query, before, limit },
    });
    return data;
  },

  /** edit name/description (OWNER or MANAGER only). Broadcasts CHANNEL_UPDATED over WS. */
  updateChannel: async (channelId: string, payload: UpdateChannelRequest): Promise<ChannelResponse> => {
    const { data } = await axiosClient.patch<ChannelResponse>(`/channels/${channelId}`, payload);
    return data;
  },

  /** US-13: Delete channel (soft delete, OWNER or MANAGER). */
  deleteChannel: async (channelId: string): Promise<void> => {
    await axiosClient.delete(`/channels/${channelId}`);
  },
};
