package com.strawhats.core.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Edit a previously sent channel message. Sent as the payload of a STOMP
 * frame to /app/messages.edit - like sending a message, editing one is a
 * real-time, multi-party event (everyone viewing the channel needs to see
 * the update live), so it is never exposed over REST.
 *
 * Only the ORIGINAL SENDER may ever edit their own message - no admin or
 * moderator exception, unlike delete (see DeleteMessageRequest). Enforced
 * server-side in MessageServiceImpl/MessagePersistenceHelper regardless
 * of what the client sends.
 */
public record EditMessageRequest(

        @NotNull(message = "channelId is required")
        UUID channelId,

        @NotNull(message = "messageId is required")
        UUID messageId,

        @NotBlank(message = "content is required")
        @Size(max = 4000, message = "content must be at most 4000 characters")
        String content
) {
}
