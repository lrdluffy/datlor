package com.strawhats.core.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Create an ADDITIONAL topic in an existing channel, beyond the default
 * "معرفی" one seeded at channel creation (US-09). Sent as the payload of a
 * STOMP frame to /app/channels.topics.create - like joining a channel or
 * changing a role, other members currently viewing the channel need to see
 * the new topic appear live, so this is a real-time, multi-party action
 * and never exposed over REST (see ChannelRestController's class javadoc).
 *
 * Any member with access (ACTIVE status) may create one - see
 * ChannelServiceImpl.createTopic for the exact permission check and the
 * per-channel name-uniqueness rule.
 */
public record CreateTopicRequest(

        @NotNull(message = "channelId is required")
        UUID channelId,

        @NotBlank(message = "name is required")
        @Size(max = 100, message = "name must be at most 100 characters")
        String name
) {
}
