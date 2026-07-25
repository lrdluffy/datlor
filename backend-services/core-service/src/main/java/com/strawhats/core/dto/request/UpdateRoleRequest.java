package com.strawhats.core.dto.request;

import com.strawhats.core.entity.enums.ChannelRole;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * US-11: Assign channel member roles. Sent as the payload of a STOMP frame
 * to /app/channels.updateRole. Authorization rules are enforced in
 * MembershipService (see class javadoc there).
 */
public record UpdateRoleRequest(

        @NotNull(message = "channelId is required")
        UUID channelId,

        @NotNull(message = "targetUserId is required")
        UUID targetUserId,

        @NotNull(message = "newRole is required")
        ChannelRole newRole
) {
}
