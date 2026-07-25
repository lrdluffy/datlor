package com.strawhats.core.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * US-09: Create channel. Sent as the payload of a STOMP frame to
 * /app/channels.create. The creator becomes the channel's OWNER.
 */
public record CreateChannelRequest(

        @NotBlank(message = "name is required")
        @Size(max = 100, message = "name must be at most 100 characters")
        String name,

        @Size(max = 500, message = "description must be at most 500 characters")
        String description
) {
}
