package com.strawhats.core.service.impl;

import com.strawhats.core.dto.request.SendMessageRequest;
import com.strawhats.core.dto.response.MessageResponse;
import com.strawhats.core.entity.Channel;
import com.strawhats.core.entity.ChannelMember;
import com.strawhats.core.entity.ChannelTopic;
import com.strawhats.core.entity.Message;
import com.strawhats.core.entity.SearchOutbox;
import com.strawhats.core.entity.enums.ChatType;
import com.strawhats.core.entity.enums.MessageType;
import com.strawhats.core.entity.enums.OutboxOperation;
import com.strawhats.core.exception.InvalidTopicException;
import com.strawhats.core.exception.ResourceNotFoundException;
import com.strawhats.core.mapper.MessageMapper;
import com.strawhats.core.repository.ChannelRepository;
import com.strawhats.core.repository.ChannelTopicRepository;
import com.strawhats.core.repository.MessageRepository;
import com.strawhats.core.repository.SearchOutboxRepository;
import com.strawhats.core.service.MembershipService;
import com.strawhats.core.service.MessageService;
import jakarta.validation.ValidationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class MessageServiceImpl implements MessageService {

    private static final int MAX_HISTORY_PAGE_SIZE = 100;

    private final MessageRepository messageRepository;
    private final SearchOutboxRepository searchOutboxRepository;
    private final ChannelRepository channelRepository;
    private final ChannelTopicRepository channelTopicRepository;
    private final MembershipService membershipService;
    private final MessageMapper messageMapper;

    public MessageServiceImpl(MessageRepository messageRepository,
                               SearchOutboxRepository searchOutboxRepository,
                               ChannelRepository channelRepository,
                               ChannelTopicRepository channelTopicRepository,
                               MembershipService membershipService,
                               MessageMapper messageMapper) {
        this.messageRepository = messageRepository;
        this.searchOutboxRepository = searchOutboxRepository;
        this.channelRepository = channelRepository;
        this.channelTopicRepository = channelTopicRepository;
        this.membershipService = membershipService;
        this.messageMapper = messageMapper;
    }

    @Override
    @Transactional
    public MessageResponse sendMessage(UUID senderId, SendMessageRequest request) {
        Channel channel = channelRepository.findActiveById(request.channelId())
                .orElseThrow(() -> new ResourceNotFoundException("Channel " + request.channelId() + " was not found"));

        ChannelMember sender = membershipService.requireMembership(channel.getId(), senderId);
        // Topic does NOT override channel permissions: this is the exact same
        // ACTIVE-membership check as before, regardless of whether the
        // message is topic-tagged or general.
        membershipService.requireCanSend(sender);

        validateContent(request);
        ChannelTopic topic = resolveTopic(channel, request.topicId());

        Message message = Message.builder()
                .chatType(ChatType.CHANNEL)
                .chatId(channel.getId())
                .senderId(senderId)
                .type(request.type())
                .content(request.content())
                .mediaId(request.mediaId())
                .topic(topic)
                .edited(false)
                .build();
        message = messageRepository.save(message);

        // Transactional outbox: same DB transaction as the message insert above,
        // so a future search-indexing consumer never misses or duplicates this event.
        SearchOutbox outboxRow = SearchOutbox.builder()
                .operation(OutboxOperation.CREATE)
                .messageId(message.getId())
                .payload(Map.of(
                        "channelId", channel.getId().toString(),
                        "senderId", senderId.toString(),
                        "type", message.getType().name(),
                        "topicId", topic != null ? topic.getId().toString() : "",
                        "content", message.getContent() == null ? "" : message.getContent()
                ))
                .build();
        searchOutboxRepository.save(outboxRow);

        return messageMapper.toResponse(message);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MessageResponse> getHistory(UUID channelId, UUID requestingUserId, LocalDateTime before, int limit) {
        channelRepository.findActiveById(channelId)
                .orElseThrow(() -> new ResourceNotFoundException("Channel " + channelId + " was not found"));

        // Membership is required to read history - throws NotAChannelMemberException otherwise.
        membershipService.requireMembership(channelId, requestingUserId);

        int pageSize = clampPageSize(limit);

        return messageRepository
                .findHistoryPage(ChatType.CHANNEL, channelId, before, PageRequest.of(0, pageSize))
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

        return messageRepository
                .findTopicHistoryPage(ChatType.CHANNEL, channelId, topicId, before, PageRequest.of(0, pageSize))
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

    private void validateContent(SendMessageRequest request) {
        if (request.type() == MessageType.TEXT && !request.hasContent()) {
            throw new ValidationException("content is required for TEXT messages");
        }
        if ((request.type() == MessageType.IMAGE || request.type() == MessageType.FILE) && request.mediaId() == null) {
            throw new ValidationException("mediaId is required for IMAGE/FILE messages");
        }
    }
}
