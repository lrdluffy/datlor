package com.strawhats.core.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

public record ChannelTopicResponse(
        UUID id,
        UUID channelId,
        String name,
        UUID createdBy,
        LocalDateTime createdAt
) {
}
