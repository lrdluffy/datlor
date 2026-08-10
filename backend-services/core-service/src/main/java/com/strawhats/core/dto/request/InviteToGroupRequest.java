package com.strawhats.core.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record InviteToGroupRequest(

        @NotNull(message = "inviteeId is required")
        UUID inviteeId
) {
}
