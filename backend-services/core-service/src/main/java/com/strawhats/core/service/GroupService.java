package com.strawhats.core.service;

import com.strawhats.core.dto.response.GroupDetailResponse;
import com.strawhats.core.dto.response.GroupInviteResponse;
import com.strawhats.core.dto.response.GroupResponse;

import java.util.List;
import java.util.UUID;

/**
 * Groups ≠ Channels: private, invitation-based membership, smaller scope.
 * Every method here operates ONLY on groups/group_members/group_invites -
 * nothing in this service ever touches channels/channel_members.
 */
public interface GroupService {

    /** Creates the group and adds the creator as its sole ADMIN. */
    GroupResponse createGroup(UUID creatorUserId, String name);

    /**
     * edit the group's name/description.
     * ANY active member may edit - deliberately broader than channel edit
     * (OWNER/MANAGER only), per spec ("by any
     * one of its members"). Broadcasts GROUP_UPDATED to
     * /topic/groups/{groupId}/members.
     */
    GroupResponse updateGroup(UUID groupId, UUID actorUserId, String name, String description);

    /**
     * delete the group (soft delete). ANY
     * active member may delete it - same "any member" rule as
     * {@link #updateGroup}, a deliberately more casual/broader rule than
     * channel delete. Broadcasts GROUP_DELETED to both group topics,
     * mirroring how ChannelService.deleteChannel broadcasts CHANNEL_DELETED.
     */
    void deleteGroup(UUID groupId, UUID actorUserId);


    List<GroupResponse> listGroupsForUser(UUID userId);

    GroupDetailResponse getGroupDetail(UUID groupId, UUID requestingUserId);

    /** Only an ADMIN may invite. Fails if the invitee already has a pending invite or is already an active member. */
    GroupInviteResponse invite(UUID groupId, UUID inviterId, UUID inviteeId);

    /** Only the invitee may accept their own invite. */
    GroupInviteResponse acceptInvite(UUID inviteId, UUID requestingUserId);

    /** Only the invitee may reject their own invite. */
    GroupInviteResponse rejectInvite(UUID inviteId, UUID requestingUserId);

    /**
     * US-17: adds `targetUserId` WITHOUT an invite/accept round-trip. Only
     * an ADMIN may call this, and only when identity-service's privacy
     * profile for `targetUserId` has allowDirectGroupAdd = true - otherwise
     * throws DirectAddNotAllowedException and the caller must fall back to
     * {@link #invite}.
     */
    GroupDetailResponse addMemberDirectly(UUID groupId, UUID actorUserId, UUID targetUserId);

    List<GroupInviteResponse> listMyPendingInvites(UUID userId);
}
