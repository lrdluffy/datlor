package com.strawhats.core.service.impl;

import com.strawhats.core.dto.request.DeleteMessageRequest;
import com.strawhats.core.dto.request.EditMessageRequest;
import com.strawhats.core.dto.request.SendMessageRequest;
import com.strawhats.core.dto.response.MessageResponse;
import com.strawhats.core.entity.Channel;
import com.strawhats.core.entity.ChannelMember;
import com.strawhats.core.entity.ChannelTopic;
import com.strawhats.core.entity.enums.ChannelRole;
import com.strawhats.core.entity.enums.ChatType;
import com.strawhats.core.exception.InvalidTopicException;
import com.strawhats.core.exception.ResourceNotFoundException;
import com.strawhats.core.mapper.MessageMapper;
import com.strawhats.core.repository.ChannelRepository;
import com.strawhats.core.repository.ChannelTopicRepository;
import com.strawhats.core.repository.MessageRepository;
import com.strawhats.core.service.MembershipService;
import com.strawhats.core.service.MessageService;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class MessageServiceImpl implements MessageService {

    private static final int MAX_HISTORY_PAGE_SIZE = 100;

    private final MessageRepository messageRepository;
    private final ChannelRepository channelRepository;
    private final ChannelTopicRepository channelTopicRepository;
    private final MembershipService membershipService;
    private final MessageMapper messageMapper;
    private final MessagePersistenceHelper messagePersistenceHelper;

    public MessageServiceImpl(MessageRepository messageRepository,
                               ChannelRepository channelRepository,
                               ChannelTopicRepository channelTopicRepository,
                               MembershipService membershipService,
                               MessageMapper messageMapper,
                               MessagePersistenceHelper messagePersistenceHelper) {
        this.messageRepository = messageRepository;
        this.channelRepository = channelRepository;
        this.channelTopicRepository = channelTopicRepository;
        this.membershipService = membershipService;
        this.messageMapper = messageMapper;
        this.messagePersistenceHelper = messagePersistenceHelper;
    }

    @Override
    @Transactional
    public MessageResponse sendMessage(UUID senderId, SendMessageRequest request) {
        Channel channel = channelRepository.findActiveById(request.channelId())
                .orElseThrow(() -> new ResourceNotFoundException("Channel " + request.channelId() + " was not found"));

        ChannelMember sender = membershipService.requireMembership(channel.getId(), senderId);
        // Topic does NOT override channel permissions: this is the exact same
        // ACTIVE-membership check as before, regardless of whether the
        // message is topic-tagged, general, immediate, or scheduled.
        membershipService.requireCanSend(sender);

        ChannelTopic topic = resolveTopic(channel, request.topicId());

        return messagePersistenceHelper.persist(
                ChatType.CHANNEL, channel.getId(), senderId, request.type(),
                request.content(), request.mediaId(), topic, request.scheduledAt());
    }

    @Override
    @Transactional
    public MessageResponse editMessage(UUID actingUserId, EditMessageRequest request) {
        Channel channel = channelRepository.findActiveById(request.channelId())
                .orElseThrow(() -> new ResourceNotFoundException("Channel " + request.channelId() + " was not found"));

        // Membership is required to act on the channel at all; the ACTUAL
        // "only the sender may edit" rule is enforced inside
        // MessagePersistenceHelper.editMessage, since being a member (even
        // OWNER) grants no exception to edit someone else's message.
        membershipService.requireMembership(channel.getId(), actingUserId);

        return messagePersistenceHelper.editMessage(
                ChatType.CHANNEL, channel.getId(), request.messageId(), actingUserId, request.content());
    }

    @Override
    @Transactional
    public MessageResponse deleteMessage(UUID actingUserId, DeleteMessageRequest request) {
        Channel channel = channelRepository.findActiveById(request.channelId())
                .orElseThrow(() -> new ResourceNotFoundException("Channel " + request.channelId() + " was not found"));

        ChannelMember actor = membershipService.requireMembership(channel.getId(), actingUserId);

        // A channel admin/moderator (MODERATOR and above) may delete
        // anyone's message; everyone else may only delete their own - the
        // final call on "own vs privileged" is made inside
        // MessagePersistenceHelper.deleteMessage.
        boolean canModerate = actor.getRole().isAtLeast(ChannelRole.MODERATOR);

        return messagePersistenceHelper.deleteMessage(
                ChatType.CHANNEL, channel.getId(), request.messageId(), actingUserId, canModerate);
    }


    @Override
    @Transactional(readOnly = true)
    public List<MessageResponse> getHistory(UUID channelId, UUID requestingUserId, LocalDateTime before, int limit) {
        channelRepository.findActiveById(channelId)
                .orElseThrow(() -> new ResourceNotFoundException("Channel " + channelId + " was not found"));

        // Membership is required to read history - throws NotAChannelMemberException otherwise.
        membershipService.requireMembership(channelId, requestingUserId);

        int pageSize = clampPageSize(limit);
        LocalDateTime effectiveBefore = before != null ? before : LocalDateTime.now();

        return messageRepository
                .findHistoryPage(ChatType.CHANNEL, channelId, effectiveBefore, PageRequest.of(0, pageSize))
                .stream()
                .map(messageMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MessageResponse> getTopicHistory(UUID channelId, UUID requestingUserId, UUID topicId,
                                                  LocalDateTime before, int limit) {
        Channel channel = channelRepository.findActiveById(channelId)
                .orElseThrow(() -> new ResourceNotFoundException("Channel " + channelId + " was not found"));

        membershipService.requireMembership(channelId, requestingUserId);

        // Validate topicId belongs to this channel up front (same rule as
        // sendMessage) rather than silently returning an empty page for a
        // topic that exists but belongs to someone else's channel.
        if (topicId != null) {
            resolveTopic(channel, topicId);
        }

        int pageSize = clampPageSize(limit);
        LocalDateTime effectiveBefore = before != null ? before : LocalDateTime.now();

        return messageRepository
                .findTopicHistoryPage(ChatType.CHANNEL, channelId, topicId, effectiveBefore, PageRequest.of(0, pageSize))
                .stream()
                .map(messageMapper::toResponse)
                .toList();
    }

    /**
     * Validates that `topicId`, if present, refers to a topic that actually
     * belongs to `channel` - a topic never overrides channel-level
     * permissions, but it must still be a topic of THIS channel, not some
     * other one. Returns null when `topicId` is null (sending/reading
     * without a topic is always allowed).
     */
    private ChannelTopic resolveTopic(Channel channel, UUID topicId) {
        if (topicId == null) {
            return null;
        }

        ChannelTopic topic = channelTopicRepository.findById(topicId)
                .orElseThrow(() -> new ResourceNotFoundException("Topic " + topicId + " was not found"));

        if (!topic.getChannel().getId().equals(channel.getId())) {
            throw new InvalidTopicException(
                    "Topic " + topicId + " does not belong to channel " + channel.getId());
        }

        return topic;
    }

    private int clampPageSize(int limit) {
        return Math.min(Math.max(limit, 1), MAX_HISTORY_PAGE_SIZE);
    }
}
