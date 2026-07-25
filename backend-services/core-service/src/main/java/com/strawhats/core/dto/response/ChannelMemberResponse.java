package com.strawhats.core.dto.response;

import com.strawhats.core.entity.enums.ChannelRole;
import com.strawhats.core.entity.enums.MemberStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record ChannelMemberResponse(
        UUID channelId,
        UUID userId,
        ChannelRole role,
        MemberStatus status,
        boolean mediaAllowed,
        LocalDateTime joinedAt
) {
}
