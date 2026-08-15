package com.strawhats.core.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * Group-equivalent of {@link DeleteMessageRequest}. Sent to
 * /app/groups.messages.delete. Allowed for the message's own sender OR a
 * group ADMIN (groups have only ADMIN/MEMBER - no moderator tier, per
 * "Groups ≠ Channels").
 */
public record DeleteGroupMessageRequest(

        @NotNull(message = "groupId is required")
        UUID groupId,

        @NotNull(message = "messageId is required")
        UUID messageId
) {
}
