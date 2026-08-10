package com.strawhats.core.dto.response;

import com.strawhats.core.entity.enums.GroupMemberStatus;
import com.strawhats.core.entity.enums.GroupRole;

import java.time.LocalDateTime;
import java.util.UUID;

public record GroupMemberResponse(
        UUID groupId,
        UUID userId,
        GroupRole role,
        GroupMemberStatus status,
        LocalDateTime joinedAt
) {
}
