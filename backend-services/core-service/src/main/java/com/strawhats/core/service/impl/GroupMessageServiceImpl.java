package com.strawhats.core.service.impl;

import com.strawhats.core.dto.request.DeleteGroupMessageRequest;
import com.strawhats.core.dto.request.EditGroupMessageRequest;
import com.strawhats.core.dto.request.GroupMessageRequest;
import com.strawhats.core.dto.response.MessageResponse;
import com.strawhats.core.entity.Group;
import com.strawhats.core.entity.GroupMember;
import com.strawhats.core.entity.enums.ChatType;
import com.strawhats.core.entity.enums.GroupMemberStatus;
import com.strawhats.core.entity.enums.GroupRole;
import com.strawhats.core.exception.NotAGroupMemberException;
import com.strawhats.core.exception.ResourceNotFoundException;
import com.strawhats.core.mapper.MessageMapper;
import com.strawhats.core.repository.GroupMemberRepository;
import com.strawhats.core.repository.GroupRepository;
import com.strawhats.core.repository.MessageRepository;
import com.strawhats.core.service.GroupMessageService;
import jakarta.validation.ValidationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class GroupMessageServiceImpl implements GroupMessageService {

    private static final int MAX_HISTORY_PAGE_SIZE = 100;

    private final MessageRepository messageRepository;
    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final MessageMapper messageMapper;
    private final MessagePersistenceHelper messagePersistenceHelper;

    public GroupMessageServiceImpl(MessageRepository messageRepository,
                                    GroupRepository groupRepository,
                                    GroupMemberRepository groupMemberRepository,
                                    MessageMapper messageMapper,
                                    MessagePersistenceHelper messagePersistenceHelper) {
        this.messageRepository = messageRepository;
        this.groupRepository = groupRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.messageMapper = messageMapper;
        this.messagePersistenceHelper = messagePersistenceHelper;
    }

    @Override
    @Transactional
    public MessageResponse sendMessage(UUID senderId, GroupMessageRequest request) {
        Group group = groupRepository.findById(request.groupId())
                .orElseThrow(() -> new ResourceNotFoundException("Group " + request.groupId() + " was not found"));

        requireActiveMember(group.getId(), senderId);

        // Groups have no topics (unlike channels) - always null here.
        return messagePersistenceHelper.persist(
                ChatType.GROUP, group.getId(), senderId, request.type(),
                request.content(), request.mediaId(), null, request.scheduledAt());
    }

    @Override
    @Transactional
    public MessageResponse editMessage(UUID actingUserId, EditGroupMessageRequest request) {
        Group group = groupRepository.findById(request.groupId())
                .orElseThrow(() -> new ResourceNotFoundException("Group " + request.groupId() + " was not found"));

        // Membership is required to act on the group at all; the ACTUAL
        // "only the sender may edit" rule is enforced inside
        // MessagePersistenceHelper.editMessage - being ADMIN grants no
        // exception to edit someone else's message.
        requireActiveMember(group.getId(), actingUserId);

        return messagePersistenceHelper.editMessage(
                ChatType.GROUP, group.getId(), request.messageId(), actingUserId, request.content());
    }

    @Override
    @Transactional
    public MessageResponse deleteMessage(UUID actingUserId, DeleteGroupMessageRequest request) {
        Group group = groupRepository.findById(request.groupId())
                .orElseThrow(() -> new ResourceNotFoundException("Group " + request.groupId() + " was not found"));

        GroupMember actor = requireActiveMember(group.getId(), actingUserId);

        // Groups only distinguish ADMIN from MEMBER (no moderator tier,
        // per "Groups ≠ Channels") - an ADMIN may delete anyone's message;
        // everyone else may only delete their own.
        boolean canModerate = actor.getRole() == GroupRole.ADMIN;

        return messagePersistenceHelper.deleteMessage(
                ChatType.GROUP, group.getId(), request.messageId(), actingUserId, canModerate);
    }


    @Override
    @Transactional(readOnly = true)
    public List<MessageResponse> getHistory(UUID groupId, UUID requestingUserId, LocalDateTime before, int limit) {
        groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group " + groupId + " was not found"));

        requireActiveMember(groupId, requestingUserId);

        int pageSize = Math.min(Math.max(limit, 1), MAX_HISTORY_PAGE_SIZE);

        return messageRepository
                .findHistoryPage(ChatType.GROUP, groupId, before, PageRequest.of(0, pageSize))
                .stream()
                .map(messageMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MessageResponse> searchMessages(UUID groupId, UUID requestingUserId, String query,
                                                LocalDateTime before, int limit) {
        groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group " + groupId + " was not found"));

        requireActiveMember(groupId, requestingUserId);

        String trimmedQuery = query == null ? "" : query.trim();
        if (trimmedQuery.isEmpty()) {
            throw new ValidationException("q is required");
        }

        int pageSize = Math.min(Math.max(limit, 1), MAX_HISTORY_PAGE_SIZE);
        LocalDateTime effectiveBefore = before != null ? before : LocalDateTime.now();

        return messageRepository
                .searchMessages(ChatType.GROUP, groupId, trimmedQuery, effectiveBefore, PageRequest.of(0, pageSize))
                .stream()
                .map(messageMapper::toResponse)
                .toList();
    }
    
    private GroupMember requireActiveMember(UUID groupId, UUID userId) {
        GroupMember member = groupMemberRepository.findByGroup_IdAndUserId(groupId, userId)
                .orElseThrow(() -> new NotAGroupMemberException(
                        "User " + userId + " is not a member of group " + groupId));

        if (member.getStatus() != GroupMemberStatus.ACTIVE) {
            throw new NotAGroupMemberException("User " + userId + " has left group " + groupId);
        }

        return member;
    }
}
