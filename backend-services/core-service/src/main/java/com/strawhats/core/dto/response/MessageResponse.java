package com.strawhats.core.dto.response;

import com.strawhats.core.entity.enums.ChatType;
import com.strawhats.core.entity.enums.MessageStatus;
import com.strawhats.core.entity.enums.MessageType;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Shared response shape for BOTH channel and group messages (they persist
 * to the same underlying `messages` table) - `chatType` tells the
 * frontend which one it's looking at and therefore which topic
 * (/topic/channels/{chatId} vs /topic/groups/{chatId}) it came from.
 */
public record MessageResponse(
        UUID id,
        ChatType chatType,
        UUID chatId,
        UUID senderId,
        MessageType type,
        String content,
        UUID mediaId,
        UUID topicId,
        boolean edited,
        MessageStatus status,
        LocalDateTime scheduledAt,
        LocalDateTime createdAt,

        /** Non-null once the message has been deleted (soft delete) - see the MESSAGE_DELETED WS event. */
        LocalDateTime deletedAt
) {
}
