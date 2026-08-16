package com.strawhats.core.dto.response;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record GroupDetailResponse(
        UUID id,
        String name,
        String description,
        UUID createdBy,
        LocalDateTime createdAt,
        List<GroupMemberResponse> members
) {
}
