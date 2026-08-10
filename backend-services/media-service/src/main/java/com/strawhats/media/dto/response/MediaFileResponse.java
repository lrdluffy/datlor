package com.strawhats.media.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

public record MediaFileResponse(
        UUID id,
        UUID uploaderId,
        String fileUrl,
        String fileType,
        long size,
        LocalDateTime createdAt
) {
}
