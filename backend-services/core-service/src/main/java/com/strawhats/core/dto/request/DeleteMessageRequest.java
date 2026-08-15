package com.strawhats.core.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * Delete a previously sent channel message. Sent as the payload of a STOMP
 * frame to /app/messages.delete - a real-time, multi-party event (every
 * viewer's screen must drop the message immediately), never exposed over
 * REST, same as sending or editing one.
 *
 * Allowed for the message's own sender OR a channel admin/moderator - see
 * MembershipService/ChannelRole: MembershipServiceImpl computes that
 * threshold the same way US-12 (block/restrict a member) does, i.e.
 * MODERATOR and above.
 */
public record DeleteMessageRequest(

        @NotNull(message = "channelId is required")
        UUID channelId,

        @NotNull(message = "messageId is required")
        UUID messageId
) {
}
