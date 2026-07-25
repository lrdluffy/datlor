package com.strawhats.core.dto.request;

import com.strawhats.core.entity.enums.MemberStatus;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * US-12: Block/restrict a channel member. Sent as the payload of a STOMP
 * frame to /app/channels.blockMember. `newStatus` also accepts ACTIVE so the
 * same handler can be used to lift a block/restriction.
 */
public record UpdateMemberStatusRequest(

        @NotNull(message = "channelId is required")
        UUID channelId,

        @NotNull(message = "targetUserId is required")
        UUID targetUserId,

        @NotNull(message = "newStatus is required")
        MemberStatus newStatus
) {
}
