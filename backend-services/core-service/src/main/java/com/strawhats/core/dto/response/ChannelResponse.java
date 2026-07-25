package com.strawhats.core.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

public record ChannelResponse(
        UUID id,
        String name,
        String description,
        UUID createdBy,
        LocalDateTime createdAt,
        int memberCount,
        ChannelRoleView viewerRole
) {
    /** The requesting user's own role/status in this channel - null if not a member. */
    public record ChannelRoleView(String role, String status) {
    }
}
