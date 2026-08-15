package com.strawhats.core.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Group-equivalent of {@link EditMessageRequest}. Sent to
 * /app/groups.messages.edit. Kept as its own DTO rather than reused across
 * chat types, per "Groups ≠ Channels" (see GroupMessageRequest).
 */
public record EditGroupMessageRequest(

        @NotNull(message = "groupId is required")
        UUID groupId,

        @NotNull(message = "messageId is required")
        UUID messageId,

        @NotBlank(message = "content is required")
        @Size(max = 4000, message = "content must be at most 4000 characters")
        String content
) {
}
