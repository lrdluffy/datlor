package com.strawhats.core.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * US-17: adding a member WITHOUT going through the invite/accept flow.
 * GroupServiceImpl only allows this when the target user's identity-service
 * privacy profile has allowDirectGroupAdd = true; otherwise it is rejected
 * and the caller must fall back to InviteToGroupRequest instead.
 */
public record AddGroupMemberRequest(

        @NotNull(message = "userId is required")
        UUID userId
) {
}
