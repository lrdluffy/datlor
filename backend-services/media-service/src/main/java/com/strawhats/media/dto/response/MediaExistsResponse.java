package com.strawhats.media.dto.response;

import java.util.UUID;

/**
 * Deliberately minimal: core-service only needs to know a mediaId is real
 * before attaching it to a message - it has no business reading the full
 * MediaFile record (uploader, size, etc).
 */
public record MediaExistsResponse(
        UUID id,
        boolean exists
) {
}
