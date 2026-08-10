import { axiosClient } from './axiosClient';
import {
  AddGroupMemberRequest,
  CreateGroupRequest,
  GroupDetailResponse,
  GroupInviteResponse,
  GroupResponse,
  InviteToGroupRequest,
} from '../types/group';
import { MessageResponse } from '../types/message';

export const groupApi = {
  createGroup: async (payload: CreateGroupRequest): Promise<GroupResponse> => {
    const { data } = await axiosClient.post<GroupResponse>('/groups', payload);
    return data;
  },

  listMyGroups: async (): Promise<GroupResponse[]> => {
    const { data } = await axiosClient.get<GroupResponse[]>('/groups');
    return data;
  },

  getGroup: async (groupId: string): Promise<GroupDetailResponse> => {
    const { data } = await axiosClient.get<GroupDetailResponse>(`/groups/${groupId}`);
    return data;
  },

  /** ADMIN only. Starts the invite/accept flow. */
  invite: async (groupId: string, payload: InviteToGroupRequest): Promise<GroupInviteResponse> => {
    const { data } = await axiosClient.post<GroupInviteResponse>(`/groups/${groupId}/invites`, payload);
    return data;
  },

  acceptInvite: async (inviteId: string): Promise<GroupInviteResponse> => {
    const { data } = await axiosClient.post<GroupInviteResponse>(`/groups/invites/${inviteId}/accept`);
    return data;
  },

  rejectInvite: async (inviteId: string): Promise<GroupInviteResponse> => {
    const { data } = await axiosClient.post<GroupInviteResponse>(`/groups/invites/${inviteId}/reject`);
    return data;
  },

  listMyInvites: async (): Promise<GroupInviteResponse[]> => {
    const { data } = await axiosClient.get<GroupInviteResponse[]>('/groups/invites/mine');
    return data;
  },

  /**
   * US-17: ADMIN only. Fails with 403 if the target's privacy profile
   * doesn't allow direct add - fall back to `invite` in that case.
   */
  addMemberDirectly: async (groupId: string, payload: AddGroupMemberRequest): Promise<GroupDetailResponse> => {
    const { data } = await axiosClient.post<GroupDetailResponse>(`/groups/${groupId}/members`, payload);
    return data;
  },

  /** Non-realtime initial history load - live updates arrive via WS after this. */
  getHistory: async (groupId: string, before?: string, limit = 50): Promise<MessageResponse[]> => {
    const { data } = await axiosClient.get<MessageResponse[]>(`/groups/${groupId}/messages`, {
      params: { before, limit },
    });
    return data;
  },
};
