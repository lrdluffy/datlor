package com.strawhats.core.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

public record GroupResponse(
        UUID id,
        String name,
        UUID createdBy,
        LocalDateTime createdAt,
        int memberCount,
        GroupRoleView viewerRole
) {
    /** The requesting user's own role/status in this group - null if not a member. */
    public record GroupRoleView(String role, String status) {
    }
}
