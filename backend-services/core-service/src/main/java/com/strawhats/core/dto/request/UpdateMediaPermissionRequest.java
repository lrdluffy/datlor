package com.strawhats.core.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * let a channel admin restrict/re-allow a member's
 * ability to attach media to their messages. Sent as the payload of a
 * STOMP frame to /app/channels.updateMediaPermission - same shape and
 * reasoning as UpdateMemberStatusRequest (US-12), just toggling a
 * different per-member flag.
 */
public record UpdateMediaPermissionRequest(

        @NotNull(message = "channelId is required")
        UUID channelId,

        @NotNull(message = "targetUserId is required")
        UUID targetUserId,

        @NotNull(message = "mediaAllowed is required")
        Boolean mediaAllowed
) {
}
