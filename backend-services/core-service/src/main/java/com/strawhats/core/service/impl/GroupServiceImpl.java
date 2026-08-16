package com.strawhats.core.service.impl;

import com.strawhats.core.client.IdentityServiceClient;
import com.strawhats.core.dto.response.GroupDetailResponse;
import com.strawhats.core.dto.response.GroupInviteResponse;
import com.strawhats.core.dto.response.GroupMemberResponse;
import com.strawhats.core.dto.response.GroupResponse;
import com.strawhats.core.dto.ws.WsEvent;
import com.strawhats.core.dto.ws.WsEventType;
import com.strawhats.core.entity.Group;
import com.strawhats.core.entity.GroupInvite;
import com.strawhats.core.entity.GroupMember;
import com.strawhats.core.entity.enums.GroupInviteStatus;
import com.strawhats.core.entity.enums.GroupMemberStatus;
import com.strawhats.core.entity.enums.GroupRole;
import com.strawhats.core.exception.DirectAddNotAllowedException;
import com.strawhats.core.exception.GroupInviteException;
import com.strawhats.core.exception.NotAGroupMemberException;
import com.strawhats.core.exception.ResourceNotFoundException;
import com.strawhats.core.exception.UnauthorizedActionException;
import com.strawhats.core.mapper.GroupMapper;
import com.strawhats.core.repository.GroupInviteRepository;
import com.strawhats.core.repository.GroupMemberRepository;
import com.strawhats.core.repository.GroupRepository;
import com.strawhats.core.service.GroupService;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class GroupServiceImpl implements GroupService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupInviteRepository groupInviteRepository;
    private final IdentityServiceClient identityServiceClient;
    private final GroupMapper groupMapper;
    private final SimpMessagingTemplate messagingTemplate;

    public GroupServiceImpl(GroupRepository groupRepository,
                            GroupMemberRepository groupMemberRepository,
                            GroupInviteRepository groupInviteRepository,
                            IdentityServiceClient identityServiceClient,
                            GroupMapper groupMapper,
                            SimpMessagingTemplate messagingTemplate) {
        this.groupRepository = groupRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.groupInviteRepository = groupInviteRepository;
        this.identityServiceClient = identityServiceClient;
        this.groupMapper = groupMapper;
        this.messagingTemplate = messagingTemplate;
    }

    @Override
    @Transactional
    public GroupResponse createGroup(UUID creatorUserId, String name) {
        Group group = Group.builder()
                .name(name.trim())
                .createdBy(creatorUserId)
                .build();
        group = groupRepository.save(group);

        GroupMember owner = GroupMember.create(group, creatorUserId, GroupRole.ADMIN);
        owner = groupMemberRepository.save(owner);

        return groupMapper.toGroupResponse(group, 1, owner);
    }

    @Override
    @Transactional(readOnly = true)
    public List<GroupResponse> listGroupsForUser(UUID userId) {
        List<Group> groups = groupRepository.findActiveGroupsForUser(userId);

        return groups.stream()
                .map(group -> {
                    List<GroupMember> members = groupMemberRepository.findByGroup_Id(group.getId());
                    GroupMember viewerMembership = members.stream()
                            .filter(m -> m.getUserId().equals(userId))
                            .findFirst()
                            .orElse(null);
                    return groupMapper.toGroupResponse(group, members.size(), viewerMembership);
                })
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public GroupDetailResponse getGroupDetail(UUID groupId, UUID requestingUserId) {
        Group group = groupRepository.findActiveById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group " + groupId + " was not found"));

        requireActiveMember(groupId, requestingUserId);

        List<GroupMember> members = groupMemberRepository.findByGroup_Id(groupId);
        return groupMapper.toDetailResponse(group, members);
    }

    @Override
    @Transactional
    public GroupResponse updateGroup(UUID groupId, UUID actorUserId, String name, String description) {
        Group group = groupRepository.findActiveById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group " + groupId + " was not found"));

        // ANY active member, not just ADMIN -
        // deliberately broader than channel edit. See deleteGroup below.
        GroupMember actor = requireActiveMemberAndReturn(groupId, actorUserId);

        group.setName(name.trim());
        group.setDescription(description == null ? null : description.trim());
        group = groupRepository.save(group);

        List<GroupMember> members = groupMemberRepository.findByGroup_Id(groupId);
        GroupResponse response = groupMapper.toGroupResponse(group, members.size(), actor);

        messagingTemplate.convertAndSend(
                "/topic/groups/" + groupId + "/members",
                WsEvent.of(WsEventType.GROUP_UPDATED, response));

        return response;
    }

    @Override
    @Transactional
    public void deleteGroup(UUID groupId, UUID actorUserId) {
        Group group = groupRepository.findActiveById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group " + groupId + " was not found"));

        // ANY active member may delete the whole group - a deliberately
        // more casual/broader rule than channel delete (OWNER/MANAGER only)
        requireActiveMember(groupId, actorUserId);

        group.setDeletedAt(LocalDateTime.now());
        groupRepository.save(group);

        Map<String, Object> payload = Map.of("groupId", groupId.toString());
        WsEvent<Map<String, Object>> event = WsEvent.of(WsEventType.GROUP_DELETED, payload);

        messagingTemplate.convertAndSend("/topic/groups/" + groupId, event);
        messagingTemplate.convertAndSend("/topic/groups/" + groupId + "/members", event);
    }

    @Override
    @Transactional
    public GroupInviteResponse invite(UUID groupId, UUID inviterId, UUID inviteeId) {
        Group group = groupRepository.findActiveById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group " + groupId + " was not found"));

        requireAdmin(groupId, inviterId);

        if (groupMemberRepository.existsActiveMember(groupId, inviteeId)) {
            throw new GroupInviteException("User " + inviteeId + " is already a member of this group");
        }
        if (groupInviteRepository.findPendingInvite(groupId, inviteeId).isPresent()) {
            throw new GroupInviteException("User " + inviteeId + " already has a pending invite to this group");
        }

        GroupInvite invite = GroupInvite.builder()
                .group(group)
                .inviterId(inviterId)
                .inviteeId(inviteeId)
                .status(GroupInviteStatus.PENDING)
                .build();
        invite = groupInviteRepository.save(invite);

        GroupInviteResponse response = groupMapper.toInviteResponse(invite);
        messagingTemplate.convertAndSendToUser(
                inviteeId.toString(), "/queue/invites", WsEvent.of(WsEventType.GROUP_INVITE_CREATED, response));

        return response;
    }

    @Override
    @Transactional
    public GroupInviteResponse acceptInvite(UUID inviteId, UUID requestingUserId) {
        GroupInvite invite = requirePendingInviteOwnedBy(inviteId, requestingUserId);

        invite.setStatus(GroupInviteStatus.ACCEPTED);
        invite = groupInviteRepository.save(invite);

        GroupMember member = GroupMember.create(invite.getGroup(), requestingUserId, GroupRole.MEMBER);
        groupMemberRepository.save(member);

        GroupInviteResponse inviteResponse = groupMapper.toInviteResponse(invite);
        GroupMemberResponse memberResponse = groupMapper.toMemberResponse(member);

        messagingTemplate.convertAndSend(
                "/topic/groups/" + invite.getGroup().getId() + "/members",
                WsEvent.of(WsEventType.GROUP_MEMBER_JOINED, memberResponse));

        messagingTemplate.convertAndSendToUser(
                invite.getInviterId().toString(), "/queue/invites",
                WsEvent.of(WsEventType.GROUP_INVITE_ACCEPTED, inviteResponse));

        return inviteResponse;
    }

    @Override
    @Transactional
    public GroupInviteResponse rejectInvite(UUID inviteId, UUID requestingUserId) {
        GroupInvite invite = requirePendingInviteOwnedBy(inviteId, requestingUserId);

        invite.setStatus(GroupInviteStatus.REJECTED);
        invite = groupInviteRepository.save(invite);

        GroupInviteResponse inviteResponse = groupMapper.toInviteResponse(invite);
        messagingTemplate.convertAndSendToUser(
                invite.getInviterId().toString(), "/queue/invites",
                WsEvent.of(WsEventType.GROUP_INVITE_REJECTED, inviteResponse));

        return inviteResponse;
    }

    @Override
    @Transactional
    public GroupDetailResponse addMemberDirectly(UUID groupId, UUID actorUserId, UUID targetUserId) {
        Group group = groupRepository.findActiveById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group " + groupId + " was not found"));

        requireAdmin(groupId, actorUserId);

        if (groupMemberRepository.existsActiveMember(groupId, targetUserId)) {
            throw new GroupInviteException("User " + targetUserId + " is already a member of this group");
        }

        // US-17: the ONLY sanctioned way to know this - never inferred,
        // never defaulted to true. See IdentityServiceClient.
        if (!identityServiceClient.allowsDirectGroupAdd(targetUserId)) {
            throw new DirectAddNotAllowedException(
                    "User " + targetUserId + " does not allow being added to groups directly - send an invite instead");
        }

        GroupMember member = GroupMember.create(group, targetUserId, GroupRole.MEMBER);
        member = groupMemberRepository.save(member);

        GroupMemberResponse memberResponse = groupMapper.toMemberResponse(member);
        messagingTemplate.convertAndSend(
                "/topic/groups/" + groupId + "/members",
                WsEvent.of(WsEventType.GROUP_MEMBER_JOINED, memberResponse));

        List<GroupMember> members = groupMemberRepository.findByGroup_Id(groupId);
        return groupMapper.toDetailResponse(group, members);
    }

    @Override
    @Transactional(readOnly = true)
    public List<GroupInviteResponse> listMyPendingInvites(UUID userId) {
        return groupInviteRepository.findByInviteeIdAndStatus(userId, GroupInviteStatus.PENDING).stream()
                .map(groupMapper::toInviteResponse)
                .toList();
    }

    private GroupInvite requirePendingInviteOwnedBy(UUID inviteId, UUID requestingUserId) {
        GroupInvite invite = groupInviteRepository.findById(inviteId)
                .orElseThrow(() -> new ResourceNotFoundException("Invite " + inviteId + " was not found"));

        if (!invite.getInviteeId().equals(requestingUserId)) {
            throw new UnauthorizedActionException("Only the invitee may respond to this invite");
        }
        if (invite.getStatus() != GroupInviteStatus.PENDING) {
            throw new GroupInviteException("Invite " + inviteId + " has already been " + invite.getStatus());
        }

        return invite;
    }

    private void requireActiveMember(UUID groupId, UUID userId) {
        requireActiveMemberAndReturn(groupId, userId);
    }

    /** Same check as requireActiveMember, but returns the member row for callers that need the role too (e.g. updateGroup, for the response's viewerRole). */
    private GroupMember requireActiveMemberAndReturn(UUID groupId, UUID userId) {
        GroupMember member = groupMemberRepository.findByGroup_IdAndUserId(groupId, userId)
                .orElseThrow(() -> new NotAGroupMemberException("User " + userId + " is not a member of group " + groupId));

        if (member.getStatus() != GroupMemberStatus.ACTIVE) {
            throw new NotAGroupMemberException("User " + userId + " has left group " + groupId);
        }

        return member;
    }

    private void requireAdmin(UUID groupId, UUID userId) {
        GroupMember member = groupMemberRepository.findByGroup_IdAndUserId(groupId, userId)
                .orElseThrow(() -> new NotAGroupMemberException("User " + userId + " is not a member of group " + groupId));

        if (member.getStatus() != GroupMemberStatus.ACTIVE) {
            throw new NotAGroupMemberException("User " + userId + " has left group " + groupId);
        }
        if (member.getRole() != GroupRole.ADMIN) {
            throw new UnauthorizedActionException("Only a group ADMIN may perform this action");
        }
    }
}
