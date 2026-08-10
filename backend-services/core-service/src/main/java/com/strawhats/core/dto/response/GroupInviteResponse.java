package com.strawhats.core.dto.response;

import com.strawhats.core.entity.enums.GroupInviteStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record GroupInviteResponse(
        UUID id,
        UUID groupId,
        String groupName,
        UUID inviterId,
        UUID inviteeId,
        GroupInviteStatus status,
        LocalDateTime createdAt
) {
}
