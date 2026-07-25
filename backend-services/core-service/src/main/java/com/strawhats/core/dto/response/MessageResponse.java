package com.strawhats.core.dto.response;

import com.strawhats.core.entity.enums.MessageType;

import java.time.LocalDateTime;
import java.util.UUID;

public record MessageResponse(
        UUID id,
        UUID channelId,
        UUID senderId,
        MessageType type,
        String content,
        UUID mediaId,
        UUID topicId,
        boolean edited,
        LocalDateTime createdAt
) {
}
