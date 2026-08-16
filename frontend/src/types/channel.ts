export type ChannelRole = 'OWNER' | 'MANAGER' | 'MODERATOR' | 'MEMBER';

export type MemberStatus = 'ACTIVE' | 'RESTRICTED' | 'BLOCKED';

export interface ChannelMemberResponse {
  channelId: string;
  userId: string;
  role: ChannelRole;
  status: MemberStatus;
  mediaAllowed: boolean;
  joinedAt: string;
}

export interface ChannelTopicResponse {
  id: string;
  channelId: string;
  name: string;
  createdBy: string;
  createdAt: string;
}

export interface ChannelRoleView {
  role: ChannelRole;
  status: MemberStatus;
}

export interface ChannelResponse {
  id: string;
  name: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
  memberCount: number;
  viewerRole: ChannelRoleView | null;
}

export interface ChannelDetailResponse {
  id: string;
  name: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
  members: ChannelMemberResponse[];
  topics: ChannelTopicResponse[];
}

/** edit an existing channel's name/description - OWNER or MANAGER only. */
export interface UpdateChannelRequest {
  name: string;
  description?: string;
}

/** Role ranking used for client-side permission gating (mirrors ChannelRole.java). */
export const ROLE_RANK: Record<ChannelRole, number> = {
  OWNER: 0,
  MANAGER: 1,
  MODERATOR: 2,
  MEMBER: 3,
};

export function outranks(a: ChannelRole, b: ChannelRole): boolean {
  return ROLE_RANK[a] < ROLE_RANK[b];
}

export function isAtLeast(a: ChannelRole, b: ChannelRole): boolean {
  return ROLE_RANK[a] <= ROLE_RANK[b];
}
