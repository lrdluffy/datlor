package com.strawhats.core.dto.request;

import com.strawhats.core.entity.enums.MessageType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Sent as the payload of a STOMP frame to /app/groups.messages.send. Kept
 * as its own DTO (rather than reusing channel's SendMessageRequest) so
 * group and channel message payloads stay visibly distinct at the API
 * boundary, per "Groups ≠ Channels" - even though both ultimately persist
 * to the same underlying Message table via chat_type/chat_id.
 */
public record GroupMessageRequest(

        @NotNull(message = "groupId is required")
        UUID groupId,

        @NotNull(message = "type is required")
        MessageType type,

        @Size(max = 4000, message = "content must be at most 4000 characters")
        String content,

        /** Required when type = IMAGE or FILE; validated against media-service (US-18). */
        UUID mediaId,

        /**
         * US-19: null (or a time in the past/present) = send immediately.
         * A future timestamp defers delivery - see ScheduledMessageDispatcher.
         */
        LocalDateTime scheduledAt
) {
    public boolean hasContent() {
        return content != null && !content.isBlank();
    }

    public boolean isScheduled() {
        return scheduledAt != null && scheduledAt.isAfter(LocalDateTime.now());
    }
}
