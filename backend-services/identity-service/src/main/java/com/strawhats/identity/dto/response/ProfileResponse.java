package com.strawhats.identity.dto.response;

import java.util.UUID;

public record ProfileResponse(
        UUID userId,
        String displayName,
        String bio,
        UUID avatarMediaId,
        boolean allowDirectGroupAdd
) {
}
