package com.strawhats.identity.dto.response;

import java.util.UUID;

/**
 * Deliberately minimal: core-service only needs to know whether direct
 * group-add is allowed before adding someone to a group without an invite
 * (US-17) - it has no business reading the rest of the profile.
 */
public record PrivacyProfileResponse(
        UUID userId,
        boolean allowDirectGroupAdd
) {
}
