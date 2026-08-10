export type GroupRole = 'ADMIN' | 'MEMBER';
export type GroupMemberStatus = 'ACTIVE' | 'LEFT';
export type GroupInviteStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface GroupMemberResponse {
  groupId: string;
  userId: string;
  role: GroupRole;
  status: GroupMemberStatus;
  joinedAt: string;
}

export interface GroupInviteResponse {
  id: string;
  groupId: string;
  groupName: string;
  inviterId: string;
  inviteeId: string;
  status: GroupInviteStatus;
  createdAt: string;
}

export interface GroupRoleView {
  role: GroupRole;
  status: GroupMemberStatus;
}

export interface GroupResponse {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  memberCount: number;
  viewerRole: GroupRoleView | null;
}

export interface GroupDetailResponse {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  members: GroupMemberResponse[];
}

export interface CreateGroupRequest {
  name: string;
}

export interface InviteToGroupRequest {
  inviteeId: string;
}

export interface AddGroupMemberRequest {
  userId: string;
}
