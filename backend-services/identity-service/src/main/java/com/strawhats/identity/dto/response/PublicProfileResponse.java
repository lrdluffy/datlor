package com.strawhats.identity.dto.response;

import java.util.UUID;

/**
 * what any OTHER authenticated user
 * sees when viewing this profile - deliberately excludes
 * {@code allowDirectGroupAdd}. That flag is a privacy PREFERENCE, not
 * profile content: it already has its own narrowly-scoped, service-to-service-only
 * view ({@link PrivacyProfileResponse}, used solely by core-service's
 * US-17 direct-add check) - a random viewer has no legitimate need to read
 * it directly, only to have the system honor it when they try to add this
 * user to a group. Everything else on {@link ProfileResponse} (display
 * name, bio, avatar) is exactly what "view this profile" means and is
 * safe to show anyone.
 */
public record PublicProfileResponse(
        UUID userId,
        String displayName,
        String bio,
        UUID avatarMediaId
) {
}
