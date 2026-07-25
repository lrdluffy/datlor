package com.strawhats.core.dto.request;

import com.strawhats.core.entity.enums.MessageType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * US-04: Send message in a public channel. Sent as the payload of a STOMP
 * frame to /app/messages.send. Messages NEVER go through REST.
 */
public record SendMessageRequest(

        @NotNull(message = "channelId is required")
        UUID channelId,

        @NotNull(message = "type is required")
        MessageType type,

        @Size(max = 4000, message = "content must be at most 4000 characters")
        String content,

        /** Required when type = IMAGE or FILE; must reference an existing media-service upload. */
        UUID mediaId,

        /**
         * Optional: tags the message to one of the channel's topics.
         * Omit (or pass null) to send a general, topic-less message - this
         * is always allowed. When present, MessageServiceImpl validates the
         * topic belongs to the SAME channel as `channelId` and rejects it
         * otherwise.
         */
        UUID topicId
) {
    public boolean hasContent() {
        return content != null && !content.isBlank();
    }
}
