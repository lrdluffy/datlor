package com.strawhats.core.service.impl;

import com.strawhats.core.client.MediaServiceClient;
import com.strawhats.core.entity.ChannelTopic;
import com.strawhats.core.entity.Message;
import com.strawhats.core.entity.SearchOutbox;
import com.strawhats.core.entity.enums.ChatType;
import com.strawhats.core.entity.enums.MessageStatus;
import com.strawhats.core.entity.enums.MessageType;
import com.strawhats.core.entity.enums.OutboxOperation;
import com.strawhats.core.exception.InvalidMediaException;
import com.strawhats.core.mapper.MessageMapper;
import com.strawhats.core.repository.MessageRepository;
import com.strawhats.core.repository.SearchOutboxRepository;
import com.strawhats.core.dto.response.MessageResponse;
import jakarta.validation.ValidationException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Shared by MessageServiceImpl (channels) and GroupMessageServiceImpl
 * (groups) - the low-level mechanics of persisting a message (content
 * validation, US-18 media validation, US-19 scheduling, the transactional
 * outbox write) are IDENTICAL for both chat types; only membership/
 * permission checks and topic handling differ, and those stay in each
 * chat type's own service, per "don't merge groups with channels".
 */
@Component
public class MessagePersistenceHelper {

    private final MessageRepository messageRepository;
    private final SearchOutboxRepository searchOutboxRepository;
    private final MediaServiceClient mediaServiceClient;
    private final MessageMapper messageMapper;

    public MessagePersistenceHelper(MessageRepository messageRepository,
                                     SearchOutboxRepository searchOutboxRepository,
                                     MediaServiceClient mediaServiceClient,
                                     MessageMapper messageMapper) {
        this.messageRepository = messageRepository;
        this.searchOutboxRepository = searchOutboxRepository;
        this.mediaServiceClient = mediaServiceClient;
        this.messageMapper = messageMapper;
    }

    @Transactional
    public MessageResponse persist(ChatType chatType, UUID chatId, UUID senderId, MessageType type,
                                    String content, UUID mediaId, ChannelTopic topic, LocalDateTime scheduledAt) {

        validateContent(type, content, mediaId);

        // US-18: mediaId must correspond to a real media-service file. NEVER
        // trust the client's word for it, and NEVER read media-service's DB -
        // this HTTP call is the one sanctioned way to know.
        if (mediaId != null && !mediaServiceClient.mediaExists(mediaId)) {
            throw new InvalidMediaException("mediaId " + mediaId + " does not correspond to an existing media file");
        }

        // US-19: a future scheduledAt defers delivery; anything else (null,
        // now, or the past) is treated as "send immediately".
        boolean isScheduled = scheduledAt != null && scheduledAt.isAfter(LocalDateTime.now());

        Message message = Message.builder()
                .chatType(chatType)
                .chatId(chatId)
                .senderId(senderId)
                .type(type)
                .content(content)
                .mediaId(mediaId)
                .topic(topic)
                .edited(false)
                .scheduledAt(isScheduled ? scheduledAt : null)
                .status(isScheduled ? MessageStatus.PENDING : MessageStatus.SENT)
                .build();
        message = messageRepository.save(message);

        // Transactional outbox: same DB transaction as the message insert
        // above, so a future search-indexing consumer never misses or
        // duplicates this event - written regardless of PENDING/SENT, since
        // the eventual content is what matters for search, not delivery timing.
        SearchOutbox outboxRow = SearchOutbox.builder()
                .operation(OutboxOperation.CREATE)
                .messageId(message.getId())
                .payload(Map.of(
                        "chatType", chatType.name(),
                        "chatId", chatId.toString(),
                        "senderId", senderId.toString(),
                        "type", message.getType().name(),
                        "topicId", topic != null ? topic.getId().toString() : "",
                        "content", message.getContent() == null ? "" : message.getContent()
                ))
                .build();
        searchOutboxRepository.save(outboxRow);

        return messageMapper.toResponse(message);
    }

    private void validateContent(MessageType type, String content, UUID mediaId) {
        boolean hasContent = content != null && !content.isBlank();
        if (type == MessageType.TEXT && !hasContent) {
            throw new ValidationException("content is required for TEXT messages");
        }
        if ((type == MessageType.IMAGE || type == MessageType.FILE) && mediaId == null) {
            throw new ValidationException("mediaId is required for IMAGE/FILE messages");
        }
    }
}
