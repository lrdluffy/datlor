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
import com.strawhats.core.exception.ResourceNotFoundException;
import com.strawhats.core.exception.UnauthorizedActionException;
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


    /**
     * Edit a previously sent message's content. ONLY the sender may ever
     * edit their own message - the caller (MessageServiceImpl /
     * GroupMessageServiceImpl) has already resolved the caller's channel/
     * group membership, but the sender check itself is identical for both
     * chat types, so it lives here alongside the rest of the shared
     * persistence mechanics.
     */
    @Transactional
    public MessageResponse editMessage(ChatType chatType, UUID chatId, UUID messageId,
                                       UUID actingUserId, String newContent) {
        Message message = requireLiveMessage(chatType, chatId, messageId);

        if (!message.getSenderId().equals(actingUserId)) {
            throw new UnauthorizedActionException("Only the sender may edit their own message");
        }

        message.setContent(newContent);
        message.setEdited(true);
        message = messageRepository.save(message);

        writeOutboxRow(OutboxOperation.UPDATE, message);

        return messageMapper.toResponse(message);
    }

    /**
     * Soft-delete a previously sent message (sets `deletedAt`, preserving
     * the row for audit - same pattern as Channel's soft delete). Allowed
     * for the message's own sender OR when `actorCanModerate` is true -
     * the caller decides that flag (channel: MODERATOR+, per US-12's
     * threshold; group: ADMIN), since what counts as "admin" is scoped
     * differently per chat type and this helper deliberately knows nothing
     * about channel/group roles.
     */
    @Transactional
    public MessageResponse deleteMessage(ChatType chatType, UUID chatId, UUID messageId,
                                         UUID actingUserId, boolean actorCanModerate) {
        Message message = requireLiveMessage(chatType, chatId, messageId);

        boolean isSender = message.getSenderId().equals(actingUserId);
        if (!isSender && !actorCanModerate) {
            throw new UnauthorizedActionException(
                    "Only the sender or a channel/group admin may delete this message");
        }

        message.setDeletedAt(LocalDateTime.now());
        message = messageRepository.save(message);

        writeOutboxRow(OutboxOperation.DELETE, message);

        return messageMapper.toResponse(message);
    }

    /**
     * Shared lookup + validation for edit/delete: the message must exist,
     * must not already be deleted (treated as not-found, same as a
     * soft-deleted Channel), must belong to the chat the caller claims it
     * does (defense in depth against a client passing a mismatched
     * channelId/groupId), and must already be SENT - a still-PENDING
     * scheduled message (US-19) hasn't gone out yet, so editing/deleting it
     * here would race with ScheduledMessageDispatcher, which is unaware of
     * either action and would still dispatch/broadcast it as-is.
     */
    private Message requireLiveMessage(ChatType chatType, UUID chatId, UUID messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message " + messageId + " was not found"));

        if (message.isDeleted() || message.getChatType() != chatType || !message.getChatId().equals(chatId)) {
            throw new ResourceNotFoundException("Message " + messageId + " was not found");
        }

        if (message.getStatus() != MessageStatus.SENT) {
            throw new ValidationException(
                    "A scheduled message that has not been sent yet cannot be edited or deleted");
        }

        return message;
    }

    private void writeOutboxRow(OutboxOperation operation, Message message) {
        // Same transactional-outbox guarantee as the CREATE row written in
        // persist() above - written in the SAME DB transaction as the
        // message update, so a future search-indexing consumer never
        // misses or duplicates this event.
        SearchOutbox outboxRow = SearchOutbox.builder()
                .operation(operation)
                .messageId(message.getId())
                .payload(Map.of(
                        "chatType", message.getChatType().name(),
                        "chatId", message.getChatId().toString(),
                        "senderId", message.getSenderId().toString(),
                        "type", message.getType().name(),
                        "topicId", message.getTopic() != null ? message.getTopic().getId().toString() : "",
                        "content", message.getContent() == null ? "" : message.getContent()
                ))
                .build();
        searchOutboxRepository.save(outboxRow);
    }
}
